/**
 * Die Waisenrettung an der Datenbank: sichern, zum Hochladen markieren, nach
 * dem Push einordnen. Die Regeln selbst stehen in
 * `app/sync/recovery/orphan-policy.ts`, hier nur ihre Ausführung.
 *
 * Gegenstück zu `OrphanRecovery.kt` und `RecoveryDao.kt` der Android-App.
 *
 * Die Datenbank kommt als Parameter herein und nicht über `getDb()`: So
 * laufen die Tests gegen eine echte IndexedDB-Implementierung im
 * Arbeitsspeicher, ohne ein Modul auszutauschen. Die Anbindung an die
 * Verbindung der App steht in `app/sync/engine/store.ts`.
 *
 * JEDE FUNKTION IST EINE TRANSAKTION. Darin wird ausschließlich auf
 * IndexedDB-Anfragen gewartet, sonst committete sie vorzeitig (siehe
 * `mutateRow` in `repositories.ts`).
 */
import type { IDBPDatabase, IDBPObjectStore, IDBPTransaction } from 'idb'
import { selectContentHashScope } from '../sync/merge/content-hash'
import {
  findOrphans,
  isSyncTable,
  settle,
  SYNC_TABLES,
  type IdsByTable,
  type RejectedIds,
  type Settlement,
  type SyncRowRef,
  type SyncTable,
} from '../sync/recovery/orphan-policy'
import {
  CLEAN,
  DIRTY,
  type DirtyFlag,
  type RecoveryPayload,
  type RecoveryStatus,
  type RecoveryTable,
  type ShlisteDb,
  type SyncRecoveryRow,
} from './schema'

/** Gerettete Kopien sind danach entbehrlich, die Zeile liegt auf dem Server. */
export const RESTORED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/** Die Stores im Umfang des Inhalts-Hashes, in der Reihenfolge von `SYNC_TABLES`. */
const HASHED_STORES = ['lists', 'list_items', 'recipes', 'recipe_ingredients', 'recipe_steps', 'badges'] as const
type HashedStoreName = typeof HASHED_STORES[number]

type SecureStores = (HashedStoreName | 'sync_recovery')[]
type SettleStores = (HashedStoreName | 'recipe_chat_messages' | 'list_members' | 'history_entries' | 'sync_recovery')[]

/**
 * Sichert alle Waisen und markiert sie zum erneuten Hochladen, in EINER
 * Transaktion: Entweder ist eine Zeile kopiert UND markiert, oder beides
 * nicht. Erst die Kopie, dann die Markierung, Eltern vor Kindern.
 *
 * Markiert wird allein über `dirty = 1`. Inhalt, `updatedAt` und die
 * Feldstempel bleiben, wie sie sind: Die Zeile soll mit genau dem Stand
 * hinausgehen, den sie hat. Weil `updatedAt` vor dem Push-Schnappschuss liegt,
 * nimmt `clearDirtyFlags` das Flag nach einem angenommenen Push wieder ab.
 *
 * @returns die gesicherten Zeilen, leer heißt: nichts zu tun
 */
export async function secureAndRequeueOrphans(
  db: IDBPDatabase<ShlisteDb>,
  fromServer: IdsByTable,
  serverHash: string | null,
  now: number,
): Promise<SyncRowRef[]> {
  const tx = db.transaction([...HASHED_STORES, 'sync_recovery'], 'readwrite')
  const recovery = tx.objectStore('sync_recovery')

  // Gerettete Kopien werden nach einer Frist entbehrlich, die Zeile liegt ja
  // auf dem Server. Kopien in Quarantäne bleiben: Sie sind die einzige Spur.
  for (const row of await recovery.index('by-status').getAll('RESTORED')) {
    if (row.settledAt !== null && row.settledAt < now - RESTORED_RETENTION_MS) {
      await recovery.delete([row.table, row.rowId])
    }
  }

  const alreadyRecovered = (await recovery.getAllKeys())
    .flatMap(([table, id]) => (isSyncTable(table) ? [{ table, id }] : []))

  const [lists, items, recipes, ingredients, steps, badges] = await Promise.all([
    tx.objectStore('lists').getAll(),
    tx.objectStore('list_items').getAll(),
    tx.objectStore('recipes').getAll(),
    tx.objectStore('recipe_ingredients').getAll(),
    tx.objectStore('recipe_steps').getAll(),
    tx.objectStore('badges').getAll(),
  ])
  // Genau die Zeilen des Hashes, davon die sauberen. Schmutzige gehen ohnehin
  // mit dem nächsten Push hinaus, und was nicht im Hash steht, kann keine
  // Abweichung erzeugen.
  const scope = selectContentHashScope({ lists, items, recipes, ingredients, steps, badges })
  const clean = {
    lists: scope.lists.filter(isClean),
    items: scope.items.filter(isClean),
    recipes: scope.recipes.filter(isClean),
    ingredients: scope.ingredients.filter(isClean),
    steps: scope.steps.filter(isClean),
    badges: scope.badges.filter(isClean),
  }

  const orphans = findOrphans({
    LIST: idsOf(clean.lists),
    ITEM: idsOf(clean.items),
    RECIPE: idsOf(clean.recipes),
    INGREDIENT: idsOf(clean.ingredients),
    STEP: idsOf(clean.steps),
    BADGE: idsOf(clean.badges),
  }, fromServer, alreadyRecovered)

  const wanted = idsByTable(orphans)
  const copy = { serverHash, now }
  await secureRows(tx, 'lists', 'LIST', clean.lists, wanted.LIST, copy)
  await secureRows(tx, 'list_items', 'ITEM', clean.items, wanted.ITEM, copy)
  await secureRows(tx, 'recipes', 'RECIPE', clean.recipes, wanted.RECIPE, copy)
  await secureRows(tx, 'recipe_ingredients', 'INGREDIENT', clean.ingredients, wanted.INGREDIENT, copy)
  await secureRows(tx, 'recipe_steps', 'STEP', clean.steps, wanted.STEP, copy)
  await secureRows(tx, 'badges', 'BADGE', clean.badges, wanted.BADGE, copy)

  await tx.done
  return orphans
}

/**
 * Ordnet offene Rettungen nach einem Push ein. Abgelehntes wird lokal
 * entfernt, Kinder vor Eltern; die Kopie bleibt in `sync_recovery`.
 *
 * VOR DEM ENTFERNEN EINER LISTE ODER EINES REZEPTS WERDEN ALLE KINDER
 * GESICHERT, nicht nur die als Waise erkannten, und zwar mit ihrem aktuellen
 * Stand. Ein Eintrag, der zwischen Erkennung und Push angelegt wurde, stünde
 * sonst nirgends mehr. Danach gehen die Kinder mit, wie in Android per
 * Kaskade: Einträge und Mitglieder einer Liste, Zutaten, Schritte und Chat
 * eines Rezepts. Blieben sie liegen, gingen schmutzige Kinder bei jedem Push
 * erneut hinaus und würden für immer abgelehnt.
 *
 * @returns das Urteil, `null` wenn keine offene Rettung in diesem Push war
 */
export async function settleRecoveries(
  db: IDBPDatabase<ShlisteDb>,
  pushed: readonly SyncRowRef[],
  skipped: RejectedIds,
  now: number,
): Promise<Settlement | null> {
  const tx = db.transaction(
    [...HASHED_STORES, 'recipe_chat_messages', 'list_members', 'history_entries', 'sync_recovery'],
    'readwrite',
  )
  const recovery = tx.objectStore('sync_recovery')

  const pending = (await recovery.index('by-status').getAll('PENDING'))
    .flatMap(row => (isSyncTable(row.table) ? [{ table: row.table, id: row.rowId }] : []))
  const result = settle(pending, pushed, skipped)
  if (result.restored.length === 0 && result.quarantined.length === 0) {
    await tx.done
    return null
  }

  for (const ref of result.restored) {
    await markSettled(recovery, ref, 'RESTORED', now)
  }

  await secureChildrenOfQuarantinedParents(tx, result.quarantined, now)

  const childrenFirst = [...result.quarantined]
    .sort((a, b) => SYNC_TABLES.indexOf(b.table) - SYNC_TABLES.indexOf(a.table))
  for (const ref of childrenFirst) {
    await markSettled(recovery, ref, 'QUARANTINED', now)
    await removeLocally(tx, ref)
  }

  await tx.done
  return result
}

/* ------------------------------------------------------------------ *
 * Hilfen
 * ------------------------------------------------------------------ */

function isClean(row: { dirty: DirtyFlag }): boolean {
  return row.dirty === CLEAN
}

function idsOf(rows: readonly { id: string }[]): Set<string> {
  return new Set(rows.map(row => row.id))
}

function idsByTable(refs: readonly SyncRowRef[]): Record<SyncTable, Set<string>> {
  const grouped: Record<SyncTable, Set<string>> = {
    LIST: new Set(),
    ITEM: new Set(),
    RECIPE: new Set(),
    INGREDIENT: new Set(),
    STEP: new Set(),
    BADGE: new Set(),
  }
  for (const ref of refs) grouped[ref.table].add(ref.id)
  return grouped
}

function recoveryCopy(
  table: RecoveryTable,
  payload: RecoveryPayload,
  status: RecoveryStatus,
  detectedAt: number,
  settledAt: number | null,
  serverHash: string | null,
): SyncRecoveryRow {
  return { table, rowId: payload.id, payload, status, detectedAt, settledAt, serverHash }
}

/** Kopie zuerst, dann nur das Flag. Eine vorhandene Kopie gibt es hier nicht (`alreadyRecovered`). */
async function secureRows<N extends HashedStoreName>(
  tx: IDBPTransaction<ShlisteDb, SecureStores, 'readwrite'>,
  storeName: N,
  table: SyncTable,
  rows: readonly ShlisteDb[N]['value'][],
  ids: ReadonlySet<string>,
  copy: { serverHash: string | null, now: number },
): Promise<void> {
  for (const row of rows) {
    if (!ids.has(row.id)) continue
    await tx.objectStore('sync_recovery').put(recoveryCopy(table, row, 'PENDING', copy.now, null, copy.serverHash))
    await tx.objectStore(storeName).put({ ...row, dirty: DIRTY })
  }
}

async function markSettled(
  recovery: IDBPObjectStore<ShlisteDb, SettleStores, 'sync_recovery', 'readwrite'>,
  ref: SyncRowRef,
  status: RecoveryStatus,
  now: number,
): Promise<void> {
  const row = await recovery.get([ref.table, ref.id])
  if (row === undefined) return
  await recovery.put({ ...row, status, settledAt: now })
}

/**
 * REPLACE: Kurz vor dem Entfernen zählt der Stand, der gleich verschwindet,
 * nicht eine ältere Kopie aus einem früheren Lauf.
 */
async function secureChildrenOfQuarantinedParents(
  tx: IDBPTransaction<ShlisteDb, SettleStores, 'readwrite'>,
  quarantined: readonly SyncRowRef[],
  now: number,
): Promise<void> {
  const recovery = tx.objectStore('sync_recovery')
  const replace = async (table: RecoveryTable, rows: readonly RecoveryPayload[]): Promise<void> => {
    for (const row of rows) {
      await recovery.put(recoveryCopy(table, row, 'QUARANTINED', now, now, null))
    }
  }

  for (const ref of quarantined) {
    if (ref.table === 'LIST') {
      await replace('ITEM', await tx.objectStore('list_items').index('by-listId').getAll(ref.id))
    }
    else if (ref.table === 'RECIPE') {
      await replace('INGREDIENT', await tx.objectStore('recipe_ingredients').index('by-recipeId').getAll(ref.id))
      await replace('STEP', await tx.objectStore('recipe_steps').index('by-recipeId').getAll(ref.id))
      await replace('CHAT_MESSAGE', await tx.objectStore('recipe_chat_messages').index('by-recipeId').getAll(ref.id))
    }
    if (ref.table === 'LIST' || ref.table === 'RECIPE') {
      await replace('HISTORY', await tx.objectStore('history_entries').index('by-parentId').getAll(ref.id))
    }
  }
}

/**
 * Der Verlauf fällt mit, wie bei `hardDeleteList`: Ein offener Eintrag zu
 * einem Elternteil, das der Server ablehnt, ginge sonst bei jedem Push hinaus,
 * würde jedes Mal abgelehnt, und die Zahl offener Änderungen käme nie auf 0.
 */
async function removeHistoryOf(
  tx: IDBPTransaction<ShlisteDb, SettleStores, 'readwrite'>,
  parentId: string,
): Promise<void> {
  const history = tx.objectStore('history_entries')
  for (const key of await history.index('by-parentId').getAllKeys(parentId)) await history.delete(key)
}

/** Entfernt eine Zeile in Quarantäne, bei Listen und Rezepten samt Kindern. */
async function removeLocally(
  tx: IDBPTransaction<ShlisteDb, SettleStores, 'readwrite'>,
  ref: SyncRowRef,
): Promise<void> {
  switch (ref.table) {
    case 'LIST': {
      const items = tx.objectStore('list_items')
      for (const key of await items.index('by-listId').getAllKeys(ref.id)) await items.delete(key)
      const members = tx.objectStore('list_members')
      for (const key of await members.index('by-listId').getAllKeys(ref.id)) await members.delete(key)
      await removeHistoryOf(tx, ref.id)
      await tx.objectStore('lists').delete(ref.id)
      return
    }
    case 'RECIPE': {
      const ingredients = tx.objectStore('recipe_ingredients')
      for (const key of await ingredients.index('by-recipeId').getAllKeys(ref.id)) await ingredients.delete(key)
      const steps = tx.objectStore('recipe_steps')
      for (const key of await steps.index('by-recipeId').getAllKeys(ref.id)) await steps.delete(key)
      const messages = tx.objectStore('recipe_chat_messages')
      for (const key of await messages.index('by-recipeId').getAllKeys(ref.id)) await messages.delete(key)
      await removeHistoryOf(tx, ref.id)
      await tx.objectStore('recipes').delete(ref.id)
      return
    }
    case 'ITEM':
      await tx.objectStore('list_items').delete(ref.id)
      return
    case 'INGREDIENT':
      await tx.objectStore('recipe_ingredients').delete(ref.id)
      return
    case 'STEP':
      await tx.objectStore('recipe_steps').delete(ref.id)
      return
    case 'BADGE':
      await tx.objectStore('badges').delete(ref.id)
  }
}

/**
 * Die Zugriffsformen auf die lokale Datenbank.
 *
 * Der Schnitt folgt den DAOs der Android-App, weil der Sync-Algorithmus dort
 * bereits erprobt ist und genau diese Formen aufruft. Wer hier etwas
 * umbenennt, muss den Sync mitdenken.
 *
 * Zwei Regeln ziehen sich durch die Datei:
 *
 * 1. Jede Schreiboperation setzt `dirty = 1`, `updatedAt` und die
 *    `fieldTimestamps` der tatsächlich geänderten Felder. Feldgenaue
 *    Zeitstempel sind die Grundlage des Last-Write-Wins: Ohne sie würde ein
 *    Server-Datensatz, der nur ein anderes Feld betrifft, die lokale
 *    Änderung überschreiben.
 * 2. Löschen ist weich (`deletedAt`), damit die Löschung überhaupt gepusht
 *    werden kann. Die einzige Ausnahme ist `hardDeleteList()` — begründet
 *    dort.
 *
 * Für ein weiches Löschen gibt es bewusst keine eigene Funktion: Es ist ein
 * normales Update, das `deletedAt` setzt, und läuft über dieselbe
 * Upsert-Funktion wie jede andere Änderung.
 */
import type {
  Badge,
  FieldTimestamps,
  HistoryEntry,
  IsoUtc,
  List,
  ListItem,
  ListMember,
  Recipe,
  RecipeChatMessage,
  RecipeIngredient,
  RecipeStep,
  SyncedEntity,
} from '../../shared/types/domain'
import { sanitize } from '../sync/merge/limits'
import { getDb } from './client'
import {
  CLEAN,
  DIRTY,
  type BadgeRow,
  type DirtyFlag,
  type HistoryEntryRow,
  type ListItemRow,
  type ListMemberRow,
  type ListRow,
  type RecipeChatMessageRow,
  type RecipeIngredientRow,
  type RecipeRow,
  type RecipeStepRow,
  type SyncMetaKey,
  type SyncMetaMap,
} from './schema'
import { compareIso, isAtOrBefore, isIsoUtc, nowIso } from './timestamps'

/**
 * Was der Aufrufer beim Schreiben liefert: alle Domänenfelder ausser den
 * dreien, die diese Schicht selbst führt. Sie sind bewusst nicht setzbar —
 * ein von Hand gesetztes `updatedAt` würde das Last-Write-Wins verfälschen.
 */
export type Draft<T extends SyncedEntity> = Omit<T, 'createdAt' | 'updatedAt' | 'fieldTimestamps'>

/** Alle Stores, deren Zeilen gepusht werden. */
export type DirtyStoreName
  = | 'lists'
    | 'list_items'
    | 'recipes'
    | 'recipe_ingredients'
    | 'recipe_steps'
    | 'recipe_chat_messages'
    | 'badges'
    | 'history_entries'

export const DIRTY_STORES: readonly DirtyStoreName[] = [
  'lists',
  'list_items',
  'recipes',
  'recipe_ingredients',
  'recipe_steps',
  'recipe_chat_messages',
  'badges',
  'history_entries',
]

/* ------------------------------------------------------------------ *
 * Reine Hilfsfunktionen — ohne IndexedDB, deshalb direkt testbar.
 * ------------------------------------------------------------------ */

/**
 * Felder, die nie einen eigenen Zeitstempel bekommen. Die ID ist
 * unveränderlich; ein Zeitstempel darauf hätte für das Merge keine
 * Bedeutung und würde nur Platz in jeder Push-Nutzlast kosten.
 */
const UNSTAMPED_FIELDS: ReadonlySet<string> = new Set(['id'])

/**
 * Liefert die Namen der Felder, die sich gegenüber der gespeicherten Zeile
 * geändert haben. Ohne Vorgänger (neue Zeile) sind das alle gelieferten
 * Felder.
 *
 * Der Vergleich mit `Object.is` genügt, weil alle Domänenfelder Primitive
 * oder `null` sind — verschachtelte Werte gibt es im Contract nicht.
 */
export function changedFields(previous: object | undefined, next: object): string[] {
  const entries: [string, unknown][] = Object.entries(next)
  const relevant = entries.filter(([field]) => !UNSTAMPED_FIELDS.has(field))

  if (previous === undefined) {
    return relevant.map(([field]) => field)
  }

  const before = new Map<string, unknown>(Object.entries(previous))
  return relevant
    .filter(([field, value]) => !Object.is(before.get(field), value))
    .map(([field]) => field)
}

/**
 * Schreibt den Zeitstempel auf die geänderten Felder fort. Die Stempel
 * unveränderter Felder bleiben stehen — genau das macht das Merge feldgenau.
 */
export function mergeFieldTimestamps(
  previous: FieldTimestamps | null,
  fields: readonly string[],
  stamp: IsoUtc,
): FieldTimestamps {
  const merged: FieldTimestamps = { ...previous }
  for (const field of fields) {
    merged[field] = stamp
  }
  return merged
}

/** Die Felder, die diese Schicht selbst führt. */
export interface RowMeta {
  createdAt: IsoUtc
  updatedAt: IsoUtc
  fieldTimestamps: FieldTimestamps
  dirty: DirtyFlag
}

/**
 * Baut die verwalteten Felder einer zu schreibenden Zeile. `createdAt` bleibt
 * beim Wert der bestehenden Zeile: Es beschreibt die Entstehung, nicht den
 * letzten Schreibvorgang, und wandert sonst bei jeder Änderung nach vorn.
 */
export function buildRowMeta(
  previous: SyncedEntity | undefined,
  changed: readonly string[],
  now: IsoUtc,
): RowMeta {
  return {
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    fieldTimestamps: mergeFieldTimestamps(previous?.fieldTimestamps ?? null, changed, now),
    dirty: DIRTY,
  }
}

/**
 * Der Zeitstempel, an dem sich entscheidet, ob eine Zeile beim Push noch
 * unverändert war. Chat-Nachrichten sind append-only und haben kein
 * `updatedAt`; für sie gilt `createdAt`.
 */
export function snapshotStampOf(row: { readonly createdAt: IsoUtc, readonly updatedAt?: IsoUtc }): IsoUtc {
  return row.updatedAt ?? row.createdAt
}

/** Neueste Änderung zuerst — die Reihenfolge der Übersichtsseiten. */
export function compareByUpdatedAtDesc(
  a: { readonly updatedAt: IsoUtc },
  b: { readonly updatedAt: IsoUtc },
): number {
  return compareIso(b.updatedAt, a.updatedAt)
}

/** Älteste zuerst — die Reihenfolge eines Gesprächsverlaufs. */
export function compareByCreatedAtAsc(
  a: { readonly createdAt: IsoUtc },
  b: { readonly createdAt: IsoUtc },
): number {
  return compareIso(a.createdAt, b.createdAt)
}

/** Von Hand sortierbare Zeilen: Items, Zutaten, Zubereitungsschritte. */
export interface ManualOrder {
  readonly sortKey: string | null
  readonly orderIndex: number
  readonly createdAt: IsoUtc
}

/**
 * Reihenfolge einer manuell sortierbaren Liste: `sortKey`, dann
 * `orderIndex`, dann `createdAt`.
 *
 * Der Vergleich der Sortierschlüssel läuft über `<` und nicht über
 * `localeCompare`: Die Schlüssel sind Base-62-Bruchindizes, deren Ordnung
 * genau die Zeichenordnung ist. Eine sprachabhängige Kollation würde
 * Gross- und Kleinbuchstaben zusammenziehen und die Reihenfolge zerstören.
 *
 * Zeilen ohne Schlüssel kommen ans Ende: Sie wurden nie von Hand einsortiert
 * (oder der Schlüssel war ungültig und wurde bewusst als `null` gespeichert)
 * und werden über `orderIndex` geordnet.
 */
export function compareByManualOrder(a: ManualOrder, b: ManualOrder): number {
  if (a.sortKey !== null && b.sortKey !== null) {
    if (a.sortKey !== b.sortKey) {
      return a.sortKey < b.sortKey ? -1 : 1
    }
  }
  else if (a.sortKey !== b.sortKey) {
    return a.sortKey === null ? 1 : -1
  }

  if (a.orderIndex !== b.orderIndex) {
    return a.orderIndex - b.orderIndex
  }

  return compareIso(a.createdAt, b.createdAt)
}

/**
 * Hat jemand ANDERES diesen Eintrag geändert, seit die Liste zuletzt offen war?
 *
 * Die Bedingung an `modifiedBy` ist wortgleich `isRemoteAddition` in der
 * Listendetailansicht (und in Androids Detail.kt): ein Wert muss da sein UND
 * ein fremder. Lokale Einträge tragen entweder noch gar keinen (optimistisches
 * Anlegen) oder die eigene UUID. Ohne eigenes Konto gibt es keinen Abgleich und
 * damit keine Fremden — dann zählt nichts.
 *
 * `seenAt === null` heisst "noch nie geöffnet" und zählt deshalb alles Fremde.
 * Das ist der Fall einer gerade angenommenen Einladung: Da ist tatsächlich der
 * gesamte Inhalt neu.
 */
export function isUnseenForeignChange(
  item: { readonly modifiedBy: string | null, readonly updatedAt: IsoUtc },
  ownUserId: string | null,
  seenAt: IsoUtc | null,
): boolean {
  if (ownUserId === null) return false
  if (item.modifiedBy === null || item.modifiedBy === ownUserId) return false

  return seenAt === null || compareIso(item.updatedAt, seenAt) > 0
}

/**
 * Obergrenze der Historie je Parent (Liste oder Rezept) — Spiegel von
 * `HISTORY_MAX_PER_PARENT` in `api.shliste.app/src/routes/sync/history.ts`
 * und der Android-Regel (HistoryDao.trimEntries). Läuft der Client aus dem
 * Takt, gleicht der Server-Trim ihn beim nächsten Pull wieder an.
 */
export const HISTORY_MAX_PER_PARENT = 50

/**
 * Neueste zuerst; bei gleichem Zeitpunkt entscheidet die Id absteigend —
 * derselbe deterministische Tie-Breaker wie im Server-Trim
 * (`ORDER BY createdAt DESC, id DESC`). Nur so behalten Client und Server
 * beim Kappen dieselben 50 Einträge.
 */
export function compareHistoryNewestFirst(
  a: { readonly createdAt: IsoUtc, readonly id: string },
  b: { readonly createdAt: IsoUtc, readonly id: string },
): number {
  const byCreatedAt = compareIso(b.createdAt, a.createdAt)
  if (byCreatedAt !== 0) return byCreatedAt
  if (a.id === b.id) return 0
  return a.id < b.id ? 1 : -1
}

/* ------------------------------------------------------------------ *
 * Schreiben
 *
 * Die Upserts sind je Entität ausgeschrieben statt generisch: `idb` bindet
 * Storename und Wertetyp aneinander, ein generischer Helfer müsste diese
 * Bindung mit einem Cast aufbrechen. Lieber sieben kurze, geprüfte
 * Funktionen als ein cleverer Helfer ohne Typsicherheit.
 * ------------------------------------------------------------------ */

export async function upsertList(input: Draft<List>): Promise<ListRow> {
  const db = await getDb()
  // Lesen und Schreiben in EINER Transaktion: `seenAt` wird aus der
  // gelesenen Zeile bewahrt — ein `markListSeen` zwischen einem freien
  // get und put ginge sonst still verloren (dieselbe Begründung, aus der
  // markListSeen und putListRow transaktional gebaut sind).
  const tx = db.transaction('lists', 'readwrite')
  const previous = await tx.store.get(input.id)
  const changed = changedFields(previous, input)

  // Ein Schreibvorgang ohne inhaltliche Änderung würde die Zeile grundlos
  // schmutzig machen und einen Push auslösen.
  if (previous !== undefined && changed.length === 0) {
    await tx.done
    return previous
  }

  // `seenAt` ist rein lokal und steht nicht im Draft — ohne diese Zeile
  // würde jedes Umbenennen das Gesehen-Wasserzeichen der Liste verwerfen.
  const row: ListRow = { ...input, ...buildRowMeta(previous, changed, nowIso()), seenAt: previous?.seenAt ?? null }
  await tx.store.put(row)
  await tx.done
  return row
}

export async function upsertItem(input: Draft<ListItem>): Promise<ListItemRow> {
  const db = await getDb()
  const previous = await db.get('list_items', input.id)
  const changed = changedFields(previous, input)

  if (previous !== undefined && changed.length === 0) {
    return previous
  }

  const row: ListItemRow = { ...input, ...buildRowMeta(previous, changed, nowIso()) }
  await db.put('list_items', row)
  return row
}

export async function upsertRecipe(input: Draft<Recipe>): Promise<RecipeRow> {
  const db = await getDb()
  const previous = await db.get('recipes', input.id)
  const changed = changedFields(previous, input)

  if (previous !== undefined && changed.length === 0) {
    return previous
  }

  const row: RecipeRow = { ...input, ...buildRowMeta(previous, changed, nowIso()) }
  await db.put('recipes', row)
  return row
}

export async function upsertIngredient(input: Draft<RecipeIngredient>): Promise<RecipeIngredientRow> {
  const db = await getDb()
  const previous = await db.get('recipe_ingredients', input.id)
  const changed = changedFields(previous, input)

  if (previous !== undefined && changed.length === 0) {
    return previous
  }

  const row: RecipeIngredientRow = { ...input, ...buildRowMeta(previous, changed, nowIso()) }
  await db.put('recipe_ingredients', row)
  return row
}

export async function upsertStep(input: Draft<RecipeStep>): Promise<RecipeStepRow> {
  const db = await getDb()
  const previous = await db.get('recipe_steps', input.id)
  const changed = changedFields(previous, input)

  if (previous !== undefined && changed.length === 0) {
    return previous
  }

  const row: RecipeStepRow = { ...input, ...buildRowMeta(previous, changed, nowIso()) }
  await db.put('recipe_steps', row)
  return row
}

export async function upsertBadge(input: Draft<Badge>): Promise<BadgeRow> {
  const db = await getDb()
  const previous = await db.get('badges', input.id)
  const changed = changedFields(previous, input)

  if (previous !== undefined && changed.length === 0) {
    return previous
  }

  const row: BadgeRow = { ...input, ...buildRowMeta(previous, changed, nowIso()) }
  await db.put('badges', row)
  return row
}

/**
 * Chat-Nachrichten sind append-only: Sie haben weder `updatedAt` noch
 * `deletedAt` noch `fieldTimestamps`. Deshalb gibt es hier nichts zu
 * vergleichen und nichts zu mergen — die Nachricht wird geschrieben und
 * beim nächsten Push übertragen.
 */
export async function appendChatMessage(message: RecipeChatMessage): Promise<RecipeChatMessageRow> {
  const db = await getDb()
  const row: RecipeChatMessageRow = { ...message, dirty: DIRTY }
  await db.put('recipe_chat_messages', row)
  return row
}

/**
 * Zeichnet eine Löschung im Verlauf auf — append-only wie `appendChatMessage`.
 *
 * `description` und `snapshotJson` werden BEIM SCHREIBEN auf die Sync-Limits
 * gekappt, nicht erst beim Push: So zeigt die lokale Verlaufsansicht exakt
 * das, was später auf allen Geräten steht — derselbe Grund, aus dem Android
 * die gekappten Werte lokal zurückschreibt.
 *
 * Trimmt danach den Parent auf 50 Einträge, wie `HistoryRepository.logEntry`
 * in Android (dao.insert + dao.trimEntries).
 */
export async function appendHistoryEntry(entry: HistoryEntry): Promise<HistoryEntryRow> {
  const db = await getDb()
  const row: HistoryEntryRow = { ...sanitize('historyEntry', entry), dirty: DIRTY }
  await db.put('history_entries', row)
  await trimHistoryForParent(entry.parentId)
  return row
}

/**
 * Übernimmt einen gepullten Historien-Eintrag — nur, wenn seine Id lokal
 * unbekannt ist. Gepullte Einträge sind die Wahrheit des Servers und deshalb
 * sauber (`dirty = 0`).
 *
 * `add` statt `put`: schlägt bei vorhandener Id fehl und lässt insbesondere
 * das Dirty-Flag einer noch nicht gepushten eigenen Zeile in Ruhe — dieselbe
 * Begründung wie `applyChatMessage` im Pull, hier aber atomar statt
 * Lesen-dann-Schreiben.
 */
export async function putPulledHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = await getDb()
  try {
    await db.add('history_entries', { ...entry, dirty: CLEAN })
  }
  catch (error) {
    // ConstraintError: die Zeile gibt es schon — wegen der Cursor-Überlappung
    // des Pulls der Normalfall, kein Fehler.
    if (error instanceof DOMException && error.name === 'ConstraintError') return
    throw error
  }
}

/**
 * Behält je Parent die 50 neuesten Einträge — Spiegel des Server-Trims
 * (`trimHistoryEntries` in der API) und von `HistoryDao.trimEntries` in
 * Android. Alle Aktionsarten zählen mit, nicht nur Löschungen: Der Server
 * trimmt genauso, sonst hielten beide Seiten verschiedene 50 fest.
 */
export async function trimHistoryForParent(parentId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('history_entries', 'readwrite')
  const store = tx.objectStore('history_entries')

  const rows = await store.index('by-parentId').getAll(parentId)
  const excess = rows
    .sort(compareHistoryNewestFirst)
    .slice(HISTORY_MAX_PER_PARENT)
    // Dirty NIE lokal wegtrimmen: Liegt die eigene Uhr hinter den Stempeln
    // von 50 gepullten Peer-Einträgen, fiele sonst genau der eben
    // geschriebene, noch nie gepushte Eintrag dem Trim zum Opfer. Nach dem
    // Push ist die Zeile sauber und der nächste Trim darf sie räumen —
    // der Server hält die 50 ohnehin verbindlich.
    .filter(row => row.dirty === CLEAN)
  await Promise.all(excess.map(row => store.delete(row.id)))

  await tx.done
}

/**
 * Ersetzt die Mitglieder einer Liste durch den Stand des Servers.
 *
 * Ersetzen statt Zusammenführen, weil der Server hier die Quelle der Wahrheit
 * ist: Wer aus der Liste entfernt wurde, taucht in der Antwort schlicht nicht
 * mehr auf, und ein Zusammenführen würde ihn lokal am Leben halten.
 */
export async function replaceListMembers(listId: string, members: readonly ListMember[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('list_members', 'readwrite')
  const store = tx.objectStore('list_members')
  const stale = await store.index('by-listId').getAllKeys(listId)

  // Erst löschen, dann schreiben: IndexedDB arbeitet die Anfragen einer
  // Transaktion in Reihenfolge ab, verbliebene Mitglieder werden also
  // unmittelbar wieder angelegt.
  await Promise.all([
    ...stale.map(key => store.delete(key)),
    ...members.map(member => store.put(member)),
  ])

  await tx.done
}

/**
 * Löscht eine Liste samt Items, Mitgliedern und Verlauf wirklich.
 *
 * Der harte Weg ist hier richtig, obwohl sonst weich gelöscht wird: Diese
 * Funktion läuft, wenn der Server meldet, dass man nicht mehr Mitglied der
 * Liste ist. Ein Tombstone würde beim nächsten Push als Löschwunsch
 * hochgeladen und damit die Liste für alle verbliebenen Mitglieder
 * löschen — für Daten, die einem gar nicht mehr gehören.
 *
 * Der Verlauf fällt mit, aus demselben Grund wie die Mitglieder: Er enthält
 * Einträge ANDERER Mitglieder einer Liste, die dieses Konto nicht mehr sieht
 * — verwaiste Fremddaten haben hier nichts mehr verloren (Androids
 * Gegenstück ist `HistoryDao.deleteOrphanedEntries`).
 */
export async function hardDeleteList(listId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['lists', 'list_items', 'list_members', 'history_entries'], 'readwrite')
  const items = tx.objectStore('list_items')
  const members = tx.objectStore('list_members')
  const history = tx.objectStore('history_entries')

  const [itemKeys, memberKeys, historyKeys] = await Promise.all([
    items.index('by-listId').getAllKeys(listId),
    members.index('by-listId').getAllKeys(listId),
    history.index('by-parentId').getAllKeys(listId),
  ])

  await Promise.all([
    ...itemKeys.map(key => items.delete(key)),
    ...memberKeys.map(key => members.delete(key)),
    ...historyKeys.map(key => history.delete(key)),
    tx.objectStore('lists').delete(listId),
  ])

  await tx.done
}

/* ------------------------------------------------------------------ *
 * Lesen für die Oberfläche
 * ------------------------------------------------------------------ */

export async function getList(listId: string): Promise<ListRow | undefined> {
  const db = await getDb()
  return db.get('lists', listId)
}

/** Alle nicht gelöschten Listen, zuletzt geänderte zuerst. */
export async function getListsForView(): Promise<ListRow[]> {
  const db = await getDb()
  const rows = await db.getAll('lists')
  return rows.filter(row => row.deletedAt === null).sort(compareByUpdatedAtDesc)
}

/**
 * Die sichtbaren Items einer Liste in ihrer manuellen Reihenfolge.
 *
 * `removed` ist der zweite Löschmarker neben `deletedAt`: rausgeworfene Items
 * bleiben als Verlauf für die Vorschläge erhalten, gehören aber nicht in die
 * Ansicht.
 */
export async function getItemsForList(listId: string): Promise<ListItemRow[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('list_items', 'by-listId', listId)
  return rows
    .filter(row => row.deletedAt === null && !row.removed)
    .sort(compareByManualOrder)
}

/**
 * Eine einzelne Item-Zeile UNGEFILTERT — auch entfernte und gelöschte.
 *
 * Für das Rückgängig im Toast: Das muss die frische Zeile lesen (nicht den
 * eingefrorenen Klick-Snapshot), und die ist in diesem Moment per Definition
 * `removed` bzw. tombstoned — die gefilterten Ansichts-Getter finden sie nicht.
 */
export async function getItemRow(itemId: string): Promise<ListItemRow | undefined> {
  const db = await getDb()
  return db.get('list_items', itemId)
}

/** Rohzeile einer Zutat — Begründung siehe `getItemRow`. */
export async function getIngredientRow(ingredientId: string): Promise<RecipeIngredientRow | undefined> {
  const db = await getDb()
  return db.get('recipe_ingredients', ingredientId)
}

/** Rohzeile eines Schritts — Begründung siehe `getItemRow`. */
export async function getStepRow(stepId: string): Promise<RecipeStepRow | undefined> {
  const db = await getDb()
  return db.get('recipe_steps', stepId)
}

export async function getRecipe(recipeId: string): Promise<RecipeRow | undefined> {
  const db = await getDb()
  return db.get('recipes', recipeId)
}

/** Alle nicht gelöschten Rezepte, zuletzt geänderte zuerst. */
export async function getRecipesForView(): Promise<RecipeRow[]> {
  const db = await getDb()
  const rows = await db.getAll('recipes')
  return rows.filter(row => row.deletedAt === null).sort(compareByUpdatedAtDesc)
}

export async function getIngredientsForRecipe(recipeId: string): Promise<RecipeIngredientRow[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('recipe_ingredients', 'by-recipeId', recipeId)
  return rows.filter(row => row.deletedAt === null).sort(compareByManualOrder)
}

export async function getStepsForRecipe(recipeId: string): Promise<RecipeStepRow[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('recipe_steps', 'by-recipeId', recipeId)
  return rows.filter(row => row.deletedAt === null).sort(compareByManualOrder)
}

export async function getChatMessagesForRecipe(recipeId: string): Promise<RecipeChatMessageRow[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('recipe_chat_messages', 'by-recipeId', recipeId)
  return rows.sort(compareByCreatedAtAsc)
}

/**
 * Auszeichnung zu einem Rezept — auch eine gelöschte.
 *
 * Bewusst inklusive Gelöschter: Der Server erzwingt genau eine Auszeichnung
 * pro Rezept und Konto. Wer seine Badges zurückgesetzt hat, soll durch
 * erneutes Fertigkochen kein Duplikat erzeugen, das der Push dann verwirft.
 */
export async function getBadgeForRecipe(recipeId: string): Promise<BadgeRow | undefined> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('badges', 'by-recipeId', recipeId)
  return rows[0]
}

/** Alle nicht gelöschten Auszeichnungen, zuletzt verdiente zuerst. */
export async function getBadgesForView(): Promise<BadgeRow[]> {
  const db = await getDb()
  const rows = await db.getAll('badges')
  return rows
    .filter(row => row.deletedAt === null)
    .sort((a, b) => compareIso(b.earnedAt, a.earnedAt))
}

export async function getMembersForList(listId: string): Promise<ListMemberRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('list_members', 'by-listId', listId)
}

/**
 * Der Verlauf einer Liste oder eines Rezepts für die Anzeige: nur
 * Löschungen, neueste zuerst, höchstens 50 — dieselbe Auswahl wie Androids
 * HistorySheet (Filter auf actionType "deleted").
 *
 * Der Filter bleibt, obwohl es bisher nur Löschungen gibt: Ein künftiger
 * Server könnte weitere Aktionsarten liefern, und die dürfen hier nicht
 * ungefragt als "wiederherstellbar" erscheinen.
 */
export async function getHistoryForParent(parentId: string): Promise<HistoryEntryRow[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('history_entries', 'by-parentId', parentId)
  return rows
    .filter(row => row.actionType === 'deleted')
    .sort(compareHistoryNewestFirst)
    .slice(0, HISTORY_MAX_PER_PARENT)
}

/* ------------------------------------------------------------------ *
 * Gesehen-Wasserzeichen — rein lokal, nie gesynct
 * ------------------------------------------------------------------ */

/**
 * Merkt, dass die Liste jetzt gesehen wurde.
 *
 * Setzt bewusst WEDER `updatedAt` NOCH `dirty` noch einen Feld-Zeitstempel —
 * Hinschauen ist keine Bearbeitung. Deshalb direktes `put` statt `upsertList`:
 * Der Upsert würde die Zeile schmutzig machen und einen Push auslösen, für
 * eine Information, die den Server gar nichts angeht. Dasselbe Muster wie
 * `markListSeen` im ShlisteDao der Android-App.
 */
export async function markListSeen(listId: string): Promise<void> {
  const db = await getDb()

  // Lesen und Schreiben in EINER Transaktion: Läuft parallel ein Pull, darf
  // dieses Zurückschreiben dessen frische Zeile nicht mit der alten Kopie
  // überdecken — es soll ausschliesslich `seenAt` setzen.
  const tx = db.transaction('lists', 'readwrite')
  const store = tx.objectStore('lists')
  const row = await store.get(listId)
  if (row !== undefined) {
    await store.put({ ...row, seenAt: nowIso() })
  }

  await tx.done
}

/**
 * Zählt die Einträge dieser Liste, die jemand anderes geändert hat, seit sie
 * zuletzt geöffnet war — die Zahl auf der Karte der Übersicht.
 *
 * Entfernte (`removed`) und gelöschte Zeilen bleiben aussen vor: Ein Hinweis
 * auf etwas, das es nicht mehr gibt, führt nur in eine leere Ansicht
 * (dieselbe Regel wie `getUnseenForeignChanges` im ShlisteDao).
 */
export async function countUnseenForeignChanges(listId: string, ownUserId: string | null): Promise<number> {
  const db = await getDb()
  const [list, rows] = await Promise.all([
    db.get('lists', listId),
    db.getAllFromIndex('list_items', 'by-listId', listId),
  ])
  if (list === undefined || list.deletedAt !== null) return 0

  const seenAt = list.seenAt ?? null
  return rows
    .filter(row => row.deletedAt === null && !row.removed)
    .filter(row => isUnseenForeignChange(row, ownUserId, seenAt))
    .length
}

/* ------------------------------------------------------------------ *
 * Sync: was muss hoch?
 * ------------------------------------------------------------------ */

export async function getDirtyLists(): Promise<ListRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('lists', 'by-dirty', DIRTY)
}

export async function getDirtyItems(): Promise<ListItemRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('list_items', 'by-dirty', DIRTY)
}

export async function getDirtyRecipes(): Promise<RecipeRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('recipes', 'by-dirty', DIRTY)
}

export async function getDirtyIngredients(): Promise<RecipeIngredientRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('recipe_ingredients', 'by-dirty', DIRTY)
}

export async function getDirtySteps(): Promise<RecipeStepRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('recipe_steps', 'by-dirty', DIRTY)
}

export async function getDirtyBadges(): Promise<BadgeRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('badges', 'by-dirty', DIRTY)
}

export async function getDirtyChatMessages(): Promise<RecipeChatMessageRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('recipe_chat_messages', 'by-dirty', DIRTY)
}

export async function getDirtyHistoryEntries(): Promise<HistoryEntryRow[]> {
  const db = await getDb()
  return db.getAllFromIndex('history_entries', 'by-dirty', DIRTY)
}

/**
 * Gesamtzahl der noch nicht gepushten Zeilen für die Statusanzeige.
 *
 * Alle Zählungen laufen in einer gemeinsamen Lesetransaktion, damit die
 * Summe einen in sich stimmigen Stand zeigt und nicht Zeilen doppelt oder
 * gar nicht erfasst, die währenddessen geschrieben werden.
 */
export async function countDirty(): Promise<number> {
  const db = await getDb()
  const tx = db.transaction(DIRTY_STORES, 'readonly')
  const counts = await Promise.all(
    DIRTY_STORES.map(name => tx.objectStore(name).index('by-dirty').count(DIRTY)),
  )
  await tx.done

  return counts.reduce((sum, count) => sum + count, 0)
}

/** Hat die Liste selbst ungepushte Änderungen? (Items zählt `countDirtyItemsForList`.) */
export async function isDirtyList(listId: string): Promise<boolean> {
  const db = await getDb()
  const row = await db.get('lists', listId)
  return row?.dirty === DIRTY
}

export async function countDirtyItemsForList(listId: string): Promise<number> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('list_items', 'by-listId', listId)
  return rows.filter(row => row.dirty === DIRTY).length
}

/**
 * Wahr, wenn am Rezept selbst oder an seinen Zutaten, Schritten oder
 * Chat-Nachrichten etwas ungepusht ist.
 *
 * Auszeichnungen bleiben bewusst aussen vor: Sie hängen zwar an einem Rezept,
 * sind aber verdiente Erfolge und kein Bestandteil des Rezeptinhalts. Ihr
 * Zustand darf das Rezept nicht als "ungespeichert" erscheinen lassen.
 */
export async function isDirtyRecipeOrChildren(recipeId: string): Promise<boolean> {
  const db = await getDb()

  const recipe = await db.get('recipes', recipeId)
  if (recipe?.dirty === DIRTY) {
    return true
  }

  const tx = db.transaction(['recipe_ingredients', 'recipe_steps', 'recipe_chat_messages'], 'readonly')
  const [ingredients, steps, messages] = await Promise.all([
    tx.objectStore('recipe_ingredients').index('by-recipeId').getAll(recipeId),
    tx.objectStore('recipe_steps').index('by-recipeId').getAll(recipeId),
    tx.objectStore('recipe_chat_messages').index('by-recipeId').getAll(recipeId),
  ])
  await tx.done

  return ingredients.some(row => row.dirty === DIRTY)
    || steps.some(row => row.dirty === DIRTY)
    || messages.some(row => row.dirty === DIRTY)
}

/**
 * Nimmt das Push-Flag von den erfolgreich übertragenen Zeilen.
 *
 * `snapshotTime` ist der Zeitpunkt, zu dem die Nutzlast zusammengestellt
 * wurde. Nur Zeilen, die seitdem unverändert geblieben sind, werden sauber
 * gesetzt. Wer während des laufenden Pushs bearbeitet wurde, bleibt schmutzig
 * — sonst ginge genau diese Änderung verloren: Der Server bestätigt den alten
 * Stand, das Flag fiele weg, und die neue Fassung würde nie hochgeladen.
 */
export async function clearDirtyFlags(
  store: DirtyStoreName,
  ids: readonly string[],
  snapshotTime: IsoUtc,
): Promise<void> {
  if (ids.length === 0) {
    return
  }

  const db = await getDb()
  const tx = db.transaction(store, 'readwrite')
  const target = tx.objectStore(store)

  await Promise.all(ids.map(async (id) => {
    const row = await target.get(id)
    if (row === undefined) {
      return
    }

    if (!isAtOrBefore(snapshotStampOf(row), snapshotTime)) {
      return
    }

    await target.put({ ...row, dirty: CLEAN })
  }))

  await tx.done
}

/**
 * Nimmt das Push-Flag von allen lokal gelöschten Zeilen.
 *
 * NUR FÜR DIE KONFLIKTAUFLÖSUNG "ZUSAMMENFÜHREN". Der Fall: Auf diesem
 * Gerät wurde offline etwas gelöscht, auf dem Server liegt derselbe
 * Bestand noch. Ohne diesen Schritt ginge die Löschabsicht beim nächsten
 * Push hinaus, und das feldgenaue Last-Write-Wins würde `deletedAt`
 * verbreiten — der Nutzer wollte aber zusammenführen und nicht löschen.
 *
 * Ohne Zeitstempelprüfung, anders als `clearDirtyFlags`: Hier wird nichts
 * bestätigt, was der Server bereits hat, sondern eine Absicht verworfen. Die
 * Zeile bleibt liegen und kommt beim nächsten Pull in ihrem Serverzustand
 * zurück.
 */
export async function clearDirtyOnDeleted(): Promise<number> {
  const db = await getDb()
  const tx = db.transaction(DIRTY_STORES, 'readwrite')

  const cleared = await Promise.all(DIRTY_STORES.map(async (name) => {
    const store = tx.objectStore(name)
    const rows = await store.index('by-dirty').getAll(DIRTY)
    // `in` statt eines Zugriffs: Chat-Nachrichten und Historien-Einträge sind
    // anfügend und kennen gar kein `deletedAt`. Sie fallen damit von selbst
    // heraus, ohne dass die Liste der Stores hier ein zweites Mal gepflegt
    // werden muss.
    const deleted = rows.filter(row => 'deletedAt' in row && row.deletedAt !== null)
    await Promise.all(deleted.map(row => store.put({ ...row, dirty: CLEAN })))
    return deleted.length
  }))

  await tx.done
  return cleared.reduce((sum, count) => sum + count, 0)
}

/**
 * Löscht ALLE abgeglichenen Nutzdaten dieses Geräts.
 *
 * NUR FÜR DIE KONFLIKTAUFLÖSUNG "SERVER ÜBERNEHMEN". Danach ist lokal
 * nichts mehr da, was der folgende volle Pull nicht wieder herstellt.
 *
 * Ohne Grabsteine: Ein `deletedAt` würde beim nächsten Push als
 * Löschabsicht hinausgehen und die Daten auch auf dem Server und allen
 * anderen Geräten entfernen. Gemeint ist aber "dieses Gerät vergisst",
 * nicht "alle vergessen".
 *
 * `lastSyncedAt` fällt mit weg, damit der folgende Pull vollständig läuft
 * und nicht nur die Änderungen seit dem alten Wasserzeichen holt.
 */
export async function wipeSyncedData(): Promise<void> {
  const db = await getDb()
  const stores = [...DIRTY_STORES, 'list_members', 'sync_meta'] as const
  const tx = db.transaction(stores, 'readwrite')

  await Promise.all(DIRTY_STORES.map(name => tx.objectStore(name).clear()))
  await tx.objectStore('list_members').clear()
  // Der Rest von sync_meta bleibt: `lastSignedInUserId` gehört zum Konto und
  // nicht zu den Daten, und `hasMigrated` setzt der Aufrufer gleich neu.
  await tx.objectStore('sync_meta').delete('lastSyncedAt')

  await tx.done
}

/* ------------------------------------------------------------------ *
 * sync_meta — Key-Value
 * ------------------------------------------------------------------ */

async function readMeta<T>(key: SyncMetaKey, isValid: (value: unknown) => value is T): Promise<T | null> {
  const db = await getDb()
  const raw: unknown = await db.get('sync_meta', key)

  // Der Store ist zur Laufzeit untypisiert (eine ältere Version der App oder
  // ein manueller Eingriff kann alles hineinschreiben). Ein unerwarteter Wert
  // gilt als "nicht gesetzt" statt die Sync-Engine mit Unsinn zu füttern.
  return isValid(raw) ? raw : null
}

async function writeMeta<K extends SyncMetaKey>(key: K, value: SyncMetaMap[K] | null): Promise<void> {
  const db = await getDb()

  if (value === null) {
    await db.delete('sync_meta', key)
    return
  }

  await db.put('sync_meta', value, key)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** Wurden die lokalen Daten einmalig auf den Server geladen? */
export async function getHasMigrated(): Promise<boolean> {
  return (await readMeta('hasMigrated', isBoolean)) ?? false
}

export async function setHasMigrated(value: boolean): Promise<void> {
  await writeMeta('hasMigrated', value)
}

/** Wurden die localStorage-Dokumente der alten Fassung übernommen? */
export async function getLegacyImported(): Promise<boolean> {
  return (await readMeta('legacyImported', isBoolean)) ?? false
}

export async function setLegacyImported(value: boolean): Promise<void> {
  await writeMeta('legacyImported', value)
}

/**
 * Schreibt übernommene Altzeilen — ohne die üblichen Zeitstempel-Regeln.
 *
 * NICHT über `upsert*`: Die setzen `updatedAt` auf jetzt und stempeln jedes
 * geänderte Feld einzeln. Für eine Zeile aus dem Jahr davor wäre beides
 * falsch — sie soll ihren eigenen Zeitpunkt behalten. `dirty` steht trotzdem
 * auf 1, denn der Server kennt diese Zeilen noch nicht.
 *
 * `add` statt `put`: Eine bereits vorhandene Zeile wird nicht überschrieben.
 * Der Import ist damit auch dann harmlos, wenn er ein zweites Mal liefe.
 */
export async function insertLegacyRows(rows: {
  lists: readonly List[]
  items: readonly ListItem[]
  recipes: readonly Recipe[]
  ingredients: readonly RecipeIngredient[]
  steps: readonly RecipeStep[]
}): Promise<number> {
  const db = await getDb()
  const tx = db.transaction(['lists', 'list_items', 'recipes', 'recipe_ingredients', 'recipe_steps'], 'readwrite')

  let written = 0
  const write = async (store: 'lists' | 'list_items' | 'recipes' | 'recipe_ingredients' | 'recipe_steps', row: object): Promise<void> => {
    try {
      // @ts-expect-error — der Storename ist zur Laufzeit gebunden; die
      // Typbindung von `idb` lässt sich hier nur mit fünf gleichlautenden
      // Zweigen erhalten, und die wären keine Verbesserung.
      await tx.objectStore(store).add({ ...row, dirty: DIRTY })
      written += 1
    }
    catch {
      // ConstraintError: die Zeile gibt es schon. Kein Fehler, sondern der
      // Normalfall eines zweiten Laufs.
    }
  }

  for (const row of rows.lists) await write('lists', row)
  for (const row of rows.items) await write('list_items', row)
  for (const row of rows.recipes) await write('recipes', row)
  for (const row of rows.ingredients) await write('recipe_ingredients', row)
  for (const row of rows.steps) await write('recipe_steps', row)

  await tx.done
  return written
}

/** Ende des letzten erfolgreichen Abgleichs, `null` wenn noch nie. */
export async function getLastSyncedAt(): Promise<IsoUtc | null> {
  return readMeta('lastSyncedAt', isIsoUtc)
}

export async function setLastSyncedAt(value: IsoUtc): Promise<void> {
  await writeMeta('lastSyncedAt', value)
}

/** Wer war zuletzt angemeldet? `null` heisst "noch nie" oder "abgemeldet". */
export async function getLastSignedInUserId(): Promise<string | null> {
  return readMeta('lastSignedInUserId', isNonEmptyString)
}

export async function setLastSignedInUserId(value: string | null): Promise<void> {
  await writeMeta('lastSignedInUserId', value)
}

/** Cursor des Event-Streams, `null` wenn noch kein Ereignis empfangen wurde. */
export async function getLastEventId(): Promise<string | null> {
  return readMeta('lastEventId', isNonEmptyString)
}

export async function setLastEventId(value: string | null): Promise<void> {
  await writeMeta('lastEventId', value)
}

// ---------------------------------------------------------------------------
// Rohzugriff für den Abgleich
//
// Die Funktionen oben sind für den Betrieb der App gedacht: `upsert*` setzt
// `dirty = 1` und stempelt `updatedAt` auf jetzt, die Lesefunktionen blenden
// Tombstones aus. Für den Abgleich ist beides falsch — eine Zeile vom Server
// ist nicht schmutzig, und das Zusammenführen braucht die Tombstones, weil es
// sonst eine Löschung nicht von "gibt es nicht" unterscheiden kann.
//
// Deshalb hier ein zweiter, roher Satz. Er liegt bewusst trotzdem in dieser
// Datei: Jeder Datenbankzugriff der App gehört an genau einen Ort, sonst muss
// bei einer Schemaänderung an mehreren Stellen gesucht werden.
//
// Ausgeschrieben statt generisch, weil `idb` Storename und Wertetyp aneinander
// bindet — ein gemeinsamer Helfer bräuchte einen Cast und damit genau die
// Typlöcher, die diese Schicht vermeiden soll.
// ---------------------------------------------------------------------------

export async function readListRow(id: string): Promise<ListRow | undefined> {
  return (await getDb()).get('lists', id)
}

/**
 * ABWEICHUNG VOM MUSTER DER ÜBRIGEN `put*Row`: bewahrt das lokale
 * Gesehen-Wasserzeichen. Der Pull baut seine Zeile vollständig aus der
 * Serverantwort (`applyList` in `app/sync/engine/pull.ts`) und kennt `seenAt`
 * nicht — ohne diese Zeile würde jeder Abgleich die Liste wieder als "nie
 * gesehen" markieren und die Übersicht mit falschen Hinweisen fluten.
 */
export async function putListRow(row: ListRow): Promise<void> {
  const db = await getDb()

  // Lesen und Schreiben in EINER Transaktion, damit ein gleichzeitiges
  // `markListSeen` nicht zwischen die beiden Schritte fallen und sein
  // frisches Wasserzeichen verlieren kann.
  const tx = db.transaction('lists', 'readwrite')
  const store = tx.objectStore('lists')
  const previous = await store.get(row.id)
  await store.put({ ...row, seenAt: row.seenAt ?? previous?.seenAt ?? null })

  await tx.done
}

export async function readItemRow(id: string): Promise<ListItemRow | undefined> {
  return (await getDb()).get('list_items', id)
}

export async function putItemRow(row: ListItemRow): Promise<void> {
  await (await getDb()).put('list_items', row)
}

export async function readRecipeRow(id: string): Promise<RecipeRow | undefined> {
  return (await getDb()).get('recipes', id)
}

export async function putRecipeRow(row: RecipeRow): Promise<void> {
  await (await getDb()).put('recipes', row)
}

export async function readIngredientRow(id: string): Promise<RecipeIngredientRow | undefined> {
  return (await getDb()).get('recipe_ingredients', id)
}

export async function putIngredientRow(row: RecipeIngredientRow): Promise<void> {
  await (await getDb()).put('recipe_ingredients', row)
}

export async function readStepRow(id: string): Promise<RecipeStepRow | undefined> {
  return (await getDb()).get('recipe_steps', id)
}

export async function putStepRow(row: RecipeStepRow): Promise<void> {
  await (await getDb()).put('recipe_steps', row)
}

export async function readBadgeRow(id: string): Promise<BadgeRow | undefined> {
  return (await getDb()).get('badges', id)
}

export async function putBadgeRow(row: BadgeRow): Promise<void> {
  await (await getDb()).put('badges', row)
}

export async function readChatMessageRow(id: string): Promise<RecipeChatMessageRow | undefined> {
  return (await getDb()).get('recipe_chat_messages', id)
}

export async function putChatMessageRow(row: RecipeChatMessageRow): Promise<void> {
  await (await getDb()).put('recipe_chat_messages', row)
}

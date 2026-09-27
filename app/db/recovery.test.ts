/**
 * Die Waisenrettung gegen eine echte IndexedDB im Arbeitsspeicher: sichern,
 * markieren, einordnen. Gegenstück zu `OrphanRecoveryTest` der Android-App.
 * Die Regeln selbst prüft `orphan-policy.test.ts`, hier geht es um die
 * Transaktionen und darum, dass keine Zeile ohne Kopie verschwindet.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { IDBPDatabase } from 'idb'
import type { SyncRowRef } from '../sync/recovery/orphan-policy'
import { RESTORED_RETENTION_MS, secureAndRequeueOrphans, settleRecoveries } from './recovery'
import { CLEAN, DIRTY, type ShlisteDb } from './schema'
import { installInMemoryIndexedDb, openFreshDb } from './testing/in-memory-db'
import {
  badgeRow,
  chatMessageRow,
  historyRow,
  ingredientRow,
  itemRow,
  listRow,
  OLD,
  recipeRow,
  stepRow,
} from './testing/rows'

const NOW = Date.parse('2026-09-27T12:00:00.000Z')

const NOTHING_REJECTED = { lists: [], listItems: [], recipes: [], recipeIngredients: [], recipeSteps: [], badges: [] }

/** Was der volle Abruf geliefert hat: nur die bekannte Liste mit ihrem Eintrag. */
const SERVER = { LIST: new Set(['known']), ITEM: new Set(['known-item']) }

const ORPHANS: SyncRowRef[] = [{ table: 'LIST', id: 'orphan' }, { table: 'ITEM', id: 'orphan-item' }]

let restore: () => void
let db: IDBPDatabase<ShlisteDb>

beforeAll(() => {
  restore = installInMemoryIndexedDb()
})

afterAll(() => {
  restore()
})

afterEach(() => {
  db.close()
})

beforeEach(async () => {
  db = await openFreshDb()
  await db.put('lists', listRow('known', { name: 'Wohnung' }))
  await db.put('lists', listRow('orphan', { name: 'Alt' }))
  await db.put('list_items', itemRow('known-item', 'known', { name: 'Tisch' }))
  await db.put('list_items', itemRow('orphan-item', 'orphan', { name: 'Lampe' }))
  await db.put('list_items', itemRow('pending-item', 'known', { name: 'Neu', dirty: DIRTY }))
})

async function statusOf(table: string, rowId: string): Promise<string | undefined> {
  return (await db.get('sync_recovery', [table, rowId]))?.status
}

describe('secureAndRequeueOrphans', () => {
  test('Waisen werden kopiert und zum Hochladen markiert, sonst wird nichts angefasst', async () => {
    const orphans = await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    expect(orphans).toEqual(ORPHANS)
    expect((await db.get('lists', 'orphan'))?.dirty).toBe(DIRTY)
    expect((await db.get('list_items', 'orphan-item'))?.dirty).toBe(DIRTY)
    expect((await db.get('lists', 'known'))?.dirty).toBe(CLEAN)
    expect((await db.get('list_items', 'known-item'))?.dirty).toBe(CLEAN)

    const copy = await db.get('sync_recovery', ['ITEM', 'orphan-item'])
    expect(copy?.status).toBe('PENDING')
    expect(copy?.detectedAt).toBe(NOW)
    expect(copy?.settledAt).toBeNull()
    expect(copy?.serverHash).toBe('abc')
    // Die Kopie ist die ganze Zeile, samt Feldstempeln, im Stand VOR der Markierung.
    expect(copy?.payload).toEqual(itemRow('orphan-item', 'orphan', { name: 'Lampe' }))
    expect((await db.getAll('sync_recovery')).length).toBe(2)
  })

  test('die Markierung ändert weder Inhalt noch Zeitstempel', async () => {
    // Sonst ginge die Zeile mit einem Stand hinaus, den niemand geschrieben
    // hat, und ein verschobenes `updatedAt` kippte Entscheidungen im Merge.
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    expect(await db.get('lists', 'orphan')).toEqual(listRow('orphan', { name: 'Alt', dirty: DIRTY }))
    const item = await db.get('list_items', 'orphan-item')
    expect(item?.updatedAt).toBe(OLD)
    expect(item?.fieldTimestamps).toEqual({ name: OLD })
  })

  test('ein zweiter Lauf lädt dieselbe Zeile nie wieder hoch', async () => {
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)
    // Der Push hat die Flags wieder gelöscht, dem Server fehlt die Zeile weiter.
    await db.put('lists', listRow('orphan', { name: 'Alt' }))
    await db.put('list_items', itemRow('orphan-item', 'orphan', { name: 'Lampe' }))

    expect(await secureAndRequeueOrphans(db, SERVER, 'abc', NOW + 1)).toEqual([])
    expect((await db.get('lists', 'orphan'))?.dirty).toBe(CLEAN)
  })

  test('nur Zeilen im Umfang des Hashes zählen', async () => {
    // Gelöschte Zeilen und Einträge gelöschter Listen stehen nicht im Hash
    // und können deshalb keine Abweichung erzeugen. Schmutzige Zeilen gehen
    // ohnehin mit dem nächsten Push hinaus.
    await db.put('lists', listRow('gone', { deletedAt: OLD }))
    await db.put('list_items', itemRow('in-gone', 'gone'))
    await db.put('list_items', itemRow('deleted-item', 'known', { deletedAt: OLD }))
    await db.put('recipes', recipeRow('r-dirty', { dirty: DIRTY }))
    // Zutaten eines gelöschten Rezepts zählen dagegen mit, wie beim Server.
    await db.put('recipes', recipeRow('r-gone', { deletedAt: OLD }))
    await db.put('recipe_ingredients', ingredientRow('g1', 'r-gone'))

    const orphans = await secureAndRequeueOrphans(db, SERVER, null, NOW)

    expect(orphans).toEqual([...ORPHANS, { table: 'INGREDIENT', id: 'g1' }])
  })

  test('alle sechs Tabellen, Eltern vor Kindern', async () => {
    await db.put('recipes', recipeRow('r1'))
    await db.put('recipe_ingredients', ingredientRow('g1', 'r1'))
    await db.put('recipe_steps', stepRow('s1', 'r1'))
    await db.put('badges', badgeRow('b1', 'r1'))

    const orphans = await secureAndRequeueOrphans(db, SERVER, null, NOW)

    expect(orphans.map(ref => ref.table)).toEqual(['LIST', 'ITEM', 'RECIPE', 'INGREDIENT', 'STEP', 'BADGE'])
    expect((await db.get('badges', 'b1'))?.dirty).toBe(DIRTY)
    expect(await statusOf('STEP', 's1')).toBe('PENDING')
  })

  test('gerettete Kopien fallen nach 30 Tagen weg, Quarantäne bleibt', async () => {
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)
    await settleRecoveries(db, ORPHANS, { ...NOTHING_REJECTED, listItems: ['orphan-item'] }, NOW)
    expect(await statusOf('LIST', 'orphan')).toBe('RESTORED')
    expect(await statusOf('ITEM', 'orphan-item')).toBe('QUARANTINED')

    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW + RESTORED_RETENTION_MS)
    expect(await statusOf('LIST', 'orphan')).toBe('RESTORED')

    await secureAndRequeueOrphans(db, { ...SERVER, LIST: new Set(['known', 'orphan']) }, 'abc', NOW + RESTORED_RETENTION_MS + 1)
    expect(await statusOf('LIST', 'orphan')).toBeUndefined()
    expect(await statusOf('ITEM', 'orphan-item')).toBe('QUARANTINED')
  })
})

describe('settleRecoveries', () => {
  test('Abgelehntes verschwindet lokal, die Kopie bleibt in Quarantäne', async () => {
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    const result = await settleRecoveries(db, ORPHANS, { ...NOTHING_REJECTED, lists: ['orphan'], listItems: ['orphan-item'] }, NOW + 5)

    // Eine Menge: Die Reihenfolge ist die des Schlüssels in `sync_recovery`.
    expect(result?.quarantined).toHaveLength(2)
    expect(result?.quarantined).toEqual(expect.arrayContaining(ORPHANS))
    expect(await db.get('lists', 'orphan')).toBeUndefined()
    expect(await db.get('list_items', 'orphan-item')).toBeUndefined()
    const copy = await db.get('sync_recovery', ['ITEM', 'orphan-item'])
    expect(copy?.status).toBe('QUARANTINED')
    expect(copy?.settledAt).toBe(NOW + 5)
    expect(copy?.payload.id).toBe('orphan-item')
    expect(await statusOf('LIST', 'orphan')).toBe('QUARANTINED')
    // Alles andere bleibt.
    expect(await db.get('lists', 'known')).toBeDefined()
    expect((await db.get('list_items', 'pending-item'))?.dirty).toBe(DIRTY)
  })

  test('Angenommenes bleibt und gilt als gerettet', async () => {
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    await settleRecoveries(db, ORPHANS, NOTHING_REJECTED, NOW + 5)

    expect((await db.get('lists', 'orphan'))?.name).toBe('Alt')
    expect(await statusOf('LIST', 'orphan')).toBe('RESTORED')
    expect(await statusOf('ITEM', 'orphan-item')).toBe('RESTORED')
    expect((await db.get('sync_recovery', ['LIST', 'orphan']))?.settledAt).toBe(NOW + 5)
  })

  test('ein Eintrag, der nach der Erkennung dazukam, wird vor dem Entfernen gesichert', async () => {
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)
    // Zwischen Erkennung und Push legt jemand einen Eintrag in der Waisenliste an.
    await db.put('list_items', itemRow('late-item', 'orphan', { name: 'Kissen', dirty: DIRTY }))

    await settleRecoveries(db, ORPHANS, { ...NOTHING_REJECTED, lists: ['orphan'], listItems: ['orphan-item', 'late-item'] }, NOW + 5)

    expect(await db.get('list_items', 'late-item')).toBeUndefined()
    const copy = await db.get('sync_recovery', ['ITEM', 'late-item'])
    expect(copy?.status).toBe('QUARANTINED')
    expect(copy?.payload).toEqual(itemRow('late-item', 'orphan', { name: 'Kissen', dirty: DIRTY }))
  })

  test('das Kind einer abgelehnten Liste wird mit seinem AKTUELLEN Stand gesichert', async () => {
    // REPLACE: Die Kopie aus der Erkennung ist veraltet, wenn der Eintrag
    // danach noch bearbeitet wurde. Es zählt, was gleich verschwindet.
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)
    await db.put('list_items', itemRow('orphan-item', 'orphan', { name: 'Stehlampe', dirty: DIRTY }))

    await settleRecoveries(db, ORPHANS, { ...NOTHING_REJECTED, lists: ['orphan'], listItems: ['orphan-item'] }, NOW + 5)

    const copy = await db.get('sync_recovery', ['ITEM', 'orphan-item'])
    expect(copy?.payload).toEqual(itemRow('orphan-item', 'orphan', { name: 'Stehlampe', dirty: DIRTY }))
    expect(copy?.status).toBe('QUARANTINED')
  })

  test('eine abgelehnte Liste nimmt ihre Mitglieder mit, wie die Kaskade in Android', async () => {
    await db.put('list_members', {
      listId: 'orphan',
      userId: 'u2',
      email: null,
      displayName: null,
      photoUrl: null,
      role: 'member',
      status: 'accepted',
    })
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    await settleRecoveries(db, ORPHANS, { ...NOTHING_REJECTED, lists: ['orphan'], listItems: ['orphan-item'] }, NOW + 5)

    expect(await db.getAll('list_members')).toEqual([])
  })

  test('der Verlauf einer abgelehnten Liste geht mit, als Kopie gesichert', async () => {
    // Offen (dirty): Bliebe er liegen, ginge er bei jedem Push hinaus und
    // würde jedes Mal abgelehnt.
    await db.put('history_entries', historyRow('h1', 'orphan', { dirty: 1 }))
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    await settleRecoveries(db, ORPHANS, { ...NOTHING_REJECTED, lists: ['orphan'], listItems: ['orphan-item'] }, NOW + 5)

    expect(await db.getAll('history_entries')).toEqual([])
    const copy = await db.get('sync_recovery', ['HISTORY', 'h1'])
    expect(copy?.payload).toEqual(historyRow('h1', 'orphan', { dirty: 1 }))
    expect(copy?.status).toBe('QUARANTINED')
  })

  test('ein abgelehntes Rezept sichert Zutaten, Schritte und Chat vor dem Entfernen', async () => {
    await db.put('recipes', recipeRow('r1', { name: 'Suppe' }))
    await db.put('recipe_ingredients', ingredientRow('g1', 'r1'))
    await db.put('recipe_steps', stepRow('s1', 'r1'))
    await db.put('recipe_chat_messages', chatMessageRow('c1', 'r1', { content: 'Wie lange kochen?' }))
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    const pushed: SyncRowRef[] = [{ table: 'RECIPE', id: 'r1' }, { table: 'INGREDIENT', id: 'g1' }, { table: 'STEP', id: 's1' }]
    await settleRecoveries(db, pushed, { ...NOTHING_REJECTED, recipes: ['r1'], recipeIngredients: ['g1'], recipeSteps: ['s1'] }, NOW + 5)

    expect(await db.get('recipes', 'r1')).toBeUndefined()
    expect(await db.getAll('recipe_ingredients')).toEqual([])
    expect(await db.getAll('recipe_steps')).toEqual([])
    expect(await db.getAll('recipe_chat_messages')).toEqual([])
    expect((await db.get('sync_recovery', ['CHAT_MESSAGE', 'c1']))?.payload).toEqual(
      chatMessageRow('c1', 'r1', { content: 'Wie lange kochen?' }),
    )
    expect(await statusOf('RECIPE', 'r1')).toBe('QUARANTINED')
    expect(await statusOf('INGREDIENT', 'g1')).toBe('QUARANTINED')
    expect(await statusOf('STEP', 's1')).toBe('QUARANTINED')
  })

  test('eine offene Rettung, die nicht in diesem Push war, bleibt offen', async () => {
    await secureAndRequeueOrphans(db, SERVER, 'abc', NOW)

    expect(await settleRecoveries(db, [], { ...NOTHING_REJECTED, lists: ['orphan'] }, NOW + 5)).toBeNull()

    expect(await statusOf('LIST', 'orphan')).toBe('PENDING')
    expect(await db.get('lists', 'orphan')).toBeDefined()
  })

  test('ohne offene Rettung passiert nichts', async () => {
    expect(await settleRecoveries(db, ORPHANS, { ...NOTHING_REJECTED, lists: ['orphan'] }, NOW)).toBeNull()
    expect(await db.get('lists', 'orphan')).toBeDefined()
  })
})

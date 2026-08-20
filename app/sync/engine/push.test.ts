/**
 * Der Vertrag des Pushs.
 *
 * Schwerpunkt ist die Blockbildung: Sie ist die Stelle, an der ein Fehler
 * still bleibt. Landet ein Kind vor seinem Elternteil, verwirft der Server es
 * (`skipped.listItems++`), antwortet trotzdem mit 200, und der Client löscht
 * anschliessend die Dirty-Flags — die Zeile ist dann dauerhaft weg, ohne dass
 * irgendwo ein Fehler auftaucht. Deshalb prüft jeder Blocktest zusätzlich die
 * drei Grundeigenschaften über `expectSoundBlocks`: Grenzen eingehalten,
 * nichts verloren, nichts doppelt.
 */
import { describe, expect, test } from 'bun:test'
import type { IsoUtc } from '../../../shared/types/domain'
import type {
  BadgeRow,
  ListItemRow,
  ListRow,
  RecipeChatMessageRow,
  RecipeIngredientRow,
  RecipeRow,
  RecipeStepRow,
} from '../../db/schema'
import { CLEAN, DIRTY } from '../../db/schema'
import { compareIso, nowIso } from '../../db/timestamps'
import type { DirtyRows, EntityStore, PushStore, RowStores } from './ports'
import {
  PUSH_BLOCK_LIMITS,
  buildPushPayload,
  countRows,
  emptyPayload,
  fitsInOneBlock,
  keptIds,
  parseMigrateResponse,
  parsePushResponse,
  runPush,
  splitIntoBlocks,
  type PushBadge,
  type PushList,
  type PushListItem,
  type PushPayload,
  type PushRecipe,
  type PushRecipeIngredient,
  type PushRecipeStep,
} from './push'

const TS: IsoUtc = '2026-01-15T10:00:00.000Z'
const FUTURE: IsoUtc = '2099-01-01T00:00:00.000Z'

/* ------------------------------------------------------------------ *
 * Bausteine
 * ------------------------------------------------------------------ */

function list(id: string): PushList {
  return {
    id,
    name: id,
    color: '#abcdef',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    createdAt: TS,
    updatedAt: TS,
    deletedAt: null,
    fieldTimestamps: null,
  }
}

function item(id: string, listId: string): PushListItem {
  return {
    id,
    listId,
    name: id,
    quantity: 1,
    checked: false,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    createdAt: TS,
    updatedAt: TS,
    deletedAt: null,
    fieldTimestamps: null,
    createdBy: null,
    modifiedBy: null,
  }
}

function recipe(id: string): PushRecipe {
  return {
    id,
    name: id,
    color: '#abcdef',
    sourceUrl: null,
    imagePath: null,
    createdAt: TS,
    updatedAt: TS,
    deletedAt: null,
    fieldTimestamps: null,
  }
}

function ingredient(id: string, recipeId: string): PushRecipeIngredient {
  return {
    id,
    recipeId,
    name: id,
    quantity: 1,
    orderIndex: 0,
    sortKey: null,
    createdAt: TS,
    updatedAt: TS,
    deletedAt: null,
    fieldTimestamps: null,
    createdBy: null,
    modifiedBy: null,
  }
}

function step(id: string, recipeId: string): PushRecipeStep {
  return {
    id,
    recipeId,
    description: id,
    orderIndex: 0,
    sortKey: null,
    isChecked: false,
    aiExplanation: null,
    createdAt: TS,
    updatedAt: TS,
    deletedAt: null,
    fieldTimestamps: null,
    createdBy: null,
    modifiedBy: null,
  }
}

function badge(id: string, recipeId: string): PushBadge {
  return {
    id,
    recipeId,
    recipeName: id,
    recipeImagePath: null,
    recipeColor: '#abcdef',
    earnedAt: TS,
    createdAt: TS,
    updatedAt: TS,
    deletedAt: null,
    fieldTimestamps: null,
  }
}

function payload(parts: Partial<PushPayload>): PushPayload {
  return { ...emptyPayload(), ...parts }
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}

/* ------------------------------------------------------------------ *
 * Prüfhilfen
 * ------------------------------------------------------------------ */

/** Alle Ids eines Typs über alle Blöcke, in Blockreihenfolge. */
function idsOf(blocks: readonly PushPayload[], pick: (block: PushPayload) => { id: string }[]): string[] {
  return blocks.flatMap(block => pick(block).map(row => row.id))
}

/** Zu jeder Id die Nummer des Blocks, in dem sie liegt. */
function blockIndexOf(
  blocks: readonly PushPayload[],
  pick: (block: PushPayload) => { id: string }[],
): Map<string, number> {
  const index = new Map<string, number>()
  blocks.forEach((block, position) => {
    for (const row of pick(block)) index.set(row.id, position)
  })
  return index
}

/**
 * Die drei Grundeigenschaften jeder Aufteilung: Grenzen eingehalten, nichts
 * verloren, nichts doppelt.
 */
function expectSoundBlocks(original: PushPayload, blocks: readonly PushPayload[]): void {
  for (const block of blocks) {
    expect(fitsInOneBlock(block)).toBe(true)
  }

  expect(blocks.reduce((sum, block) => sum + countRows(block), 0)).toBe(countRows(original))

  const picks: ((block: PushPayload) => { id: string }[])[] = [
    block => block.lists,
    block => block.listItems,
    block => block.recipes,
    block => block.recipeIngredients,
    block => block.recipeSteps,
    block => block.recipeChatMessages,
    block => block.badges,
  ]

  for (const pick of picks) {
    const ids = idsOf(blocks, pick)
    expect([...new Set(ids)]).toHaveLength(ids.length)
    expect([...ids].sort()).toEqual([...pick(original).map(row => row.id)].sort())
  }
}

/* ------------------------------------------------------------------ *
 * Blockbildung
 * ------------------------------------------------------------------ */

describe('splitIntoBlocks', () => {
  test('eine leere Nutzlast bleibt genau ein Block', () => {
    // Der Import braucht eine Antwort des Servers, also mindestens eine Anfrage.
    const empty = emptyPayload()
    expect(splitIntoBlocks(empty)).toEqual([empty])
  })

  test('eine kleine Nutzlast wird nicht angefasst', () => {
    const original = payload({
      lists: [list('l1')],
      listItems: [item('i1', 'l1'), item('i2', 'l1')],
      recipes: [recipe('r1')],
      recipeIngredients: [ingredient('z1', 'r1')],
      recipeSteps: [step('s1', 'r1')],
      badges: [badge('b1', 'r1')],
    })

    const blocks = splitIntoBlocks(original)

    expect(blocks).toHaveLength(1)
    // Der häufigste Fall kopiert nichts — dieselbe Referenz.
    expect(blocks[0]).toBe(original)
  })

  test('eine Nutzlast genau auf allen Grenzen bleibt ein Block', () => {
    const original = payload({
      lists: range(PUSH_BLOCK_LIMITS.lists).map(index => list(`l${index}`)),
      listItems: range(PUSH_BLOCK_LIMITS.listItems).map(index => item(`i${index}`, 'l0')),
      badges: range(PUSH_BLOCK_LIMITS.badges).map(index => badge(`b${index}`, 'fremd')),
    })

    expect(splitIntoBlocks(original)).toHaveLength(1)
  })

  test('eine Liste und ihre Items landen im selben Block', () => {
    // 600 Listen sprengen die Grenze, jede Gruppe für sich passt aber locker.
    const lists = range(600).map(index => list(`l${index}`))
    const listItems = lists.flatMap(row => range(5).map(index => item(`${row.id}-i${index}`, row.id)))
    const original = payload({ lists, listItems })

    const blocks = splitIntoBlocks(original)

    expect(blocks.length).toBeGreaterThan(1)
    expectSoundBlocks(original, blocks)

    const listBlock = blockIndexOf(blocks, block => block.lists)
    const itemBlock = blockIndexOf(blocks, block => block.listItems)
    for (const row of listItems) {
      expect(itemBlock.get(row.id)).toBe(listBlock.get(row.listId))
    }
  })

  test('kein Kind liegt in einem früheren Block als sein Elternteil', () => {
    // Eine Liste mit mehr Items, als ein Block fasst: Das Elternteil kommt in
    // den ersten Block, die Kinder laufen in die folgenden weiter.
    const lists = [list('gross'), list('klein')]
    const listItems = [
      ...range(PUSH_BLOCK_LIMITS.listItems + 250).map(index => item(`g${index}`, 'gross')),
      ...range(3).map(index => item(`k${index}`, 'klein')),
    ]
    const original = payload({ lists, listItems })

    const blocks = splitIntoBlocks(original)

    expect(blocks.length).toBeGreaterThan(1)
    expectSoundBlocks(original, blocks)

    const listBlock = blockIndexOf(blocks, block => block.lists)
    const itemBlock = blockIndexOf(blocks, block => block.listItems)
    for (const row of listItems) {
      const parent = listBlock.get(row.listId) ?? -1
      expect((itemBlock.get(row.id) ?? -1) >= parent).toBe(true)
    }
  })

  test('ein Rezept liegt nie nach seinen Zutaten, Schritten oder Auszeichnungen', () => {
    const recipes = range(600).map(index => recipe(`r${index}`))
    const recipeIngredients = recipes.flatMap(row => range(4).map(index => ingredient(`${row.id}-z${index}`, row.id)))
    const recipeSteps = recipes.flatMap(row => range(3).map(index => step(`${row.id}-s${index}`, row.id)))
    const badges = recipes.map(row => badge(`${row.id}-b`, row.id))
    const original = payload({ recipes, recipeIngredients, recipeSteps, badges })

    const blocks = splitIntoBlocks(original)

    expect(blocks.length).toBeGreaterThan(1)
    expectSoundBlocks(original, blocks)

    const recipeBlock = blockIndexOf(blocks, block => block.recipes)
    const children: [{ id: string, recipeId: string }[], (block: PushPayload) => { id: string }[]][] = [
      [recipeIngredients, block => block.recipeIngredients],
      [recipeSteps, block => block.recipeSteps],
      [badges, block => block.badges],
    ]

    for (const [rows, pick] of children) {
      const childBlock = blockIndexOf(blocks, pick)
      for (const row of rows) {
        expect((childBlock.get(row.id) ?? -1) >= (recipeBlock.get(row.recipeId) ?? -1)).toBe(true)
      }
    }
  })

  test('Kinder ohne Elternteil in der Nutzlast dürfen überall hin', () => {
    // Das Elternteil liegt bereits auf dem Server — wäre es lokal geändert
    // worden, wäre es schmutzig und mit in der Nutzlast.
    const original = payload({
      lists: range(600).map(index => list(`l${index}`)),
      listItems: range(20).map(index => item(`waise${index}`, 'nicht-im-payload')),
    })

    const blocks = splitIntoBlocks(original)

    expect(blocks.length).toBeGreaterThan(1)
    expectSoundBlocks(original, blocks)
  })

  test('ein Elternteil mit zu vielen Kindern wird gemeldet', () => {
    const notices: string[] = []
    const original = payload({
      lists: [list('gross'), ...range(600).map(index => list(`l${index}`))],
      listItems: range(PUSH_BLOCK_LIMITS.listItems + 1).map(index => item(`i${index}`, 'gross')),
    })

    splitIntoBlocks(original, notice => notices.push(notice))

    expect(notices).toHaveLength(1)
    expect(notices[0]).toContain('gross')
  })
})

/* ------------------------------------------------------------------ *
 * Antworten des Servers
 * ------------------------------------------------------------------ */

describe('parsePushResponse', () => {
  test('liest Konflikte und verworfene Ids', () => {
    const response = parsePushResponse({
      conflicts: {
        lists: [{ id: 'l1', name: 'Server', color: '#fff', createdAt: TS, updatedAt: TS, userId: 'u1' }],
        listItems: [],
        recipes: [],
        recipeIngredients: [],
        recipeSteps: [],
        badges: [],
      },
      skippedIds: { lists: ['l9'], listItems: ['i9'], recipes: [], recipeIngredients: [], recipeSteps: [], recipeChatMessages: [], badges: [] },
      serverTime: TS,
    })

    expect(response.conflicts.lists).toHaveLength(1)
    expect(response.conflicts.lists[0]?.name).toBe('Server')
    // `userId` ist das befristete Duplikat von `ownerUserId`.
    expect(response.conflicts.lists[0]?.ownerUserId).toBe('u1')
    expect(response.skippedIds.lists).toEqual(['l9'])
    expect(response.serverTime).toBe(TS)
  })

  test('eine Zeile ohne Pflichtfelder wird verworfen statt geraten', () => {
    const response = parsePushResponse({
      conflicts: { lists: [{ id: 'l1' }, { name: 'ohne id', createdAt: TS, updatedAt: TS }] },
    })

    expect(response.conflicts.lists).toHaveLength(0)
  })

  test('eine Antwort ohne skippedIds gilt als "nichts verworfen"', () => {
    const response = parsePushResponse({ conflicts: {}, serverTime: TS })

    expect(response.skippedIds.lists).toEqual([])
    expect(response.skippedIds.badges).toEqual([])
  })

  test('parseMigrateResponse zählt die importierten Zeilen', () => {
    const response = parseMigrateResponse({ migrated: { lists: 3, recipes: 2 }, serverTime: TS })

    expect(response.migrated.lists).toBe(3)
    expect(response.migrated.recipes).toBe(2)
  })
})

describe('keptIds', () => {
  test('verworfene Zeilen bleiben aus der Clear-Liste heraus', () => {
    expect(keptIds([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['b'])).toEqual(['a', 'c'])
  })

  test('ohne verworfene Zeilen bleibt alles drin', () => {
    expect(keptIds([{ id: 'a' }, { id: 'b' }], [])).toEqual(['a', 'b'])
  })
})

/* ------------------------------------------------------------------ *
 * Der Ablauf
 * ------------------------------------------------------------------ */

function memoryEntityStore<TRow extends { id: string }>(rows: TRow[] = []): EntityStore<TRow> & { all: Map<string, TRow> } {
  const all = new Map(rows.map(row => [row.id, row]))
  return {
    all,
    read: id => Promise.resolve(all.get(id)),
    write: (row) => {
      all.set(row.id, row)
      return Promise.resolve()
    },
  }
}

interface FakePushStore extends PushStore {
  cleared: { store: string, ids: readonly string[], snapshot: IsoUtc }[]
  readDirtyAt: IsoUtc | null
  lists: Map<string, ListRow>
  items: Map<string, ListItemRow>
}

function emptyDirty(): DirtyRows {
  return { lists: [], items: [], recipes: [], ingredients: [], steps: [], chatMessages: [], badges: [] }
}

function fakePushStore(dirty: Partial<DirtyRows> = {}, local: { lists?: ListRow[], items?: ListItemRow[] } = {}): FakePushStore {
  const listStore = memoryEntityStore<ListRow>(local.lists ?? [])
  const itemStore = memoryEntityStore<ListItemRow>(local.items ?? [])
  const rows: RowStores = {
    lists: listStore,
    items: itemStore,
    recipes: memoryEntityStore<RecipeRow>(),
    ingredients: memoryEntityStore<RecipeIngredientRow>(),
    steps: memoryEntityStore<RecipeStepRow>(),
    badges: memoryEntityStore<BadgeRow>(),
    chatMessages: memoryEntityStore<RecipeChatMessageRow>(),
  }

  const store: FakePushStore = {
    rows,
    cleared: [],
    readDirtyAt: null,
    lists: listStore.all,
    items: itemStore.all,
    readDirty: () => {
      store.readDirtyAt = nowIso()
      return Promise.resolve({ ...emptyDirty(), ...dirty })
    },
    clearDirty: (name, ids, snapshot) => {
      store.cleared.push({ store: name, ids, snapshot })
      return Promise.resolve()
    },
  }

  return store
}

function dirtyList(id: string, updatedAt: IsoUtc = TS): ListRow {
  return { ...list(id), ownerUserId: null, updatedAt, dirty: DIRTY }
}

function dirtyItem(id: string, listId: string, updatedAt: IsoUtc = TS): ListItemRow {
  return { ...item(id, listId), updatedAt, dirty: DIRTY }
}

const OK_RESPONSE = {
  conflicts: {},
  skippedIds: { lists: [], listItems: [], recipes: [], recipeIngredients: [], recipeSteps: [], recipeChatMessages: [], badges: [] },
  serverTime: TS,
}

describe('runPush', () => {
  test('ohne schmutzige Zeilen wird nichts gesendet', async () => {
    const store = fakePushStore()
    let calls = 0

    const outcome = await runPush(store, () => {
      calls += 1
      return Promise.resolve(OK_RESPONSE)
    })

    expect(calls).toBe(0)
    expect(outcome.blocks).toBe(0)
    expect(store.cleared).toHaveLength(0)
  })

  test('der Snapshot wird VOR dem Lesen der Zeilen genommen', async () => {
    const store = fakePushStore({ lists: [dirtyList('l1')] })

    const outcome = await runPush(store, () => Promise.resolve(OK_RESPONSE))

    // Sonst würde eine Bearbeitung zwischen Snapshot und Lesen ihr Flag
    // verlieren, ohne je gesendet worden zu sein.
    expect(store.readDirtyAt).not.toBeNull()
    expect(compareIso(outcome.pushSnapshot, store.readDirtyAt ?? TS)).toBeLessThan(1)
    for (const call of store.cleared) {
      expect(call.snapshot).toBe(outcome.pushSnapshot)
    }
  })

  test('verworfene Zeilen behalten ihr Dirty-Flag', async () => {
    const store = fakePushStore({ lists: [dirtyList('l1'), dirtyList('l2')] })

    await runPush(store, () => Promise.resolve({
      ...OK_RESPONSE,
      skippedIds: { ...OK_RESPONSE.skippedIds, lists: ['l2'] },
    }))

    const listsCleared = store.cleared.find(call => call.store === 'lists')
    expect(listsCleared?.ids).toEqual(['l1'])
  })

  test('Blöcke gehen streng nacheinander raus', async () => {
    const lists = range(600).map(index => dirtyList(`l${index}`))
    const store = fakePushStore({ lists })

    let inFlight = 0
    let maxInFlight = 0
    const seen: number[] = []

    const outcome = await runPush(store, async (block) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      seen.push(block.lists.length)
      await Promise.resolve()
      inFlight -= 1
      return OK_RESPONSE
    })

    expect(outcome.blocks).toBe(2)
    expect(seen).toEqual([PUSH_BLOCK_LIMITS.lists, 100])
    // Parallel zu senden bricht serverseitig die Zugriffsprüfung.
    expect(maxInFlight).toBe(1)
  })

  test('Konflikte werden übernommen — sauber, nicht schmutzig', async () => {
    const store = fakePushStore(
      { lists: [dirtyList('l1')] },
      { lists: [dirtyList('l1')] },
    )

    await runPush(store, () => Promise.resolve({
      ...OK_RESPONSE,
      conflicts: {
        lists: [{ id: 'l1', name: 'Serverstand', color: '#000000', createdAt: TS, updatedAt: TS, userId: 'u1' }],
      },
    }))

    const stored = store.lists.get('l1')
    expect(stored?.name).toBe('Serverstand')
    expect(stored?.dirty).toBe(CLEAN)
  })

  test('eine lokal frischere Zeile überschreibt der Konflikt nicht', async () => {
    // Bearbeitet WÄHREND des Pushs: Der Serverstand ist älter als diese
    // Änderung und darf sie nicht wegwerfen.
    const localList: ListRow = { ...dirtyList('l1', FUTURE), name: 'Gerade getippt' }
    const store = fakePushStore({ lists: [dirtyList('l1')] }, { lists: [localList] })

    await runPush(store, () => Promise.resolve({
      ...OK_RESPONSE,
      conflicts: { lists: [{ id: 'l1', name: 'Serverstand', color: '#000000', createdAt: TS, updatedAt: TS }] },
    }))

    expect(store.lists.get('l1')?.name).toBe('Gerade getippt')
    expect(store.lists.get('l1')?.dirty).toBe(DIRTY)
  })

  test('Items und ihre Liste werden zusammen gesendet und beide sauber gesetzt', async () => {
    const store = fakePushStore({
      lists: [dirtyList('l1')],
      items: [dirtyItem('i1', 'l1'), dirtyItem('i2', 'l1')],
    })

    const outcome = await runPush(store, () => Promise.resolve(OK_RESPONSE))

    expect(outcome.sentRows).toBe(3)
    expect(store.cleared.find(call => call.store === 'lists')?.ids).toEqual(['l1'])
    expect(store.cleared.find(call => call.store === 'list_items')?.ids).toEqual(['i1', 'i2'])
  })
})

describe('buildPushPayload', () => {
  test('kappt zu lange Werte, bevor sie die API mit 422 kippen', () => {
    const long = 'x'.repeat(600)
    const built = buildPushPayload({ ...emptyDirty(), lists: [{ ...dirtyList('l1'), name: long }] })

    expect(built.lists[0]?.name).toHaveLength(500)
  })

  test('das lokale Dirty-Flag und der Eigentümer bleiben zu Hause', () => {
    const built = buildPushPayload({ ...emptyDirty(), lists: [{ ...dirtyList('l1'), ownerUserId: 'u1' }] })
    const sent: Record<string, unknown> = { ...built.lists[0] }

    expect(sent['dirty']).toBeUndefined()
    expect(sent['ownerUserId']).toBeUndefined()
  })

  /**
   * Das Merge schreibt einen LEEREN Zeitstempel, wenn weder lokal noch auf dem
   * Server einer für ein Feld existiert (`mergeFields` in
   * `app/sync/merge/field-lww.ts`). Dort ist das richtig — er bedeutet
   * "ältestmöglich". Die API lehnt `""` aber gegen ihr Muster ab, und ein 422
   * kippt nicht die Zeile, sondern den GESAMTEN Push. Deshalb wird an dieser
   * Kante gesiebt und nicht im Merge (`fixtures.json` schreibt `""` als
   * erwartetes Merge-Ergebnis fest).
   */
  test('ein leerer Feld-Zeitstempel geht nicht hinaus', () => {
    const built = buildPushPayload({
      ...emptyDirty(),
      lists: [{ ...dirtyList('l1'), fieldTimestamps: { name: TS, color: '' } }],
    })

    expect(built.lists[0]?.fieldTimestamps).toEqual({ name: TS })
  })

  test('bleibt kein einziger Stempel übrig, wird null gesendet', () => {
    // Wie `.ifEmpty { null }` im Android-Client: Ein leeres Objekt und `null`
    // bedeuten für die API dasselbe, `null` ist die schlankere Angabe.
    const built = buildPushPayload({
      ...emptyDirty(),
      lists: [{ ...dirtyList('l1'), fieldTimestamps: { name: '' } }],
    })

    expect(built.lists[0]?.fieldTimestamps).toBeNull()
  })

  test('ein Stempel ohne Millisekunden bleibt stehen', () => {
    // Javas `Instant.toString()` lässt die `.000` weg, und die API nimmt beide
    // Schreibweisen an. Ein Stempel vom Android-Client darf hier nicht als
    // kaputt gelten.
    const built = buildPushPayload({
      ...emptyDirty(),
      lists: [{ ...dirtyList('l1'), fieldTimestamps: { name: '2026-01-15T10:00:00Z' } }],
    })

    expect(built.lists[0]?.fieldTimestamps).toEqual({ name: '2026-01-15T10:00:00Z' })
  })

  test('gültige Stempel bleiben in jeder Entität unangetastet', () => {
    // Nicht nur Listen: Jede `toPush…`-Funktion muss durch dieselbe Kante.
    const stamps = { name: TS }
    const built = buildPushPayload({
      ...emptyDirty(),
      lists: [{ ...dirtyList('l1'), fieldTimestamps: { ...stamps, color: '' } }],
      items: [{ ...dirtyItem('i1', 'l1'), fieldTimestamps: { ...stamps, checked: '' } }],
    })

    expect(built.lists[0]?.fieldTimestamps).toEqual(stamps)
    expect(built.listItems[0]?.fieldTimestamps).toEqual(stamps)
  })

  test('ohne Feld-Zeitstempel bleibt es bei null', () => {
    const built = buildPushPayload({ ...emptyDirty(), lists: [dirtyList('l1')] })

    expect(built.lists[0]?.fieldTimestamps).toBeNull()
  })
})

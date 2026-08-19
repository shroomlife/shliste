/**
 * Der Vertrag des Delta-Abrufs.
 *
 * Drei Eigenschaften tragen alles andere:
 *
 * 1. DER CURSOR RUECKT NIE VOR. Ein Delta ist ein Ausschnitt; wuerde das
 *    Wasserzeichen danach weiterwandern, fielen alle gleichzeitigen Aenderungen
 *    an anderen Zeilen dauerhaft aus dem Fenster des naechsten Pulls.
 * 2. DIE ADRESSE PASST ZUR API. `type`, `listId`, `id` und das kommagetrennte
 *    `ids` sind genau die Parameter, die `routes/sync/delta.ts` liest — ein
 *    falscher Name ergibt dort 400 oder, schlimmer, eine stille Vollantwort.
 * 3. EINE LEERE ANTWORT IST KEIN FEHLER. So sagt der Server "gehoert dir nicht
 *    (mehr)", und genau daran darf nichts kaputtgehen.
 */
import { describe, expect, test } from 'bun:test'
import type { IsoUtc, ListMember } from '../../../shared/types/domain'
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
import { deltaQuery, parseDeltaResponse, runDelta } from './delta'
import type { EntityStore, PullStore, RowStores } from './ports'

const OLD: IsoUtc = '2026-01-15T10:00:00.000Z'
const NEW: IsoUtc = '2026-02-20T10:00:00.000Z'

/* ------------------------------------------------------------------ *
 * Attrappen
 * ------------------------------------------------------------------ */

function memoryEntityStore<TRow extends { id: string }>(rows: TRow[] = []): EntityStore<TRow> & { all: Map<string, TRow> } {
  const all = new Map(rows.map(row => [row.id, row]))
  return {
    all,
    read: (id: string) => Promise.resolve(all.get(id)),
    write: (row: TRow) => {
      all.set(row.id, row)
      return Promise.resolve()
    },
  }
}

interface FakeStore extends PullStore {
  cursorWrites: number
  lists: Map<string, ListRow>
  items: Map<string, ListItemRow>
  recipes: Map<string, RecipeRow>
  members: Map<string, readonly ListMember[]>
}

function fakeStore(options: { items?: ListItemRow[] } = {}): FakeStore {
  const listStore = memoryEntityStore<ListRow>()
  const itemStore = memoryEntityStore<ListItemRow>(options.items ?? [])
  const recipeStore = memoryEntityStore<RecipeRow>()

  const rows: RowStores = {
    lists: listStore,
    items: itemStore,
    recipes: recipeStore,
    ingredients: memoryEntityStore<RecipeIngredientRow>(),
    steps: memoryEntityStore<RecipeStepRow>(),
    badges: memoryEntityStore<BadgeRow>(),
    chatMessages: memoryEntityStore<RecipeChatMessageRow>(),
  }

  const store: FakeStore = {
    rows,
    cursorWrites: 0,
    lists: listStore.all,
    items: itemStore.all,
    recipes: recipeStore.all,
    members: new Map<string, readonly ListMember[]>(),
    replaceMembers: (listId, members) => {
      store.members.set(listId, members)
      return Promise.resolve()
    },
    readCursor: () => Promise.resolve(null),
    writeCursor: () => {
      store.cursorWrites += 1
      return Promise.resolve()
    },
  }

  return store
}

/* ------------------------------------------------------------------ *
 * Serverzeilen als rohes JSON
 * ------------------------------------------------------------------ */

function serverItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'i1',
    listId: 'l1',
    name: 'Server-Item',
    quantity: 1,
    checked: true,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    createdAt: OLD,
    updatedAt: NEW,
    deletedAt: null,
    fieldTimestamps: { checked: NEW },
    createdBy: null,
    modifiedBy: null,
    ...overrides,
  }
}

function serverList(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'l1',
    name: 'Server-Liste',
    color: '#123456',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    createdAt: OLD,
    updatedAt: NEW,
    deletedAt: null,
    fieldTimestamps: { name: NEW },
    userId: 'owner-uuid',
    ownerUserId: 'owner-uuid',
    items: [],
    members: [],
    ...overrides,
  }
}

function localItem(overrides: Partial<ListItemRow> = {}): ListItemRow {
  return {
    id: 'i1',
    listId: 'l1',
    name: 'Lokal',
    quantity: 1,
    checked: false,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    createdBy: null,
    modifiedBy: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: CLEAN,
    ...overrides,
  }
}

/* ------------------------------------------------------------------ *
 * Die Adresse
 * ------------------------------------------------------------------ */

describe('deltaQuery', () => {
  test('eine Liste: type und listId', () => {
    expect(deltaQuery({ kind: 'list', listId: 'l1' })).toBe('type=list&listId=l1')
  })

  test('Positionen: Ids kommagetrennt in einem Parameter', () => {
    const query = deltaQuery({ kind: 'items', listId: 'l1', itemIds: ['a', 'b'] })
    expect(query).toBe('type=items&listId=l1&ids=a%2Cb')
    expect(new URLSearchParams(query).get('ids')).toBe('a,b')
  })

  test('ohne Ids bleibt ids weg — der Server liefert dann alle Positionen', () => {
    expect(deltaQuery({ kind: 'items', listId: 'l1', itemIds: [] })).toBe('type=items&listId=l1')
  })

  test('ein Rezept wird ueber id angefragt, nicht ueber listId', () => {
    expect(deltaQuery({ kind: 'recipe', recipeId: 'r1' })).toBe('type=recipe&id=r1')
  })

  test('Sonderzeichen werden kodiert', () => {
    const query = deltaQuery({ kind: 'list', listId: 'a&b=c' })
    expect(new URLSearchParams(query).get('listId')).toBe('a&b=c')
  })
})

/* ------------------------------------------------------------------ *
 * Einlesen
 * ------------------------------------------------------------------ */

describe('parseDeltaResponse', () => {
  test('liest Listen, Positionen und Rezepte', () => {
    const response = parseDeltaResponse({
      lists: [serverList({ items: [serverItem()] })],
      items: [serverItem({ id: 'i2' })],
      recipes: [],
    })

    expect(response.lists).toHaveLength(1)
    expect(response.lists[0]?.items).toHaveLength(1)
    expect(response.items).toHaveLength(1)
    expect(response.items[0]?.id).toBe('i2')
  })

  test('eine leere Antwort ergibt leere Listen statt eines Fehlers', () => {
    const response = parseDeltaResponse({ lists: [], items: [], recipes: [], serverTime: NEW })
    expect(response.lists).toEqual([])
    expect(response.items).toEqual([])
    expect(response.recipes).toEqual([])
  })

  test('unbrauchbares JSON ergibt leere Listen', () => {
    expect(parseDeltaResponse(null).items).toEqual([])
    expect(parseDeltaResponse('kaputt').items).toEqual([])
  })

  test('eine unvollstaendige Zeile faellt raus, die uebrigen bleiben', () => {
    const response = parseDeltaResponse({
      items: [serverItem(), { id: 'ohne-alles' }],
    })
    expect(response.items).toHaveLength(1)
    expect(response.items[0]?.id).toBe('i1')
  })
})

/* ------------------------------------------------------------------ *
 * Der Ablauf
 * ------------------------------------------------------------------ */

describe('runDelta', () => {
  test('schreibt die Serverzeile und ruft die gebaute Adresse ab', async () => {
    const store = fakeStore()
    let asked: string | null = null

    const outcome = await runDelta(
      store,
      (query) => {
        asked = query
        return Promise.resolve({ lists: [], items: [serverItem()], recipes: [] })
      },
      { kind: 'items', listId: 'l1', itemIds: ['i1'] },
    )

    expect(asked).toBe('type=items&listId=l1&ids=i1')
    expect(store.items.get('i1')?.checked).toBe(true)
    expect(outcome.items).toBe(1)
    expect(outcome.changed).toBe(true)
  })

  test('RUECKT DAS WASSERZEICHEN NIE VOR', async () => {
    const store = fakeStore()

    await runDelta(
      store,
      () => Promise.resolve({ lists: [serverList()], items: [], recipes: [] }),
      { kind: 'list', listId: 'l1' },
    )

    expect(store.cursorWrites).toBe(0)
  })

  test('eine leere Antwort aendert nichts und meldet changed = false', async () => {
    const store = fakeStore({ items: [localItem()] })

    const outcome = await runDelta(
      store,
      () => Promise.resolve({ lists: [], items: [], recipes: [] }),
      { kind: 'list', listId: 'l1' },
    )

    expect(outcome.changed).toBe(false)
    expect(store.items.get('i1')?.name).toBe('Lokal')
  })

  test('eine Liste bringt ihre Positionen und Mitglieder mit', async () => {
    const store = fakeStore()

    await runDelta(
      store,
      () => Promise.resolve({
        lists: [serverList({
          items: [serverItem()],
          members: [{
            userId: 'u1',
            email: 'wer@example.com',
            displayName: 'Wer',
            photoUrl: null,
            role: 'member',
            status: 'active',
            invitedAt: OLD,
            acceptedAt: OLD,
          }],
        })],
        items: [],
        recipes: [],
      }),
      { kind: 'list', listId: 'l1' },
    )

    expect(store.lists.get('l1')?.name).toBe('Server-Liste')
    expect(store.items.get('i1')?.checked).toBe(true)
    expect(store.members.get('l1')).toHaveLength(1)
  })

  test('das lokale Feld gewinnt, wenn es juenger ist — dieselbe Regel wie im Pull', async () => {
    const store = fakeStore({
      items: [localItem({
        name: 'Lokal neuer',
        dirty: DIRTY,
        fieldTimestamps: { name: '2026-03-01T00:00:00.000Z' },
      })],
    })

    await runDelta(
      store,
      () => Promise.resolve({ lists: [], items: [serverItem({ name: 'Server aelter' })], recipes: [] }),
      { kind: 'items', listId: 'l1', itemIds: ['i1'] },
    )

    const merged = store.items.get('i1')
    expect(merged?.name).toBe('Lokal neuer')
    // Der lokale Gewinner muss beim naechsten Push hinaus.
    expect(merged?.dirty).toBe(DIRTY)
    // Das Serverfeld ohne lokalen Gegenspieler wird trotzdem uebernommen.
    expect(merged?.checked).toBe(true)
  })

  test('zweimal dasselbe Delta ergibt denselben Stand', async () => {
    const store = fakeStore()
    const fetchDelta = (): Promise<unknown> =>
      Promise.resolve({ lists: [], items: [serverItem()], recipes: [] })

    await runDelta(store, fetchDelta, { kind: 'items', listId: 'l1', itemIds: ['i1'] })
    const first = { ...store.items.get('i1') }
    await runDelta(store, fetchDelta, { kind: 'items', listId: 'l1', itemIds: ['i1'] })

    expect({ ...store.items.get('i1') }).toEqual(first)
  })
})

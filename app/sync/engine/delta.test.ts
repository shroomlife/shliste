/**
 * Der Vertrag des Delta-Abrufs.
 *
 * Drei Eigenschaften tragen alles andere:
 *
 * 1. DER CURSOR RÜCKT NIE VOR. Ein Delta ist ein Ausschnitt; würde das
 *    Wasserzeichen danach weiterwandern, fielen alle gleichzeitigen Änderungen
 *    an anderen Zeilen dauerhaft aus dem Fenster des nächsten Pulls.
 * 2. DIE ADRESSE PASST ZUR API. `type`, `listId`, `id` und das kommagetrennte
 *    `ids` sind genau die Parameter, die `routes/sync/delta.ts` liest — ein
 *    falscher Name ergibt dort 400 oder, schlimmer, eine stille Vollantwort.
 * 3. EINE LEERE ANTWORT IST KEIN FEHLER. So sagt der Server "gehört dir nicht
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
import type { EntityStore, RowMerge, PullStore, RowStores } from './ports'

const OLD: IsoUtc = '2026-01-15T10:00:00.000Z'
const NEW: IsoUtc = '2026-02-20T10:00:00.000Z'

/* ------------------------------------------------------------------ *
 * Attrappen
 * ------------------------------------------------------------------ */

function memoryEntityStore<TRow extends { id: string }>(rows: TRow[] = []): EntityStore<TRow> & { all: Map<string, TRow> } {
  const all = new Map(rows.map(row => [row.id, row]))
  return {
    all,
    // Bildet `mutateRow` nach: ein unteilbares Lesen-Rechnen-Schreiben.
    mutate: (id: string, merge: RowMerge<TRow>) => {
      const next = merge(all.get(id))
      if (next !== null) all.set(next.id, next)
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

function fakeStore(options: { items?: ListItemRow[], lists?: ListRow[] } = {}): FakeStore {
  const listStore = memoryEntityStore<ListRow>(options.lists ?? [])
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
    putPulledHistoryEntry: () => Promise.resolve(),
    trimHistoryForParent: () => Promise.resolve(),
    replaceMembers: (listId, members) => {
      store.members.set(listId, members)
      return Promise.resolve()
    },
    readCursor: () => Promise.resolve(null),
    // Änderungsnummer: für diese Tests belanglos, aber Teil des Ports.
    writeChangeSeq: () => Promise.resolve(),
    advanceChangeSeq: () => Promise.resolve(),
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
    url: null,
    linkTitle: null,
    linkImagePath: null,
    linkImageKind: null,
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
    url: null,
    linkTitle: null,
    linkImagePath: null,
    linkImageKind: null,
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
    const query = deltaQuery({ kind: 'items', listId: 'l1', itemIds: ['a', 'b'], listUpdatedAt: null })
    expect(query).toBe('type=items&listId=l1&ids=a%2Cb')
    expect(new URLSearchParams(query).get('ids')).toBe('a,b')
  })

  test('ohne Ids bleibt ids weg — der Server liefert dann alle Positionen', () => {
    expect(deltaQuery({ kind: 'items', listId: 'l1', itemIds: [], listUpdatedAt: null })).toBe('type=items&listId=l1')
  })

  test('ein Rezept wird über id angefragt, nicht über listId', () => {
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

  test('eine unvollständige Zeile fällt raus, die übrigen bleiben', () => {
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
      { kind: 'items', listId: 'l1', itemIds: ['i1'], listUpdatedAt: null },
    )

    expect(asked).toBe('type=items&listId=l1&ids=i1')
    expect(store.items.get('i1')?.checked).toBe(true)
    expect(outcome.items).toBe(1)
    expect(outcome.changed).toBe(true)
  })

  test('RÜCKT DAS WASSERZEICHEN NIE VOR', async () => {
    const store = fakeStore()

    await runDelta(
      store,
      () => Promise.resolve({ lists: [serverList()], items: [], recipes: [] }),
      { kind: 'list', listId: 'l1' },
    )

    expect(store.cursorWrites).toBe(0)
  })

  test('eine leere Antwort ändert nichts und meldet changed = false', async () => {
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

  test('das lokale Feld gewinnt, wenn es jünger ist — dieselbe Regel wie im Pull', async () => {
    const store = fakeStore({
      items: [localItem({
        name: 'Lokal neuer',
        dirty: DIRTY,
        fieldTimestamps: { name: '2026-03-01T00:00:00.000Z' },
      })],
    })

    await runDelta(
      store,
      () => Promise.resolve({ lists: [], items: [serverItem({ name: 'Server älter' })], recipes: [] }),
      { kind: 'items', listId: 'l1', itemIds: ['i1'], listUpdatedAt: null },
    )

    const merged = store.items.get('i1')
    expect(merged?.name).toBe('Lokal neuer')
    // Der lokale Gewinner muss beim nächsten Push hinaus.
    expect(merged?.dirty).toBe(DIRTY)
    // Das Serverfeld ohne lokalen Gegenspieler wird trotzdem übernommen.
    expect(merged?.checked).toBe(true)
  })

  test('zweimal dasselbe Delta ergibt denselben Stand', async () => {
    const store = fakeStore()
    const fetchDelta = (): Promise<unknown> =>
      Promise.resolve({ lists: [], items: [serverItem()], recipes: [] })

    await runDelta(store, fetchDelta, { kind: 'items', listId: 'l1', itemIds: ['i1'], listUpdatedAt: null })
    const first = { ...store.items.get('i1') }
    await runDelta(store, fetchDelta, { kind: 'items', listId: 'l1', itemIds: ['i1'], listUpdatedAt: null })

    expect({ ...store.items.get('i1') }).toEqual(first)
  })
})

/* ------------------------------------------------------------------ *
 * Sortierzeitpunkt der Elternliste
 * ------------------------------------------------------------------ */

/** Die Liste, um die es in diesem Abschnitt geht. */
const LIST_ID = 'l1'

/** Eine lokale Listenzeile, so schlank wie der Test sie braucht. */
function lokaleListe(updatedAt: string, dirty: 0 | 1): ListRow {
  return {
    id: LIST_ID,
    name: 'Wocheneinkauf',
    color: '#fff',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: 'user-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt,
    deletedAt: null,
    fieldTimestamps: null,
    dirty,
    seenAt: null,
  } as ListRow
}

describe('Sortierzeitpunkt der Elternliste', () => {
  const ALT = '2026-08-25T10:00:00.000Z'
  const NEU = '2026-08-25T11:00:00.000Z'

  test('wird aus dem Ereignis nachgezogen, ohne die Liste zu holen', async () => {
    /*
     * DER GANZE ZWECK: Ohne diesen Weg bräuchte die Übersicht ein zusätzliches
     * `list_changed`, um die Reihenfolge zu aktualisieren. Und weil das
     * Coalescing `list_changed` gewinnen lässt, landete jedes Abhaken im
     * Listen-Delta, das die Liste MIT ALLEN Items zurückgibt — 312 statt einem
     * bei der grössten Liste in Produktion.
     */
    const store = fakeStore({ lists: [lokaleListe(ALT, 0)] })
    await runDelta(store, () => Promise.resolve({ lists: [], items: [], recipes: [] }), {
      kind: 'items',
      listId: LIST_ID,
      itemIds: [],
      listUpdatedAt: NEU,
    })

    expect(store.lists.get(LIST_ID)?.updatedAt).toBe(NEU)
    // Sauber geblieben: Der Server hat denselben Wert gesetzt, es gibt nichts
    // hochzuladen.
    expect(store.lists.get(LIST_ID)?.dirty).toBe(0)
  })

  test('eine ungesendete lokale Änderung wird NICHT überschrieben', async () => {
    // Ihr eigener Stand ist neuer und geht beim nächsten Push hinaus. Sie hier
    // zu überschreiben wäre genau der stille Verlust, den diese Schicht
    // abgestellt hat.
    const store = fakeStore({ lists: [lokaleListe(ALT, 1)] })
    await runDelta(store, () => Promise.resolve({ lists: [], items: [], recipes: [] }), {
      kind: 'items',
      listId: LIST_ID,
      itemIds: [],
      listUpdatedAt: NEU,
    })

    expect(store.lists.get(LIST_ID)?.updatedAt).toBe(ALT)
  })

  test('geht nur vorwärts', async () => {
    // Die Zustellung ist nicht geordnet. Ein überholtes Ereignis würde die
    // Reihenfolge der Übersicht sonst zurückdrehen.
    const store = fakeStore({ lists: [lokaleListe(NEU, 0)] })
    await runDelta(store, () => Promise.resolve({ lists: [], items: [], recipes: [] }), {
      kind: 'items',
      listId: LIST_ID,
      itemIds: [],
      listUpdatedAt: ALT,
    })

    expect(store.lists.get(LIST_ID)?.updatedAt).toBe(NEU)
  })

  test('ohne Zeitpunkt im Ereignis passiert nichts', async () => {
    // So verhält sich eine ältere API. Der Client holt den Sortierzeitpunkt
    // dann wie bisher über das begleitende `list_changed`.
    const store = fakeStore({ lists: [lokaleListe(ALT, 0)] })
    await runDelta(store, () => Promise.resolve({ lists: [], items: [], recipes: [] }), {
      kind: 'items',
      listId: LIST_ID,
      itemIds: [],
      listUpdatedAt: null,
    })

    expect(store.lists.get(LIST_ID)?.updatedAt).toBe(ALT)
  })

  test('eine lokal unbekannte Liste wird nicht angelegt', async () => {
    // Ein Ereignis ist ein Hinweis, keine Nutzlast. Aus einem Zeitstempel eine
    // halbe Liste zu bauen wäre schlimmer als sie erst beim nächsten Pull zu
    // bekommen.
    const store = fakeStore()
    await runDelta(store, () => Promise.resolve({ lists: [], items: [], recipes: [] }), {
      kind: 'items',
      listId: LIST_ID,
      itemIds: [],
      listUpdatedAt: NEU,
    })

    expect(store.lists.size).toBe(0)
  })
})

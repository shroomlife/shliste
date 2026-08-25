/**
 * Der Vertrag zwischen Echtzeit-Ereignis und Datenabruf.
 *
 * Vier Regeln, und jede einzelne hat eine Datenverlust-Geschichte hinter sich:
 *
 * 1. EIN UNGESENDETER LOKALER STAND MACHT AUS DEM DELTA EINEN VOLLEN LAUF.
 *    Ein Delta zieht nur. Ohne diese Regel holte es den Serverstand herein,
 *    ohne den eigenen hinauszugeben.
 * 2. ENTFERNUNGEN LAUFEN IMMER, auch neben einem vollen Lauf. Ein Pull
 *    erwähnt eine Liste, deren Mitgliedschaft endete, gar nicht mehr — sie
 *    bliebe sonst für immer sichtbar.
 * 3. `list_changed` SCHLÄGT `item_changed` derselben Liste. Es ist die
 *    Obermenge; zwei Abrufe wären einer zuviel.
 * 4. WAS SICH NICHT ABBILDEN LÄSST, WIRD EIN VOLLER LAUF. Auch ein künftiger,
 *    hier unbekannter Ereignistyp. Lieber eine Runde zuviel als eine
 *    Änderung, die niemand holt.
 */
import { describe, expect, test } from 'bun:test'
import type { RealtimeEvent } from '../realtime/events'
import type { DeltaTarget } from './delta'
import type { EntityStore, PullStore, RealtimeStore, RowStores } from './ports'
import { createRealtimeSync, planRealtimeActions } from './realtime'

/* ------------------------------------------------------------------ *
 * Attrappen
 * ------------------------------------------------------------------ */

function emptyEntityStore<TRow extends { id: string }>(): EntityStore<TRow> {
  const all = new Map<string, TRow>()
  return {
    // Bildet `mutateRow` nach: ein unteilbares Lesen-Rechnen-Schreiben.
    mutate: (id, merge) => {
      const next = merge(all.get(id))
      if (next !== null) all.set(next.id, next)
      return Promise.resolve()
    },
  }
}

/*
 * Ohne Doppel-Cast: `as unknown as RowStores` hat hier zuletzt einen echten
 * Typfehler verdeckt — die Attrappe hatte die Form des Ports gar nicht mehr,
 * und aufgefallen ist es erst zur Laufzeit. Eine benannte Annotation lässt den
 * Compiler die Arbeit machen.
 */
const rows: RowStores = {
  lists: emptyEntityStore(),
  items: emptyEntityStore(),
  recipes: emptyEntityStore(),
  ingredients: emptyEntityStore(),
  steps: emptyEntityStore(),
  badges: emptyEntityStore(),
  chatMessages: emptyEntityStore(),
}

interface Recorder {
  store: RealtimeStore
  removed: string[]
  queries: string[]
  fullSyncs: number
  applied: number
  fetchDelta: (query: string) => Promise<unknown>
  runFullSync: () => Promise<unknown>
  onApplied: () => void
}

function recorder(options: {
  dirtyLists?: readonly string[]
  dirtyRecipes?: readonly string[]
  /** Was der Delta-Abruf zurückgibt. Standard: eine leere Antwort. */
  deltaResponse?: unknown
} = {}): Recorder {
  const dirtyLists = new Set(options.dirtyLists ?? [])
  const dirtyRecipes = new Set(options.dirtyRecipes ?? [])

  const base: PullStore = {
    rows,
    putPulledHistoryEntry: () => Promise.resolve(),
    trimHistoryForParent: () => Promise.resolve(),
    replaceMembers: () => Promise.resolve(),
    readCursor: () => Promise.resolve(null),
    writeCursor: () => Promise.resolve(),
    // Änderungsnummer: für diese Tests belanglos, aber Teil des Ports.
    readChangeSeq: () => Promise.resolve(null),
    writeChangeSeq: () => Promise.resolve(),
  }

  const self: Recorder = {
    removed: [],
    queries: [],
    fullSyncs: 0,
    applied: 0,

    store: {
      ...base,
      isListDirty: (listId: string) => Promise.resolve(dirtyLists.has(listId)),
      isRecipeDirty: (recipeId: string) => Promise.resolve(dirtyRecipes.has(recipeId)),
      removeList: (listId: string) => {
        self.removed.push(listId)
        return Promise.resolve()
      },
    },

    fetchDelta: (query: string) => {
      self.queries.push(query)
      return Promise.resolve(options.deltaResponse ?? { lists: [], items: [], recipes: [] })
    },

    runFullSync: () => {
      self.fullSyncs += 1
      return Promise.resolve(null)
    },

    onApplied: () => {
      self.applied += 1
    },
  }

  return self
}

function syncFor(deps: Recorder) {
  return createRealtimeSync({
    store: deps.store,
    fetchDelta: deps.fetchDelta,
    runFullSync: deps.runFullSync,
    onApplied: deps.onApplied,
  })
}

/** Eine Antwort, die tatsächlich eine Zeile enthält. */
const CHANGED_RESPONSE = {
  lists: [],
  items: [{
    id: 'i1',
    listId: 'l1',
    name: 'Server',
    quantity: 1,
    checked: true,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    deletedAt: null,
    fieldTimestamps: { checked: '2026-01-15T10:00:00.000Z' },
    createdBy: null,
    modifiedBy: null,
  }],
  recipes: [],
}

/* ------------------------------------------------------------------ *
 * Der Plan
 * ------------------------------------------------------------------ */

describe('planRealtimeActions', () => {
  test('item_changed wird ein gezielter Positions-Abruf', () => {
    const plan = planRealtimeActions([{ type: 'item_changed', listId: 'l1', itemIds: ['a', 'b'], listUpdatedAt: null }])

    expect(plan.needsFullSync).toBe(false)
    expect(plan.deltas).toEqual([{ kind: 'items', listId: 'l1', itemIds: ['a', 'b'], listUpdatedAt: null }])
  })

  test('zwei item_changed derselben Liste vereinigen ihre Ids', () => {
    const plan = planRealtimeActions([
      { type: 'item_changed', listId: 'l1', itemIds: ['a'], listUpdatedAt: null },
      { type: 'item_changed', listId: 'l1', itemIds: ['b', 'a'], listUpdatedAt: null },
    ])

    expect(plan.deltas).toEqual([{ kind: 'items', listId: 'l1', itemIds: ['a', 'b'], listUpdatedAt: null }])
  })

  test('list_changed schlägt item_changed — in beide Richtungen', () => {
    const itemsFirst = planRealtimeActions([
      { type: 'item_changed', listId: 'l1', itemIds: ['a'], listUpdatedAt: null },
      { type: 'list_changed', listId: 'l1' },
    ])
    const listFirst = planRealtimeActions([
      { type: 'list_changed', listId: 'l1' },
      { type: 'item_changed', listId: 'l1', itemIds: ['a'], listUpdatedAt: null },
    ])

    expect(itemsFirst.deltas).toEqual([{ kind: 'list', listId: 'l1' }])
    expect(listFirst.deltas).toEqual([{ kind: 'list', listId: 'l1' }])
  })

  test('verschiedene Listen bleiben getrennt', () => {
    const plan = planRealtimeActions([
      { type: 'list_changed', listId: 'l1' },
      { type: 'list_changed', listId: 'l2' },
    ])

    expect(plan.deltas).toHaveLength(2)
  })

  test('list_removed landet in removals und nicht in den Abrufen', () => {
    const plan = planRealtimeActions([{ type: 'list_removed', listId: 'l1' }])

    expect(plan.removals).toEqual(['l1'])
    expect(plan.deltas).toEqual([])
    expect(plan.needsFullSync).toBe(false)
  })

  test('sync_needed, member_invited und badge_changed verlangen den vollen Lauf', () => {
    for (const event of [
      { type: 'sync_needed' },
      { type: 'member_invited', listId: 'l1' },
      { type: 'badge_changed' },
    ] as RealtimeEvent[]) {
      expect(planRealtimeActions([event]).needsFullSync).toBe(true)
    }
  })

  test('ohne Ereignisse gibt es nichts zu tun', () => {
    expect(planRealtimeActions([])).toEqual({ removals: [], deltas: [], needsFullSync: false })
  })
})

/* ------------------------------------------------------------------ *
 * Die Ausführung
 * ------------------------------------------------------------------ */

describe('createRealtimeSync', () => {
  test('holt das Delta und meldet die Änderung', async () => {
    const deps = recorder({ deltaResponse: CHANGED_RESPONSE })

    await syncFor(deps).handleEvents([{ type: 'item_changed', listId: 'l1', itemIds: ['i1'], listUpdatedAt: null }])

    expect(deps.queries).toEqual(['type=items&listId=l1&ids=i1'])
    expect(deps.fullSyncs).toBe(0)
    expect(deps.applied).toBe(1)
  })

  test('ein Delta ohne Inhalt meldet keine Änderung', async () => {
    const deps = recorder()

    await syncFor(deps).handleEvents([{ type: 'list_changed', listId: 'l1' }])

    expect(deps.queries).toHaveLength(1)
    expect(deps.applied).toBe(0)
  })

  test('EIN UNGESENDETER LOKALER STAND ERZWINGT DEN VOLLEN LAUF', async () => {
    const deps = recorder({ dirtyLists: ['l1'] })

    await syncFor(deps).handleEvents([{ type: 'item_changed', listId: 'l1', itemIds: ['i1'], listUpdatedAt: null }])

    expect(deps.fullSyncs).toBe(1)
    expect(deps.queries).toEqual([])
  })

  test('dasselbe gilt für Rezepte', async () => {
    const deps = recorder({ dirtyRecipes: ['r1'] })

    await syncFor(deps).handleEvents([{ type: 'recipe_changed', recipeId: 'r1' }])

    expect(deps.fullSyncs).toBe(1)
    expect(deps.queries).toEqual([])
  })

  test('eine schmutzige Liste zieht die übrigen Abrufe mit in den vollen Lauf', async () => {
    const deps = recorder({ dirtyLists: ['l2'] })

    await syncFor(deps).handleEvents([
      { type: 'list_changed', listId: 'l2' },
      { type: 'list_changed', listId: 'l3' },
    ])

    // Kein einziges Delta: Der volle Lauf bringt beide Listen ohnehin mit.
    expect(deps.queries).toEqual([])
    expect(deps.fullSyncs).toBe(1)
  })

  test('sync_needed löst genau einen vollen Lauf aus, auch neben Deltas', async () => {
    const deps = recorder()

    await syncFor(deps).handleEvents([
      { type: 'list_changed', listId: 'l1' },
      { type: 'sync_needed' },
    ])

    expect(deps.queries).toEqual([])
    expect(deps.fullSyncs).toBe(1)
  })

  test('ENTFERNUNGEN LAUFEN AUCH NEBEN EINEM VOLLEN LAUF', async () => {
    const deps = recorder()

    await syncFor(deps).handleEvents([
      { type: 'list_removed', listId: 'l1' },
      { type: 'sync_needed' },
    ])

    expect(deps.removed).toEqual(['l1'])
    expect(deps.fullSyncs).toBe(1)
  })

  test('eine Entfernung meldet die Änderung auch ohne Delta', async () => {
    const deps = recorder()

    await syncFor(deps).handleEvents([{ type: 'list_removed', listId: 'l1' }])

    expect(deps.removed).toEqual(['l1'])
    expect(deps.applied).toBe(1)
  })

  test('ohne Ereignisse passiert gar nichts', async () => {
    const deps = recorder()

    await syncFor(deps).handleEvents([])

    expect(deps.queries).toEqual([])
    expect(deps.fullSyncs).toBe(0)
    expect(deps.applied).toBe(0)
  })

  test('ein Fehler im Delta wird durchgereicht, nicht verschluckt', async () => {
    const deps = recorder()
    const sync = createRealtimeSync({
      store: deps.store,
      fetchDelta: () => Promise.reject(new Error('Netz weg')),
      runFullSync: deps.runFullSync,
    })

    await expect(sync.handleEvents([{ type: 'list_changed', listId: 'l1' }]))
      .rejects.toThrow('Netz weg')
  })

  test('mehrere Ziele werden nacheinander abgerufen', async () => {
    const deps = recorder()

    await syncFor(deps).handleEvents([
      { type: 'list_changed', listId: 'l1' },
      { type: 'recipe_changed', recipeId: 'r1' },
    ])

    expect(deps.queries).toEqual(['type=list&listId=l1', 'type=recipe&id=r1'])
  })

  test('der Plan bleibt bei ungebündelten Ereignissen richtig', async () => {
    const deps = recorder()

    // So käme es an, wenn die Bündelung ausfiele: dieselbe Liste dreimal.
    await syncFor(deps).handleEvents([
      { type: 'item_changed', listId: 'l1', itemIds: ['a'], listUpdatedAt: null },
      { type: 'item_changed', listId: 'l1', itemIds: ['b'], listUpdatedAt: null },
      { type: 'item_changed', listId: 'l1', itemIds: ['a'], listUpdatedAt: null },
    ])

    expect(deps.queries).toEqual(['type=items&listId=l1&ids=a%2Cb'])
  })
})

/* ------------------------------------------------------------------ *
 * Typtreue: der Plan liefert genau die Ziele, die `runDelta` annimmt
 * ------------------------------------------------------------------ */

describe('Plan und Abruf passen zusammen', () => {
  test('jedes geplante Ziel hat eine der drei bekannten Formen', () => {
    const plan = planRealtimeActions([
      { type: 'list_changed', listId: 'l1' },
      { type: 'item_changed', listId: 'l2', itemIds: ['a'], listUpdatedAt: null },
      { type: 'recipe_changed', recipeId: 'r1' },
    ])

    const kinds = plan.deltas.map((target: DeltaTarget) => target.kind)
    expect(kinds).toEqual(['list', 'items', 'recipe'])
  })
})

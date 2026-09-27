/**
 * Das Melden und Übernehmen der Gesehen-Zeitpunkte.
 *
 * Die wichtigste Zusage: `pushSeenMarksQuietly` wirft NIE. Gesehen ist kein
 * Inhalt, ein gescheitertes Melden darf keinen Abgleich kippen und muss beim
 * nächsten Lauf von selbst wieder anstehen.
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
import { CLEAN } from '../../db/schema'
import { pendingSeenMark, type SeenMark } from '../../db/seen'
import type { EntityStore, RowMerge, RowStores, SeenStore } from './ports'
import { applySeenMarks, MAX_SEEN_MARKS_PER_PUSH, parseSeenMark, pushSeenMarksQuietly } from './seen'

const EARLY: IsoUtc = '2026-09-01T08:00:00.000Z'
const MIDDLE: IsoUtc = '2026-09-02T08:00:00.000Z'
const LATE: IsoUtc = '2026-09-03T08:00:00.000Z'

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

function list(id: string, overrides: Partial<ListRow> = {}): ListRow {
  return {
    id,
    name: id,
    color: '#123456',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: null,
    createdAt: EARLY,
    updatedAt: EARLY,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: CLEAN,
    ...overrides,
  }
}

interface FakeSeenStore extends SeenStore {
  lists: Map<string, ListRow>
}

/** Liest die offenen Marken genau wie das Repository: über `pendingSeenMark`. */
function fakeSeenStore(rows: ListRow[]): FakeSeenStore {
  const lists = memoryEntityStore<ListRow>(rows)
  const stores: RowStores = {
    lists,
    items: memoryEntityStore<ListItemRow>(),
    recipes: memoryEntityStore<RecipeRow>(),
    ingredients: memoryEntityStore<RecipeIngredientRow>(),
    steps: memoryEntityStore<RecipeStepRow>(),
    badges: memoryEntityStore<BadgeRow>(),
    chatMessages: memoryEntityStore<RecipeChatMessageRow>(),
  }
  return {
    rows: stores,
    lists: lists.all,
    readPendingSeenMarks: (limit) => {
      const marks: SeenMark[] = []
      for (const row of lists.all.values()) {
        const mark = pendingSeenMark(row)
        if (mark !== null && marks.length < limit) marks.push(mark)
      }
      return Promise.resolve(marks)
    },
  }
}

function isPending(store: FakeSeenStore, id: string): boolean {
  const row = store.lists.get(id)
  return row !== undefined && pendingSeenMark(row) !== null
}

describe('parseSeenMark', () => {
  test('liest eine Marke und normalisiert den Zeitpunkt auf drei Millisekundenstellen', () => {
    expect(parseSeenMark({ listId: 'l1', seenAt: '2026-09-03T08:00:00Z' })).toEqual({ listId: 'l1', seenAt: LATE })
  })

  test('verwirft alles ohne Id oder ohne gültigen Zeitpunkt', () => {
    expect(parseSeenMark({ listId: '', seenAt: LATE })).toBeNull()
    expect(parseSeenMark({ seenAt: LATE })).toBeNull()
    expect(parseSeenMark({ listId: 'l1', seenAt: 'gestern' })).toBeNull()
    expect(parseSeenMark('l1')).toBeNull()
  })
})

describe('applySeenMarks', () => {
  test('nur vorwärts, und eine unbekannte Liste bleibt unberührt', async () => {
    const store = fakeSeenStore([list('neuer', { seenAt: EARLY }), list('aelter', { seenAt: LATE, seenPushedAt: LATE })])

    await applySeenMarks(store.rows, [
      { listId: 'neuer', seenAt: LATE },
      { listId: 'aelter', seenAt: EARLY },
      { listId: 'unbekannt', seenAt: LATE },
    ])

    expect(store.lists.get('neuer')?.seenAt).toBe(LATE)
    expect(store.lists.get('aelter')?.seenAt).toBe(LATE)
    expect(store.lists.has('unbekannt')).toBe(false)
  })
})

describe('pushSeenMarksQuietly', () => {
  test('nichts offen: keine Anfrage', async () => {
    const store = fakeSeenStore([list('l1'), list('l2', { seenAt: LATE, seenPushedAt: LATE })])
    let calls = 0

    const outcome = await pushSeenMarksQuietly(store, () => {
      calls += 1
      return Promise.resolve({ marks: [] })
    })

    expect(calls).toBe(0)
    expect(outcome).toEqual({ sent: 0, answered: 0, error: null })
  })

  test('meldet die offenen Marken und hakt sie mit dem Stand des Servers ab', async () => {
    const store = fakeSeenStore([list('l1', { seenAt: MIDDLE }), list('l2', { seenAt: MIDDLE, seenPushedAt: EARLY })])
    const gesendet: SeenMark[][] = []

    const outcome = await pushSeenMarksQuietly(store, (marks) => {
      gesendet.push([...marks])
      // l2 kennt der Server schon neuer, von einem anderen Gerät.
      return Promise.resolve({ marks: [{ listId: 'l1', seenAt: MIDDLE }, { listId: 'l2', seenAt: LATE }] })
    })

    expect(gesendet).toEqual([[{ listId: 'l1', seenAt: MIDDLE }, { listId: 'l2', seenAt: MIDDLE }]])
    expect(outcome).toEqual({ sent: 2, answered: 2, error: null })
    expect(store.lists.get('l2')?.seenAt).toBe(LATE)
    expect(isPending(store, 'l1')).toBe(false)
    expect(isPending(store, 'l2')).toBe(false)
  })

  test('was der Server nicht annimmt, gilt trotzdem als gemeldet', async () => {
    // Sonst ginge es bei jedem Abgleich erneut hinaus, ohne je anzukommen.
    const store = fakeSeenStore([list('lokal', { seenAt: MIDDLE })])

    await pushSeenMarksQuietly(store, () => Promise.resolve({ marks: [] }))

    expect(store.lists.get('lokal')?.seenAt).toBe(MIDDLE)
    expect(store.lists.get('lokal')?.seenPushedAt).toBe(MIDDLE)
  })

  test('ein vom Server gekappter Zeitpunkt läuft nicht in eine Schleife', async () => {
    // Die Geräteuhr geht vor: gemeldet LATE, der Server kappt auf MIDDLE.
    const store = fakeSeenStore([list('l1', { seenAt: LATE })])

    await pushSeenMarksQuietly(store, () => Promise.resolve({ marks: [{ listId: 'l1', seenAt: MIDDLE }] }))

    expect(store.lists.get('l1')?.seenAt).toBe(LATE)
    expect(isPending(store, 'l1')).toBe(false)
  })

  test('ein Netzfehler wirft nicht, die Marke bleibt offen', async () => {
    const store = fakeSeenStore([list('l1', { seenAt: MIDDLE })])

    const outcome = await pushSeenMarksQuietly(store, () => Promise.reject(new Error('offline')))

    expect(outcome.sent).toBe(1)
    expect(outcome.error).not.toBeNull()
    expect(isPending(store, 'l1')).toBe(true)
  })

  test('eine Antwort ohne die erwartete Form hakt nichts ab', async () => {
    const store = fakeSeenStore([list('l1', { seenAt: MIDDLE })])

    for (const antwort of [null, 'ok', {}, { marks: 'alle' }]) {
      const outcome = await pushSeenMarksQuietly(store, () => Promise.resolve(antwort))
      expect(outcome.error).not.toBeNull()
    }

    expect(isPending(store, 'l1')).toBe(true)
  })

  test('ein Fehler beim Lesen der lokalen Datenbank wirft ebenfalls nicht', async () => {
    const store: SeenStore = { ...fakeSeenStore([]), readPendingSeenMarks: () => Promise.reject(new Error('gesperrt')) }

    const outcome = await pushSeenMarksQuietly(store, () => Promise.resolve({ marks: [] }))

    expect(outcome.error).not.toBeNull()
  })

  test('ein Blick während des Meldens bleibt für den nächsten Lauf offen', async () => {
    const store = fakeSeenStore([list('l1', { seenAt: MIDDLE })])

    await pushSeenMarksQuietly(store, async () => {
      // Die Liste wird geöffnet, während die Anfrage unterwegs ist.
      await store.rows.lists.mutate('l1', local => (local === undefined ? null : { ...local, seenAt: LATE }))
      return { marks: [{ listId: 'l1', seenAt: MIDDLE }] }
    })

    expect(store.lists.get('l1')?.seenAt).toBe(LATE)
    expect(store.lists.get('l1')?.seenPushedAt).toBe(MIDDLE)
    expect(isPending(store, 'l1')).toBe(true)
  })

  test('höchstens so viele Marken je Anfrage, wie der Server annimmt', async () => {
    const rows = Array.from({ length: MAX_SEEN_MARKS_PER_PUSH + 3 }, (_, index) => list(`l${index}`, { seenAt: MIDDLE }))
    const store = fakeSeenStore(rows)
    let groesse = 0

    await pushSeenMarksQuietly(store, (marks) => {
      groesse = marks.length
      return Promise.resolve({ marks: [] })
    })

    expect(groesse).toBe(MAX_SEEN_MARKS_PER_PUSH)
    expect([...store.lists.keys()].filter(id => isPending(store, id))).toHaveLength(3)
  })
})

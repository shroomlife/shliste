/**
 * Die Regeln der Waisenrettung, Fall für Fall wie `OrphanPolicyTest` der
 * Android-App. Dazu der Sammler, der die Ids eines vollen Abrufs über alle
 * Seiten zusammenträgt.
 */
import { describe, expect, test } from 'bun:test'
import { createServerIdCollector, findOrphans, settle, type RejectedIds } from './orphan-policy'

function rejected(overrides: Partial<RejectedIds> = {}): RejectedIds {
  return { lists: [], listItems: [], recipes: [], recipeIngredients: [], recipeSteps: [], badges: [], ...overrides }
}

describe('findOrphans', () => {
  test('eine saubere lokale Zeile, die der Server nicht geliefert hat, ist eine Waise', () => {
    const orphans = findOrphans(
      { LIST: new Set(['l1', 'l2']) },
      { LIST: new Set(['l1']) },
      [],
    )
    expect(orphans).toEqual([{ table: 'LIST', id: 'l2' }])
  })

  test('was der Server geliefert hat, ist nie eine Waise', () => {
    const orphans = findOrphans(
      { ITEM: new Set(['i1']), BADGE: new Set(['b1']) },
      { ITEM: new Set(['i1']), BADGE: new Set(['b1']) },
      [],
    )
    expect(orphans).toEqual([])
  })

  test('Eltern kommen vor ihren Kindern, damit der Server sie einordnen kann', () => {
    const orphans = findOrphans(
      {
        STEP: new Set(['s1']),
        ITEM: new Set(['i1']),
        RECIPE: new Set(['r1']),
        LIST: new Set(['l1']),
      },
      {},
      [],
    )
    expect(orphans.map(ref => ref.table)).toEqual(['LIST', 'ITEM', 'RECIPE', 'STEP'])
  })

  test('eine schon einmal gesicherte Zeile geht nie ein zweites Mal hinaus', () => {
    const orphans = findOrphans(
      { LIST: new Set(['l1', 'l2']) },
      {},
      [{ table: 'LIST', id: 'l1' }],
    )
    expect(orphans).toEqual([{ table: 'LIST', id: 'l2' }])
  })

  test('innerhalb einer Tabelle nach Zeichenreihenfolge der Id', () => {
    const orphans = findOrphans({ ITEM: new Set(['b', 'B', 'a']) }, {}, [])
    expect(orphans.map(ref => ref.id)).toEqual(['B', 'a', 'b'])
  })
})

describe('settle', () => {
  test('nach dem Push geht Abgelehntes in Quarantäne, der Rest gilt als gerettet', () => {
    const pending = [{ table: 'LIST', id: 'l1' }, { table: 'ITEM', id: 'i1' }] as const
    const result = settle(pending, pending, rejected({ listItems: ['i1'] }))
    expect(result.restored).toEqual([{ table: 'LIST', id: 'l1' }])
    expect(result.quarantined).toEqual([{ table: 'ITEM', id: 'i1' }])
  })

  test('eine offene Zeile, die nicht in diesem Push war, bleibt offen', () => {
    const result = settle([{ table: 'RECIPE', id: 'r1' }], [], rejected({ recipes: ['r1'] }))
    expect(result.restored).toEqual([])
    expect(result.quarantined).toEqual([])
  })

  test('dieselbe Id in einer anderen Tabelle zählt nicht als abgelehnt', () => {
    const pending = [{ table: 'INGREDIENT', id: 'x' }] as const
    const result = settle(pending, pending, rejected({ recipeSteps: ['x'] }))
    expect(result.restored).toEqual([{ table: 'INGREDIENT', id: 'x' }])
    expect(result.quarantined).toEqual([])
  })
})

describe('createServerIdCollector', () => {
  test('sammelt über alle Seiten, samt Kindern', () => {
    const collector = createServerIdCollector()
    collector.add({
      lists: [{ id: 'l1', items: [{ id: 'i1' }] }],
      recipes: [{ id: 'r1', ingredients: [{ id: 'g1' }], steps: [{ id: 's1' }] }],
      badges: [],
    })
    collector.add({ lists: [{ id: 'l2', items: [{ id: 'i2' }] }], recipes: [], badges: [{ id: 'b1' }] })

    const ids = collector.snapshot()
    expect([...ids.LIST]).toEqual(['l1', 'l2'])
    expect([...ids.ITEM]).toEqual(['i1', 'i2'])
    expect([...ids.RECIPE]).toEqual(['r1'])
    expect([...ids.INGREDIENT]).toEqual(['g1'])
    expect([...ids.STEP]).toEqual(['s1'])
    expect([...ids.BADGE]).toEqual(['b1'])
  })

  test('der Schnappschuss ändert sich nicht mehr, wenn danach weitere Seiten kommen', () => {
    const collector = createServerIdCollector()
    const vorher = collector.snapshot()
    collector.add({ lists: [{ id: 'l1', items: [] }], recipes: [], badges: [] })
    expect(vorher.LIST.size).toBe(0)
  })
})

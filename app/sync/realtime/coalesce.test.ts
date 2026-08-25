/**
 * Vertrag der Bündelung.
 *
 * Die beiden Regeln, an denen alles hängt: `list_changed` ist die Obermenge von
 * `item_changed` und schlägt es deshalb, und `list_removed` bleibt eigenständig
 * stehen. Fiele die Entfernung einer Änderung zum Opfer, bliebe die Liste
 * lokal für immer sichtbar.
 */
import { describe, expect, test } from 'bun:test'
import type { RealtimeEvent } from './events'
import { coalesceEvents, coalesceKeyFor, createEventCoalescer, mergeEvents } from './coalesce'

const LIST_A = 'a0000000-0000-4000-8000-00000000000a'
const LIST_B = 'a0000000-0000-4000-8000-00000000000b'
const RECIPE = 'a0000000-0000-4000-8000-00000000000c'

function itemChanged(listId: string, itemIds: string[], listUpdatedAt: string | null = null): RealtimeEvent {
  return { type: 'item_changed', listId, itemIds, listUpdatedAt }
}

describe('coalesceKeyFor', () => {
  test('teilt einen Schlüssel für Positions- und Listenänderung', () => {
    expect(coalesceKeyFor(itemChanged(LIST_A, ['i1']))).toBe(`list:${LIST_A}`)
    expect(coalesceKeyFor({ type: 'list_changed', listId: LIST_A })).toBe(`list:${LIST_A}`)
  })

  test('gibt der Entfernung einen eigenen Schlüssel', () => {
    expect(coalesceKeyFor({ type: 'list_removed', listId: LIST_A })).toBe(`list-removed:${LIST_A}`)
  })

  test('schlüsselt Rezepte je Rezept', () => {
    expect(coalesceKeyFor({ type: 'recipe_changed', recipeId: RECIPE })).toBe(`recipe:${RECIPE}`)
  })

  test('schlüsselt den Rest je Ereignistyp', () => {
    expect(coalesceKeyFor({ type: 'sync_needed' })).toBe('other:sync_needed')
    expect(coalesceKeyFor({ type: 'badge_changed' })).toBe('other:badge_changed')
    expect(coalesceKeyFor({ type: 'member_invited', listId: LIST_A })).toBe('other:member_invited')
  })
})

describe('mergeEvents', () => {
  test('list_changed schlägt item_changed in beide Richtungen', () => {
    const listChanged: RealtimeEvent = { type: 'list_changed', listId: LIST_A }

    expect(mergeEvents(itemChanged(LIST_A, ['i1']), listChanged)).toEqual(listChanged)
    expect(mergeEvents(listChanged, itemChanged(LIST_A, ['i1']))).toEqual(listChanged)
  })

  test('vereinigt die Ids zweier Positionsänderungen', () => {
    const merged = mergeEvents(itemChanged(LIST_A, ['i1', 'i2']), itemChanged(LIST_A, ['i2', 'i3']))

    expect(merged).toEqual(itemChanged(LIST_A, ['i1', 'i2', 'i3']))
  })

  test('nimmt sonst das jüngere Ereignis', () => {
    const older: RealtimeEvent = { type: 'recipe_changed', recipeId: RECIPE }
    const newer: RealtimeEvent = { type: 'recipe_changed', recipeId: RECIPE }

    expect(mergeEvents(older, newer)).toBe(newer)
  })
})

describe('coalesceEvents', () => {
  test('macht aus vielen Positionsänderungen einen Hinweis je Liste', () => {
    const result = coalesceEvents([
      itemChanged(LIST_A, ['i1']),
      itemChanged(LIST_A, ['i2']),
      itemChanged(LIST_B, ['i3']),
      itemChanged(LIST_A, ['i1']),
    ])

    expect(result).toEqual([
      itemChanged(LIST_A, ['i1', 'i2']),
      itemChanged(LIST_B, ['i3']),
    ])
  })

  test('lässt list_changed über item_changed derselben Liste gewinnen', () => {
    const result = coalesceEvents([
      itemChanged(LIST_A, ['i1']),
      { type: 'list_changed', listId: LIST_A },
      itemChanged(LIST_A, ['i2']),
    ])

    expect(result).toEqual([{ type: 'list_changed', listId: LIST_A }])
  })

  test('lässt die Entfernung neben der Änderung stehen', () => {
    const result = coalesceEvents([
      { type: 'list_removed', listId: LIST_A },
      { type: 'list_changed', listId: LIST_A },
      itemChanged(LIST_A, ['i1']),
    ])

    expect(result).toHaveLength(2)
    expect(result).toEqual([
      { type: 'list_removed', listId: LIST_A },
      { type: 'list_changed', listId: LIST_A },
    ])
  })

  test('behält die Reihenfolge des ersten Auftretens', () => {
    const result = coalesceEvents([
      { type: 'list_removed', listId: LIST_B },
      { type: 'recipe_changed', recipeId: RECIPE },
      itemChanged(LIST_A, ['i1']),
      { type: 'recipe_changed', recipeId: RECIPE },
    ])

    expect(result).toEqual([
      { type: 'list_removed', listId: LIST_B },
      { type: 'recipe_changed', recipeId: RECIPE },
      itemChanged(LIST_A, ['i1']),
    ])
  })

  test('fasst mehrere Einladungen zu einem Hinweis zusammen', () => {
    // Absicht: Der Aufrufer holt daraufhin ALLE offenen Einladungen, nicht die
    // eine. Zwei Hinweise wären zwei gleiche Abrufe.
    const result = coalesceEvents([
      { type: 'member_invited', listId: LIST_A },
      { type: 'member_invited', listId: LIST_B },
    ])

    expect(result).toEqual([{ type: 'member_invited', listId: LIST_B }])
  })

  test('lässt eine leere Folge leer', () => {
    expect(coalesceEvents([])).toEqual([])
  })
})

describe('createEventCoalescer', () => {
  test('liefert nicht sofort, sondern erst beim Fenster-Ende', () => {
    const batches: RealtimeEvent[][] = []
    const coalescer = createEventCoalescer(events => batches.push(events), 10_000)

    coalescer.push(itemChanged(LIST_A, ['i1']))
    coalescer.push(itemChanged(LIST_A, ['i2']))
    expect(batches).toHaveLength(0)

    coalescer.flush()
    expect(batches).toEqual([[itemChanged(LIST_A, ['i1', 'i2'])]])

    coalescer.cancel()
  })

  test('flush ohne Inhalt liefert nichts', () => {
    const batches: RealtimeEvent[][] = []
    const coalescer = createEventCoalescer(events => batches.push(events), 10_000)

    coalescer.flush()
    coalescer.flush()

    expect(batches).toHaveLength(0)
  })

  test('cancel verwirft Gesammeltes und den Zeitgeber', async () => {
    const batches: RealtimeEvent[][] = []
    const coalescer = createEventCoalescer(events => batches.push(events), 1)

    coalescer.push(itemChanged(LIST_A, ['i1']))
    coalescer.cancel()

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    })

    expect(batches).toHaveLength(0)
  })

  test('liefert nach Ablauf des Fensters von selbst', async () => {
    const batches: RealtimeEvent[][] = []
    const coalescer = createEventCoalescer(events => batches.push(events), 1)

    coalescer.push({ type: 'sync_needed' })
    coalescer.push({ type: 'sync_needed' })

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    })

    expect(batches).toEqual([[{ type: 'sync_needed' }]])

    coalescer.cancel()
  })
})

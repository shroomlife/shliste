/**
 * Der Vertrag des Umsortierens.
 *
 * Zwei Eigenschaften tragen alles:
 *
 * 1. EINE VERSCHIEBUNG SCHREIBT EINE ZEILE. Alles andere wäre eine Änderung je
 *    Zeile im Abgleich — und bei zwei gleichzeitig sortierenden Geräten eine
 *    Kollision je Zeile statt keiner.
 * 2. DIE SICHTBARE REIHENFOLGE STIMMT DANACH. Geprüft wird nicht, welche
 *    Schlüssel entstehen (die sind ein Implementierungsdetail), sondern wie die
 *    Liste anschliessend dasteht.
 *
 * Die Zählweise von `toIndex` ist die von Sortable.js: die Position in der
 * Liste OHNE die gezogene Zeile. Ein Vertippen daran verschiebt um eins
 * daneben, und genau das fällt ohne Test niemandem auf.
 */
import { describe, expect, test } from 'bun:test'
import { planMoveTo, type OrderedRow } from './reorder'

/** Wendet einen Plan an und gibt die neue sichtbare Reihenfolge zurück. */
function apply(rows: readonly OrderedRow[], id: string, toIndex: number): string[] {
  const plan = planMoveTo(rows, id, toIndex)
  if (plan === null) return rows.map(row => row.id)

  const keys = new Map(plan.normalized.map(row => [row.id, row.sortKey]))
  keys.set(plan.moved.id, plan.moved.sortKey)

  return [...rows]
    .map(row => ({ id: row.id, sortKey: keys.get(row.id) ?? row.sortKey ?? '' }))
    // Dieselbe Regel wie `compareByManualOrder`: Zeichenordnung, keine
    // sprachabhängige Kollation.
    .sort((a, b) => a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0)
    .map(row => row.id)
}

/** Vier Zeilen ohne Schlüssel — der Zustand jeder frisch angelegten Liste. */
const FRESH: OrderedRow[] = [
  { id: 'a', sortKey: null },
  { id: 'b', sortKey: null },
  { id: 'c', sortKey: null },
  { id: 'd', sortKey: null },
]

describe('planMoveTo', () => {
  test('ohne Schlüssel bekommen zuerst alle Zeilen einen', () => {
    const plan = planMoveTo(FRESH, 'd', 0)

    expect(plan?.normalized).toHaveLength(4)
    expect(plan?.normalized.map(row => row.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('sind Schlüssel vorhanden, wird nur eine Zeile geschrieben', () => {
    const rows: OrderedRow[] = [
      { id: 'a', sortKey: 'a0' },
      { id: 'b', sortKey: 'a1' },
      { id: 'c', sortKey: 'a2' },
    ]

    const plan = planMoveTo(rows, 'c', 0)

    expect(plan?.normalized).toEqual([])
    expect(plan?.moved.id).toBe('c')
  })

  test('an den Anfang ziehen', () => {
    expect(apply(FRESH, 'd', 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  test('ans Ende ziehen', () => {
    expect(apply(FRESH, 'a', 3)).toEqual(['b', 'c', 'd', 'a'])
  })

  test('in die Mitte ziehen, von oben nach unten', () => {
    // 'a' landet an Position 2 der Liste OHNE 'a' — also zwischen 'c' und 'd'.
    expect(apply(FRESH, 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  test('in die Mitte ziehen, von unten nach oben', () => {
    expect(apply(FRESH, 'd', 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  test('eine Verschiebung um eine Stelle stimmt auch', () => {
    expect(apply(FRESH, 'b', 2)).toEqual(['a', 'c', 'b', 'd'])
    expect(apply(FRESH, 'c', 1)).toEqual(['a', 'c', 'b', 'd'])
  })

  test('auf die eigene Stelle ziehen ergibt keinen Plan', () => {
    expect(planMoveTo(FRESH, 'b', 1)).toBeNull()
  })

  test('ausserhalb der Liste ergibt keinen Plan', () => {
    expect(planMoveTo(FRESH, 'a', -1)).toBeNull()
    expect(planMoveTo(FRESH, 'a', 4)).toBeNull()
  })

  test('eine unbekannte Zeile ergibt keinen Plan', () => {
    expect(planMoveTo(FRESH, 'gibtsnicht', 0)).toBeNull()
  })

  test('eine einzelne Zeile lässt sich nicht verschieben', () => {
    expect(planMoveTo([{ id: 'a', sortKey: null }], 'a', 0)).toBeNull()
  })

  test('mehrere Verschiebungen hintereinander bleiben stimmig', () => {
    // Der Härtetest: Nach der Normalisierung wird weitergezogen, und zwar
    // immer nur mit einer geschriebenen Zeile.
    let rows: OrderedRow[] = FRESH.map(row => ({ ...row }))

    const move = (id: string, toIndex: number): string[] => {
      const plan = planMoveTo(rows, id, toIndex)
      if (plan === null) return rows.map(row => row.id)

      const keys = new Map(plan.normalized.map(row => [row.id, row.sortKey]))
      keys.set(plan.moved.id, plan.moved.sortKey)

      rows = rows
        .map(row => ({ id: row.id, sortKey: keys.get(row.id) ?? row.sortKey ?? '' }))
        .sort((a, b) => a.sortKey < b.sortKey ? -1 : 1)

      return rows.map(row => row.id)
    }

    expect(move('d', 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(move('d', 3)).toEqual(['a', 'b', 'c', 'd'])
    expect(move('b', 0)).toEqual(['b', 'a', 'c', 'd'])
    expect(move('c', 1)).toEqual(['b', 'c', 'a', 'd'])
  })

  test('ein leerer Schlüssel gilt wie keiner', () => {
    // So etwas entsteht, wenn ein Schlüssel die Längenbegrenzung der API
    // gerissen hat und bewusst leer gespeichert wurde.
    const rows: OrderedRow[] = [
      { id: 'a', sortKey: 'a0' },
      { id: 'b', sortKey: '' },
    ]

    expect(planMoveTo(rows, 'b', 0)?.normalized).toHaveLength(2)
  })
})

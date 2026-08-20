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
import { nextSortKey, planMoveTo, type OrderedRow } from './reorder'

/** Wendet einen Plan an und gibt die neue sichtbare Reihenfolge zurück. */
function apply(
  rows: readonly OrderedRow[],
  id: string,
  toIndex: number,
  group: readonly OrderedRow[] = rows,
): string[] {
  const plan = planMoveTo(rows, group, id, toIndex)
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
    const plan = planMoveTo(FRESH, FRESH, 'd', 0)

    expect(plan?.normalized).toHaveLength(4)
    expect(plan?.normalized.map(row => row.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('sind Schlüssel vorhanden, wird nur eine Zeile geschrieben', () => {
    const rows: OrderedRow[] = [
      { id: 'a', sortKey: 'a0' },
      { id: 'b', sortKey: 'a1' },
      { id: 'c', sortKey: 'a2' },
    ]

    const plan = planMoveTo(rows, rows, 'c', 0)

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
    expect(planMoveTo(FRESH, FRESH, 'b', 1)).toBeNull()
  })

  test('ausserhalb der Liste ergibt keinen Plan', () => {
    expect(planMoveTo(FRESH, FRESH, 'a', -1)).toBeNull()
    expect(planMoveTo(FRESH, FRESH, 'a', 4)).toBeNull()
  })

  test('eine unbekannte Zeile ergibt keinen Plan', () => {
    expect(planMoveTo(FRESH, FRESH, 'gibtsnicht', 0)).toBeNull()
  })

  test('eine einzelne Zeile lässt sich nicht verschieben', () => {
    expect(planMoveTo([{ id: 'a', sortKey: null }], [{ id: 'a', sortKey: null }], 'a', 0)).toBeNull()
  })

  test('mehrere Verschiebungen hintereinander bleiben stimmig', () => {
    // Der Härtetest: Nach der Normalisierung wird weitergezogen, und zwar
    // immer nur mit einer geschriebenen Zeile.
    let rows: OrderedRow[] = FRESH.map(row => ({ ...row }))

    const move = (id: string, toIndex: number): string[] => {
      const plan = planMoveTo(rows, rows, id, toIndex)
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

    expect(planMoveTo(rows, rows, 'b', 0)?.normalized).toHaveLength(2)
  })
})

describe('nextSortKey', () => {
  test('die erste Zeile einer Liste bekommt den Startschlüssel', () => {
    expect(nextSortKey([])).toBe('aV')
  })

  test('ohne einen einzigen Schlüssel zählt der Startschlüssel', () => {
    // Der Fall "Liste hat noch gar keine Schlüssel": Der linke Nachbar ist
    // dann `null`, nicht etwa der leere String — mit dem käme
    // `generateKeyBetween` nicht weiter.
    expect(nextSortKey(FRESH)).toBe('aV')
  })

  test('ein neuer Eintrag landet hinter dem grössten vorhandenen Schlüssel', () => {
    // Nur der Schlüssel zählt: `nextSortKey` fragt nichts anderes ab.
    const key = nextSortKey([
      { sortKey: 'a0' },
      { sortKey: 'a1' },
    ])

    expect(key > 'a1').toBe(true)
  })

  test('massgeblich ist der grösste Schlüssel, nicht der der letzten Zeile', () => {
    // Halb normalisiert: Die hinteren Zeilen haben noch keinen Schlüssel. Wer
    // stattdessen den der letzten Zeile nähme, bekäme `null` und landete vorn.
    const key = nextSortKey([
      { sortKey: 'a0' },
      { sortKey: 'a1' },
      { sortKey: null },
    ])

    expect(key > 'a1').toBe(true)
  })

  test('ein leerer Schlüssel gilt wie keiner', () => {
    expect(nextSortKey([{ sortKey: '' }])).toBe('aV')
  })

  test('mehrfaches Anlegen bleibt aufsteigend', () => {
    // So entsteht eine Liste im Betrieb: Eintrag für Eintrag, jeder hinter dem
    // vorherigen. Gäbe es hier eine Wiederholung, stünden zwei Einträge auf
    // demselben Platz.
    const rows: OrderedRow[] = []
    for (let index = 0; index < 5; index++) {
      rows.push({ id: `row-${index}`, sortKey: nextSortKey(rows) })
    }

    const keys = rows.map(row => row.sortKey)
    expect(keys).toEqual([...keys].sort())
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('Blöcke aus offenen und erledigten Einträgen', () => {
  const OPEN: OrderedRow[] = [
    { id: 'offen-1', sortKey: null },
    { id: 'offen-2', sortKey: null },
  ]

  const DONE: OrderedRow[] = [
    { id: 'erledigt-1', sortKey: null },
    { id: 'erledigt-2', sortKey: null },
  ]

  const ALL: OrderedRow[] = [...OPEN, ...DONE]

  test('normalisiert über die ganze Liste, nicht je Block', () => {
    // Der alte Fehler: Wurde je Block normalisiert, lieferte
    // generateNKeysBetween(null, null, …) beiden dieselbe Folge, und der erste
    // offene Eintrag trug denselben Schlüssel wie der erste erledigte.
    const plan = planMoveTo(ALL, DONE, 'erledigt-2', 0)

    expect(plan?.normalized).toHaveLength(ALL.length)

    const keys = new Map((plan?.normalized ?? []).map(row => [row.id, row.sortKey]))
    keys.set(plan?.moved.id ?? '', plan?.moved.sortKey ?? '')
    expect(new Set(keys.values()).size).toBe(ALL.length)
  })

  test('innerhalb des erledigten Blocks verschiebt es nur dort', () => {
    expect(apply(ALL, 'erledigt-2', 0, DONE))
      .toEqual(['offen-1', 'offen-2', 'erledigt-2', 'erledigt-1'])
  })

  /*
   * REGRESSION: Ein abgehakter Eintrag behält seinen Schlüssel, rutscht in der
   * Anzeige aber nach hinten. Die zusammengesetzte Liste ist dann NICHT mehr
   * schlüsselaufsteigend.
   *
   * Wurde sie trotzdem für die Nachbarn benutzt, warf jedes vierte Ziehen
   * "a >= b" — und der Wurf landete stumm in einem catch, das nur protokolliert.
   * Die Fälle, die nicht warfen, erzeugten doppelte Schlüssel.
   */
  const MIT_ABGEHAKTEM: OrderedRow[] = [
    { id: 'B', sortKey: 'aW' },
    { id: 'C', sortKey: 'aX' },
    // A wurde zuerst angelegt (aV) und dann abgehakt: in der Anzeige hinten,
    // im Schlüsselraum aber ganz vorn.
    { id: 'A', sortKey: 'aV' },
  ]
  const OFFEN: OrderedRow[] = [
    { id: 'B', sortKey: 'aW' },
    { id: 'C', sortKey: 'aX' },
  ]

  test('ein abgehakter Eintrag vor den offenen bricht das Ziehen nicht', () => {
    const plan = planMoveTo(MIT_ABGEHAKTEM, OFFEN, 'B', 1)

    expect(plan).not.toBeNull()
    // B rutscht hinter C, der Schlüssel muss also grösser als der von C sein.
    expect((plan?.moved.sortKey ?? '') > 'aX').toBe(true)
  })

  test('dabei entsteht kein Schlüssel, den es schon gibt', () => {
    const plan = planMoveTo(MIT_ABGEHAKTEM, OFFEN, 'C', 0)

    expect(plan).not.toBeNull()
    expect(['aV', 'aW', 'aX']).not.toContain(plan?.moved.sortKey)
  })

  test('auch die zusammengesetzte Liste als Block wirft nicht mehr', () => {
    // Genau dieser Aufruf hat den Fehler ausgelöst: Nachbarn aus einer Liste,
    // die nicht schlüsselaufsteigend ist. Seit die Nachbarn global bestimmt
    // werden, ist die Reihenfolge des Blocks dafür unerheblich.
    expect(() => planMoveTo(MIT_ABGEHAKTEM, MIT_ABGEHAKTEM, 'B', 1)).not.toThrow()
  })

  test('kein Zug in einer Liste mit Abgehaktem erzeugt eine Kollision', () => {
    // Erschöpfend statt stichprobenartig: jede Zeile an jede Position des
    // offenen Blocks. Vorher warf rund ein Viertel davon oder erzeugte
    // Doppelte — beides stumm.
    for (const row of OFFEN) {
      for (let toIndex = 0; toIndex < OFFEN.length; toIndex += 1) {
        const plan = planMoveTo(MIT_ABGEHAKTEM, OFFEN, row.id, toIndex)
        if (plan === null) continue

        const keys = MIT_ABGEHAKTEM
          .filter(entry => entry.id !== row.id)
          .map(entry => entry.sortKey)
        expect(keys).not.toContain(plan.moved.sortKey)
      }
    }
  })
})

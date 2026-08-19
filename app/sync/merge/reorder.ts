/**
 * Umsortieren von Hand — welche Zeile bekommt welchen Sortierschlüssel.
 *
 * WARUM BRUCHINDIZES UND KEINE FORTLAUFENDEN ZAHLEN: Beim Verschieben einer
 * Zeile zwischen zwei andere entsteht ein Schlüssel, der genau dazwischen
 * liegt (`generateKeyBetween`). Nur DIESE eine Zeile wird geschrieben — mit
 * fortlaufenden Zahlen müssten alle folgenden neu nummeriert werden, und jede
 * davon ginge als eigene Änderung in den Abgleich. Bei zwei Geräten, die
 * gleichzeitig sortieren, wäre das eine Kollision je Zeile statt keiner.
 *
 * DIE EINMALIGE NORMALISIERUNG: Zeilen ohne Schlüssel stehen laut
 * `compareByManualOrder` hinten und werden über `orderIndex` geordnet. Bekäme
 * eine einzelne davon einen Schlüssel, spränge sie schlagartig nach vorn.
 * Deshalb bekommen beim ersten Verschieben ALLE Zeilen einen Schlüssel, und
 * zwar in genau der Reihenfolge, in der sie gerade zu sehen sind. Das ist ein
 * einmaliger Preis je Liste.
 *
 * Rein und ohne Datenbank: Das Verschieben ist die Stelle, an der eine
 * Reihenfolge unbemerkt kaputtgehen kann, und genau deshalb ohne Browser
 * prüfbar.
 */
import { generateKeyBetween, generateNKeysBetween } from './fractional-index'

/** Was diese Funktion von einer Zeile braucht. */
export interface OrderedRow {
  readonly id: string
  readonly sortKey: string | null
}

export interface ReorderPlan {
  /**
   * Zeilen, die einen Schlüssel bekommen, weil in dieser Liste noch keiner
   * vergeben war. Leer, sobald einmal sortiert wurde.
   */
  normalized: { id: string, sortKey: string }[]
  /** Die verschobene Zeile mit ihrem neuen Schlüssel. */
  moved: { id: string, sortKey: string }
}

/**
 * Berechnet die Schlüssel für eine Verschiebung an eine beliebige Stelle.
 *
 * `rows` ist die Liste in der Reihenfolge, in der sie gerade angezeigt wird.
 * `toIndex` ist die Position, an der die Zeile danach stehen soll — gezählt in
 * der Liste OHNE die verschobene Zeile, genau wie Sortable.js es meldet.
 *
 * `null` heisst "nichts zu tun": unbekannte Zeile, Ziel ausserhalb der Liste,
 * oder die Zeile liegt bereits dort.
 */
export function planMoveTo(
  rows: readonly OrderedRow[],
  id: string,
  toIndex: number,
): ReorderPlan | null {
  const from = rows.findIndex(row => row.id === id)
  if (from === -1) return null
  if (toIndex < 0 || toIndex >= rows.length) return null
  if (toIndex === from) return null

  // Erst dafür sorgen, dass jede Zeile einen Schlüssel hat.
  const needsNormalizing = rows.some(row => row.sortKey === null || row.sortKey === '')
  const keys = needsNormalizing
    ? generateNKeysBetween(null, null, rows.length)
    : rows.map(row => row.sortKey as string)

  const normalized = needsNormalizing
    ? rows.map((row, position) => ({ id: row.id, sortKey: keys[position] as string }))
    : []

  // Die Zeile herausnehmen: Erst danach stehen die beiden Nachbarn fest,
  // zwischen die der neue Schlüssel gehört.
  const without = keys.filter((_, position) => position !== from)
  const left = toIndex === 0 ? null : without[toIndex - 1] ?? null
  const right = without[toIndex] ?? null

  return {
    normalized,
    moved: { id, sortKey: generateKeyBetween(left, right) },
  }
}

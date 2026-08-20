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
 * Der Sortierschlüssel für eine neu angelegte Zeile: hinter allen bestehenden.
 *
 * WARUM SOFORT UND NICHT ERST BEIM UMSORTIEREN: Die Android-App vergibt beim
 * Anlegen IMMER einen (`ListStore.addItemToList`). Täte das Web es nicht,
 * lägen seine Einträge in einer geteilten Liste im Resttopf "ohne Schlüssel".
 * Der steht auf beiden Seiten hinten (`compareByManualOrder` hier, `sortKey IS
 * NULL` in der ORDER-BY-Klausel des Android-DAO), INNERHALB des Topfes
 * entscheidet aber `orderIndex` — und den bilden die beiden Clients
 * unterschiedlich: Android nimmt die Anzahl der Einträge, das Web den grössten
 * vorhandenen Wert plus eins. Nach der ersten Löschung laufen die Folgen
 * auseinander, und dieselbe Liste steht auf zwei Geräten verschieden da.
 * Mit einem Schlüssel ab dem ersten Moment gibt es diesen Topf gar nicht erst.
 *
 * Der linke Nachbar ist der GRÖSSTE vorhandene Schlüssel und nicht der der
 * letzten Zeile: Eine Liste kann teils normalisiert sein, dann haben gerade
 * die hinteren Zeilen keinen. Der grösste Schlüssel ist der letzte belegte
 * Platz, und dahinter gehört der neue Eintrag. Hat keine einzige Zeile einen,
 * ist der linke Nachbar `null` und es entsteht der Startschlüssel.
 *
 * Ein leerer Schlüssel gilt wie keiner — dieselbe Regel wie in `planMoveTo`.
 */
export function nextSortKey(rows: readonly Pick<OrderedRow, 'sortKey'>[]): string {
  let highest: string | null = null

  for (const row of rows) {
    const key = row.sortKey
    if (key === null || key === '') continue
    if (highest === null || key > highest) highest = key
  }

  return generateKeyBetween(highest, null)
}

/**
 * Berechnet die Schlüssel für eine Verschiebung an eine beliebige Stelle.
 *
 * ZWEI LISTEN, DREI AUFGABEN — und sie zu vermischen war ein echter Fehler:
 *
 * `groupRows` ist der Block, in dem gezogen wurde, und `toIndex` zählt darin.
 * Er beantwortet die Frage NEBEN WEN die Zeile gehört.
 *
 * `allRows` ist die vollständige Liste. Sie wird für zwei Dinge gebraucht: für
 * die einmalige Normalisierung (liefe die je Block, bekämen der erste offene
 * und der erste erledigte Eintrag denselben Schlüssel) und für die Frage,
 * WELCHE SCHLÜSSEL an der Zielstelle tatsächlich anliegen.
 *
 * Die Ansicht zeigt offene Einträge vor erledigten, die Schlüssel bleiben beim
 * Abhaken aber unverändert. Die zusammengesetzte Liste ist deshalb NICHT
 * schlüsselaufsteigend, und ein abgehakter Eintrag kann im Schlüsselraum
 * mitten zwischen zwei offenen liegen. Beide Vereinfachungen sind schon
 * schiefgegangen: nur der Block ergibt Schlüssel, die mit dem anderen Block
 * kollidieren; nur die Gesamtliste ergibt Nachbarn in verkehrter Reihenfolge,
 * woraufhin `generateKeyBetween` wirft.
 *
 * Bei einer Liste ohne Blöcke (Zutaten, Rezeptschritte) ist `groupRows`
 * schlicht `allRows`.
 *
 * `null` heisst "nichts zu tun": unbekannte Zeile, Ziel ausserhalb des Blocks,
 * oder die Zeile liegt bereits dort.
 */
export function planMoveTo(
  allRows: readonly OrderedRow[],
  groupRows: readonly OrderedRow[],
  id: string,
  toIndex: number,
): ReorderPlan | null {
  const from = groupRows.findIndex(row => row.id === id)
  if (from === -1) return null
  if (toIndex < 0 || toIndex >= groupRows.length) return null
  if (toIndex === from) return null

  // Erst dafür sorgen, dass JEDE Zeile der Liste einen Schlüssel hat — nicht
  // nur die des Blocks, sonst kollidieren die Blöcke miteinander.
  const needsNormalizing = allRows.some(row => row.sortKey === null || row.sortKey === '')
  const allKeys = needsNormalizing
    ? generateNKeysBetween(null, null, allRows.length)
    : allRows.map(row => row.sortKey as string)

  const normalized = needsNormalizing
    ? allRows.map((row, position) => ({ id: row.id, sortKey: allKeys[position] as string }))
    : []

  const keyById = new Map(allRows.map((row, position) => [row.id, allKeys[position] as string]))

  // SCHRITT 1 — die Absicht aus dem Block ablesen: hinter wen, vor wen?
  // Nur der Block weiss, was "an Position 2" bedeutet, denn genau ihn hat der
  // Nutzer vor Augen gehabt.
  const groupWithout = groupRows.filter(row => row.id !== id)
  const leftNeighbourId = toIndex === 0 ? null : groupWithout[toIndex - 1]?.id ?? null
  const rightNeighbourId = groupWithout[toIndex]?.id ?? null

  /*
   * SCHRITT 2 — die Nachbarn im GLOBALEN Schlüsselraum bestimmen.
   *
   * WARUM NICHT EINFACH DIE SCHLÜSSEL DER BLOCK-NACHBARN: Zwischen zwei
   * offenen Einträgen kann im Schlüsselraum ein abgehakter liegen — er behält
   * seinen Schlüssel, rutscht in der Anzeige aber in den anderen Block. Würde
   * der neue Schlüssel nur zwischen den beiden Block-Nachbarn gebildet, träfe
   * er womöglich genau dessen Platz. Beispiel: A(aV) abgehakt, offen B(aW) und
   * C(aX); C an den Anfang des offenen Blocks ziehen hiesse "vor B", und
   * zwischen "nichts" und aW liegt eben auch aV.
   *
   * Deshalb: Der Block sagt, NEBEN WEN es geht, und die global sortierte Liste
   * sagt, WELCHE SCHLÜSSEL dort tatsächlich anliegen.
   */
  const ordered = allRows
    .filter(row => row.id !== id)
    .map(row => ({ id: row.id, key: keyById.get(row.id) }))
    .filter((row): row is { id: string, key: string } => row.key !== undefined)
    .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)

  let left: string | null = null
  let right: string | null = null

  if (rightNeighbourId !== null) {
    // Direkt VOR diese Zeile — also zwischen sie und ihren globalen Vorgänger.
    const at = ordered.findIndex(row => row.id === rightNeighbourId)
    if (at === -1) return null
    right = ordered[at]?.key ?? null
    left = at === 0 ? null : ordered[at - 1]?.key ?? null
  }
  else if (leftNeighbourId !== null) {
    // Ans Ende des Blocks — also zwischen diese Zeile und ihren globalen
    // Nachfolger. Der kann aus dem anderen Block stammen, und genau dann ist
    // die globale Sicht der Unterschied zwischen richtig und kollidierend.
    const at = ordered.findIndex(row => row.id === leftNeighbourId)
    if (at === -1) return null
    left = ordered[at]?.key ?? null
    right = at === ordered.length - 1 ? null : ordered[at + 1]?.key ?? null
  }

  return {
    normalized,
    moved: { id, sortKey: generateKeyBetween(left, right) },
  }
}

/**
 * Nachbearbeitung und Cache-Format der AI-Vorschläge.
 *
 * Beides exakt wie in der Android-App (`SuggestionEngine.postProcess` und
 * `lastSuggestedItems`): Der Cache ist ein Semikolon-separierter String am
 * Listen-Datensatz und wird mitsynchronisiert — beide Clients lesen und
 * schreiben dasselbe Feld, deshalb darf das Format hier nicht abweichen.
 *
 * Reine Funktionen, direkt mit `bun test` prüfbar (siehe suggestions.test.ts).
 */

/** Wie viele Vorschläge die Ansicht zeigt — die API liefert genau sieben. */
export const SUGGESTION_COUNT = 7

/**
 * Bereinigt rohe Vorschläge des Modells:
 * trimmen, führende Aufzählungszeichen (-, *, •) entfernen, Leeres verwerfen,
 * case-insensitiv deduplizieren, bereits aktive Einträge herausfiltern.
 */
export function postProcessSuggestions(
  raw: readonly string[],
  activeNames: readonly string[],
): string[] {
  const active = new Set(activeNames.map(name => name.trim().toLowerCase()))
  const seen = new Set<string>()
  const result: string[] = []

  for (const entry of raw) {
    const cleaned = entry.replace(/^[\s\-*•]+/, '').trim()
    if (cleaned.length === 0) continue

    const key = cleaned.toLowerCase()
    if (seen.has(key) || active.has(key)) continue

    seen.add(key)
    result.push(cleaned)
    if (result.length === SUGGESTION_COUNT) break
  }

  return result
}

/** Liest den gesyncten Cache (`lastSuggestedItems`) — leere Teile fallen weg. */
export function splitSuggestionCache(cache: string): string[] {
  return cache
    .split(';')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
}

/** Schreibform des Caches — Semikolon-separiert wie in der Android-App. */
export function joinSuggestionCache(items: readonly string[]): string {
  return items.join(';')
}

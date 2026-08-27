/**
 * Verlauf einer Liste für die AI-Vorschläge.
 *
 * /ai/suggest bekommt neben den aktuellen Einträgen auch `pastItems`: Namen,
 * die früher auf der Liste standen (`removed = true`) — genau dafür bleiben
 * rausgeworfene Einträge überhaupt erhalten (siehe `removed` im Domänenmodell).
 * Die Android-App schickt denselben Verlauf.
 *
 * Die Repository-Schicht bietet bewusst nur die SICHTBAREN Einträge an
 * (`getItemsForList` filtert `removed` heraus); diese rein lesende Projektion
 * ergänzt den Verlauf, ohne dort eine zweite Sicht einzubauen. Geschrieben
 * wird hier nichts — alle Schreibwege bleiben bei `db/repositories`.
 */
import type { IsoUtc } from '../../shared/types/domain'
import { getDb } from '../db/client'

/**
 * Eine Zeile, so wie diese Datei sie zu sehen bekommt.
 *
 * `url` ist WAHLWEISE, und das ist keine Nachlässigkeit: Diese Projektion
 * liest rohe Zeilen aus IndexedDB, an `repositories.ts` vorbei. Zeilen aus
 * der Zeit vor dem Feld tragen den Schlüssel gar nicht.
 */
export interface SuggestionCandidate {
  deletedAt: IsoUtc | null
  removed: boolean
  name: string
  url?: string | null
}

/**
 * Taugt diese Zeile als Vorschlagsquelle?
 *
 * Nur rausgeworfene, nicht gelöschte Zeilen mit einem Namen — und keine
 * Link-Einträge: „chefkoch.de" als Vorschlag für den nächsten Einkauf wäre
 * Unsinn. Die Android-App filtert dafür mit `AND url IS NULL`.
 *
 * DIE PRÜFUNG LAUTET `typeof === 'string'` UND NICHT `!== null`: Ein `!== null`
 * würde bei einer Altzeile ohne den Schlüssel greifen und damit den gesamten
 * Bestand aus den Vorschlägen werfen — also genau die Einträge, die die
 * Vorschläge überhaupt tragen. Der Upgrade auf Datenbankversion 3 füllt die
 * Schlüssel zwar nach; die Prüfung hält auch dann, wenn Zeilen später einmal an
 * der Migration vorbei entstehen.
 */
export function isSuggestionSource(row: SuggestionCandidate): boolean {
  if (row.deletedAt !== null || !row.removed) return false
  if (typeof row.url === 'string') return false
  return row.name.trim().length > 0
}

/** Einmalige Namen früherer Einträge, case-insensitiv dedupliziert. */
export async function getRemovedItemNamesForList(listId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('list_items', 'by-listId', listId)

  const seen = new Set<string>()
  const names: string[] = []

  for (const row of rows) {
    if (!isSuggestionSource(row)) continue

    const name = row.name.trim()
    const key = name.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    names.push(name)
  }

  return names
}

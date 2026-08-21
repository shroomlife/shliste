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
import { getDb } from '../db/client'

/** Einmalige Namen früherer Einträge, case-insensitiv dedupliziert. */
export async function getRemovedItemNamesForList(listId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('list_items', 'by-listId', listId)

  const seen = new Set<string>()
  const names: string[] = []

  for (const row of rows) {
    if (row.deletedAt !== null || !row.removed) continue

    const name = row.name.trim()
    if (name.length === 0) continue

    const key = name.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    names.push(name)
  }

  return names
}

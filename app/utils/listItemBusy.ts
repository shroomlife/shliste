/**
 * Ist ein Listeneintrag gerade "in Arbeit"?
 *
 * Das entscheidet allein der Server (`linkPending`, Regel in
 * `lib/link-preview/pending.ts` der API) — hier wird nichts nachgerechnet,
 * nur an EINER Stelle gelesen. Oberfläche und Löschweg fragen beide hier,
 * damit der Knopf nie etwas anderes sagt als die Logik dahinter.
 *
 * Solange gilt: Die Zeile zeigt den Lichtlauf, das Löschen ist gesperrt.
 * Abhaken und Umbenennen bleiben erlaubt — der Server schreibt nur seine
 * Spiegel, nie in Name oder Haken.
 */
import type { ListItem } from '#shared/types/domain'

export function isItemBusy(item: Pick<ListItem, 'linkPending'>): boolean {
  return item.linkPending
}

/**
 * Auflösung von `Recipe.imagePath` zu einer ladbaren Bildadresse.
 *
 * Das Feld kennt zwei Formen (siehe shared/types/domain.ts):
 *
 * - `sync:{userUuid}/{recipeId}/{hash12}.webp` — das Bild liegt auf dem Server
 *   und ist über den BFF-Proxy `/api/images/{ref}` erreichbar.
 * - alles andere (z.B. `recipe_images/…`) — ein lokaler Dateipfad auf einem
 *   Android-Gerät. Für die PWA existiert diese Datei nicht: kein Bild.
 *
 * Reine Funktion ohne Vue und ohne Netz, deshalb direkt testbar
 * (useRecipeImage.test.ts).
 */

/** Präfix, das eine Serverreferenz von einem lokalen Gerätepfad unterscheidet. */
export const SYNC_IMAGE_PREFIX = 'sync:'

/**
 * Die Bild-URL zum Laden im Browser, oder null wenn nichts auflösbar ist.
 *
 * Entschieden wird hier nur die Form des Pfads. Ob die Referenz gültig ist und
 * dem angemeldeten Konto gehört, prüft der BFF-Proxy serverseitig — eine
 * zweite Prüfung im Client wäre eine Kopie der Wahrheit, die driften kann.
 */
export function resolveRecipeImageUrl(imagePath: string | null): string | null {
  if (imagePath === null || !imagePath.startsWith(SYNC_IMAGE_PREFIX)) return null

  const ref = imagePath.slice(SYNC_IMAGE_PREFIX.length)
  if (ref.length === 0) return null

  return `/api/images/${ref}`
}

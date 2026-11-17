/**
 * EINE Regel für die zwei Bild-Spiegel eines Listeneintrags (SHL-1).
 *
 * DIE REGEL: Das KI-Bild gehört zum NAMEN, so wie Titel und Vorschaubild
 * eines Links zur Adresse gehören (`./link-mirrors.ts`). Übernommen wird es,
 * solange die Zeile denselben Namen trägt, sonst fällt es weg. "Derselbe"
 * heißt nach Normalisierung: "gurke" und " Gurke " bekommen kein neues Bild.
 * Die Normalisierung ist wortgleich die der API
 * (`lib/item-images/normalize.ts`), sonst wichen Server und Gerät bei
 * derselben Eingabe voneinander ab.
 *
 * Drei Aufrufer, dieselbe Regel: `upsertItem` in `app/db/repositories.ts`,
 * `applyItem` in `app/sync/engine/pull.ts`, `applyConflicts` in
 * `app/sync/engine/push.ts`.
 */
import type { ItemImageMirrorField, ListItem } from '../../../shared/types/domain'

export interface ItemImageMirrors {
  itemImagePath: string | null
  itemImagePending: boolean
}

export function emptyItemImageMirrors(): ItemImageMirrors {
  return { itemImagePath: null, itemImagePending: false }
}

/** NFC, Ränder weg, Leerräume zusammengefasst, deutsche Kleinschreibung. */
export function normalizeItemName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('de').normalize('NFC')
}

/**
 * Die Bild-Spiegel, die zu `effectiveName` gehören. `source` bringt sie mit:
 * beim lokalen Schreiben die bestehende Zeile, beim Abgleich die Serverzeile.
 */
export function itemImageMirrorsFor(
  source: Pick<ListItem, 'name' | ItemImageMirrorField> | undefined,
  effectiveName: string,
): ItemImageMirrors {
  if (source === undefined || normalizeItemName(source.name) !== normalizeItemName(effectiveName)) {
    return emptyItemImageMirrors()
  }
  return {
    itemImagePath: source.itemImagePath ?? null,
    // `?? false`: Zeilen aus der Zeit vor dem Feld (siehe Version 6 in `app/db/schema.ts`).
    itemImagePending: source.itemImagePending ?? false,
  }
}

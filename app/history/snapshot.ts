/**
 * Snapshots der Lösch-Historie: schreiben im Vereinigungs-Format, lesen tolerant.
 *
 * DER INTEROP-PUNKT DIESES FEATURES: `snapshotJson` liest der Client, der
 * wiederherstellt — und der weiß nicht, wer gelöscht hat. Android
 * serialisiert seine UI-Datenklassen (`uuid` und `order`, Vorgabewerte
 * fehlen im JSON, weil kotlinx sie nicht mitschreibt) und LIEST auch
 * strikt in genau diese Klassen zurück. Deshalb schreibt die PWA die
 * VEREINIGUNG beider Formen: jedes Feld unter dem eigenen Namen (`id`,
 * `orderIndex`) UND unter dem Android-Namen (`uuid`, `order`). Für den
 * eigenen toleranten Parser sind die Duplikate unsichtbar, für Androids
 * strikten kotlinx-Reader sind sie die Pflichtfelder. Der Parser hier
 * liest weiterhin BEIDE Formen: `uuid` ↔ `id`, fehlende Felder mit
 * Vorgabewerten.
 *
 * Geschrieben wird die Zeile OHNE `createdAt`/`updatedAt`/`fieldTimestamps`:
 * Diese Felder führt die Datenbankschicht, und eine Wiederherstellung erzeugt
 * ohnehin frische Stempel (Reaktivieren) oder eine ganz neue Zeile (Neuanlage).
 *
 * Alle Funktionen sind rein — ohne IndexedDB und ohne Vue, deshalb direkt
 * mit `bun test` prüfbar. Die Importe sind relativ statt über `~`, weil es
 * im Testlauf keine Alias-Auflösung gibt (dieselbe Begründung wie in
 * `db/timestamps.ts`).
 */
import type { HistoryEntityType, ListItem, RecipeIngredient, RecipeStep } from '../../shared/types/domain'
import { isRecord, readNumberOr, readString } from '../sync/engine/json'
import { validHttpUrlOrNull } from '../utils/url'

/* ------------------------------------------------------------------ *
 * Schreiben — Vereinigungs-Format (PWA- + Android-Feldnamen)
 * ------------------------------------------------------------------ */

/**
 * Mengen wandern als ganze Zahl in den Snapshot: Androids kotlinx-Reader
 * dekodiert `quantity` strikt als Int — ein Bruch oder NaN aus einer
 * lokalen Zwischenform würde dort das Wiederherstellen werfen lassen.
 * Der Draht selbst erzwingt Ganzzahlen ohnehin (t.Integer im Push-Schema).
 */
function snapshotQuantity(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 1
}

/**
 * Die Zeile eines Listeneintrags, wie sie in `snapshotJson` wandert.
 *
 * `url` ist dabei, die drei Server-Spiegel nicht: Der Link gehört zum
 * Eintrag und soll die Wiederherstellung überleben, Titel und Vorschaubild
 * holt der Server danach von selbst wieder. Sie hier mitzuschreiben hieße,
 * einen Serverzustand einzufrieren, der bis zur Wiederherstellung längst
 * veraltet sein kann.
 *
 * Androids kotlinx-Reader ist tolerant gegenüber einem zusätzlichen Feld
 * (`ignoreUnknownKeys`) und lässt `url` auf seinem Vorgabewert, solange die
 * dortige Datenklasse es noch nicht kennt.
 */
export function listItemSnapshotJson(item: ListItem): string {
  return JSON.stringify({
    id: item.id,
    uuid: item.id,
    listId: item.listId,
    name: item.name,
    quantity: snapshotQuantity(item.quantity),
    checked: item.checked,
    removed: item.removed,
    orderIndex: item.orderIndex,
    order: item.orderIndex,
    sortKey: item.sortKey,
    url: item.url,
    createdBy: item.createdBy,
    modifiedBy: item.modifiedBy,
    deletedAt: item.deletedAt,
  })
}

export function ingredientSnapshotJson(ingredient: RecipeIngredient): string {
  return JSON.stringify({
    id: ingredient.id,
    uuid: ingredient.id,
    recipeId: ingredient.recipeId,
    name: ingredient.name,
    quantity: snapshotQuantity(ingredient.quantity),
    orderIndex: ingredient.orderIndex,
    order: ingredient.orderIndex,
    sortKey: ingredient.sortKey,
    createdBy: ingredient.createdBy,
    modifiedBy: ingredient.modifiedBy,
    deletedAt: ingredient.deletedAt,
  })
}

export function stepSnapshotJson(step: RecipeStep): string {
  return JSON.stringify({
    id: step.id,
    uuid: step.id,
    recipeId: step.recipeId,
    description: step.description,
    orderIndex: step.orderIndex,
    order: step.orderIndex,
    sortKey: step.sortKey,
    isChecked: step.isChecked,
    aiExplanation: step.aiExplanation,
    createdBy: step.createdBy,
    modifiedBy: step.modifiedBy,
    deletedAt: step.deletedAt,
  })
}

/* ------------------------------------------------------------------ *
 * Lesen — tolerant gegenüber beiden Formen
 * ------------------------------------------------------------------ */

/**
 * Was die Wiederherstellung aus einem Snapshot braucht — nicht mehr.
 *
 * `id` ist die Kennung der gelöschten Zeile (`uuid` bei Android) und kann
 * fehlen; die Wiederherstellung greift ohnehin zuerst über `entityId` des
 * Eintrags auf die Original-Zeile zu. Name/Menge bzw. Beschreibung tragen
 * die Neuanlage, wenn die Original-Zeile nicht mehr existiert.
 */
export type HistorySnapshot
  = | { entityType: 'list_item', id: string | null, name: string, quantity: number, url: string | null }
    | { entityType: 'recipe_ingredient', id: string | null, name: string, quantity: number }
    | { entityType: 'recipe_step', id: string | null, description: string }

/** `id` (PWA) vor `uuid` (Android) — leere Strings zählen als "keine Id". */
function readSnapshotId(source: Record<string, unknown>): string | null {
  const id = readString(source, 'id') ?? readString(source, 'uuid')
  return id === null || id === '' ? null : id
}

/**
 * Menge mit Vorgabewert 1 — kotlinx lässt Felder auf ihrem Default im JSON
 * weg, ein fehlendes `quantity` heißt also "eins". Unsinn (NaN, Unendlich,
 * Brüche, Null und Negatives) wird auf eine gültige Menge gezogen, denn die
 * Neuanlage einer Zeile mit Menge 0 wäre keiner.
 */
function readSnapshotQuantity(source: Record<string, unknown>): number {
  return Math.max(1, Math.trunc(readNumberOr(source, 'quantity', 1)))
}

/**
 * Liest einen `snapshotJson` beider Client-Formen ein.
 *
 * `null` bei allem, was sich nicht sinnvoll wiederherstellen lässt: kaputtes
 * JSON (auch ein am Limit gekappter Snapshot), kein Objekt, fehlender oder
 * leerer Name bzw. fehlende Beschreibung. Die Wiederherstellung fällt dann
 * auf die Original-Zeile zurück — existiert auch die nicht mehr, ist der
 * ehrliche Ausgang ein Hinweis statt einer leeren Zeile.
 */
export function parseHistorySnapshot(entityType: HistoryEntityType, snapshotJson: string): HistorySnapshot | null {
  let raw: unknown
  try {
    raw = JSON.parse(snapshotJson)
  }
  catch {
    return null
  }

  if (!isRecord(raw)) return null

  if (entityType === 'recipe_step') {
    const description = readString(raw, 'description')
    if (description === null || description.trim().length === 0) return null

    return { entityType, id: readSnapshotId(raw), description }
  }

  // Der Link zuerst: Er entscheidet mit, ob ein leerer Name zulässig ist.
  const url = entityType === 'list_item' ? validHttpUrlOrNull(readString(raw, 'url')) : null

  const name = readString(raw, 'name')
  if (name === null) return null

  // Ein leerer Name ist NUR bei einem Link-Eintrag brauchbar — dort steht
  // ohnehin der Seitentitel oder der Host auf dem Schirm. Ohne beides bliebe
  // eine leere Zeile übrig, und dann ist der ehrliche Ausgang ein Hinweis.
  if (name.trim().length === 0 && url === null) return null

  if (entityType === 'list_item') {
    return { entityType, id: readSnapshotId(raw), name, quantity: readSnapshotQuantity(raw), url }
  }

  return {
    entityType,
    id: readSnapshotId(raw),
    name,
    quantity: readSnapshotQuantity(raw),
  }
}

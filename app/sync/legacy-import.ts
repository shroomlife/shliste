/**
 * Übernahme der Daten aus der alten Fassung (v0.9.5 und früher).
 *
 * Die Vorgängerin legte alles in `localStorage` ab, als vier JSON-Dokumente.
 * Diese Datei liest sie, bildet sie auf das heutige Modell ab und schreibt sie
 * in IndexedDB. Danach nimmt der gewöhnliche Abgleich sie mit — für den
 * Server sind es dann ganz normale lokale Zeilen.
 *
 * DER IMPORT LÄUFT OHNE KONTO. Wer die alte Fassung ohne Anmeldung benutzt
 * hat, muss seine Listen auch ohne Anmeldung wiederfinden; alles andere wäre
 * eine Anmeldepflicht durch die Hintertür.
 *
 * `localStorage` WIRD NICHT GELÖSCHT. Der Import ist damit umkehrbar: Solange
 * die alten Dokumente liegen bleiben, ist nichts verloren, auch wenn diese
 * Abbildung sich später als lückenhaft herausstellt. Ein aufgeräumter
 * Speicher ist den Verlust nicht wert.
 *
 * WAS NICHT MITKOMMT, wird gezählt und gemeldet statt still verschluckt:
 * - `description` an Listen und Rezepten — im heutigen Modell gibt es das Feld
 *   nicht, weder lokal noch in der API.
 * - Märkte und der Produktkatalog (`shliste/markets`, `shliste/products`) —
 *   diese Bereiche sind gestrichen.
 */
import type { IsoUtc, List, ListItem, Recipe, RecipeIngredient, RecipeStep } from '../../shared/types/domain'
import { isIsoUtc, nowIso, toIso } from '../db/timestamps'

/* ------------------------------------------------------------------ *
 * Die alten Dokumente
 * ------------------------------------------------------------------ */

export const LEGACY_KEYS = {
  lists: 'shliste/lists',
  recipes: 'shliste/recipes',
  /** Gestrichener Bereich, wird nur gezählt. */
  markets: 'shliste/markets',
  /** Gestrichener Bereich, wird nur gezählt. */
  products: 'shliste/products',
} as const

/** Ein Eintrag einer alten Liste oder eines alten Rezepts. */
interface LegacyProduct {
  uuid?: unknown
  name?: unknown
  brand?: unknown
  checked?: unknown
}

interface LegacyList {
  uuid?: unknown
  name?: unknown
  color?: unknown
  url?: unknown
  description?: unknown
  products?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  archivedAt?: unknown
}

interface LegacyRecipe {
  uuid?: unknown
  name?: unknown
  color?: unknown
  url?: unknown
  description?: unknown
  products?: unknown
  steps?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

/* ------------------------------------------------------------------ *
 * Kleine Umformungen
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Die alte Fassung speicherte Zeitpunkte als ISO-Zeichenkette, `null` oder gar
 * nicht. Alles, was sich nicht als Datum lesen lässt, wird zu "jetzt": Ein
 * erfundener Zeitpunkt in der Vergangenheit wäre schlimmer, weil das
 * feldgenaue Last-Write-Wins ihn gegen den Serverstand antreten liesse.
 */
export function toTimestamp(value: unknown, fallback: IsoUtc): IsoUtc {
  if (isIsoUtc(value)) return value

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return toIso(date)
  }

  return fallback
}

/**
 * Wandelt die alte Farbe in eine Form, die das heutige Modell versteht.
 *
 * Die Vorgängerin legte Zufallsfarben als `rgba(r, g, b, 0.2)` ab — der
 * Alpha-Wert war die Lasur, die heute die Oberfläche selbst legt
 * (`color-mix`, 20 Prozent). Bliebe er stehen, käme die Lasur zweimal und die
 * Karte wäre fast weiss. Deshalb wird der Farbton übernommen und die
 * Durchsichtigkeit verworfen.
 */
export function toHexColor(value: unknown, fallback: string): string {
  const text = readText(value)
  if (text === '') return fallback

  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toUpperCase()
  if (/^[0-9a-f]{6}$/i.test(text)) return `#${text.toUpperCase()}`

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(text)
  if (rgb === null) return fallback

  const channels = rgb.slice(1, 4).map(part => Number.parseInt(part, 10))
  if (channels.some(channel => channel === undefined || channel > 255)) return fallback

  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/**
 * Der Name eines Eintrags, um die Marke ergänzt.
 *
 * Die alte Fassung führte `brand` als eigenes Feld; das heutige Modell kennt
 * nur `name`. Die Marke gehört an die Ware ("Milch Weihenstephan" ist im Laden
 * etwas anderes als "Milch"), deshalb wandert sie in Klammern in den Namen,
 * statt verloren zu gehen.
 */
export function toItemName(name: unknown, brand: unknown): string {
  const base = readText(name)
  const label = readText(brand)

  if (label === '' || base.toLowerCase().includes(label.toLowerCase())) return base
  return base === '' ? label : `${base} (${label})`
}

/** Nur was eine brauchbare Kennung und einen Namen hat, wird übernommen. */
function readEntry(value: unknown): { id: string, name: string } | null {
  if (!isRecord(value)) return null

  const id = readText(value.uuid)
  const name = readText(value.name)
  if (id === '' || name === '') return null

  return { id, name }
}

/* ------------------------------------------------------------------ *
 * Die Abbildung
 * ------------------------------------------------------------------ */

/** Was der Import gefunden und was er nicht mitnehmen konnte. */
export interface LegacyImportPlan {
  lists: List[]
  items: ListItem[]
  recipes: Recipe[]
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  /** Wie viele der Listen aus dem Archiv der alten Fassung stammen. */
  archivedLists: number
  /** Beschreibungen, für die es im heutigen Modell kein Feld gibt. */
  droppedDescriptions: number
  /** Zeilen aus den gestrichenen Bereichen Märkte und Produktkatalog. */
  droppedCatalogRows: number
}

export const EMPTY_PLAN: LegacyImportPlan = {
  lists: [],
  items: [],
  recipes: [],
  ingredients: [],
  steps: [],
  archivedLists: 0,
  droppedDescriptions: 0,
  droppedCatalogRows: 0,
}

/** Gemeinsame Felder jeder übernommenen Zeile. */
function baseRow(id: string, createdAt: IsoUtc, updatedAt: IsoUtc) {
  return {
    id,
    createdAt,
    updatedAt,
    deletedAt: null,
    // Keine Feld-Zeitstempel: Die alte Fassung kannte sie nicht, und erfundene
    // wären eine Behauptung über die Vergangenheit. Ohne sie gewinnt beim
    // ersten Abgleich im Zweifel der Server — das ist die sichere Richtung.
    fieldTimestamps: null,
  }
}

/**
 * Bildet die alten Dokumente auf das heutige Modell ab.
 *
 * Rein: nimmt geparste Werte entgegen und gibt Zeilen zurück, ohne etwas zu
 * lesen oder zu schreiben. Genau deshalb ist die Abbildung ohne Browser
 * prüfbar — und sie ist der Teil, an dem Daten verloren gehen könnten.
 *
 * ARCHIVIERTE LISTEN KOMMEN MIT. Das Archiv ist als Bereich gestrichen; die
 * Listen darin sind trotzdem die Daten des Nutzers. Sie erscheinen als
 * gewöhnliche Listen und lassen sich mit zwei Handgriffen löschen — eine
 * verschwundene Liste bekommt dagegen niemand zurück. Wie viele es waren,
 * steht im Ergebnis.
 */
export function planLegacyImport(input: {
  lists?: unknown
  recipes?: unknown
  markets?: unknown
  products?: unknown
  fallbackColor: () => string
  now?: IsoUtc
}): LegacyImportPlan {
  const now = input.now ?? nowIso()
  const plan: LegacyImportPlan = { ...EMPTY_PLAN, lists: [], items: [], recipes: [], ingredients: [], steps: [] }

  for (const raw of Array.isArray(input.lists) ? input.lists : []) {
    const entry = readEntry(raw)
    if (entry === null) continue

    const source = raw as LegacyList
    const createdAt = toTimestamp(source.createdAt, now)
    const updatedAt = toTimestamp(source.updatedAt, createdAt)

    if (readText(source.description) !== '') plan.droppedDescriptions += 1
    if (source.archivedAt !== null && source.archivedAt !== undefined) plan.archivedLists += 1

    plan.lists.push({
      ...baseRow(entry.id, createdAt, updatedAt),
      name: entry.name,
      color: toHexColor(source.color, input.fallbackColor()),
      // Die alte Fassung kannte keine geheimen Listen und kein Teilen.
      secret: false,
      lastSuggestedItems: '',
      sourceUrl: readText(source.url) === '' ? null : readText(source.url),
      ownerUserId: null,
    })

    const products = Array.isArray(source.products) ? source.products : []
    products.forEach((rawProduct, index) => {
      const product = readEntry(rawProduct)
      if (product === null) return

      const fields = rawProduct as LegacyProduct
      plan.items.push({
        ...baseRow(product.id, createdAt, updatedAt),
        listId: entry.id,
        name: toItemName(fields.name, fields.brand),
        // Die alte Fassung kannte keine Mengen.
        quantity: 1,
        checked: fields.checked === true,
        removed: false,
        orderIndex: index,
        sortKey: null,
        // Die alte Fassung kannte keine Links, und Titel wie Vorschaubild
        // pflegt ohnehin nur der Server.
        url: null,
        linkTitle: null,
        linkImagePath: null,
        linkImageKind: null,
        createdBy: null,
        modifiedBy: null,
      })
    })
  }

  for (const raw of Array.isArray(input.recipes) ? input.recipes : []) {
    const entry = readEntry(raw)
    if (entry === null) continue

    const source = raw as LegacyRecipe
    const createdAt = toTimestamp(source.createdAt, now)
    const updatedAt = toTimestamp(source.updatedAt, createdAt)

    if (readText(source.description) !== '') plan.droppedDescriptions += 1

    plan.recipes.push({
      ...baseRow(entry.id, createdAt, updatedAt),
      name: entry.name,
      color: toHexColor(source.color, input.fallbackColor()),
      sourceUrl: readText(source.url) === '' ? null : readText(source.url),
      imagePath: null,
    })

    const products = Array.isArray(source.products) ? source.products : []
    products.forEach((rawProduct, index) => {
      const product = readEntry(rawProduct)
      if (product === null) return

      const fields = rawProduct as LegacyProduct
      plan.ingredients.push({
        ...baseRow(product.id, createdAt, updatedAt),
        recipeId: entry.id,
        name: toItemName(fields.name, fields.brand),
        quantity: 1,
        orderIndex: index,
        sortKey: null,
        createdBy: null,
        modifiedBy: null,
      })
    })

    const steps = Array.isArray(source.steps) ? source.steps : []
    steps.forEach((rawStep, index) => {
      const description = readText(rawStep)
      if (description === '') return

      plan.steps.push({
        ...baseRow(crypto.randomUUID(), createdAt, updatedAt),
        recipeId: entry.id,
        description,
        orderIndex: index,
        sortKey: null,
        isChecked: false,
        aiExplanation: null,
        createdBy: null,
        modifiedBy: null,
      })
    })
  }

  for (const dropped of [input.markets, input.products]) {
    if (Array.isArray(dropped)) plan.droppedCatalogRows += dropped.length
  }

  return plan
}

/** Hat der Plan überhaupt etwas zu schreiben? */
export function isEmptyPlan(plan: LegacyImportPlan): boolean {
  return plan.lists.length === 0 && plan.recipes.length === 0
}

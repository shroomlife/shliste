/**
 * Der Fingerabdruck des lokalen Bestands, vergleichbar mit dem des Servers.
 *
 * WOZU: Ein inkrementeller Abruf fragt „was hat sich seit Zeitpunkt X
 * geändert". Weicht eine Zeile ÄLTER als X zwischen Gerät und Server ab, kommt
 * sie in keiner dieser Antworten je wieder vor — der Cursor ist längst darüber
 * hinweg. Ohne einen Vergleich über den ganzen Bestand bliebe so etwas für
 * immer unbemerkt. Android prüft das nach jedem Abgleich; diese Seite konnte es
 * bisher nicht.
 *
 * WARUM DIESE DATEI SO PEINLICH GENAU IST: Die Prüfsumme ist nur dann etwas
 * wert, wenn beide Seiten Zeichen für Zeichen dasselbe zusammensetzen. Jede
 * Abweichung — ein Trennzeichen, eine Sortierung, ein `null` gegen leeren
 * String, eine Zahl mit Nachkommastelle — ergibt eine dauerhaft andere Summe,
 * und die sähe im Betrieb nicht nach einem Formatfehler aus, sondern nach einem
 * Datenschaden. Gegenstück: `computeContentHashes` in
 * `api.shliste.app/src/routes/sync/status.ts` (Postgres) und
 * `SyncManager.computeLocalContentHashes` in der Android-App.
 *
 * NUR V2. Die ältere Fassung V1 hängt an jede Zeile ihren Änderungszeitstempel
 * an. Unter feldgenauem Last-Write-Wins laufen diese Zeitstempel zwischen
 * Geräten zu Recht auseinander, ohne dass der INHALT abweicht — V1 meldet
 * deshalb Abweichungen, die keine sind. Genau daran ist auf Android einmal eine
 * Endlosschleife entstanden.
 */
import type { Badge, List, ListItem, Recipe, RecipeIngredient, RecipeStep } from '../../../shared/types/domain'
import { md5 } from './md5'

/** Die sechs Teil-Summen. Der Server liefert sie als `contentHashParts`. */
export interface ContentHashParts {
  lists: string
  listItems: string
  recipes: string
  recipeIngredients: string
  recipeSteps: string
  badges: string
}

export interface ContentHashes {
  /** Die Summe über alle sechs Teile — Gegenstück zu `contentHashV2`. */
  v2: string
  parts: ContentHashParts
}

/** Die Zeilen, aus denen sich der Fingerabdruck ergibt. Ungefiltert. */
export interface ContentHashInput {
  lists: readonly List[]
  items: readonly ListItem[]
  recipes: readonly Recipe[]
  ingredients: readonly RecipeIngredient[]
  steps: readonly RecipeStep[]
  badges: readonly Badge[]
}

/**
 * Sortiert nach Id, in Zeichenreihenfolge.
 *
 * NICHT `localeCompare`: Das sortiert nach Sprachregeln des Browsers und wäre
 * von Gerät zu Gerät verschieden. Postgres sortiert die Ids als Text, Android
 * mit `sortedBy`, und beide entsprechen bei Ids aus Ziffern, Kleinbuchstaben
 * und Bindestrichen der reinen Zeichenreihenfolge.
 */
function byId<T extends { id: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** Postgres schreibt Wahrheitswerte als `true`/`false`. */
function bool(value: boolean): string {
  return value ? 'true' : 'false'
}

/** `COALESCE(spalte, '')` — ein fehlender Wert ist ein leerer String. */
function text(value: string | null): string {
  return value ?? ''
}

/**
 * Ein Zeitstempel als Millisekunden seit Epoch.
 *
 * Der Server rechnet `FLOOR(EXTRACT(EPOCH FROM …) * 1000)`. `Date.parse` auf
 * einem ISO-Zeitstempel mit Z liefert exakt denselben Wert.
 */
function millis(iso: string): string {
  return String(Date.parse(iso))
}

/** Reihen zu einer Zeichenkette verketten und hashen — ohne Trennzeichen. */
function hashRows<T extends { id: string }>(rows: readonly T[], line: (row: T) => string): string {
  return md5(byId(rows).map(line).join(''))
}

/**
 * Rechnet die sechs Teil-Summen und die Gesamtsumme.
 *
 * Rein: keine Datenbank, keine Uhr. Die Filter stehen bewusst HIER und nicht
 * beim Aufrufer, weil sie Teil der Formel sind — sie müssen zu den
 * WHERE-Klauseln des Servers passen.
 */
export function computeContentHashes(input: ContentHashInput): ContentHashes {
  // Listen: nicht gelöscht.
  const lists = input.lists.filter(row => row.deletedAt === null)

  // Einträge: nicht gelöscht UND in einer nicht gelöschten Liste. Der Server
  // verknüpft dafür mit `lists` und prüft dort ebenfalls auf `deletedAt`.
  const aktiveListen = new Set(lists.map(row => row.id))
  const items = input.items.filter(row => row.deletedAt === null && aktiveListen.has(row.listId))

  const recipes = input.recipes.filter(row => row.deletedAt === null)

  // Zutaten und Schritte: NUR nach dem eigenen Löschmarker. Der Server prüft
  // beim Verknüpfen mit `recipes` die Zugehörigkeit, aber ausdrücklich NICHT
  // `r."deletedAt"` — Zutaten eines gelöschten Rezepts zählen also weiterhin
  // mit. Das mag überraschen; es hier "richtiger" zu machen, ergäbe dauerhaft
  // verschiedene Summen.
  const ingredients = input.ingredients.filter(row => row.deletedAt === null)
  const steps = input.steps.filter(row => row.deletedAt === null)

  const badges = input.badges.filter(row => row.deletedAt === null)

  const parts: ContentHashParts = {
    lists: hashRows(lists, row =>
      `${row.id}|${row.name}|${row.color}|${bool(row.secret)}|${text(row.sourceUrl)}`),

    listItems: hashRows(items, row =>
      `${row.id}|${row.name}|${row.quantity}|${bool(row.checked)}|${bool(row.removed)}|${row.orderIndex}`),

    recipes: hashRows(recipes, row =>
      `${row.id}|${row.name}|${row.color}|${text(row.sourceUrl)}|${text(row.imagePath)}`),

    recipeIngredients: hashRows(ingredients, row =>
      `${row.id}|${row.name}|${row.quantity}|${row.orderIndex}`),

    recipeSteps: hashRows(steps, row =>
      `${row.id}|${row.description}|${row.orderIndex}|${bool(row.isChecked)}`),

    badges: hashRows(badges, row =>
      `${row.id}|${row.recipeId}|${row.recipeName}|${text(row.recipeImagePath)}|${row.recipeColor}|${millis(row.earnedAt)}`),
  }

  const v2 = md5(
    parts.lists
    + parts.listItems
    + parts.recipes
    + parts.recipeIngredients
    + parts.recipeSteps
    + parts.badges,
  )

  return { v2, parts }
}

/** Benennt die Bereiche, in denen sich Server und Gerät unterscheiden. */
export function divergentAreas(server: ContentHashParts | null, local: ContentHashParts): string[] {
  if (server === null) return []
  const areas: Array<[keyof ContentHashParts, string]> = [
    ['lists', 'Listen'],
    ['listItems', 'Einträge'],
    ['recipes', 'Rezepte'],
    ['recipeIngredients', 'Zutaten'],
    ['recipeSteps', 'Schritte'],
    ['badges', 'Auszeichnungen'],
  ]
  return areas.filter(([key]) => server[key] !== local[key]).map(([, label]) => label)
}

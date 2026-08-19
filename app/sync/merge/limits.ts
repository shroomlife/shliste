/**
 * Feldlimits der Sync-API — Spiegel von `SYNC_FIELD_LIMITS` aus
 * `api.shliste.app/src/routes/sync/schemas.ts`.
 *
 * WARUM DAS HIER LIEGT: Die API validiert den Push-Body als GANZES (TypeBox).
 * Ein einziger Wert über seinem `maxLength` macht den kompletten Request
 * ungültig — alle gesunden Zeilen fallen mit durch und der Sync des Geräts
 * bleibt dauerhaft stehen. `sanitize` ist die letzte Verteidigungslinie
 * unmittelbar vor dem Push, analog zu `SyncSanitizer` im Android-Client.
 *
 * BETRIEBSREGEL (identisch in API und Android): Limits dürfen ohne
 * gleichzeitigen Client-Rollout nur ANGEHOBEN werden, nie gesenkt. Ein
 * gesenktes Limit lässt jeden bereits ausgelieferten Client mit längeren
 * Werten in ein 422 laufen, und ein 422 kippt den gesamten Push.
 *
 * Gegenstücke, die Zeile für Zeile übereinstimmen müssen:
 * - `api.shliste.app/src/routes/sync/schemas.ts` (SSOT)
 * - `android-app/app/src/main/java/com/shroomlife/shliste/sync/SyncLimits.kt`
 */
import type {
  Badge,
  List,
  ListItem,
  Recipe,
  RecipeChatMessage,
  RecipeIngredient,
  RecipeStep,
} from '../../../shared/types/domain'

export const SYNC_FIELD_LIMITS = {
  /** id, listId, recipeId, createdBy, modifiedBy — UUID-Länge */
  ID: 36,
  /** Listen-, Item-, Rezept-, Zutaten-Name und Badge-recipeName */
  NAME: 500,
  /** Listen-, Rezept- und Badge-Farbe */
  COLOR: 20,
  /** sourceUrl von Listen und Rezepten */
  SOURCE_URL: 2000,
  /** imagePath von Rezepten und Badge-recipeImagePath */
  IMAGE_PATH: 2000,
  /** lastSuggestedItems einer Liste */
  LAST_SUGGESTED: 5000,
  /** sortKey von Items, Zutaten und Schritten (Bruchindex) */
  SORT_KEY: 100,
  /** RecipeStep.description */
  DESCRIPTION: 10_000,
  /** RecipeStep.aiExplanation */
  AI_EXPLANATION: 50_000,
  /** RecipeChatMessage.content */
  CHAT_CONTENT: 50_000,
  /** RecipeChatMessage.role — "user" / "assistant" / "error" */
  ROLE: 20,
  /** quantity und orderIndex */
  NUMBER_MIN: 0,
  NUMBER_MAX: 1_000_000,
} as const

/**
 * Kappt einen String auf sein Limit.
 *
 * `limit` zählt UTF-16-Code-Units — dasselbe, was TypeBox' `maxLength` über
 * `value.length` prüft und was Kotlins `String.length` liefert. Fällt der
 * Schnitt zwischen High- und Low-Surrogate, wird eine Code-Unit früher
 * gekappt: Ein einzelnes Surrogat ist kein gültiger Codepoint und würde beim
 * UTF-8-Kodieren still zu "?" degradieren. Identisch zu `capForSync` in
 * `SyncLimits.kt`.
 */
export function capText(value: string, limit: number): string {
  if (value.length <= limit) return value
  const lastKept = value.charCodeAt(limit - 1)
  const firstDropped = value.charCodeAt(limit)
  const splitsSurrogatePair
    = lastKept >= 0xD800 && lastKept <= 0xDBFF
      && firstDropped >= 0xDC00 && firstDropped <= 0xDFFF
  return value.slice(0, splitsSurrogatePair ? limit - 1 : limit)
}

/** Wie `capText`, lässt `null` aber `null`. */
export function capTextOrNull(value: string | null, limit: number): string | null {
  return value === null ? null : capText(value, limit)
}

/**
 * Klemmt eine Zahl auf den von der API akzeptierten Bereich.
 *
 * Zusätzlich zum Klemmen wird gerundet und ein nicht-endlicher Wert auf
 * `NUMBER_MIN` gezogen. Das ist KEINE Abweichung von Android, sondern deckt
 * eine Lücke, die es dort strukturell nicht gibt: Kotlins `Int` ist immer
 * ganzzahlig und endlich, eine JS-`number` kann `1.5`, `NaN` oder `Infinity`
 * sein. Die API validiert per `t.Integer`, jeder dieser Werte würde denselben
 * 422 auf den gesamten Push auslösen wie ein zu langer String.
 */
export function clampNumber(
  value: number,
  min: number = SYNC_FIELD_LIMITS.NUMBER_MIN,
  max: number = SYNC_FIELD_LIMITS.NUMBER_MAX,
): number {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(Math.round(value), min), max)
}

/** Gemeinsame Mechanik für Werte, die verworfen statt gekürzt werden. */
function dropIfTooLong(value: string | null, limit: number): string | null {
  if (value === null) return null
  return value.length > limit ? null : value
}

/**
 * Ein zu langer `sortKey` wird VERWORFEN, nicht gekürzt.
 *
 * Ein Bruchindex kodiert im Kopfzeichen die Länge seines Integer-Teils und ist
 * nur als Ganzes lexikografisch korrekt. Ein abgeschnittener Schlüssel ist
 * kein kürzerer Schlüssel, sondern ein FALSCHER: Er sortiert an einer anderen
 * Stelle und kollidiert mit Nachbarn. Deshalb lieber `null` senden — die API
 * fällt dann auf "a" + orderIndex zurück. Schlüssel wachsen ohnehin nur
 * logarithmisch, 100 Zeichen sind praktisch unerreichbar.
 */
export function sortKeyForSync(value: string | null): string | null {
  return dropIfTooLong(value, SYNC_FIELD_LIMITS.SORT_KEY)
}

/**
 * Eine zu lange `createdBy`/`modifiedBy` wird VERWORFEN, nicht gekürzt.
 *
 * Eine abgeschnittene UUID ist keine kürzere UUID, sondern eine ANDERE — sie
 * würde eine fremde Identität behaupten. Das Feld ist nullable und rein
 * informativ, `null` ist die ehrliche Antwort.
 */
export function userRefForSync(value: string | null): string | null {
  return dropIfTooLong(value, SYNC_FIELD_LIMITS.ID)
}

/**
 * Entitätstypen, für die es einen Sanitizer gibt.
 *
 * Das sind die sechs gemergten Typen aus `field-lww.ts` plus
 * `recipeChatMessage`: Chat-Nachrichten sind append-only und nehmen deshalb
 * nicht am LWW-Merge teil, gehen aber im selben Push-Body mit — ein zu langer
 * `content` kippt denselben Request.
 */
export interface SanitizableRowByType {
  list: List
  listItem: ListItem
  recipe: Recipe
  recipeIngredient: RecipeIngredient
  recipeStep: RecipeStep
  badge: Badge
  recipeChatMessage: RecipeChatMessage
}

export type SanitizableType = keyof SanitizableRowByType

/**
 * NICHT ANGEFASST WERDEN: `id`, `listId`, `recipeId`.
 *
 * Sie sind nicht nullable, und eine gekürzte ID zeigt auf eine andere Zeile
 * oder auf gar keine. Eine Zeile mit zu langer ID ist kaputt und gehört
 * aussortiert, nicht repariert — stillschweigend eine fremde Identität zu
 * behaupten wäre die schlechtere Antwort.
 *
 * Ebenfalls nicht angefasst: `fieldTimestamps`, `createdAt`, `updatedAt`,
 * `deletedAt`. Wer sie hier veränderte, verschöbe die LWW-Entscheidung,
 * obwohl sich inhaltlich nichts geändert hat.
 */
function sanitizeList(row: List): List {
  return {
    ...row,
    name: capText(row.name, SYNC_FIELD_LIMITS.NAME),
    color: capText(row.color, SYNC_FIELD_LIMITS.COLOR),
    lastSuggestedItems: capText(row.lastSuggestedItems, SYNC_FIELD_LIMITS.LAST_SUGGESTED),
    sourceUrl: capTextOrNull(row.sourceUrl, SYNC_FIELD_LIMITS.SOURCE_URL),
  }
}

function sanitizeListItem(row: ListItem): ListItem {
  return {
    ...row,
    name: capText(row.name, SYNC_FIELD_LIMITS.NAME),
    quantity: clampNumber(row.quantity),
    orderIndex: clampNumber(row.orderIndex),
    sortKey: sortKeyForSync(row.sortKey),
    createdBy: userRefForSync(row.createdBy),
    modifiedBy: userRefForSync(row.modifiedBy),
  }
}

function sanitizeRecipe(row: Recipe): Recipe {
  return {
    ...row,
    name: capText(row.name, SYNC_FIELD_LIMITS.NAME),
    color: capText(row.color, SYNC_FIELD_LIMITS.COLOR),
    sourceUrl: capTextOrNull(row.sourceUrl, SYNC_FIELD_LIMITS.SOURCE_URL),
    imagePath: capTextOrNull(row.imagePath, SYNC_FIELD_LIMITS.IMAGE_PATH),
  }
}

function sanitizeRecipeIngredient(row: RecipeIngredient): RecipeIngredient {
  return {
    ...row,
    name: capText(row.name, SYNC_FIELD_LIMITS.NAME),
    quantity: clampNumber(row.quantity),
    orderIndex: clampNumber(row.orderIndex),
    sortKey: sortKeyForSync(row.sortKey),
    createdBy: userRefForSync(row.createdBy),
    modifiedBy: userRefForSync(row.modifiedBy),
  }
}

function sanitizeRecipeStep(row: RecipeStep): RecipeStep {
  return {
    ...row,
    description: capText(row.description, SYNC_FIELD_LIMITS.DESCRIPTION),
    orderIndex: clampNumber(row.orderIndex),
    sortKey: sortKeyForSync(row.sortKey),
    aiExplanation: capTextOrNull(row.aiExplanation, SYNC_FIELD_LIMITS.AI_EXPLANATION),
    createdBy: userRefForSync(row.createdBy),
    modifiedBy: userRefForSync(row.modifiedBy),
  }
}

function sanitizeBadge(row: Badge): Badge {
  return {
    ...row,
    recipeName: capText(row.recipeName, SYNC_FIELD_LIMITS.NAME),
    recipeColor: capText(row.recipeColor, SYNC_FIELD_LIMITS.COLOR),
    recipeImagePath: capTextOrNull(row.recipeImagePath, SYNC_FIELD_LIMITS.IMAGE_PATH),
  }
}

/**
 * `role` wird nicht gekappt: Der Domänentyp lässt nur 'user' und 'assistant'
 * zu, beide liegen weit unter `ROLE`. Ein Kappen würde den Literaltyp zerstören
 * und damit eine Rolle erzeugen, die es im Modell nicht gibt.
 */
function sanitizeRecipeChatMessage(row: RecipeChatMessage): RecipeChatMessage {
  return {
    ...row,
    content: capText(row.content, SYNC_FIELD_LIMITS.CHAT_CONTENT),
    createdBy: userRefForSync(row.createdBy),
  }
}

const SANITIZERS: { [K in SanitizableType]: (row: SanitizableRowByType[K]) => SanitizableRowByType[K] } = {
  list: sanitizeList,
  listItem: sanitizeListItem,
  recipe: sanitizeRecipe,
  recipeIngredient: sanitizeRecipeIngredient,
  recipeStep: sanitizeRecipeStep,
  badge: sanitizeBadge,
  recipeChatMessage: sanitizeRecipeChatMessage,
}

/**
 * Alle Typen, die `sanitize` kennt — die Testsuite prüft damit, dass jeder
 * gemergte Entitätstyp aus `field-lww.ts` auch einen Sanitizer hat.
 *
 * Die Typzusicherung ist durch die Annotation von `SANITIZERS` gedeckt: Der
 * Mapped Type erzwingt, dass die Schlüssel exakt `SanitizableType` sind.
 */
export const SANITIZABLE_TYPES: readonly SanitizableType[] = Object.keys(SANITIZERS) as SanitizableType[]

/**
 * Kappt bzw. verwirft alle Werte einer Zeile auf die Limits der Sync-API.
 *
 * Reine Funktion: Sie gibt eine neue Zeile zurück und lässt die Eingabe in
 * Ruhe. Ob das Ergebnis auch lokal gespeichert wird, entscheidet der Aufrufer
 * — im Android-Client wird es das, damit der lokale Content-Hash nicht vom
 * gesendeten Stand abdriftet.
 */
export function sanitize<K extends SanitizableType>(
  entityType: K,
  row: SanitizableRowByType[K],
): SanitizableRowByType[K] {
  return SANITIZERS[entityType](row)
}

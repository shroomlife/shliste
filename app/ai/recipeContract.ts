/**
 * Der Antwort-Vertrag der Rezept-AI-Routen von api.shliste.app.
 *
 * Gleiche Haltung wie `contract.ts` (die Listen-Routen): Alles, was über das
 * Netz kommt, ist `unknown` und wird an der Kante eingeengt statt gecastet.
 * Eine Antwort, die dem Vertrag nicht entspricht, ergibt `null` und nie ein
 * halb gefülltes Objekt.
 *
 * Importe relativ statt über `~`: Die Parser laufen mit `bun test` ohne Nuxt
 * (dieselbe Begründung wie in `contract.ts`).
 */
import { isRecord, readArray, readNumberOr, readString } from '../sync/engine/json'
import { normalizeQuantity } from './contract'

/** Eine Zutat, wie sie voice-/url-/image-to-recipe liefern. */
export interface GeneratedIngredient {
  name: string
  quantity: number
}

/** Ein Schritt, wie ihn alle Rezept-Routen liefern. */
export interface GeneratedStep {
  description: string
}

/**
 * Antwort von voice-to-recipe, url-to-recipe und image-to-recipe.
 *
 * `imageData` ist ROHES Base64 (WebP) ohne data:-Präfix — es wird nie
 * angezeigt, sondern hochgeladen (siehe `images.ts`).
 */
export interface GeneratedRecipe {
  name: string
  ingredients: GeneratedIngredient[]
  steps: GeneratedStep[]
  imageData: string | null
  sourceUrl: string | null
}

/** Eine Zutat aus /ai/edit-recipe: `idx` null bedeutet neuer Eintrag. */
export interface EditedRecipeIngredient {
  idx: number | null
  name: string
  quantity: number
}

export interface EditedRecipeStep {
  idx: number | null
  description: string
}

export interface EditedRecipe {
  name: string
  ingredients: EditedRecipeIngredient[]
  steps: EditedRecipeStep[]
}

/** Antwort von /ai/voice-recipe-chat: Transkript plus Antwort. */
export interface VoiceChatReply {
  userMessage: string
  reply: string
}

function readValidIdx(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function parseGeneratedIngredient(value: unknown): GeneratedIngredient | null {
  if (!isRecord(value)) return null

  const name = readString(value, 'name')?.trim() ?? ''
  if (name.length === 0) return null

  return { name, quantity: normalizeQuantity(readNumberOr(value, 'quantity', 1)) }
}

function parseGeneratedStep(value: unknown): GeneratedStep | null {
  if (!isRecord(value)) return null

  const description = readString(value, 'description')?.trim() ?? ''
  if (description.length === 0) return null

  return { description }
}

/**
 * Antwort von voice-to-recipe, url-to-recipe und image-to-recipe:
 * `{recipe: {name, ingredients, steps}, imageData?, sourceUrl?}`.
 *
 * Ein Rezept ganz ohne Namen, Zutaten und Schritte gilt als gescheitert:
 * Was die AI nicht erkannt hat, soll nicht als leeres Rezept angelegt werden.
 */
export function parseGeneratedRecipe(payload: unknown): GeneratedRecipe | null {
  if (!isRecord(payload)) return null
  const recipe = payload.recipe
  if (!isRecord(recipe)) return null

  const name = readString(recipe, 'name')?.trim() ?? ''

  const ingredients: GeneratedIngredient[] = []
  for (const raw of readArray(recipe, 'ingredients')) {
    const ingredient = parseGeneratedIngredient(raw)
    if (ingredient !== null) ingredients.push(ingredient)
  }

  const steps: GeneratedStep[] = []
  for (const raw of readArray(recipe, 'steps')) {
    const step = parseGeneratedStep(raw)
    if (step !== null) steps.push(step)
  }

  if (name.length === 0 && ingredients.length === 0 && steps.length === 0) return null

  const imageData = readString(payload, 'imageData')
  const sourceUrl = readString(payload, 'sourceUrl')

  return {
    name: name.length > 0 ? name : 'Neues Rezept',
    ingredients,
    steps,
    imageData: imageData !== null && imageData.length > 0 ? imageData : null,
    sourceUrl: sourceUrl !== null && sourceUrl.length > 0 ? sourceUrl : null,
  }
}

function parseEditedIngredient(value: unknown): EditedRecipeIngredient | null {
  if (!isRecord(value)) return null

  const name = readString(value, 'name')?.trim() ?? ''
  if (name.length === 0) return null

  return {
    idx: readValidIdx(value.idx),
    name,
    quantity: normalizeQuantity(readNumberOr(value, 'quantity', 1)),
  }
}

function parseEditedStep(value: unknown): EditedRecipeStep | null {
  if (!isRecord(value)) return null

  const description = readString(value, 'description')?.trim() ?? ''
  if (description.length === 0) return null

  return { idx: readValidIdx(value.idx), description }
}

/** Antwort von /ai/edit-recipe und /ai/voice-edit-recipe: `{recipe: {...}}`. */
export function parseEditedRecipe(payload: unknown): EditedRecipe | null {
  if (!isRecord(payload)) return null
  const recipe = payload.recipe
  if (!isRecord(recipe)) return null

  const name = readString(recipe, 'name')?.trim() ?? ''
  if (name.length === 0) return null

  const ingredients: EditedRecipeIngredient[] = []
  for (const raw of readArray(recipe, 'ingredients')) {
    const ingredient = parseEditedIngredient(raw)
    if (ingredient !== null) ingredients.push(ingredient)
  }

  const steps: EditedRecipeStep[] = []
  for (const raw of readArray(recipe, 'steps')) {
    const step = parseEditedStep(raw)
    if (step !== null) steps.push(step)
  }

  return { name, ingredients, steps }
}

/** Antwort von /ai/recipe-chat: `{reply}`. */
export function parseChatReply(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const reply = readString(payload, 'reply')
  return reply !== null && reply.length > 0 ? reply : null
}

/** Antwort von /ai/voice-recipe-chat: `{userMessage, reply}`. */
export function parseVoiceChatReply(payload: unknown): VoiceChatReply | null {
  if (!isRecord(payload)) return null

  const userMessage = readString(payload, 'userMessage')
  const reply = readString(payload, 'reply')
  if (userMessage === null || userMessage.length === 0) return null
  if (reply === null || reply.length === 0) return null

  return { userMessage, reply }
}

/** Antwort von /ai/explain-step: `{explanation}`. */
export function parseExplanation(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const explanation = readString(payload, 'explanation')
  return explanation !== null && explanation.length > 0 ? explanation : null
}

/** Antwort von /ai/recipe-to-image — rohes Base64 ohne data:-Präfix. */
export function parseImageData(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const imageData = readString(payload, 'imageData')
  return imageData !== null && imageData.length > 0 ? imageData : null
}

/* ------------------------------------------------------------------ *
 * Anfrage-Formen
 * ------------------------------------------------------------------ */

/**
 * Das Rezept, wie es recipe-chat, voice-recipe-chat und explain-step
 * erwarten. Die Mengen MÜSSEN ganze Zahlen sein — die API validiert mit
 * `t.Integer()` und antwortet sonst 422 auf die gesamte Anfrage.
 */
export interface ChatRecipePayload {
  name: string
  ingredients: { name: string, quantity: number }[]
  steps: { description: string }[]
}

/**
 * Baut das Chat-Rezept aus den Zeilen der Detailansicht. `normalizeQuantity`
 * rundet auf eine ganze Zahl ab 1 — exakt die Form, die `t.Integer()` drüben
 * annimmt.
 */
export function buildChatRecipePayload(
  name: string,
  ingredients: readonly { readonly name: string, readonly quantity: number }[],
  steps: readonly { readonly description: string }[],
): ChatRecipePayload {
  return {
    name,
    ingredients: ingredients.map(row => ({ name: row.name, quantity: normalizeQuantity(row.quantity) })),
    steps: steps.map(row => ({ description: row.description })),
  }
}

/**
 * Der `recipeText` für /ai/recipe-to-image — zeilengleich mit der Android-App
 * (`enqueueImageGenerationJob` in AiJobRepository.kt), damit beide Clients
 * denselben Bild-Prompt erzeugen.
 */
export function buildRecipeImageText(
  name: string,
  ingredients: readonly { readonly name: string, readonly quantity: number }[],
  steps: readonly { readonly description: string }[],
): string {
  const lines: string[] = [name, '', 'Zutaten:']
  for (const ingredient of ingredients) {
    lines.push(`- ${ingredient.name} (${ingredient.quantity})`)
  }
  lines.push('', 'Schritte:')
  for (const [index, step] of steps.entries()) {
    lines.push(`${index + 1}. ${step.description}`)
  }
  // Android baut mit appendLine — jede Zeile endet auf '\n', auch die letzte.
  return `${lines.join('\n')}\n`
}

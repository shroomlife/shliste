/**
 * Diff zwischen dem aktuellen Rezept und dem AI-Vorschlag.
 *
 * Kein zweiter Algorithmus: Zutaten und Schritte laufen durch dasselbe
 * idx-Matching wie die Listeneinträge (`computeListDiff` in diff.ts) — hier
 * stehen nur die Adapter, die beide Formen in die Diff-Form bringen.
 *
 * - Zutaten: `checked` existiert nicht und bleibt konstant false — übrig
 *   bleiben genau die Fälle added/removed/modified(Menge)/renamed.
 * - Schritte: `description` wird als `name` gematcht, die Menge ist konstant 1
 *   — eine Umformulierung erscheint dadurch als `renamed`, also als Geändert.
 *
 * Reine Funktionen ohne Vue, direkt mit `bun test` prüfbar; Importe deshalb
 * relativ statt über `~` (dieselbe Begründung wie in diff.ts).
 */
import type { EditedListItem } from './contract'
import type { DiffSourceItem, ListDiffEntry } from './diff'
import type { EditedRecipe } from './recipeContract'

/** Payload-Form von `currentRecipe` für /ai/edit-recipe und /ai/voice-edit-recipe. */
export interface CurrentRecipePayload {
  name: string
  ingredients: { idx: number, name: string, quantity: number }[]
  steps: { idx: number, description: string }[]
}

/** Eine Zutat, wie das Diff und die Anfrage sie brauchen. */
export interface RecipeIngredientSource {
  readonly id: string
  readonly name: string
  readonly quantity: number
}

/** Ein Schritt, wie das Diff und die Anfrage ihn brauchen. */
export interface RecipeStepSource {
  readonly id: string
  readonly description: string
}

/**
 * Baut die `currentRecipe` der Anfrage. Der `idx` ist die Position in den
 * übergebenen Arrays — GENAU diese Arrays müssen später auch dem Diff dienen,
 * sonst zeigen die zurückgegebenen Indizes auf die falschen Einträge.
 */
export function buildCurrentRecipePayload(
  name: string,
  ingredients: readonly RecipeIngredientSource[],
  steps: readonly RecipeStepSource[],
): CurrentRecipePayload {
  return {
    name,
    ingredients: ingredients.map((row, idx) => ({ idx, name: row.name, quantity: row.quantity })),
    steps: steps.map((row, idx) => ({ idx, description: row.description })),
  }
}

/** Zutaten in der Form, die `computeListDiff` erwartet. */
export function ingredientDiffSource(ingredients: readonly RecipeIngredientSource[]): DiffSourceItem[] {
  return ingredients.map(row => ({ id: row.id, name: row.name, quantity: row.quantity, checked: false }))
}

/** Schritte in der Form, die `computeListDiff` erwartet (`name` = description). */
export function stepDiffSource(steps: readonly RecipeStepSource[]): DiffSourceItem[] {
  return steps.map(row => ({ id: row.id, name: row.description, quantity: 1, checked: false }))
}

/** Die vorgeschlagenen Zutaten in der Eintragsform des Diffs. */
export function editedIngredientsAsItems(proposal: EditedRecipe): EditedListItem[] {
  return proposal.ingredients.map(row => ({
    idx: row.idx,
    name: row.name,
    quantity: row.quantity,
    checked: false,
  }))
}

/** Die vorgeschlagenen Schritte in der Eintragsform des Diffs. */
export function editedStepsAsItems(proposal: EditedRecipe): EditedListItem[] {
  return proposal.steps.map(row => ({
    idx: row.idx,
    name: row.description,
    quantity: 1,
    checked: false,
  }))
}

/** Was „Übernehmen" an die Seite meldet: neuer Name plus die zwei Diff-Blöcke. */
export interface AiRecipeEditApplyPayload {
  name: string
  ingredientEntries: ListDiffEntry[]
  stepEntries: ListDiffEntry[]
}

/** Hat der Vorschlag überhaupt etwas geändert (Blöcke oder Rezeptname)? */
export function hasRecipeChanges(
  ingredientDiff: readonly ListDiffEntry[],
  stepDiff: readonly ListDiffEntry[],
  currentName: string,
  proposal: EditedRecipe,
): boolean {
  if (proposal.name.trim() !== currentName) return true
  return ingredientDiff.some(entry => entry.kind !== 'unchanged')
    || stepDiff.some(entry => entry.kind !== 'unchanged')
}

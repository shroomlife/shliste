/**
 * Ein einzelnes Rezept samt Zutaten und Schritten.
 *
 * Aufbau bewusst wie `useListDetail`: Beide Bereiche verhalten sich für die
 * Bedienung gleich, deshalb sollen sie sich auch im Code gleich lesen — bis
 * hin zum Schutz gegen das Wettrennen beim schnellen Wechsel.
 *
 * Ohne Konto nutzbar. Die Daten liegen in IndexedDB; der Abgleich schreibt in
 * dieselbe Datenbank zurück, danach genügt hier ein erneutes `load()`.
 *
 * Der Gesprächsverlauf (`recipe_chat_messages`) bleibt aussen vor: Er gehört
 * zur KI-Unterstützung, und die ist die zweite Welle.
 */
import type { RecipeIngredient, RecipeStep } from '../../shared/types/domain'
import {
  getIngredientsForRecipe,
  getRecipe,
  getStepsForRecipe,
  upsertIngredient,
  upsertStep,
  type Draft,
} from '../db/repositories'
import type { RecipeIngredientRow, RecipeRow, RecipeStepRow } from '../db/schema'
import { nowIso } from '../db/timestamps'

/* ------------------------------------------------------------------ *
 * Reine Funktionen — ohne IndexedDB und ohne Vue, deshalb direkt testbar.
 * ------------------------------------------------------------------ */

/**
 * Der Ordnungswert für einen neuen Eintrag: hinter allen bestehenden.
 *
 * Wie bei den Listeneinträgen: `sortKey` bleibt leer, den vergibt erst das
 * Umsortieren. `orderIndex` ist die Rückfallordnung und muss trotzdem
 * eindeutig hinten liegen, sonst springt der neue Eintrag an eine
 * willkürliche Stelle.
 */
export function nextOrderIndex(rows: readonly { readonly orderIndex: number }[]): number {
  return rows.reduce((highest, row) => Math.max(highest, row.orderIndex), -1) + 1
}

/** Der Anteil erledigter Schritte in Prozent, gerundet. */
export function stepProgress(steps: readonly { readonly isChecked: boolean }[]): number {
  if (steps.length === 0) return 0
  return Math.round((steps.filter(step => step.isChecked).length / steps.length) * 100)
}

/**
 * Baut aus einer Zeile den Entwurf für ein Update.
 *
 * Ohne `createdAt`, `updatedAt` und `fieldTimestamps`: Die führt die
 * Datenbankschicht, und wer sie mitschickte, würde genau die Zeitstempel
 * überschreiben, auf denen das feldgenaue Last-Write-Wins beruht.
 */
function toIngredientDraft(row: RecipeIngredient): Draft<RecipeIngredient> {
  return {
    id: row.id,
    recipeId: row.recipeId,
    name: row.name,
    quantity: row.quantity,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    deletedAt: row.deletedAt,
  }
}

function toStepDraft(row: RecipeStep): Draft<RecipeStep> {
  return {
    id: row.id,
    recipeId: row.recipeId,
    description: row.description,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    isChecked: row.isChecked,
    aiExplanation: row.aiExplanation,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    deletedAt: row.deletedAt,
  }
}

/* ------------------------------------------------------------------ *
 * Der Zustand der Ansicht
 * ------------------------------------------------------------------ */

export function useRecipeDetail() {
  const recipe = useState<RecipeRow | null>('recipe-detail', () => null)
  const ingredients = useState<RecipeIngredientRow[]>('recipe-detail-ingredients', () => [])
  const steps = useState<RecipeStepRow[]>('recipe-detail-steps', () => [])
  const isLoading = useState<boolean>('recipe-detail-loading', () => false)

  /** Welches Rezept zuletzt angefordert wurde — siehe `useListDetail`. */
  const requestedRecipeId = useState<string | null>('recipe-detail-id', () => null)

  const progress = computed<number>(() => stepProgress(steps.value))

  async function load(recipeId: string): Promise<void> {
    if (import.meta.server) return

    requestedRecipeId.value = recipeId
    isLoading.value = true

    try {
      const [row, loadedIngredients, loadedSteps] = await Promise.all([
        getRecipe(recipeId),
        getIngredientsForRecipe(recipeId),
        getStepsForRecipe(recipeId),
      ])

      // Ein zwischenzeitlicher Wechsel gewinnt: Sonst könnte das ältere
      // Ergebnis als letztes eintreffen und das falsche Rezept anzeigen.
      if (requestedRecipeId.value !== recipeId) return

      recipe.value = row ?? null
      ingredients.value = loadedIngredients
      steps.value = loadedSteps
    }
    finally {
      if (requestedRecipeId.value === recipeId) isLoading.value = false
    }
  }

  async function reload(): Promise<void> {
    const recipeId = requestedRecipeId.value
    if (recipeId === null) return
    await load(recipeId)
  }

  /**
   * Legt eine Zutat an. Die ID kommt vom Client — dieselbe Begründung wie bei
   * den Listeneinträgen: ohne eigene Schlüssel kein Offline-Betrieb.
   */
  async function addIngredient(name: string, quantity: number = 1): Promise<RecipeIngredientRow | null> {
    const trimmed = name.trim()
    const target = recipe.value
    if (trimmed.length === 0 || target === null) return null

    const row = await upsertIngredient({
      id: crypto.randomUUID(),
      recipeId: target.id,
      name: trimmed,
      quantity,
      orderIndex: nextOrderIndex(ingredients.value),
      sortKey: null,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })

    await reload()
    return row
  }

  async function addStep(description: string): Promise<RecipeStepRow | null> {
    const trimmed = description.trim()
    const target = recipe.value
    if (trimmed.length === 0 || target === null) return null

    const row = await upsertStep({
      id: crypto.randomUUID(),
      recipeId: target.id,
      description: trimmed,
      orderIndex: nextOrderIndex(steps.value),
      sortKey: null,
      isChecked: false,
      aiExplanation: null,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })

    await reload()
    return row
  }

  /** Hakt einen Schritt beim Kochen ab oder nimmt das Häkchen zurück. */
  async function toggleStep(step: RecipeStep): Promise<void> {
    await upsertStep({ ...toStepDraft(step), isChecked: !step.isChecked })
    await reload()
  }

  /**
   * Löscht eine Zutat.
   *
   * `deletedAt` und nicht das Entfernen der Zeile: Der Grabstein ist die
   * Löschabsicht, die beim nächsten Push hinausgeht. Würde die Zeile hier
   * verschwinden, wüsste der Server nie davon und brächte sie beim nächsten
   * Pull zurück.
   */
  async function removeIngredient(ingredient: RecipeIngredient): Promise<void> {
    await upsertIngredient({ ...toIngredientDraft(ingredient), deletedAt: nowIso() })
    await reload()
  }

  async function removeStep(step: RecipeStep): Promise<void> {
    await upsertStep({ ...toStepDraft(step), deletedAt: nowIso() })
    await reload()
  }

  return {
    recipe: readonly(recipe),
    ingredients: readonly(ingredients),
    steps: readonly(steps),
    progress,
    isLoading: readonly(isLoading),
    load,
    reload,
    addIngredient,
    addStep,
    toggleStep,
    removeIngredient,
    removeStep,
  }
}

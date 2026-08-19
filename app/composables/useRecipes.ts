import type { RecipeRow } from '../db/schema'
import {
  getIngredientsForRecipe,
  getRecipesForView,
  getStepsForRecipe,
  upsertRecipe,
} from '../db/repositories'
import { randomListColor } from '../utils/color'

/**
 * Ein Rezept samt der Zahlen, die die Übersicht anzeigt.
 *
 * Wie bei den Listen abgeleitet und nicht in der Zeile gespeichert: Eine
 * zweite Wahrheit, die bei jeder Änderung mitgepflegt werden müsste, würde
 * früher oder später auseinanderlaufen.
 */
export interface RecipeWithCounts {
  recipe: RecipeRow
  ingredientCount: number
  stepCount: number
}

/**
 * Rezeptübersicht aus der lokalen Datenbank.
 *
 * Aufbau bewusst gleich wie `useLists`: Beide Bereiche verhalten sich für die
 * Bedienung identisch, deshalb sollen sie sich auch im Code gleich lesen.
 *
 * Wie bei den Listen ohne Konto nutzbar — angemeldet werden muss man erst
 * für Abgleich und Teilen.
 */
export function useRecipes() {
  const entries = useState<RecipeWithCounts[]>('recipes', () => [])
  const isLoading = useState<boolean>('recipes-loading', () => false)

  async function reload(): Promise<void> {
    // IndexedDB gibt es nur im Browser. Auf dem Server bleibt die Liste leer,
    // was folgenlos ist, weil der App-Bereich client-seitig rendert.
    if (import.meta.server) return

    isLoading.value = true
    try {
      const recipes = await getRecipesForView()
      entries.value = await Promise.all(recipes.map(async (recipe) => {
        const [ingredients, steps] = await Promise.all([
          getIngredientsForRecipe(recipe.id),
          getStepsForRecipe(recipe.id),
        ])
        return { recipe, ingredientCount: ingredients.length, stepCount: steps.length }
      }))
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Legt ein Rezept an und gibt es zurück.
   *
   * Die ID wird clientseitig vergeben, genau wie bei den Listen und wie in der
   * Android-App: ohne eigene Schlüssel gäbe es offline keine stabile
   * Identität.
   */
  async function createRecipe(name: string): Promise<RecipeRow> {
    const row = await upsertRecipe({
      id: crypto.randomUUID(),
      name: name.trim(),
      color: randomListColor(),
      sourceUrl: null,
      imagePath: null,
      deletedAt: null,
    })
    await reload()
    return row
  }

  return {
    entries: readonly(entries),
    isLoading: readonly(isLoading),
    reload,
    createRecipe,
  }
}

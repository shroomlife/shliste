import type { GeneratedList } from './contract'
import type { GeneratedRecipe } from './recipeContract'
import {
  getList,
  getRecipe,
  upsertIngredient,
  upsertItem,
  upsertList,
  upsertRecipe,
  upsertStep,
} from '../db/repositories'
import { nextSortKey } from '../sync/merge/reorder'

/**
 * Schreibt AI-Ergebnisse direkt in die lokale Datenbank — OHNE den geteilten
 * Detail-Zustand.
 *
 * WARUM NICHT über `useListDetail`/`useRecipeDetail`: Deren Zustand ist EIN
 * `useState` für die ganze App. Eine Übersichtsseite, die ihn zum Anlegen
 * kapert, verschiebt die offene Detailansicht auf den neuen Datensatz — und
 * sobald während der langen AI-Wartezeit ein Sync-Tick den Zustand auf die
 * per Route geöffnete Zeile zurücksetzt, landen die restlichen Schreibzüge
 * (Einträge, Bildpfad) am FALSCHEN Datensatz. Hier ist jede Funktion an die
 * explizit übergebene Id gebunden; ein Wechsel der Ansicht kann nichts mehr
 * umleiten.
 */
export async function persistGeneratedListDetails(listId: string, generated: GeneratedList): Promise<void> {
  if (generated.sourceUrl !== null) {
    await setListSourceUrlById(listId, generated.sourceUrl)
  }

  const created: { sortKey: string | null }[] = []
  for (const [index, item] of generated.items.entries()) {
    const sortKey = nextSortKey(created)
    await upsertItem({
      id: crypto.randomUUID(),
      listId,
      name: item.name,
      quantity: item.quantity,
      checked: false,
      removed: false,
      orderIndex: index,
      sortKey,
      // Die KI liefert Namen, keine Adressen — ein KI-Eintrag ist nie ein Link.
      url: null,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })
    created.push({ sortKey })
  }
}

export async function persistGeneratedRecipeDetails(recipeId: string, generated: GeneratedRecipe): Promise<void> {
  if (generated.sourceUrl !== null) {
    await setRecipeSourceUrlById(recipeId, generated.sourceUrl)
  }

  const ingredientKeys: { sortKey: string | null }[] = []
  for (const [index, ingredient] of generated.ingredients.entries()) {
    const sortKey = nextSortKey(ingredientKeys)
    await upsertIngredient({
      id: crypto.randomUUID(),
      recipeId,
      name: ingredient.name,
      quantity: ingredient.quantity,
      orderIndex: index,
      sortKey,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })
    ingredientKeys.push({ sortKey })
  }

  const stepKeys: { sortKey: string | null }[] = []
  for (const [index, step] of generated.steps.entries()) {
    const sortKey = nextSortKey(stepKeys)
    await upsertStep({
      id: crypto.randomUUID(),
      recipeId,
      description: step.description,
      orderIndex: index,
      sortKey,
      isChecked: false,
      aiExplanation: null,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })
    stepKeys.push({ sortKey })
  }
}

/**
 * Setzt den Bildpfad eines Rezepts — frisch gelesen, nur dieses eine Feld.
 *
 * Die Zeile wird unmittelbar vor dem Schreiben aus der Datenbank geholt:
 * Zwischen Generierung und Upload können Minuten liegen, und ein Draft aus
 * einem alten Ansichts-Zustand würde alle zwischenzeitlichen Änderungen
 * (auch fremde, per Pull angekommene) mit frischen Zeitstempeln kippen.
 */
export async function attachRecipeImageById(recipeId: string, imagePath: string): Promise<boolean> {
  const row = await getRecipe(recipeId)
  if (row === undefined || row.deletedAt !== null) return false

  await upsertRecipe({
    id: row.id,
    name: row.name,
    color: row.color,
    sourceUrl: row.sourceUrl,
    imagePath,
    deletedAt: row.deletedAt,
  })
  return true
}

async function setRecipeSourceUrlById(recipeId: string, sourceUrl: string): Promise<void> {
  const row = await getRecipe(recipeId)
  if (row === undefined) return

  await upsertRecipe({
    id: row.id,
    name: row.name,
    color: row.color,
    sourceUrl,
    imagePath: row.imagePath,
    deletedAt: row.deletedAt,
  })
}

async function setListSourceUrlById(listId: string, sourceUrl: string): Promise<void> {
  const row = await getList(listId)
  if (row === undefined) return

  await upsertList({
    id: row.id,
    name: row.name,
    color: row.color,
    secret: row.secret,
    sourceUrl,
    lastSuggestedItems: row.lastSuggestedItems,
    ownerUserId: row.ownerUserId,
    deletedAt: row.deletedAt,
  })
}

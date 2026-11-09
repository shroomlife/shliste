import type { IDBPDatabase, IDBPTransaction } from 'idb'
import type { ShlisteDb, RecipeRow, RecipeIngredientRow, RecipeStepRow } from './schema'
import { getDb } from './client'
import { generateNKeysBetween } from '../sync/merge/fractional-index'
import { ingredientLabel, parseIllustration, parseEditorialMetadata, recipeMetadata, validateCatalogRecipe, type CatalogRecipe } from '../../lib/editorial'

const catalogStores = ['recipes', 'recipe_ingredients', 'recipe_steps', 'sync_meta'] as const
type CatalogTx = IDBPTransaction<ShlisteDb, typeof catalogStores, 'readwrite'>

async function refreshArtwork(tx: CatalogTx, row: RecipeRow, recipe: CatalogRecipe) {
  const meta = parseEditorialMetadata(row.editorialMetadata)
  if (!meta || row.deletedAt || meta.catalogId !== recipe.catalogId || meta.version !== recipe.version) return false
  const stamp = new Date().toISOString()
  let changed = false
  const needsUpdate = (old: CatalogRecipe['hero'], next: CatalogRecipe['hero']) => {
    const previous = old.src.match(/^(.+)\/v(\d+)\//)
    const current = next.src.match(/^(.+)\/v(\d+)\//)
    return previous && current && previous[1] === current[1] && Number(previous[2]) <= Number(current[2]) && (old.src !== next.src || old.alt !== next.alt || JSON.stringify(old.markers ?? []) !== JSON.stringify(next.markers ?? []))
  }
  const refreshCover = needsUpdate(meta.hero, recipe.hero)
  const refreshName = row.name !== recipe.title && recipe.previousTitles?.includes(row.name)
  const legacySource = `https://shliste.app/rezepte/${recipe.slug}`
  const originalUrl = recipe.inspiration?.url
  const refreshSource = row.sourceUrl === legacySource && originalUrl && originalUrl !== legacySource
  if (refreshCover || refreshName || refreshSource) {
    const updated = { ...row, updatedAt: stamp, dirty: 1 as const, fieldTimestamps: { ...row.fieldTimestamps } }
    if (refreshCover) {
      updated.editorialMetadata = JSON.stringify({ ...meta, hero: recipe.hero })
      updated.fieldTimestamps.editorialMetadata = stamp
    }
    if (refreshSource) {
      updated.sourceUrl = originalUrl
      updated.fieldTimestamps.sourceUrl = stamp
    }
    if (refreshName) {
      updated.name = recipe.title
      updated.fieldTimestamps.name = stamp
    }
    await tx.objectStore('recipes').put(updated)
    changed = true
  }
  const originals = new Map(recipe.steps.map(step => [step.title + '\n\n' + step.instruction, step.illustration]))
  const steps = tx.objectStore('recipe_steps')
  for (const step of await steps.index('by-recipeId').getAll(row.id)) {
    const old = parseIllustration(step.illustration)
    const next = originals.get(step.description)
    if (step.deletedAt || !old || !next || !needsUpdate(old, next)) continue
    await steps.put({ ...step, illustration: JSON.stringify(next), updatedAt: stamp, dirty: 1, fieldTimestamps: { ...step.fieldTimestamps, illustration: stamp } })
    changed = true
  }
  if (changed) {
    const gen = await tx.objectStore('sync_meta').get('workGeneration')
    await tx.objectStore('sync_meta').put((typeof gen === 'number' ? gen : 0) + 1, 'workGeneration')
  }
  return changed
}

/** Nur die bereits geöffnete Kopie anfassen; offline bleibt sie vollständig nutzbar. */
export async function refreshSavedCatalogArtwork(recipeId: string, input: CatalogRecipe, database?: IDBPDatabase<ShlisteDb>) {
  const recipe = validateCatalogRecipe(input)
  const db = database ?? await getDb()
  const tx = db.transaction(catalogStores, 'readwrite')
  try {
    const row = await tx.objectStore('recipes').get(recipeId)
    const changed = row ? await refreshArtwork(tx, row, recipe) : false
    await tx.done
    return changed
  }
  catch (error) {
    try {
      tx.abort()
    }
    catch { /* Already inactive. */ }
    await tx.done.catch(() => {})
    throw error
  }
}

/** Serialisierung durch IndexedDB verhindert auch Dubletten zwischen mehreren Tabs. Kein Netz innerhalb der Transaktion. */
export async function importCatalogRecipe(input: CatalogRecipe, asCopy = false, database?: IDBPDatabase<ShlisteDb>): Promise<{ recipeId: string, created: boolean }> {
  const recipe = validateCatalogRecipe(input)
  const db = database ?? await getDb()
  const tx = db.transaction(catalogStores, 'readwrite')
  // Attach rejection handling before any child request can abort the transaction.
  void tx.done.catch(() => {})
  try {
    const existing = (await tx.objectStore('recipes').getAll()).find(row => !row.deletedAt && parseEditorialMetadata(row.editorialMetadata)?.catalogId === recipe.catalogId)
    if (existing && !asCopy) {
      await refreshArtwork(tx, existing, recipe)
      await tx.done
      return { recipeId: existing.id, created: false }
    }
    const recipeId = crypto.randomUUID()
    const stamp = new Date().toISOString()
    const meta = (fields: string[]) => ({ createdAt: stamp, updatedAt: stamp, deletedAt: null, dirty: 1 as const, fieldTimestamps: Object.fromEntries(fields.map(f => [f, stamp])) })
    const row: RecipeRow = {
      id: recipeId, name: recipe.title, color: '#D8AF73', sourceUrl: recipe.inspiration?.url ?? null,
      imagePath: null, editorialMetadata: JSON.stringify(recipeMetadata(recipe)),
      ...meta(['name', 'color', 'sourceUrl', 'imagePath', 'editorialMetadata', 'deletedAt']),
    }
    await tx.objectStore('recipes').add(row)
    const ingredientKeys = generateNKeysBetween(null, null, recipe.ingredients.length)
    for (const [index, ingredient] of recipe.ingredients.entries()) {
      const item: RecipeIngredientRow = { id: crypto.randomUUID(), recipeId, name: ingredientLabel(ingredient), quantity: 1, orderIndex: index, sortKey: ingredientKeys[index]!, createdBy: null, modifiedBy: null, ...meta(['name', 'quantity', 'orderIndex', 'sortKey', 'deletedAt']) }
      await tx.objectStore('recipe_ingredients').add(item)
    }
    const stepKeys = generateNKeysBetween(null, null, recipe.steps.length)
    for (const [index, step] of recipe.steps.entries()) {
      const item: RecipeStepRow = { id: crypto.randomUUID(), recipeId, description: `${step.title}\n\n${step.instruction}`, illustration: JSON.stringify(step.illustration), orderIndex: index, sortKey: stepKeys[index]!, isChecked: false, aiExplanation: null, createdBy: null, modifiedBy: null, ...meta(['description', 'illustration', 'orderIndex', 'sortKey', 'isChecked', 'aiExplanation', 'deletedAt']) }
      await tx.objectStore('recipe_steps').add(item)
    }
    const previous = await tx.objectStore('sync_meta').get('workGeneration')
    await tx.objectStore('sync_meta').put((typeof previous === 'number' ? previous : 0) + 1, 'workGeneration')
    await tx.done
    return { recipeId, created: true }
  }
  catch (error) {
    try {
      tx.abort()
    }
    catch { /* Transaktion bereits abgebrochen. */ }
    await tx.done.catch(() => {})
    throw error
  }
}

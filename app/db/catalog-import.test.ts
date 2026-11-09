import 'fake-indexeddb/auto'
import { afterEach, describe, expect, test } from 'bun:test'
import { openDB, deleteDB, type IDBPDatabase } from 'idb'
import { createSchema, type ShlisteDb } from './schema'
import { importCatalogRecipe, refreshSavedCatalogArtwork } from './catalog-import'
import { buildPushPayload } from '../sync/engine/push'
import { parseRecipe, parseStep } from '../sync/engine/entities'
import { mergeFields } from '../sync/merge/field-lww'
import { pilotRecipe, recipeIdeas, getCatalogRecipe } from '../../lib/recipes/catalog'
import { filterRecipeIdeas } from '../../lib/recipe-filters'
import { parseEditorialMetadata, parseIllustration, validateCatalogRecipe } from '../../lib/editorial'

const databases: { name: string, db: IDBPDatabase<ShlisteDb> }[] = []
async function database() {
  const name = `catalog-test-${crypto.randomUUID()}`
  const db = await openDB<ShlisteDb>(name, 1, { upgrade: createSchema })
  databases.push({ name, db })
  return db
}
afterEach(async () => {
  for (const { name, db } of databases.splice(0)) {
    db.close()
    await deleteDB(name)
  }
})

describe('editorial catalog contract', () => {
  test('20 unique ideas, ten sweet and ten savory; released recipes are public', () => {
    expect(new Set(recipeIdeas.map(r => r.id)).size).toBe(20)
    expect(recipeIdeas.filter(r => r.kind === 'suess')).toHaveLength(10)
    expect(recipeIdeas.filter(r => r.kind === 'herzhaft')).toHaveLength(10)
    expect(pilotRecipe.status).toBe('published')
    expect(getCatalogRecipe(pilotRecipe.catalogId)).toEqual(pilotRecipe)
    expect(getCatalogRecipe(pilotRecipe.catalogId, 1, true)).toEqual(pilotRecipe)
    expect(getCatalogRecipe(pilotRecipe.catalogId, 2, true)).toBeNull()
  })
  test('filters combine; unknown cooking times cannot match a time filter', () => {
    expect(filterRecipeIdeas(recipeIdeas, { kind: 'suess', meal: 'Frühstück' })).toHaveLength(3)
    expect(filterRecipeIdeas(recipeIdeas, { q: 'ZWIEBEL', maxMinutes: 75, difficulty: 'einfach' }, [pilotRecipe]).map(r => r.id)).toEqual([pilotRecipe.catalogId])
    expect(filterRecipeIdeas(recipeIdeas, { maxMinutes: 30 }, [pilotRecipe])).toEqual([])
    expect(filterRecipeIdeas(recipeIdeas, { kind: 'suess', q: 'zwiebel' })).toEqual([])
  })
  test('untrusted image URLs and invalid recipes are rejected', () => {
    expect(parseIllustration(JSON.stringify({ src: 'https://example.com/tracker', alt: 'x' }))).toBeNull()
    expect(parseIllustration('{broken')).toBeNull()
    expect(() => validateCatalogRecipe({ ...pilotRecipe, ingredients: [{ ...pilotRecipe.ingredients[0], amount: -1 }] })).toThrow()
  })
})
describe('atomic personal recipe import', () => {
  test('push and pull retain metadata and illustrations; omitted fields differ from explicit null', async () => {
    const db = await database()
    await importCatalogRecipe(pilotRecipe, false, db)
    const payload = buildPushPayload({ lists: [], items: [], recipes: await db.getAll('recipes'), ingredients: await db.getAll('recipe_ingredients'), steps: await db.getAll('recipe_steps'), badges: [], chatMessages: [], historyEntries: [] })
    expect(parseRecipe(payload.recipes[0])?.editorialMetadata).toBe(payload.recipes[0]!.editorialMetadata!)
    expect(parseStep(payload.recipeSteps[0])?.illustration).toBe(payload.recipeSteps[0]!.illustration!)
    const { illustration: _illustration, ...oldStep } = payload.recipeSteps[0]!
    expect(Object.hasOwn(parseStep(oldStep)!, 'illustration')).toBe(false)
    expect(parseStep({ ...oldStep, illustration: null })?.illustration).toBeNull()
    const local = { illustration: payload.recipeSteps[0]!.illustration }
    const localTs = { illustration: '2026-11-01T12:00:00Z' }
    expect(mergeFields(['illustration'], local, localTs, {}, {}).mergedValues.illustration).toBe(local.illustration!)
    expect(mergeFields(['illustration'], local, localTs, { illustration: null }, { illustration: '2026-11-03T12:00:00Z' }).mergedValues.illustration).toBeNull()
  })
  test('concurrent imports create one recipe, all children, and one work generation', async () => {
    const db = await database()
    const results = await Promise.all([importCatalogRecipe(pilotRecipe, false, db), importCatalogRecipe(pilotRecipe, false, db)])
    expect(results.filter(r => r.created)).toHaveLength(1)
    expect(results[0]!.recipeId).toBe(results[1]!.recipeId)
    expect(await db.count('recipes')).toBe(1)
    expect(await db.count('recipe_steps')).toBe(8)
    expect(await db.count('recipe_ingredients')).toBe(pilotRecipe.ingredients.length)
    expect(await db.count('lists')).toBe(0)
    expect(await db.get('sync_meta', 'workGeneration')).toBe(1)
    const recipe = (await db.getAll('recipes'))[0]!
    expect(parseEditorialMetadata(recipe.editorialMetadata)?.catalogId).toBe(pilotRecipe.catalogId)
    expect((await db.getAll('recipe_steps')).every(s => parseIllustration(s.illustration))).toBe(true)
    expect((await db.getAll('recipe_ingredients')).every(i => Number.isInteger(i.quantity))).toBe(true)
    recipe.name = 'Meine eigene Variante'
    await db.put('recipes', recipe)
    await importCatalogRecipe(pilotRecipe, false, db)
    expect((await db.get('recipes', recipe.id))?.name).toBe('Meine eigene Variante')
    await importCatalogRecipe(pilotRecipe, true, db)
    expect(await db.count('recipes')).toBe(2)
  })
  test('refreshes a saved edition in place, preserving progress, private edits and image removals', async () => {
    const db = await database()
    const old = structuredClone(pilotRecipe)
    old.title = 'French-Onion-Pasta'
    old.hero.src = old.hero.src.replace('/v2/', '/v1/')
    for (const step of old.steps) step.illustration.src = old.hero.src
    const { recipeId } = await importCatalogRecipe(old, false, db)
    const rows = (await db.getAll('recipe_steps')).sort((a, b) => a.orderIndex - b.orderIndex)
    await db.put('recipe_steps', { ...rows[0]!, description: 'Meine eigene Methode' })
    await db.put('recipe_steps', { ...rows[1]!, illustration: null })
    await db.put('recipe_steps', { ...rows[7]!, isChecked: true, orderIndex: 0 })
    expect(await importCatalogRecipe(pilotRecipe, false, db)).toEqual({ recipeId, created: false })
    expect((await db.get('recipes', recipeId))?.name).toBe(pilotRecipe.title)
    expect(parseEditorialMetadata((await db.get('recipes', recipeId))?.editorialMetadata)?.hero).toEqual(pilotRecipe.hero)
    expect((await db.get('recipe_steps', rows[0]!.id))?.description).toBe('Meine eigene Methode')
    expect((await db.get('recipe_steps', rows[1]!.id))?.illustration).toBeNull()
    const serving = await db.get('recipe_steps', rows[7]!.id)
    expect(serving?.isChecked).toBe(true)
    expect(serving?.orderIndex).toBe(0)
    expect(parseIllustration(serving?.illustration)).toEqual(pilotRecipe.steps[7]!.illustration)
    expect(await refreshSavedCatalogArtwork(recipeId, pilotRecipe, db)).toBe(false)
    expect(await refreshSavedCatalogArtwork(recipeId, old, db)).toBe(false)
    expect(await db.get('sync_meta', 'workGeneration')).toBe(2)
  })
  test('upgrades only the generated source link on existing copies', async () => {
    const db = await database()
    const { recipeId } = await importCatalogRecipe(pilotRecipe, false, db)
    const recipe = (await db.get('recipes', recipeId))!
    expect(recipe.sourceUrl).toBe(pilotRecipe.inspiration!.url)
    for (const sourceUrl of [null, 'https://example.org/mein-rezept']) {
      await db.put('recipes', { ...recipe, sourceUrl })
      expect(await refreshSavedCatalogArtwork(recipeId, pilotRecipe, db)).toBe(false)
      expect((await db.get('recipes', recipeId))?.sourceUrl).toBe(sourceUrl)
    }
    await db.put('recipes', { ...recipe, sourceUrl: `https://shliste.app/rezepte/${pilotRecipe.slug}` })
    expect(await refreshSavedCatalogArtwork(recipeId, pilotRecipe, db)).toBe(true)
    expect((await db.get('recipes', recipeId))?.sourceUrl).toBe(pilotRecipe.inspiration!.url)
  })
  test('a child write failure rolls back parent, children, and work generation', async () => {
    const db = await database()
    const original = crypto.randomUUID
    crypto.randomUUID = () => '00000000-0000-4000-8000-000000000001'
    try {
      await expect(importCatalogRecipe(pilotRecipe, false, db)).rejects.toThrow()
    }
    finally { crypto.randomUUID = original }
    expect(await db.count('recipes')).toBe(0)
    expect(await db.count('recipe_ingredients')).toBe(0)
    expect(await db.count('recipe_steps')).toBe(0)
    expect(await db.get('sync_meta', 'workGeneration')).toBeUndefined()
  })
})

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { catalogRecipes, recipeIdeas, getCatalogRecipe } from '../lib/recipes/catalog'
import pairings from '../lib/recipes/pairings.json'
import { ingredientLabel, recipeMetadata } from '../lib/editorial'

// Read-only release gate. Publication is an explicit editorial change, never a side effect.
const preview = process.argv.includes('--preview')
const problems: string[] = []
const assert = (condition: unknown, message: string) => {
  if (!condition) problems.push(message)
}
assert(catalogRecipes.length === 20, 'Expected 20 complete recipes')
assert(new Set(catalogRecipes.map(r => r.catalogId)).size === catalogRecipes.length, 'Duplicate catalog IDs')
assert(new Set(catalogRecipes.map(r => r.slug)).size === catalogRecipes.length, 'Duplicate recipe slugs')
for (const kind of ['herzhaft', 'suess']) assert(catalogRecipes.filter(r => r.kind === kind).length === 10, `Expected 10 ${kind} recipes`)
for (const recipe of catalogRecipes) {
  assert(preview || recipe.status === 'published', `${recipe.slug}: editorial publication pending`)
  assert(getCatalogRecipe(recipe.slug, recipe.version, true)?.catalogId === recipe.catalogId, `${recipe.slug}: slug does not resolve to stable ID`)
  assert(recipeIdeas.some(idea => idea.id === recipe.catalogId), `${recipe.slug}: catalog idea missing`)
  assert(JSON.stringify(recipe).length < 1000000, `${recipe.slug}: Android payload limit`)
  assert(JSON.stringify(recipeMetadata(recipe)).length <= 20000, `${recipe.slug}: sync metadata limit`)
  assert(recipe.ingredients.every(item => ingredientLabel(item).length <= 500), `${recipe.slug}: ingredient import limit`)
  assert(recipe.steps.every(step => JSON.stringify(step.illustration).length <= 4000 && (step.title + '\n\n' + step.instruction).length <= 10000), `${recipe.slug}: step import limit`)
  assert(recipe.steps.length > 0 && recipe.ingredients.length > 0, `${recipe.slug}: empty recipe`)
  for (const [index, picture] of [recipe.hero, ...recipe.steps.map(step => step.illustration)].entries()) {
    const file = resolve('public' + picture.src)
    assert(existsSync(file), `${recipe.slug}: missing ${picture.src}`)
    assert(existsSync(file.replace('.webp', '-small.webp')), `${recipe.slug}: missing small export ${picture.src}`)
    if (existsSync(file)) {
      const bytes = readFileSync(file)
      assert(bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP', `${recipe.slug}: invalid WebP at image ${index}`)
    }
  }
  const relations = pairings[recipe.catalogId as keyof typeof pairings]?.related ?? []
  assert(relations.length > 0, `${recipe.slug}: no related recipes`)
  for (const relation of relations) assert(getCatalogRecipe(relation.id, 1, true), `${recipe.slug}: missing recommendation ${relation.id}`)
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exitCode = 1
}
else console.log(`PASS: ${catalogRecipes.length} recipes, 10 sweet / 10 savory, stable IDs, assets and recommendations${preview ? ' (local preview; publication not asserted)' : ''}`)

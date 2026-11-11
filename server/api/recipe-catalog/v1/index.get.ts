import { catalogRecipes, recipeIdeas } from '../../../../lib/recipes/catalog'

export default defineEventHandler((event) => {
  // Entwürfe sind nur im lokalen Dev-Server sichtbar.
  const preview = import.meta.dev
  setResponseHeader(event, 'Cache-Control', preview ? 'no-store' : 'public, max-age=300')
  const recipes = catalogRecipes.filter(recipe => preview || recipe.status === 'published')
  const ids = new Set(recipes.map(recipe => recipe.catalogId))
  return { schemaVersion: 1, preview, recipes, ideas: recipeIdeas.filter(idea => preview || ids.has(idea.id)) }
})

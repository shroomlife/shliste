import { catalogRecipes, recipeIdeas } from '../../../../lib/recipes/catalog'

export default defineEventHandler((event) => {
  const preview = import.meta.dev || useRuntimeConfig(event).recipeCatalogPreview
  setResponseHeader(event, 'Cache-Control', preview ? 'no-store' : 'public, max-age=300')
  const recipes = catalogRecipes.filter(recipe => preview || recipe.status === 'published')
  const ids = new Set(recipes.map(recipe => recipe.catalogId))
  return { schemaVersion: 1, preview: Boolean(preview), recipes, ideas: recipeIdeas.filter(idea => preview || ids.has(idea.id)) }
})

import { getCatalogRecipe, catalogRecipes, recipeIdeas } from '../../../../lib/recipes/catalog'

import matrix from '../../../../lib/recipes/pairings.json'

const pairings: Record<string, { profile: string[], related: { id: string, relation: string, reason: string }[] }> = matrix

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const version = query.version === undefined ? 1 : Number(query.version)
  if (!Number.isSafeInteger(version) || version < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültige Rezeptversion' })
  const preview = import.meta.dev || Boolean(useRuntimeConfig(event).recipeCatalogPreview)
  const recipe = getCatalogRecipe(getRouterParam(event, 'id') ?? '', version, preview)
  if (!recipe) throw createError({ statusCode: 404, statusMessage: 'Rezept nicht verfügbar' })
  setResponseHeader(event, 'Cache-Control', preview ? 'no-store' : 'public, max-age=300')
  const row = pairings[recipe.catalogId]
  const recommendations = (row?.related ?? []).flatMap((link) => {
    const idea = recipeIdeas.find(item => item.id === link.id)
    const ready = catalogRecipes.find(item => item.catalogId === link.id && (preview || item.status === 'published'))
    if (!idea || (!preview && !ready)) return []
    return [{ ...link, title: idea.title, emoji: idea.emoji, meal: idea.meal, ready: Boolean(ready), to: ready ? '/rezepte/' + ready.slug : '/rezeptideen?q=' + encodeURIComponent(idea.title) + '#rezeptideen' }]
  })
  return { schemaVersion: 1, recipe, flavorProfile: row?.profile ?? [], recommendations }
})

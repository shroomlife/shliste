import { bakingRecipes, bakingAmount } from '~/data/christmasBaking'

export function useThemeWorldSchema(kind: 'index' | 'raclette' | 'baking') {
  const origin = 'https://shliste.app'
  const path = kind === 'index' ? '/themenwelten' : `/themenwelten/${kind === 'baking' ? 'plaetzchen-backen' : 'raclette'}`
  const url = `${origin}${path}`
  const name = kind === 'index' ? 'Einkaufslisten Themenwelten' : kind === 'baking' ? 'Weihnachtsbäckerei' : 'Raclette'
  // Extend the existing Nuxt SEO page node rather than emitting a duplicate.
  if (kind === 'index') {
    useSchemaOrg([defineWebPage({ '@type': 'CollectionPage' })])
  }
  const graph: Record<string, unknown>[] = []
  if (kind !== 'index') graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, 'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Themenwelten', 'item': `${origin}/themenwelten` },
      { '@type': 'ListItem', 'position': 2, name, 'item': url },
    ],
  })
  if (kind === 'baking') graph.push(...bakingRecipes.map(recipe => ({
    '@type': 'Recipe', '@id': `${url}#rezept-${recipe.id}`, 'url': `${url}#rezept-${recipe.id}`,
    'name': recipe.name, 'description': recipe.subtitle, 'image': `${origin}${recipe.image}`,
    'author': { '@type': 'Organization', 'name': 'shliste', 'url': origin },
    'recipeCategory': 'Weihnachtsgebäck', 'recipeYield': 'Ca. 30 kleine Plätzchen', 'suitableForDiet': 'https://schema.org/VeganDiet',
    'recipeIngredient': recipe.ingredients.map(item => `${bakingAmount(item)} ${item.name}`),
    'recipeInstructions': recipe.steps.map(text => ({ '@type': 'HowToStep', text })),
  })))
  useHead({
    link: [{ rel: 'canonical', href: url }],
    script: graph.length ? [{ key: 'theme-world-schema', type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c') }] : [],
  })
}

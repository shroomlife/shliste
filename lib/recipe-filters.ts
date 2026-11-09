import { totalMinutes, type RecipeIdea, type CatalogRecipe } from './editorial'

function recipeDuration(id: string, recipes: readonly CatalogRecipe[]) {
  const recipe = recipes.find(r => r.catalogId === id)
  return recipe ? totalMinutes(recipe) : Number.MAX_SAFE_INTEGER
}
export interface CatalogFilters { q?: string, kind?: string, meal?: string, maxMinutes?: number, difficulty?: string, sort?: string }
export function filterRecipeIdeas(ideas: readonly RecipeIdea[], filters: CatalogFilters, recipes: readonly CatalogRecipe[] = []): RecipeIdea[] {
  const query = (filters.q ?? '').trim().toLocaleLowerCase('de-DE')
  return ideas.filter((i) => {
    const complete = recipes.find(recipe => recipe.catalogId === i.id) ?? null
    return (!query || [i.title, ...(complete?.previousTitles ?? []), i.description, ...i.tags].join(' ').toLocaleLowerCase('de-DE').includes(query))
      && (!filters.kind || i.kind === filters.kind) && (!filters.meal || i.meal === filters.meal)
      && (!filters.maxMinutes || (complete !== null && totalMinutes(complete) <= filters.maxMinutes))
      && (!filters.difficulty || complete?.difficulty === filters.difficulty)
  }).sort((a, b) => filters.sort === 'alphabet' ? a.title.localeCompare(b.title, 'de') : filters.sort === 'duration' ? recipeDuration(a.id, recipes) - recipeDuration(b.id, recipes) : 0)
}

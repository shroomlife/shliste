export interface RecipeCollectionArrival {
  recipeId: string
  title: string
  image: string
  ingredients: string[]
  ingredientCount: number
  created: boolean
  ready: boolean
}

export function useRecipeCollectionArrival() {
  return useState<RecipeCollectionArrival | null>('recipe-collection-arrival', () => null)
}

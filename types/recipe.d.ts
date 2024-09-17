interface Recipe {
  uuid: string
  name: string
  color: string
  description: string
  ingredients: Product | ListedProduct[]
  createdAt: Date | null
  updatedAt: Date | null
}

interface RecipeStore {
  recipes: Recipe[]
  recipeEdit: Recipe | null
}

interface Recipe {
  uuid: string
  name: string
  color: string
  description: string
  products: Product[]
  steps: string[]
  createdAt: Date | null
  updatedAt: Date | null
}

interface RecipeStore {
  recipes: Recipe[]
  recipeEdit: Recipe | null
  productEdit: Product | null
}

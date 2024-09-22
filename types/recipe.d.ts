interface Recipe {
  uuid: string
  name: string
  color: string
  description: string
  url: string
  products: Product[]
  steps: string[]
  createdAt: Date | null
  updatedAt: Date | null
}

interface RecipeStore {
  recipes: Recipe[]
  recipeEdit: Recipe | null
  productEdit: Product | null
  recipeStepEditIndex: number | null
}

interface ExtractRecipeResponse {
  success: boolean
  title?: string
  ingredients?: string[]
  steps?: string[]
  error?: string
}

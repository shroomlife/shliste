import { defineStore } from 'pinia'

const localStorageKey = 'shliste/recipes'

export const useRecipeStore = defineStore('recipeStore', {

  state: (): RecipeStore => {
    const savedRecipes = localStorage.getItem(localStorageKey)
    return {
      recipes: savedRecipes ? JSON.parse(savedRecipes) as Recipe[] : [],
      recipeEdit: null as Recipe | null,
      productEdit: null as Product | null,
    }
  },

  actions: {
    addNewRecipe() {
      this.recipeEdit = {
        uuid: '',
        name: '',
        color: '',
        description: '',
        products: [],
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Recipe
    },
    setRecipeEdit(recipe: Recipe | null) {
      this.recipeEdit = recipe
    },
    addRecipe(recipe: Recipe) {
      this.recipes.push(recipe)
      this.saveRecipes()
    },
    updateRecipe(uuid: string, recipe: Recipe) {
      const foundRecipe = this.recipes.find((recipe: Recipe) => recipe.uuid === uuid)
      if (foundRecipe) {
        foundRecipe.name = recipe.name
        foundRecipe.color = recipe.color
        foundRecipe.description = recipe.description
        foundRecipe.products = recipe.products ?? []
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    removeRecipe(uuid: string) {
      this.recipes = this.recipes.filter((recipe: Recipe) => recipe.uuid !== uuid)
      this.saveRecipes()
    },
    addItem(recipe: Recipe, item: Product) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe) {
        foundRecipe.products.push(item)
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    removeItem(recipe: Recipe, item: Product) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe) {
        foundRecipe.products = foundRecipe.products.filter((i: Product) => i.uuid !== item.uuid)
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    updateProduct(item: Product) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.products.some((i: Product) => i.uuid === item.uuid))
      if (foundRecipe) {
        const foundProduct = foundRecipe.products.find((i: Product) => i.uuid === item.uuid)
        if (foundProduct) {
          foundProduct.name = item.name
          foundProduct.description = item.description
          foundProduct.brand = item.brand
          foundRecipe.updatedAt = new Date()
          this.saveRecipes()
        }
      }
    },
    setProductEdit(product: Product | null) {
      this.productEdit = product
    },
    saveRecipesLocal() {
      localStorage.setItem(localStorageKey, JSON.stringify(this.recipes))
    },
    async saveRecipes() {
      localStorage.setItem(localStorageKey, JSON.stringify(this.recipes))
      const googleStore = useGoogleStore()
      await googleStore.triggerPush()
    },
  },

  getters: {
    getRecipes: state => state.recipes,
    getRecipeById: state => (uuid: string) => state.recipes.find((recipe: Recipe) => recipe.uuid === uuid) as Recipe,
    getRecipeEdit: state => state.recipeEdit,
    getRecipeCount: state => state.recipes.length,
    getProductEdit: (state): Product | null => state.productEdit,
  },

})

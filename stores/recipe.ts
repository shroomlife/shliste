import { defineStore } from 'pinia'

const localStorageKey = 'shliste/recipes'

export const useRecipeStore = defineStore('recipeStore', {

  state: (): RecipeStore => {
    const savedRecipes = localStorage.getItem(localStorageKey)
    return {
      recipes: savedRecipes ? JSON.parse(savedRecipes) as Recipe[] : [],
      recipeEdit: null as Recipe | null,
      productEdit: null as Product | null,
      recipeStepEditIndex: null as number | null,
    }
  },

  actions: {
    addNewRecipe() {
      this.recipeEdit = {
        uuid: '',
        name: '',
        color: '',
        description: '',
        url: '',
        products: [],
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Recipe
    },
    setRecipeEdit(recipe: Recipe | null) {
      this.recipeEdit = recipe
    },
    setRecipeStepEdit(step: number | null) {
      this.recipeStepEditIndex = step
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
        foundRecipe.url = recipe.url
        foundRecipe.products = recipe.products ?? []
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    addStep(recipe: Recipe, step: string) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe) {
        foundRecipe.steps.push(step)
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    removeStep(recipe: Recipe, index: number) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe) {
        foundRecipe.steps.splice(index, 1)
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    removeRecipe(uuid: string) {
      this.recipes = this.recipes.filter((recipe: Recipe) => recipe.uuid !== uuid)
      this.saveRecipes()
    },
    orderStepUp(recipe: Recipe, index: number) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe && index > 0) {
        const step = foundRecipe.steps[index]
        foundRecipe.steps[index] = foundRecipe.steps[index - 1] as string
        foundRecipe.steps[index - 1] = step as string
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    orderStepDown(recipe: Recipe, index: number) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe && index < foundRecipe.steps.length - 1) {
        const step = foundRecipe.steps[index]
        foundRecipe.steps[index] = foundRecipe.steps[index + 1] as string
        foundRecipe.steps[index + 1] = step as string
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    addItem(recipe: Recipe, item: Product) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe) {
        foundRecipe.products.push(item)
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    addListedProduct(recipe: Recipe, item: ListedProduct) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe) {
        foundRecipe.products.push({
          uuid: item.uuid,
          name: item.name,
          description: item.description,
          brand: item.brand,
          checked: false,
        })
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
      }
    },
    setRecipes(recipes: Recipe[]) {
      this.recipes = recipes ?? [] as Recipe[]
      this.saveRecipesLocal()
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
    updateRecipeStep(recipe: Recipe, stepIndex: number, newName: string) {
      const foundRecipe = this.recipes.find((r: Recipe) => r.uuid === recipe.uuid)
      if (foundRecipe) {
        foundRecipe.steps[stepIndex] = newName
        foundRecipe.updatedAt = new Date()
        this.saveRecipes()
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
    getRecipes: state => state.recipes
      .sort((a: Recipe, b: Recipe) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()),
    getRecipeStepEditIndex: state => state.recipeStepEditIndex,
    getRecipeById: state => (uuid: string) => state.recipes.find((recipe: Recipe) => recipe.uuid === uuid) as Recipe,
    getRecipeEdit: state => state.recipeEdit,
    getRecipeCount: state => state.recipes.length,
    getProductEdit: (state): Product | null => state.productEdit,
  },

})

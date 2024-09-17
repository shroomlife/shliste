import { defineStore } from 'pinia'

const localStorageKey = 'shliste/recipes'

export const useRecipeStore = defineStore('recipeStore', {

  state: (): RecipeStore => {
    const savedRecipes = localStorage.getItem(localStorageKey)
    return {
      recipes: savedRecipes ? JSON.parse(savedRecipes) as Recipe[] : [],
      recipeEdit: null as Recipe | null,
    }
  },

  getters: {},

  actions: {
    addNewRecipe() {
      this.recipeEdit = {} as Recipe
    },
  },

})

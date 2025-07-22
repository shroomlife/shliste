<script lang="ts" setup>
const recipeStore = useRecipeStore()
const computedRecipes = computed(() => recipeStore.getRecipes)
definePageMeta({
  showActionsBar: true,
  showRecipeButtons: true,
})
useSeoMeta({
  title: 'shliste ~ Verwalte deine Rezepte und Zutaten',
  description: 'Erstelle und speichere Rezepte. Füge Zutaten und Zubereitung hinzu und plane deine Mahlzeiten einfach und effektiv!',
})
</script>

<template>
  <div>
    <div
      v-if="computedRecipes.length"
      class="flex flex-col gap-4"
    >
      <RecipeCard
        v-for="recipe of computedRecipes"
        :key="recipe.uuid"
        :recipe="recipe"
      />
    </div>
    <div v-else>
      <div class="flex items-center justify-center gap-2 text-lg h-40">
        <UIcon
          :name="appNavigation.recipes.icon"
          class="w-5 h-5"
        />
        <span>
          Keine Rezepte vorhanden
        </span>
      </div>
    </div>
    <RecipeEdit />
  </div>
</template>

<style lang="scss" scoped>
</style>

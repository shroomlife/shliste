<script lang="ts" setup>
const recipeStore = useRecipeStore()
const props = defineProps<{
  recipe: Recipe
}>()

const { recipe } = toRefs(props)

const toast = useToast()
const { $swal } = useNuxtApp()

const computedRecipeLink = computed(() => `/rezept/${recipe.value.uuid}`)
const computedCardUi = computed(() => ({
  body: {
    padding: 'p-3',
  },
  header: {
    padding: 'sm:px-0 p-0',
  },
  footer: {
    padding: 'p-3',
  },
}))

const editOption = [{
  label: 'Bearbeiten',
  icon: 'i-ph-pencil-line',
  click: () => recipeStore.setRecipeEdit(recipe.value),
}]

const deleteOption = [{
  label: 'Löschen',
  icon: 'i-ph-trash',
  click: async () => {
    const response = await $swal.fire({
      title: 'Rezept wirklich löschen?',
      text: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      showCancelButton: true,
      icon: 'question',
      confirmButtonText: 'Ja, löschen!',
      cancelButtonText: 'Abbrechen',
    })
    if (response.isConfirmed) {
      recipeStore.removeRecipe(recipe.value.uuid)
      toast.add({
        title: 'Rezept wurde gelöscht!',
        color: 'rose',
        icon: 'i-ph-trash',
      })
    }
  },
}]

const optionItems = computed(() => {
  return [editOption, deleteOption]
})

const computedRecipeStyle = computed(() => {
  return {
    background: `linear-gradient(to bottom, ${recipe.value.color}, white)`,
  }
})

const computedRecipeHasUrl = computed(() => {
  return typeof recipe.value.url === 'string' && recipe.value.url.length > 0
})

const computedExternalRecipeLink = computed(() => {
  return recipe.value.url
})
</script>

<template>
  <UCard :ui="computedCardUi">
    <template #header>
      <NuxtLink
        :to="computedRecipeLink"
        class="flex sm:px-6 p-4 rounded-t-lg"
        :style="computedRecipeStyle"
      >
        <ListName :name="recipe.name" />
      </NuxtLink>
    </template>

    <template
      #footer
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UBadge
            color="white"
            variant="solid"
            size="lg"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="appNavigation.products.icon" />
              <span>{{ recipe.products.length }} Zutaten</span>
            </div>
          </UBadge>
        </div>

        <div class="flex gap-2">
          <UButton
            v-if="computedRecipeHasUrl"
            icon="i-ph-arrow-square-out"
            color="gray"
            size="md"
            square
            padded
            :to="computedExternalRecipeLink"
            target="_blank"
            :external="true"
          />
          <UDropdown
            :items="optionItems"
            :ui="{
              item: {
                label: 'text-base',
              },
            }"
          >
            <UButton
              color="gray"
              icon="i-ph-dots-three-bold"
              size="md"
              square
              padded
            />
          </UDropdown>
        </div>
      </div>
    </template>
  </UCard>
</template>

<style lang="scss" scoped>

</style>

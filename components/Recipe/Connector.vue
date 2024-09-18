<script lang="ts" setup>
const listStore = useListStore()
const recipeStore = useRecipeStore()

const { list } = defineProps<{
  list: List
}>()

const state = reactive({
  isOpen: false,
  searchInput: '',
})

const openModal = () => {
  state.isOpen = true
}

const closeModal = () => {
  state.isOpen = false
}

const selectedRecipes = ref<Recipe[]>([])

const onSelect = (products: { id: string, label: string }[]) => {
  const selectedRecipe = products[0] as { id: string, label: string }
  if (!selectedRecipe) {
    return
  }
  state.isOpen = false
  listStore.addRecipe(list, selectedRecipe.id)
  selectedRecipes.value = []
}

const listedRecipes = computed(() => {
  return recipeStore.getRecipes.map((recipe: Recipe) => {
    return {
      id: recipe.uuid,
      label: recipe.name,
    }
  })
})

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && state.isOpen) {
    closeModal()
  }
}
</script>

<template>
  <div>
    <UButton
      type="button"
      color="rose"
      size="xl"
      padded
      square
      :icon="appNavigation.recipes.icon"
      @click="openModal"
    />

    <UModal
      v-model="state.isOpen"
      :ui="{
        container: 'items-center',
      }"
    >
      <UCommandPalette
        :empty-state="{
          label: 'Keine Produkte',
          icon: 'i-ph-shopping-cart',
          queryLabel: 'Keine passenden Produkte gefunden',
        }"
        :model-value="[]"
        multiple
        :fuse="{
          fuseOptions: {
            keys: ['label', 'brand'],
          },
        }"
        :groups="[{ key: 'listedRecipes', commands: listedRecipes }]"
        :ui="{
          input: {
            size: 'text-base sm:text-base',
          },
          group: {
            command: {
              container: 'w-full',
              label: 'w-full',
            },
          },
        }"
        @update:model-value="onSelect"
      >
        <template #listedRecipes-command="{ command }">
          <div class="flex items-center justify-between text-lg w-full">
            <span>{{ command.label }}</span>
          </div>
        </template>
      </UCommandPalette>
    </UModal>
  </div>
</template>

<style lang="scss" scoped>

</style>

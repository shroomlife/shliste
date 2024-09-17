<script lang="ts" setup>
const listStore = useListStore()
const productStore = useProductStore()
const marketStore = useMarketStore()
const recipeStore = useRecipeStore()

const isFooterHidden = ref(false) // Controls the visibility of the footer
const lastScrollPosition = ref(0) // Track the last known scroll position

const handleScroll = () => {
  const currentScrollPosition = window.scrollY

  if (currentScrollPosition > lastScrollPosition.value) {
    isFooterHidden.value = true
  }
  else {
    isFooterHidden.value = false
  }

  lastScrollPosition.value = currentScrollPosition
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

const handleAddListButtonClick = () => {
  listStore.addNewList()
}

const handleAddProductButtonClick = () => {
  productStore.addNewProduct()
}

const handleAddMarketButtonClick = () => {
  marketStore.addNewMarket()
}

const handleAddRecipeButtonClick = () => {
  recipeStore.addNewRecipe()
}

const route = useRoute()
const computedShowAddListButton = computed(() => {
  return route.meta.showActionsBar === true && route.meta.showAddListButton === true
})

const computedShowAddProductButton = computed(() => {
  return route.meta.showActionsBar === true && route.meta.showAddProductButton === true
})

const computedShowAddMarketButton = computed(() => {
  return route.meta.showActionsBar === true && route.meta.showAddMarketButton === true
})

const computedShowRecipeButtons = computed(() => {
  return route.meta.showActionsBar === true && route.meta.showRecipeButtons === true
})
</script>

<template>
  <section
    class="w-full"
    :class="{ hidden: isFooterHidden }"
  >
    <div class="container mx-auto">
      <div class="flex gap-2 justify-end p-4 xl:p-4">
        <UButton
          v-if="computedShowAddListButton"
          class="shadow-md"
          icon="i-ph-plus-circle-fill"
          size="xl"
          color="pink"
          variant="solid"
          label="Neue Liste"
          @click="handleAddListButtonClick"
        />
        <UButton
          v-if="computedShowAddProductButton"
          class="shadow-md"
          icon="i-ph-plus-circle-fill"
          size="xl"
          color="pink"
          variant="solid"
          label="Neues Produkt"
          @click="handleAddProductButtonClick"
        />
        <UButton
          v-if="computedShowAddMarketButton"
          class="shadow-md"
          icon="i-ph-plus-circle-fill"
          size="xl"
          color="pink"
          variant="solid"
          label="Neuer Supermarkt"
          @click="handleAddMarketButtonClick"
        />
        <RecipeExtractor v-if="computedShowRecipeButtons" />
        <UButton
          v-if="computedShowRecipeButtons"
          class="shadow-md"
          icon="i-ph-plus-circle-fill"
          size="xl"
          color="pink"
          variant="solid"
          label="Neues Rezept"
          @click="handleAddRecipeButtonClick"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
section {
  display: block;
  height: fit-content;
  position: fixed;
  bottom: 0;
  transition: transform 0.3s ease-out;

  &.hidden {
    transform: translateY(100%);
  }

  .actions-bar {
    display: flex;
    justify-content: flex-end;
    padding-bottom: 1rem;
    padding-right: 1rem;
  }
}
</style>

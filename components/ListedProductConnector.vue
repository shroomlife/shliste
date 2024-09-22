<script lang="ts" setup>
const listStore = useListStore()
const productStore = useProductStore()
const recipeStore = useRecipeStore()

const { list, recipe } = defineProps<{
  list?: List
  recipe?: Recipe
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

const selectedProducts = ref<ListedProduct[]>([])

const onSelect = (products: { id: string, label: string }[]) => {
  console.log('onSelect', products)
  const selectedProduct = products[0] as { id: string, label: string }
  const foundProduct = productStore.getProductByUuid(selectedProduct.id)

  if (!foundProduct) {
    return
  }
  state.isOpen = false

  if (list) {
    listStore.addListedProduct(list, foundProduct.uuid)
  }

  if (recipe) {
    recipeStore.addListedProduct(recipe, foundProduct)
  }

  selectedProducts.value = []
}

const listedProducts = computed(() => {
  return productStore.getProducts.map((product: ListedProduct) => {
    return {
      id: product.uuid,
      label: product.name,
      brand: product.brand,
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
      color="pink"
      size="xl"
      padded
      square
      icon="i-ph-list-magnifying-glass"
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
        :groups="[{ key: 'listedProducts', commands: listedProducts }]"
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
        <template #listedProducts-command="{ command }">
          <div class="flex items-center justify-between text-lg w-full">
            <span>{{ command.label }}</span>
            <UBadge
              v-if="command.brand"
              color="pink"
              variant="solid"
              size="md"
            >
              {{ command.brand }}
            </UBadge>
          </div>
        </template>
      </UCommandPalette>
    </UModal>
  </div>
</template>

<style lang="scss" scoped>

</style>

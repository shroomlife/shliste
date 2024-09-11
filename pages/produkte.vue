<script lang="ts" setup>
const productStore = useProductStore()

const { $moment } = useNuxtApp()

const products = computed(() => {
  return productStore.getProducts.filter((product: ListedProduct) => product.name.toLowerCase().includes(searchQuery.value.toLowerCase())).map((product: ListedProduct) => {
    return {
      ...product,
      updatedAt: $moment(product.updatedAt).format('DD.MM.YYYY HH:mm'),
    }
  })
})

definePageMeta({
  showActionsBar: true,
  showAddProductButton: true,
})

const columns = ref([
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'brand',
    label: 'Marke',
    sortable: true,
  },
  {
    key: 'description',
    label: 'Beschreibung',
  },
  {
    key: 'updatedAt',
    label: 'Letztes Update',
    sortable: true,
  },
  {
    key: 'actions',
    label: '',
    width: 'w-20',
  },
])

const searchQuery = ref('')
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-3xl md:text-4xl font-bold">
          Alle Produkte
        </h2>
        <div>
          <UInput
            v-model="searchQuery"
            icon="i-ph-magnifying-glass"
            placeholder="Produkt suchen..."
            size="lg"
          />
        </div>
      </div>
    </template>

    <UTable
      :rows="products"
      :columns="columns"
    >
      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton
            icon="i-ph-pencil-line"
            color="gray"
            size="sm"
            @click="productStore.editProduct(row.uuid)"
          >
            <span class="hidden md:block">
              Bearbeiten
            </span>
          </UButton>
          <UButton
            icon="i-ph-trash"
            color="red"
            size="sm"
            @click="productStore.deleteProduct(row.uuid)"
          >
            <span class="hidden md:block">
              Löschen
            </span>
          </UButton>
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<style lang="scss" scoped>

</style>

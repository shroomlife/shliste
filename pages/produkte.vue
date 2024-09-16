<script lang="ts" setup>
const appConfig = useAppConfig()
const productStore = useProductStore()

const { $moment } = useNuxtApp()

const products = computed(() => {
  const searchTerm = searchQuery.value.toLowerCase()
  return productStore.getProducts
    .filter((product: ListedProduct) => {
      return (
        product.name.toLowerCase().includes(searchTerm)
        || product.brand?.toLowerCase().includes(searchTerm)
      )
    })
    .map((product: ListedProduct) => {
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
    key: 'marketIds',
    label: 'Supermärkte',
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

const toast = useToast()
const { $swal } = useNuxtApp()

const deleteProduct = async (uuid: string) => {
  const response = await $swal.fire({
    title: 'Produkt wirklich löschen?',
    text: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    showCancelButton: true,
    icon: 'question',
    confirmButtonText: 'Ja, löschen!',
    cancelButtonText: 'Abbrechen',
  })
  if (response.isConfirmed) {
    productStore.deleteProduct(uuid)
    toast.add({
      title: 'Produkt wurde gelöscht!',
      color: 'red',
      icon: 'i-ph-trash',
    })
  }
}

const searchQuery = ref('')
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-3xl md:text-4xl font-bold">
          Produkte
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
      :ui="appConfig.table.ui"
      :empty-state="{
        label: 'Keine Produkte',
        icon: 'i-ph-shopping-cart',
      }"
    >
      <template #marketIds-data="{ row }">
        <MarketRow :product="row" />
      </template>

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
            @click="deleteProduct(row.uuid)"
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

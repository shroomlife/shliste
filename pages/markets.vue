<script lang="ts" setup>
const appConfig = useAppConfig()
const marketStore = useMarketStore()

const { $moment } = useNuxtApp()

const markets = computed(() => {
  const searchTerm = searchQuery.value.toLowerCase()
  return marketStore.getMarkets
    .filter((market: Market) => {
      return (
        market.name.toLowerCase().includes(searchTerm)
        || market.address?.toLowerCase().includes(searchTerm)
      )
    })
    .map((market: Market) => {
      return {
        ...market,
        updatedAt: $moment(market.updatedAt).format('DD.MM.YYYY HH:mm'),
      }
    })
})

definePageMeta({
  showActionsBar: true,
  showAddMarketButton: true,
})

const columns = ref([
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'address',
    label: 'Adresse',
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

const defaultSort = ref({
  column: 'updatedAt',
  direction: 'desc' as const,
})

const toast = useToast()
const { $swal } = useNuxtApp()

const deleteMarket = async (uuid: string) => {
  const response = await $swal.fire({
    title: 'Supermarkt wirklich löschen?',
    text: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    showCancelButton: true,
    icon: 'question',
    confirmButtonText: 'Ja, löschen!',
    cancelButtonText: 'Abbrechen',
  })
  if (response.isConfirmed) {
    marketStore.deleteMarket(uuid)
    toast.add({
      title: 'Supermarkt wurde gelöscht!',
      color: 'rose',
      icon: 'i-ph-trash',
    })
  }
}

const searchQuery = ref('')

useSeoMeta({
  title: 'shliste ~ Deine Supermärkte im Überblick',
  description: 'Verwalte deine Supermärkte. Verknüpfe Produkte mit Supermärkten und finde schnell, wo deine Artikel erhältlich sind.',
})
</script>

<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-3xl md:text-4xl font-bold">
            Supermärkte
          </h2>
          <div>
            <UInput
              v-model="searchQuery"
              icon="i-ph-magnifying-glass"
              placeholder="Supermarkt suchen..."
              size="lg"
            />
          </div>
        </div>
      </template>

      <UTable
        :sort="defaultSort"
        :rows="markets"
        :columns="columns"
        :ui="appConfig.table.ui"
        :empty-state="{
          label: 'Keine Supermärkte',
          icon: 'i-ph-storefront',
        }"
      >
        <template #actions-data="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-ph-pencil-line"
              color="gray"
              size="sm"
              @click="marketStore.editMarket(row.uuid)"
            >
              <span class="hidden md:block">
                Bearbeiten
              </span>
            </UButton>
            <UButton
              icon="i-ph-trash"
              color="rose"
              size="sm"
              @click="deleteMarket(row.uuid)"
            >
              <span class="hidden md:block">
                Löschen
              </span>
            </UButton>
          </div>
        </template>
      </UTable>
    </UCard>
    <MarketEdit />
  </div>
</template>

<style lang="scss" scoped>

</style>

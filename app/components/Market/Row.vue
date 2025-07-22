<script lang="ts" setup>
const marketStore = useMarketStore()

const props = defineProps<{
  product: ListedProduct
}>()

const isOpen = ref(false)
const currentMarket = ref<Market | null>(null)

const { product } = toRefs(props)
const computedHasMarketIds = computed(() => product.value.marketIds && product.value.marketIds.length > 0)

const computedMarketCaption = computed(() => {
  return (marketId: string) => {
    const market = marketStore.getMarketById(marketId)
    return market ? market.name : marketId
  }
})

const computedMarketDirectionsLink = computed(() => {
  return `https://www.google.com/maps/dir/?api=1&destination=${currentMarket.value?.address}`
})

const handleClose = () => {
  isOpen.value = false
}
</script>

<template>
  <div
    v-if="computedHasMarketIds"
    class="flex gap-2 items-center justify-start"
  >
    <UButton
      v-for="marketId in product.marketIds"
      :key="marketId"
      size="sm"
      @click="() => {
        currentMarket = marketStore.getMarketById(marketId)
        isOpen = true
      }"
    >
      {{ computedMarketCaption(marketId) }}
    </UButton>

    <UModal v-model="isOpen">
      <UCard v-if="currentMarket">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                class="w-8 h-8"
                :name="appNavigation.markets.icon"
              />
              <span class="text-2xl font-bold">
                {{ currentMarket.name }}
              </span>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              size="md"
              icon="i-ph-x"
              square
              padded
              @click="handleClose"
            />
          </div>
        </template>

        <div class="flex justify-start items-center gap-2">
          <UIcon
            class="w-6 h-6"
            name="ph:map-pin"
          />
          <span class="text-lg">{{ currentMarket.address }}</span>
        </div>

        <template #footer>
          <UButton
            color="green"
            :to="computedMarketDirectionsLink"
            target="_blank"
          >
            Starte Navigation
          </UButton>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style lang="scss" scoped>

</style>

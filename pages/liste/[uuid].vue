<script lang="ts" setup>
import { object, string } from 'yup'

const listStore = useListStore()
const productStore = useProductStore()
const marketStore = useMarketStore()

const { uuid } = useRoute().params
const list = computed(() => listStore.getListByUuid(uuid as string)) as ComputedRef<List>

definePageMeta({
  isSingleList: true,
  backLink: '/',
})

const productUiConfig = {
  body: {
    padding: 'p-3 sm:p-4 xl:p-6',
  },
}

const computedCardUi = computed(() => ({
  header: {
    padding: 'sm:px-0 p-0',
  },
}))

const state = reactive({
  newName: '',
})

const schema = object({
  newName: string().required('Erforderlich'),
})

const addItem = () => {
  listStore.addItem(list.value, state.newName)
  state.newName = ''
}

const checkProduct = (product: Product) => {
  listStore.checkProduct(list.value, product)
}

const uncheckProduct = (product: Product) => {
  listStore.uncheckProduct(list.value, product)
}

const uncheckAllProducts = () => {
  listStore.uncheckAllProducts(list.value)
}

const removeProduct = (product: Product) => {
  listStore.removeProduct(list.value, product)
}

const computedShowUncheckAllProducts = computed(() => {
  return list.value.products.some((product) => {
    return product.checked === true
  })
})

const computedListStyle = computed(() => {
  return {
    background: `linear-gradient(to bottom, ${list.value.color}, white)`,
  }
})

const editProduct = (product: Product) => {
  if (product.checked === true) {
    return
  }
  listStore.setProductEdit(product)
}

const computedProductsInMarket = computed(() => {
  return (market: Market) => {
    return list.value.products.filter((product) => {
      if (typeof product.parentId === 'undefined' || !product.parentId) return false

      const listedProduct = productStore.getProductByUuid(product.parentId)
      if (!listedProduct) return false

      return listedProduct.marketIds.includes(market.uuid)
    })
      .map((product) => {
        return product.name
      })
      .join(', ')
  }
})

const computedHasMarketsInList = computed(() => {
  return computedMarketsInList.value.length > 0
})

const computedMarketsInList = computed(() => {
  const allMarkets = [] as Market[]
  for (const product of list.value.products) {
    if (typeof product.parentId !== 'undefined') {
      const listedProduct = productStore.getProductByUuid(product.parentId)
      if (listedProduct) {
        const markets = listedProduct.marketIds.map((marketId) => {
          return marketStore.getMarketById(marketId)
        })
        for (const market of markets) {
          if (market) {
            allMarkets.push(market)
          }
        }
      }
    }
  }
  return allMarkets
})
</script>

<template>
  <div>
    <div class="flex flex-col pb-24 gap-4">
      <UCard :ui="computedCardUi">
        <template #header>
          <div
            class="flex justify-between items-center sm:px-6 p-4 rounded-t-lg"
            :style="computedListStyle"
          >
            <ListName
              :list="list"
              :h1="true"
            />
            <div class="flex gap-2">
              <UButton
                v-if="computedShowUncheckAllProducts"
                color="orange"
                variant="soft"
                size="md"
                icon="i-ph-arrow-counter-clockwise-bold"
                square
                padded
                @click="uncheckAllProducts"
              />
            </div>
          </div>
        </template>

        <div class="flex flex-col gap-2">
          <p
            v-if="list.products.length === 0"
            class="text-gray-500"
          >
            Keine Einträge
          </p>
          <UCard
            v-for="product of list.products"
            :key="product.uuid"
            :ui="productUiConfig"
          >
            <div class="flex items-center gap-2">
              <div
                class="flex-1 items-center flex gap-2 overflow-hidden"
              >
                <NuxtLink
                  class="cursor-pointer flex gap-2 items-center"
                  @click="editProduct(product)"
                >
                  <p
                    class="line-clamp-2 text-lg"
                    :class="{ 'line-through': product.checked }"
                  >
                    {{ product.name }}
                  </p>
                  <UBadge
                    v-if="product.brand"
                    color="pink"
                    variant="solid"
                    size="md"
                  >
                    {{ product.brand }}
                  </UBadge>
                </NuxtLink>
              </div>
              <div class="flex gap-2">
                <UButton
                  v-if="!product.checked"
                  color="green"
                  variant="soft"
                  size="md"
                  icon="i-ph-check-fat-fill"
                  square
                  padded
                  @click="checkProduct(product)"
                />

                <UButton
                  v-else
                  color="orange"
                  variant="soft"
                  size="md"
                  icon="i-ph-arrow-counter-clockwise-bold"
                  square
                  padded
                  @click="uncheckProduct(product)"
                />

                <UButton
                  v-if="product.checked"
                  color="rose"
                  variant="soft"
                  size="md"
                  icon="i-ph-trash"
                  square
                  padded
                  @click="removeProduct(product)"
                />
              </div>
            </div>
          </UCard>
        </div>
      </UCard>

      <UCard v-if="computedHasMarketsInList">
        <template #header>
          <h2 class="text-xl font-bold">
            Supermärkte
          </h2>
        </template>

        <div class="flex flex-col gap-2">
          <UCard
            v-for="market of computedMarketsInList"
            :key="market.uuid"
          >
            <div class="flex flex-col justify-center items-start gap-4">
              <div class="flex flex-col md:flex-row items-start gap-2">
                <span class="text-2xl font-bold">{{ market.name }}</span>
                <span class="flex items-center gap-2">
                  <UIcon
                    class="w-6 h-6"
                    name="ph:map-pin"
                  />
                  <span class="text-lg">{{ market.address }}</span>
                </span>
              </div>
              <div>
                {{ computedProductsInMarket(market) }}
              </div>
            </div>
          </UCard>
        </div>
      </UCard>

      <div class="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 p-4 border-t border-gray-300">
        <UForm
          :state="state"
          :schema="schema"
          :validate-on="['submit']"
          class="container mx-auto px-4"
          @submit="addItem"
        >
          <UFormGroup
            name="newName"
            size="xl"
          >
            <template #default>
              <div class="flex gap-2">
                <RecipeConnector :list="list" />
                <ListedProductConnector :list="list" />
                <UInput
                  v-model="state.newName"
                  class="flex-1"
                  placeholder="Neuer Eintrag"
                />
                <UButton
                  type="submit"
                  color="green"
                  size="xl"
                  padded
                  square
                  icon="i-ph-plus-circle-fill"
                />
              </div>
            </template>
          </UFormGroup>
        </UForm>
      </div>
    </div>
    <ProductEdit />
  </div>
</template>

<style lang="scss" scoped>

</style>

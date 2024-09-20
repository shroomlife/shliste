<script lang="ts" setup>
import { object, string } from 'yup'
import { v4 as uuidv4 } from 'uuid'

const appConfig = useAppConfig()
const toast = useToast()

const productStore = useProductStore()
const marketStore = useMarketStore()

const computedIsOpen = computed({
  get() {
    return productStore.getProductEdit !== null
  },
  set(value) {
    if (!value) {
      productStore.setProductEdit(null)
    }
  },
})

const handleClose = () => {
  productStore.setProductEdit(null)
}

const computedProductHasId = computed(() => {
  return typeof productStore.getProductEdit?.uuid === 'string' && productStore.getProductEdit?.uuid.length > 0
})

const computedTitle = computed(() => {
  return computedProductHasId.value ? 'Bearbeite Produkt' : 'Neues Produkt'
})

const state = reactive<ListedProduct>({
  uuid: '',
  name: '',
  description: '',
  brand: '',
  marketIds: [] as string[],
  checked: false,
  createdAt: null,
  updatedAt: null,
})

const schema = object({
  name: string().required('Name ist Erforderlich'),
  description: string().optional(),
  brand: string().optional(),
})

const resetState = (): void => {
  state.name = ''
  state.uuid = ''
  state.description = ''
  state.brand = ''
  state.marketIds = [] as string[]
  state.checked = false
  state.createdAt = null
  state.updatedAt = null
}

async function onSubmit() {
  if (!state.uuid) {
    state.uuid = uuidv4()
    state.createdAt = new Date()
    state.updatedAt = new Date()
    productStore.addProduct({ ...state })
    toast.add({
      title: 'Produkt wurde erstellt!',
      color: 'green',
      icon: 'i-ph-check-circle',
    })
  }
  else {
    productStore.updateProduct(state.uuid, state)
  }

  handleClose()
  resetState()
}

watch(() => productStore.getProductEdit, (newVal: ListedProduct | null) => {
  if (newVal) {
    state.uuid = newVal.uuid
    state.name = newVal.name
    state.description = newVal.description
    state.brand = newVal.brand
    state.marketIds = newVal.marketIds ?? []
    state.createdAt = newVal.createdAt
    state.updatedAt = newVal.updatedAt
  }
})

const computedMarkets = computed(() => {
  return marketStore.getMarkets.map((market) => {
    return {
      label: `${market.name} - ${market.address}`,
      value: market.uuid,
    }
  })
})

const computedSelectedMarketsCaption = computed(() => {
  return state.marketIds.map((marketId) => {
    const market = marketStore.getMarketById(marketId)
    const addressSplit = market.address.split(',')
    const zipAndCity = addressSplit[1]?.trim()
    const zip = zipAndCity?.split(' ')[0]
    return `${market.name}${zip ? ` - ${zip}` : ''}`
  }).join(', ')
})
</script>

<template>
  <USlideover
    v-model="computedIsOpen"
    :ui="appConfig.slideOver.ui"
  >
    <div class="p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">
          {{ computedTitle }}
        </h2>
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
      <UForm
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        :validate-on="['submit']"
        @submit="onSubmit"
      >
        <UFormGroup
          label="Name"
          name="name"
          size="xl"
        >
          <UInput
            v-model="state.name"
            placeholder="Name deines Produkts"
            icon="i-ph-shopping-cart"
          />
        </UFormGroup>
        <UFormGroup
          label="Beschreibung"
          name="description"
          size="xl"
        >
          <UInput
            v-model="state.description"
            placeholder="Beschreibung deines Produkts"
            icon="i-ph-text-align-left"
          />
        </UFormGroup>

        <UFormGroup
          label="Marke"
          name="brand"
          size="xl"
        >
          <UInput
            v-model="state.brand"
            placeholder="Marke deines Produkts"
            icon="i-ph-tag"
          />
        </UFormGroup>

        <UFormGroup
          label="Supermärkte"
          name="marketIds"
          size="xl"
        >
          <USelectMenu
            v-model="state.marketIds"
            :options="computedMarkets"
            :clear-search-on-close="true"
            value-attribute="value"
            :search-attributes="['label']"
            searchable
            multiple
          >
            <template #empty>
              Keine Supermärkte
            </template>

            <template #option-empty="{ query }">
              <q>{{ query }}</q> wurde nicht gefunden.
            </template>
            <template #label>
              <template
                v-if="state.marketIds.length"
              >
                <span
                  v-if="state.marketIds.length > 3"
                  class="truncate"
                >{{ state.marketIds.length }} Supermärkte</span>
                <span
                  v-else
                  class="truncate"
                >{{ computedSelectedMarketsCaption }}</span>
              </template>
              <span v-else>Keine Auswahl</span>
            </template>
          </USelectMenu>
        </UFormGroup>

        <div class="flex justify-between items-center">
          <UButton
            color="gray"
            size="xl"
            @click="handleClose"
          >
            Abbrechen
          </UButton>
          <UButton
            type="submit"
            color="pink"
            size="xl"
          >
            Speichern
          </UButton>
        </div>
      </UForm>
    </div>
  </USlideover>
</template>

<style lang="scss" scoped>

</style>

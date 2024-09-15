<script lang="ts" setup>
import { object, string } from 'yup'

const listStore = useListStore()

const { uuid } = useRoute().params
const list = computed(() => listStore.getListByUuid(uuid as string)) as ComputedRef<List>

definePageMeta({
  isSingleList: true,
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
</script>

<template>
  <div class="pb-24">
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
          v-for="product in list.products"
          :key="product.uuid"
          :ui="productUiConfig"
        >
          <div class="flex items-center gap-2">
            <div
              class="flex-1 items-center flex gap-2 overflow-hidden"
            >
              <NuxtLink
                class="cursor-pointer"
                @click="editProduct(product)"
              >
                <UBadge
                  v-if="product.brand"
                  color="pink"
                  variant="solid"
                  size="md"
                >
                  {{ product.brand }}
                </UBadge>
                <p
                  class="line-clamp-2 text-lg"
                  :class="{ 'line-through': product.checked }"
                >
                  {{ product.name }}
                </p>
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
                color="red"
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
</template>

<style lang="scss" scoped>

</style>

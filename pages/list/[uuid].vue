<script lang="ts" setup>
import { object, string } from 'yup'

const listStore = useListStore()
const { uuid } = useRoute().params
const list = computed(() => listStore.getListByUuid(uuid as string)) as ComputedRef<List>

const productUiConfig = {
  body: {
    padding: 'p-4',
  },
}

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

const removeProduct = (product: Product) => {
  listStore.removeProduct(list.value, product)
}
</script>

<template>
  <div>
    <UCard>
      <template #header>
        <h1 class="text-2xl font-bold">
          {{ list.name }}
        </h1>
      </template>

      <div class="flex flex-col gap-2">
        <p
          v-if="list.products.length === 0"
          class="text-center text-gray-500"
        >
          Keine Produkte
        </p>
        <UCard
          v-for="product in list.products"
          :key="product.uuid"
          :ui="productUiConfig"
        >
          <div class="flex items-center gap-2">
            <div class="flex-1 overflow-hidden">
              <p
                class="line-clamp-2 text-lg"
                :class="{ 'line-through': product.checked }"
              >
                {{ product.name }}
              </p>
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
                @click="checkProduct(product)"
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

      <template #footer>
        <UForm
          :state="state"
          :schema="schema"
          :validate-on="['submit']"
          @submit="addItem"
        >
          <UFormGroup
            name="newName"
            label="Neuer Eintrag"
            size="xl"
          >
            <template #default>
              <div class="flex gap-2">
                <UInput
                  v-model="state.newName"
                  class="flex-1"
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
      </template>
    </UCard>
  </div>
</template>

<style lang="scss" scoped>

</style>

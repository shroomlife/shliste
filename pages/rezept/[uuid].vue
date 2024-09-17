<script lang="ts" setup>
import { object, string } from 'yup'
import { v4 as uuidv4 } from 'uuid'

const recipeStore = useRecipeStore()

const { uuid } = useRoute().params
const { $swal } = useNuxtApp()
const recipe = computed(() => recipeStore.getRecipeById(uuid as string)) as ComputedRef<Recipe>

definePageMeta({
  isSingleList: true,
  backLink: '/rezepte',
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
  console.log('addItem')
  const newProduct: Product = {
    uuid: uuidv4(),
    name: state.newName,
    description: '',
    checked: false,
  }
  recipeStore.addItem(recipe.value, newProduct)
  state.newName = ''
}

const editProduct = (product: Product) => {
  console.log('editProduct')
  recipeStore.setProductEdit(product)
}

const removeProduct = async (product: Product | ListedProduct) => {
  const response = await $swal.fire({
    title: 'Produkt wirklich löschen?',
    text: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    showCancelButton: true,
    icon: 'question',
    confirmButtonText: 'Ja, löschen!',
    cancelButtonText: 'Abbrechen',
  })
  if (response.isConfirmed) {
    recipeStore.removeItem(recipe.value, product)
  }
}

const computedListStyle = computed(() => {
  return {
    background: `linear-gradient(to bottom, ${recipe.value.color}, white)`,
  }
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
              :name="recipe.name"
              :h1="true"
            />
            <div class="flex gap-2" />
          </div>
        </template>

        <div class="flex flex-col gap-2">
          <p
            v-if="recipe.products.length === 0"
            class="text-gray-500"
          >
            Keine Einträge
          </p>
          <UCard
            v-for="product of recipe.products"
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
    <RecipeProductEdit />
  </div>
</template>

<style lang="scss" scoped>

</style>

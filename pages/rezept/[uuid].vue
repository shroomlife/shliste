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
  product: {
    newName: '',
  },
  step: {
    newName: '',
  },
})

const schema = object({
  newName: string().required('Erforderlich'),
})

const addItem = () => {
  const newProduct: Product = {
    uuid: uuidv4(),
    name: state.product.newName,
    description: '',
    checked: false,
  }
  recipeStore.addItem(recipe.value, newProduct)
  state.product.newName = ''
}

const addStep = () => {
  recipeStore.addStep(recipe.value, state.step.newName)
  state.step.newName = ''
}

const editProduct = (product: Product) => {
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

const removeStep = async (index: number) => {
  const response = await $swal.fire({
    title: 'Schritt wirklich löschen?',
    text: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    showCancelButton: true,
    icon: 'question',
    confirmButtonText: 'Ja, löschen!',
    cancelButtonText: 'Abbrechen',
  })
  if (response.isConfirmed) {
    recipeStore.removeStep(recipe.value, index)
  }
}

const computedListStyle = computed(() => {
  return {
    background: `linear-gradient(to bottom, ${recipe.value.color}, white)`,
  }
})

const computedFlatListStyle = computed(() => {
  return {
    backgroundColor: String(recipe.value.color).replace('0.2', '0.05'),
  }
})

const isAbleToOrderStepUp = (index: number) => {
  return index > 0
}

const isAbleToOrderStepDown = (index: number) => {
  return index < recipe.value.steps.length - 1
}

const orderStepUp = (index: number) => {
  recipeStore.orderStepUp(recipe.value, index)
}

const orderStepDown = (index: number) => {
  recipeStore.orderStepDown(recipe.value, index)
}

const editStep = (index: number) => {
  console.log('editStep', index)
  recipeStore.setRecipeStepEdit(index)
}

const isEdit = ref(false)
</script>

<template>
  <div>
    <div class="flex flex-col pb-24 gap-4">
      <UCard :ui="computedCardUi">
        <template #header>
          <div
            class="flex justify-between items-start sm:px-6 p-4 rounded-t-lg"
            :style="computedListStyle"
          >
            <ListName
              :name="recipe.name"
              :h1="true"
            />
            <div class="flex gap-2">
              <UButton
                v-if="!isEdit"
                color="white"
                variant="solid"
                size="lg"
                icon="i-ph-pencil-line"
                padded
                square
                @click="isEdit = true"
              />
              <UButton
                v-else
                color="white"
                variant="solid"
                size="lg"
                icon="i-ph-check-bold"
                padded
                square
                @click="isEdit = false"
              />
            </div>
          </div>
        </template>

        <div
          v-if="isEdit"
          class="flex flex-col gap-6"
        >
          <UCard :ui="computedCardUi">
            <template #header>
              <div
                class="flex justify-between items-center sm:px-6 p-4 rounded-t-lg"
                :style="computedFlatListStyle"
              >
                <span class="text-2xl md:text-3xl font-bold">Zutaten</span>
              </div>
            </template>

            <div class="flex flex-col gap-2">
              <p
                v-if="recipe.products.length === 0"
                class="text-gray-500"
              >
                Keine Zutaten
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

            <template #footer>
              <UForm
                :state="state.product"
                :schema="schema"
                :validate-on="['submit']"
                class="container mx-auto"
                @submit="addItem"
              >
                <UFormGroup
                  name="newName"
                  size="xl"
                >
                  <template #default>
                    <div class="flex gap-2">
                      <ListedProductConnector :recipe="recipe" />
                      <UInput
                        v-model="state.product.newName"
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
            </template>
          </UCard>

          <UDivider />

          <UCard :ui="computedCardUi">
            <template #header>
              <div
                class="flex justify-between items-center sm:px-6 p-4 rounded-t-lg"
                :style="computedFlatListStyle"
              >
                <span class="text-2xl md:text-3xl font-bold">Zubereitung</span>
              </div>
            </template>

            <div class="flex flex-col gap-2">
              <p
                v-if="recipe.steps.length === 0"
                class="text-gray-500"
              >
                Keine Schritte
              </p>
              <UCard
                v-for="(step, index) of recipe.steps"
                :key="index"
                :ui="productUiConfig"
              >
                <div class="flex flex-col justify-end gap-2">
                  <div
                    class="flex-1 items-center flex gap-2 overflow-hidden"
                  >
                    <NuxtLink
                      class="cursor-pointer flex gap-2 items-center"
                      @click="editStep(index)"
                    >
                      <p
                        class="text-lg"
                      >
                        <span class="font-bold text-xl">{{ index+1 }}.</span> {{ step }}
                      </p>
                    </NuxtLink>
                  </div>
                  <div class="flex items-center justify-end gap-3">
                    <!-- Buttons for Order Up and Order Down -->
                    <div class="flex gap-2">
                      <UButton
                        :disabled="!isAbleToOrderStepUp(index)"
                        color="white"
                        variant="solid"
                        size="xs"
                        icon="i-ph-caret-up"
                        square
                        padded
                        @click="orderStepUp(index)"
                      />
                      <UButton
                        :disabled="!isAbleToOrderStepDown(index)"
                        color="white"
                        variant="solid"
                        size="xs"
                        icon="i-ph-caret-down"
                        square
                        padded
                        @click="orderStepDown(index)"
                      />
                    </div>
                    <UButton
                      color="rose"
                      variant="soft"
                      size="md"
                      icon="i-ph-trash"
                      square
                      padded
                      @click="removeStep(index)"
                    />
                  </div>
                </div>
              </UCard>
            </div>

            <template #footer>
              <UForm
                :state="state.step"
                :schema="schema"
                :validate-on="['submit']"
                class="container mx-auto"
                @submit="addStep"
              >
                <UFormGroup
                  name="newName"
                  size="xl"
                >
                  <template #default>
                    <div class="flex gap-2">
                      <UInput
                        v-model="state.step.newName"
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
            </template>
          </UCard>
        </div>
        <RecipeView
          v-else
          :recipe="recipe"
        />
      </UCard>
    </div>
    <RecipeProductEdit />
    <RecipeStepEdit />
  </div>
</template>

<style lang="scss" scoped>

</style>

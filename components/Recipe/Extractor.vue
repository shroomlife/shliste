<script lang="ts" setup>
import { object, string, type InferType } from 'yup'
import { v4 as uuidv4 } from 'uuid'
import type { FormSubmitEvent } from '#ui/types'
import IconVype from '@/assets/icons/vype-ai.svg'

const isOpen = ref(false)
const toast = useToast()
const recipeStore = useRecipeStore()

const openModal = () => {
  isOpen.value = true
}
const closeModal = () => {
  isOpen.value = false
}

const state = reactive({
  recipeUrl: '',
  goVegan: true,
  extractedRecipe: {
    extracted: false,
    title: '' as string,
    ingredients: [] as string[],
    selectedIngredients: [] as string[],
    steps: [] as string[],
    selectedSteps: [] as string[],
  },
})

const isLoading = ref(false)

const schema = object({
  recipeUrl: string().url('Ungültige URL').required('Erforderlich'),
})

type Schema = InferType<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    isLoading.value = true
    const { recipeUrl } = event.data
    const recipeResponse = await $fetch('/api/recipe/extract', {
      method: 'GET',
      params: {
        recipeUrl,
        goVegan: state.goVegan,
      },
    }) as ExtractRecipeResponse

    if (recipeResponse.success && recipeResponse.ingredients && recipeResponse.steps && recipeResponse.title) {
      state.extractedRecipe.extracted = true

      state.extractedRecipe.title = recipeResponse.title as string

      state.extractedRecipe.ingredients = [...recipeResponse.ingredients]
      state.extractedRecipe.selectedIngredients = [...recipeResponse.ingredients]

      state.extractedRecipe.steps = [...recipeResponse.steps]
      state.extractedRecipe.selectedSteps = [...recipeResponse.steps]
    }
    else if (recipeResponse.error) {
      toast.add({
        title: 'Fehler beim Extrahieren',
        description: recipeResponse.error,
        color: 'red',
        timeout: 5000,
      })
    }
    else {
      throw new Error('Unerwartete Antwort vom Server')
    }
  }
  catch (error) {
    console.error(error)
    toast.add({
      title: 'Fehler beim Extrahieren',
      description: 'Ein unbekannter Fehler ist aufgetreten.',
      color: 'red',
      timeout: 5000,
    })
  }
  finally {
    isLoading.value = false
  }
}

const computedHasExtractedRecipe = computed(() => {
  return state.extractedRecipe.extracted
})

const isIngredientSelected = computed(() => (ingredient: string) => {
  return state.extractedRecipe.selectedIngredients.includes(ingredient)
})

const isStepSelected = computed(() => (step: string) => {
  return state.extractedRecipe.selectedSteps.includes(step)
})

const toggleIngredient = (ingredient: string) => {
  const index = state.extractedRecipe.selectedIngredients.indexOf(ingredient)
  if (index > -1) {
    state.extractedRecipe.selectedIngredients.splice(index, 1)
  }
  else {
    state.extractedRecipe.selectedIngredients.push(ingredient)
  }
}

const toggleStep = (step: string) => {
  const index = state.extractedRecipe.selectedSteps.indexOf(step)
  if (index > -1) {
    state.extractedRecipe.selectedSteps.splice(index, 1)
  }
  else {
    state.extractedRecipe.selectedSteps.push(step)
  }
}

const resetLoadedRecipe = () => {
  isLoading.value = false
  state.recipeUrl = ''
  state.extractedRecipe.extracted = false
  state.extractedRecipe.title = ''
  state.extractedRecipe.ingredients = []
  state.extractedRecipe.selectedIngredients = []
  state.extractedRecipe.steps = []
  state.extractedRecipe.selectedSteps = []
}

const saveRecipe = () => {
  recipeStore.addRecipe({
    uuid: uuidv4(),
    name: state.extractedRecipe.title,
    color: useRandomColorRGBA(0.2),
    description: '',
    steps: state.extractedRecipe.selectedSteps,
    products: state.extractedRecipe.selectedIngredients.map((ingredient) => {
      const newProduct: Product = {
        uuid: uuidv4(),
        name: ingredient,
        checked: false,
        brand: '',
        description: '',
      }
      return newProduct
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  closeModal()
  resetLoadedRecipe()
}
</script>

<template>
  <div>
    <UButton
      class="shadow-md"
      icon="i-ph-magic-wand"
      size="xl"
      color="rose"
      variant="solid"
      @click="openModal"
    />
    <UModal v-model="isOpen">
      <UForm
        :schema="schema"
        :state="state"
        @submit="onSubmit"
      >
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-ph-magic-wand"
                  size="28"
                />
                <h2 class="text-2xl font-bold">
                  Rezeptextraktor
                </h2>
              </div>
              <UButton
                color="gray"
                variant="ghost"
                size="md"
                icon="i-ph-x"
                square
                padded
                @click="closeModal"
              />
            </div>
          </template>

          <div
            v-if="!computedHasExtractedRecipe"
            class="flex flex-col gap-2"
          >
            <UFormGroup
              label="Rezept URL"
              name="recipeUrl"
              size="xl"
            >
              <UInput
                v-model="state.recipeUrl"
                placeholder="https://"
                :disabled="isLoading"
                icon="i-ph-brackets-curly"
              />
            </UFormGroup>

            <UFormGroup
              v-if="0"
              label="Rezept in Vegan"
              name="vegan"
              size="xl"
            >
              <UCheckbox
                v-model="state.goVegan"
                name="vegan"
                :disabled="isLoading"
                label="Bitte das Rezept in eine vegane Variante umwandeln."
                :ui="{
                  label: 'text-lg',
                  base: 'w-5 h-5',
                  wrapper: 'items-center',
                }"
              />
            </UFormGroup>
          </div>

          <div
            v-if="computedHasExtractedRecipe"
            class="flex flex-col gap-4"
          >
            <div>
              <span class="text-2xl font-bold">Zutaten</span>
              <div class="bg-gray-100 rounded-lg border border-gray-200 p-4">
                <div
                  v-for="(ingredient, index) of state.extractedRecipe.ingredients"
                  :key="index"
                >
                  <UCheckbox

                    :model-value="isIngredientSelected(ingredient)"
                    :ui="{
                      label: 'text-base',
                      base: 'w-4 h-4',
                      // wrapper: 'items-start',
                    }"
                    @update:model-value="toggleIngredient(ingredient)"
                  >
                    <template #label>
                      {{ ingredient }}
                    </template>
                  </UCheckbox>
                </div>
              </div>
            </div>

            <div>
              <span class="text-2xl font-bold">Zubereitung</span>
              <div class="bg-gray-100 rounded-lg border border-gray-200 p-4">
                <div
                  v-for="(step, index) of state.extractedRecipe.steps"
                  :key="index"
                >
                  <UCheckbox

                    :model-value="isStepSelected(step)"
                    :ui="{
                      label: 'text-base',
                      base: 'w-4 h-4',
                      // wrapper: 'items-start',
                    }"
                    @update:model-value="toggleStep(step)"
                  >
                    <template #label>
                      <span class="font-bold">{{ index+1 }}.</span> {{ step }}
                    </template>
                  </UCheckbox>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between">
              <div class="flex gap-2">
                <UButton
                  v-if="computedHasExtractedRecipe"
                  color="rose"
                  variant="solid"
                  size="xl"
                  type="submit"
                  :loading="isLoading"
                  @click="saveRecipe"
                >
                  Speichern
                </UButton>
                <UButton
                  v-if="computedHasExtractedRecipe"
                  color="gray"
                  variant="solid"
                  size="xl"
                  type="submit"
                  @click="resetLoadedRecipe"
                >
                  Abbrechen
                </UButton>
                <UButton
                  v-if="!computedHasExtractedRecipe"
                  color="rose"
                  variant="solid"
                  size="xl"
                  type="submit"
                  :loading="isLoading"
                >
                  Extrahieren
                </UButton>
              </div>

              <div class="flex items-center justify-end gap-2">
                <span class="text-xs text-gray-500">powered by</span>
                <NuxtLink
                  to="https://vype.ai"
                  target="_blank"
                  rel="noopener"
                  title="Die besten KI-Tools kommen von Vype."
                >
                  <IconVype
                    class="w-20"
                    alt="Vype AI Logo"
                  />
                </NuxtLink>
              </div>
            </div>
          </template>
        </UCard>
      </UForm>
    </UModal>
  </div>
</template>

<style lang="scss" scoped>

</style>

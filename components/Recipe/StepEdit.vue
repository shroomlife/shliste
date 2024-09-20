<script lang="ts" setup>
import { object, string } from 'yup'

const appConfig = useAppConfig()

const recipeStore = useRecipeStore()
const computedIsOpen = computed({
  get() {
    return recipeStore.getRecipeStepEditIndex !== null
  },
  set(value) {
    if (!value) {
      recipeStore.setRecipeStepEdit(null)
    }
  },
})

const handleClose = () => {
  recipeStore.setRecipeStepEdit(null)
}

const state = reactive({
  name: '',
})

const schema = object({
  name: string().required('Name ist Erforderlich'),
})

const resetState = (): void => {
  state.name = ''
}

async function onSubmit() {
  if (computedCurrentRecipe.value === null) {
    return
  }

  if (computedCurrentRecipeStepEditIndex.value === null) {
    return
  }

  recipeStore.updateRecipeStep(computedCurrentRecipe.value, computedCurrentRecipeStepEditIndex.value, state.name)
  handleClose()
  resetState()
}

const computedCurrentRecipeStepEditIndex = computed((): number | null => {
  return recipeStore.getRecipeStepEditIndex
})

const computedCurrentRecipeId = computed((): string | null => {
  const route = useRoute()
  return route.params.uuid as string ?? null
})

const computedCurrentRecipe = computed((): Recipe | null => {
  const recipeId = computedCurrentRecipeId.value
  if (typeof recipeId === 'string') {
    return recipeStore.getRecipeById(recipeId) as Recipe
  }
  return null
})

watch(() => recipeStore.getRecipeStepEditIndex, (newVal: number | null) => {
  if (newVal !== null) {
    console.log('newVal', newVal)
    const route = useRoute()
    const currentRecipeId = route.params.uuid as string
    console.log('currentRecipeId', currentRecipeId)
    if (currentRecipeId) {
      const currentRecipe = recipeStore.getRecipeById(currentRecipeId) as Recipe
      console.log('currentRecipe', currentRecipe)
      const currentStep = currentRecipe.steps[newVal]
      console.log('currentStep', currentStep)
      state.name = currentStep as string
    }
  }
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
          Bearbeite Zubereitungsschritt
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
          <UTextarea
            v-model="state.name"
            placeholder="Name deines Rezepts"
            :icon="appNavigation.recipes.icon"
          />
        </UFormGroup>
        <div class="flex justify-between items-center">
          <div class="flex gap-2">
            <UButton
              color="gray"
              size="xl"
              @click="handleClose"
            >
              Abbrechen
            </UButton>
            <UButton
              v-if="0"
              color="orange"
              size="xl"
              variant="ghost"
              icon="i-ph-paint-brush"
            >
              Neue Farbe
            </UButton>
          </div>
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

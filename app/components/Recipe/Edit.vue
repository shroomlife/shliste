<script lang="ts" setup>
import { object, string } from 'yup'
import { v4 as uuidv4 } from 'uuid'

const appConfig = useAppConfig()
const toast = useToast()

const recipeStore = useRecipeStore()
const computedIsOpen = computed({
  get() {
    return recipeStore.getRecipeEdit !== null
  },
  set(value) {
    if (!value) {
      recipeStore.setRecipeEdit(null)
    }
  },
})

const handleClose = () => {
  recipeStore.setRecipeEdit(null)
}

// const handleChangeColor = () => {
//   const color = useRandomColorRGBA(0.2)
//   recipeStore.changeColor(state.uuid, color)
// }

const computedRecipeHasId = computed(() => {
  return typeof recipeStore.getRecipeEdit?.uuid === 'string' && recipeStore.getRecipeEdit?.uuid.length > 0
})

const computedTitle = computed(() => {
  return computedRecipeHasId.value ? 'Bearbeite Rezept' : 'Neues Rezept'
})

const state = reactive<Recipe>({
  uuid: '',
  name: '',
  color: '',
  description: '',
  url: '',
  products: [] as (Product | ListedProduct)[],
  steps: [] as string[],
  createdAt: null,
  updatedAt: null,
})

const schema = object({
  name: string().required('Name ist Erforderlich'),
  url: string().url('Ungültige URL'),
})

const resetState = (): void => {
  state.uuid = ''
  state.name = ''
  state.color = ''
  state.description = ''
  state.url = ''
  state.products = []
  state.steps = []
  state.createdAt = new Date()
  state.updatedAt = new Date()
}

async function onSubmit() {
  if (!state.uuid) {
    state.uuid = uuidv4()
    state.createdAt = new Date()
    state.updatedAt = new Date()
    state.color = useRandomColorRGBA(0.2)
    recipeStore.addRecipe({ ...state })
    toast.add({
      title: 'Rezept wurde erstellt!',
      color: 'green',
      icon: 'i-ph-check-circle',
    })
  }
  else {
    recipeStore.updateRecipe(state.uuid, state)
  }

  handleClose()
  resetState()
}

watch(() => recipeStore.getRecipeEdit, (newVal: Recipe | null) => {
  if (newVal) {
    state.uuid = newVal.uuid
    state.name = newVal.name
    state.color = newVal.color
    state.description = newVal.description
    state.url = newVal.url
    state.products = newVal.products
    state.steps = newVal.steps
    state.createdAt = newVal.createdAt
    state.updatedAt = newVal.updatedAt
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
            placeholder="Name deines Rezepts"
            :icon="appNavigation.recipes.icon"
          />
        </UFormGroup>
        <UFormGroup
          label="Link"
          name="url"
          size="xl"
        >
          <UInput
            v-model="state.url"
            placeholder="URL deines Rezepts"
            icon="i-ph-link"
            type="url"
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

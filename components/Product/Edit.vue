<script lang="ts" setup>
import { object, string } from 'yup'

const appConfig = useAppConfig()

const listStore = useListStore()

const computedIsOpen = computed({
  get() {
    return listStore.getProductEdit !== null
  },
  set(value) {
    if (!value) {
      listStore.setProductEdit(null)
    }
  },
})

const handleClose = () => {
  listStore.setProductEdit(null)
}

const computedProductHasId = computed(() => {
  return typeof listStore.getProductEdit?.uuid === 'string'
})

const computedTitle = computed(() => {
  return computedProductHasId.value ? 'Bearbeite Produkt' : 'Neues Produkt'
})

const state = reactive<Product>({
  uuid: '',
  name: '',
  description: '',
  brand: '',
  checked: false,
})

const schema = object({
  name: string().required('Name ist Erforderlich'),
  description: string().optional(),
  brand: string().optional(),
})

const resetState = (): void => {
  state.name = ''
  state.uuid = ''
  state.brand = ''
  state.description = ''
  state.checked = false
}

async function onSubmit() {
  listStore.updateProduct(state)
  handleClose()
  resetState()
}

watch(() => listStore.getProductEdit, (newVal: Product | null) => {
  if (newVal) {
    state.uuid = newVal.uuid
    state.name = newVal.name
    state.brand = newVal.brand
    state.description = newVal.description
    state.checked = newVal.checked
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
            placeholder="Name deines Produkts"
            icon="i-ph-text-align-left"
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

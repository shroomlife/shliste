<script lang="ts" setup>
import { object, string } from 'yup'
import { v4 as uuidv4 } from 'uuid'

const appConfig = useAppConfig()
const toast = useToast()

const marketStore = useMarketStore()

const computedIsOpen = computed({
  get() {
    return marketStore.getMarketEdit !== null
  },
  set(value) {
    if (!value) {
      marketStore.setMarketEdit(null)
    }
  },
})

const handleClose = () => {
  marketStore.setMarketEdit(null)
}

const computedProductHasId = computed(() => {
  return typeof marketStore.getMarketEdit?.uuid === 'string'
})

const computedTitle = computed(() => {
  return computedProductHasId.value ? 'Bearbeite Supermarkt' : 'Neuer Supermarkt'
})

const state = reactive<Market>({
  uuid: '',
  name: '',
  address: '',
  createdAt: null,
  updatedAt: null,
})

const schema = object({
  name: string().required('Name ist Erforderlich'),
  address: string().required('Adresse ist Erforderlich'),
})

const resetState = (): void => {
  state.uuid = ''
  state.name = ''
  state.address = ''
  state.createdAt = null
  state.updatedAt = null
}

async function onSubmit() {
  if (!state.uuid) {
    state.uuid = uuidv4()
    state.createdAt = new Date()
    state.updatedAt = new Date()
    marketStore.addMarket({ ...state })
    toast.add({
      title: 'Supermarkt wurde erstellt!',
      color: 'green',
      icon: 'i-ph-check-circle',
    })
  }
  else {
    marketStore.updateMarket(state.uuid, state)
  }

  handleClose()
  resetState()
}

watch(() => marketStore.getMarketEdit, (newVal: Market | null) => {
  if (newVal) {
    state.uuid = newVal.uuid
    state.name = newVal.name
    state.address = newVal.address
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
            placeholder="Name des Supermarkts"
            icon="i-ph-storefront"
          />
        </UFormGroup>
        <UFormGroup
          label="Adresse"
          name="address"
          size="xl"
        >
          <UInput
            v-model="state.address"
            placeholder="Adresse des Supermarkts"
            icon="i-ph-map-pin"
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

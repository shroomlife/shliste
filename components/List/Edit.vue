<script lang="ts" setup>
import { object, string } from 'yup'
import { v4 as uuidv4 } from 'uuid'

const appConfig = useAppConfig()
const toast = useToast()

const listStore = useListStore()
const computedIsOpen = computed({
  get() {
    return listStore.getListEdit !== null
  },
  set(value) {
    if (!value) {
      listStore.setListEdit(null)
    }
  },
})

const handleClose = () => {
  listStore.setListEdit(null)
}

const handleChangeColor = () => {
  const color = useRandomColorRGBA(0.2)
  listStore.changeColor(state.uuid, color)
}

const computedListHasId = computed(() => {
  return typeof listStore.getListEdit?.uuid === 'string' && listStore.getListEdit?.uuid.length > 0
})

const computedTitle = computed(() => {
  return computedListHasId.value ? 'Bearbeite Liste' : 'Neue Liste'
})

const state = reactive<List>({
  uuid: '',
  name: '',
  color: '',
  description: '',
  products: [] as Product[],
  createdAt: null,
  updatedAt: null,
  archivedAt: null,
})

const schema = object({
  name: string().required('Name ist Erforderlich'),
})

const resetState = (): void => {
  state.uuid = ''
  state.name = ''
  state.color = ''
  state.description = ''
  state.products = []
  state.createdAt = new Date()
  state.updatedAt = new Date()
  state.archivedAt = null
}

async function onSubmit() {
  if (!state.uuid) {
    state.uuid = uuidv4()
    state.createdAt = new Date()
    state.updatedAt = new Date()
    state.archivedAt = null
    state.color = useRandomColorRGBA(0.2)
    listStore.addList({ ...state })
    toast.add({
      title: 'Liste wurde erstellt!',
      color: 'green',
      icon: 'i-ph-check-circle',
    })
  }
  else {
    listStore.updateList(state.uuid, state)
  }

  handleClose()
  resetState()
}

watch(() => listStore.getListEdit, (newVal: List | null) => {
  if (newVal) {
    state.uuid = newVal.uuid
    state.name = newVal.name
    state.color = newVal.color
    state.description = newVal.description
    state.products = newVal.products
    state.createdAt = newVal.createdAt
    state.updatedAt = newVal.updatedAt
    state.archivedAt = newVal.archivedAt
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
            placeholder="Name deiner Liste"
            icon="i-ph-list-checks"
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
              v-if="computedListHasId"
              color="orange"
              size="xl"
              variant="ghost"
              icon="i-ph-paint-brush"
              @click="handleChangeColor"
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

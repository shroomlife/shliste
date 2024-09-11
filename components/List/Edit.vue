<script lang="ts" setup>
import { object, string } from 'yup'
import { v4 as uuidv4 } from 'uuid'

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

const computedListHasId = computed(() => {
  return typeof listStore.getListEdit?.uuid === 'string'
})

const computedTitle = computed(() => {
  return computedListHasId.value ? 'Bearbeite Liste' : 'Neue Liste'
})

const state = reactive<List>({
  uuid: '',
  name: '',
  products: [] as Product[],
  createdAt: null,
  updatedAt: null,
  archivedAt: null,
})

const schema = object({
  name: string().required('Name ist Erforderlich'),
})

const resetState = (): void => {
  state.name = ''
  state.uuid = ''
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
    listStore.addList({ ...state })
  }
  else {
    listStore.updateList(state.uuid, state)
  }

  handleClose()
  resetState()
}

watch(() => listStore.getListEdit, (newVal: List | null) => {
  console.log(newVal)
  if (newVal) {
    state.uuid = newVal.uuid
    state.name = newVal.name
    state.createdAt = newVal.createdAt
    state.updatedAt = newVal.updatedAt
    state.archivedAt = newVal.archivedAt
  }
})
</script>

<template>
  <USlideover v-model="computedIsOpen">
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
            icon="i-ph-text-align-left"
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

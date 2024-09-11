<script lang="ts" setup>
const listStore = useListStore()
const { list } = defineProps<{
  list: List
}>()

const toast = useToast()
const { $moment, $swal } = useNuxtApp()

const computedListLink = computed(() => `/list/${list.uuid}`)
const computedCardUi = computed(() => ({
  body: {
    padding: 'p-3',
  },
  header: {
    padding: 'sm:px-0 p-0',
  },
  footer: {
    padding: 'p-3',
  },
}))

const editOption = [{
  label: 'Bearbeiten',
  icon: 'i-ph-pencil-line',
  click: () => listStore.setListEdit(list),
}]

const archiveOption = [{
  label: 'Archivieren',
  icon: 'i-ph-archive-box',
  click: () => listStore.archiveList(list),
}]

const unarchiveOption = [{
  label: 'Unarchivieren',
  icon: 'i-ph-archive-box',
  click: () => listStore.unarchiveList(list),
}]

const deleteOption = [{
  label: 'Löschen',
  icon: 'i-ph-trash',
  click: async () => {
    const response = await $swal.fire({
      title: 'Liste wirklich löschen?',
      text: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      showCancelButton: true,
      icon: 'question',
      confirmButtonText: 'Ja, löschen!',
      cancelButtonText: 'Abbrechen',
    })
    if (response.isConfirmed) {
      listStore.removeList(list.uuid)
      toast.add({
        title: 'Liste wurde gelöscht!',
        color: 'red',
        icon: 'i-ph-trash',
      })
    }
  },
}]

const optionItems = computed(() => {
  if (list.archivedAt) {
    return [unarchiveOption, deleteOption]
  }
  return [editOption, archiveOption, deleteOption]
})

const computedListStyle = computed(() => {
  return {
    background: `linear-gradient(to bottom, ${list.color}, white)`,
  }
})

const computedCheckedProductsCount = computed(() => {
  return list.products.filter(product => product.checked).length
})

const computedShowCheckedProductsCount = computed(() => {
  return list.products.some(product => product.checked)
})
</script>

<template>
  <UCard :ui="computedCardUi">
    <template #header>
      <NuxtLink
        v-if="!list.archivedAt"
        :to="computedListLink"
        class="flex sm:px-6 p-4 rounded-t-lg"
        :style="computedListStyle"
      >
        <ListName :list="list" />
      </NuxtLink>
      <div
        v-else
        class="flex sm:px-6 p-4 rounded-t-lg"
      >
        <ListName :list="list" />
      </div>
    </template>

    <template
      #footer
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UBadge
            color="pink"
            variant="subtle"
            size="lg"
          >
            {{ list.products.length }} Einträge
          </UBadge>
          <UBadge
            v-if="computedShowCheckedProductsCount"
            color="green"
            variant="subtle"
            size="lg"
          >
            {{ computedCheckedProductsCount }} Erledigt
          </UBadge>
          <UBadge
            v-if="list.archivedAt"
            color="gray"
            variant="soft"
            size="lg"
          >
            Archiviert am {{ $moment(list.archivedAt).format('DD.MM.YYYY, HH:mm') }} Uhr
          </UBadge>
        </div>

        <UDropdown
          :items="optionItems"
          :ui="{
            item: {
              label: 'text-base',
            },
          }"
        >
          <UButton
            color="gray"
            icon="i-ph-dots-three-bold"
            size="md"
            square
            padded
          />
        </UDropdown>
      </div>
    </template>
  </UCard>
</template>

<style lang="scss" scoped>

</style>

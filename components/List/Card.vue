<script lang="ts" setup>
const listStore = useListStore()
const props = defineProps<{
  list: List
}>()

const { list } = toRefs(props)

const toast = useToast()
const { $moment, $swal } = useNuxtApp()
const isDescriptionOpen = ref(false)

const computedListLink = computed(() => `/liste/${list.value.uuid}`)
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
  click: () => listStore.setListEdit(list.value),
}]

const archiveOption = [{
  label: 'Archivieren',
  icon: 'i-ph-archive-box',
  click: () => listStore.archiveList(list.value),
}]

const unarchiveOption = [{
  label: 'Unarchivieren',
  icon: 'i-ph-archive-box',
  click: () => listStore.unarchiveList(list.value),
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
      listStore.removeList(list.value.uuid)
      toast.add({
        title: 'Liste wurde gelöscht!',
        color: 'rose',
        icon: 'i-ph-trash',
      })
    }
  },
}]

const optionItems = computed(() => {
  if (list.value.archivedAt) {
    return [unarchiveOption, deleteOption]
  }
  return [editOption, archiveOption, deleteOption]
})

const computedListStyle = computed(() => {
  return {
    background: `linear-gradient(to bottom, ${list.value.color}, white)`,
  }
})

const computedCheckedProductsCount = computed(() => {
  return list.value.products.filter(product => product.checked).length
})

const computedShowCheckedProductsCount = computed(() => {
  return list.value.products.some(product => product.checked)
})

const computedListHasUrl = computed(() => {
  return list.value.url && list.value.url.length > 0
})

const computedExternalListLink = computed(() => {
  return list.value.url
})

const computedListHasDescription = computed(() => {
  return list.value.description && list.value.description.length > 0
})

const openDescription = () => {
  isDescriptionOpen.value = true
}

const closeDescription = () => {
  isDescriptionOpen.value = false
}

const computedProductAmountCaption = computed(() => {
  return list.value.products.length === 1 ? 'Produkt' : 'Produkte'
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
            color="white"
            variant="solid"
            size="lg"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="appNavigation.products.icon" />
              <span>{{ list.products.length }} {{ computedProductAmountCaption }}</span>
            </div>
          </UBadge>
          <UBadge
            v-if="computedShowCheckedProductsCount"
            color="green"
            variant="subtle"
            size="lg"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-ph-check-fat-fill" />
              <span>{{ computedCheckedProductsCount }}</span>
            </div>
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

        <div class="flex gap-2">
          <UButton
            v-if="computedListHasDescription"
            icon="i-ph-text-columns"
            color="gray"
            size="md"
            square
            padded
            @click="openDescription"
          />

          <UModal v-model="isDescriptionOpen">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <ListName :list="list" />
                  <UButton
                    color="gray"
                    variant="ghost"
                    size="md"
                    icon="i-ph-x"
                    square
                    padded
                    @click="closeDescription"
                  />
                </div>
              </template>

              <div class="text-lg">
                {{ list.description }}
              </div>
            </UCard>
          </UModal>

          <UButton
            v-if="computedListHasUrl"
            icon="i-ph-arrow-square-out"
            color="gray"
            size="md"
            square
            padded
            :to="computedExternalListLink"
            target="_blank"
            :external="true"
          />
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
      </div>
    </template>
  </UCard>
</template>

<style lang="scss" scoped>

</style>

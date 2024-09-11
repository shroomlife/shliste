<script lang="ts" setup>
const listStore = useListStore()
const { list } = defineProps<{
  list: List
}>()
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
</script>

<template>
  <UCard :ui="computedCardUi">
    <template #header>
      <NuxtLink
        :to="computedListLink"
        class="flex sm:px-6 p-4"
      >
        <div

          class="flex items-center justify-between"
        >
          <span class="text-2xl md:text-3xl font-bold">{{ list.name }}</span>
          <div
            v-if="list.archivedAt"
            class="flex gap-2"
          >
            <UButton
              icon="i-ph-arrow-counter-clockwise-bold"
              color="gray"
              size="sm"
              square
              @click="listStore.unarchiveList(list.uuid)"
            />
            <UButton
              icon="i-ph-trash"
              color="red"
              size="sm"
              @click="listStore.removeList(list.uuid)"
            />
          </div>
        </div>
      </NuxtLink>
    </template>

    <template
      v-if="!list.archivedAt"
      #footer
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-ph-pencil-line"
            color="gray"
            size="sm"
            @click="listStore.setListEdit(list)"
          >
            <span class="hidden md:block">
              Bearbeiten
            </span>
          </UButton>
          <UButton
            icon="i-ph-archive-box"
            color="gray"
            size="sm"
            @click="listStore.archiveList(list.uuid)"
          >
            <span class="hidden md:block">
              Archivieren
            </span>
          </UButton>
        </div>
        <UButton
          icon="i-ph-trash"
          color="red"
          size="sm"
          @click="listStore.removeList(list.uuid)"
        >
          <span class="hidden md:block">
            Löschen
          </span>
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<style lang="scss" scoped>

</style>

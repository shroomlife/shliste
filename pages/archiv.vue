<script lang="ts" setup>
const listStore = useListStore()
const computedLists = computed(() => listStore.getArchivedLists)

useSeoMeta({
  title: 'shliste ~ Deine archivierten Einkaufslisten',
  description: 'Archivierte Einkaufslisten in shliste. Hier findest du alle Listen, die du archiviert hast.',
})
</script>

<template>
  <div>
    <div
      v-if="computedLists.length"
      class="flex flex-col gap-4"
    >
      <ListCard
        v-for="list in computedLists"
        :key="list.uuid"
        :list="list"
      />
    </div>
    <div v-else>
      <div class="flex items-center justify-center gap-2 text-lg h-40">
        <UIcon
          :name="appNavigation.archiv.icon"
          class="w-5 h-5"
        />
        <span>
          Keine archivierten Listen vorhanden
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

</style>

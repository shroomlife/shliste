<script lang="ts" setup>
const listStore = useListStore()
const computedLists = computed(() => listStore.getActiveLists)
definePageMeta({
  showActionsBar: true,
  showAddListButton: true,
})
</script>

<template>
  <div>
    <div
      v-if="computedLists.length"
      class="flex flex-col gap-4"
    >
      <ListCard
        v-for="list of computedLists"
        :key="list.uuid"
        :list="list"
      />
    </div>
    <div v-else>
      <div class="flex items-center justify-center gap-2 text-lg h-40">
        <UIcon
          :name="appNavigation.lists.icon"
          class="w-5 h-5"
        />
        <span>
          Keine Listen vorhanden
        </span>
      </div>
    </div>
    <ListEdit />
  </div>
</template>

<style lang="scss" scoped>
</style>

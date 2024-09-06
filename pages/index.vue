<script lang="ts" setup>
const listStore = useListStore()
const computedLists = computed(() => listStore.getActiveLists)
</script>

<template>
  <div>
    <div class="flex flex-col gap-4">
      <ListCard
        v-for="list in computedLists"
        :key="list.uuid"
        :list="list"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>

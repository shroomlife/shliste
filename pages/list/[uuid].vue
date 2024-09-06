<script lang="ts" setup>
const listStore = useListStore()
const { uuid } = useRoute().params
const list = computed(() => listStore.getListByUuid(uuid as string))
</script>

<template>
  <div>
    {{ list }}
  </div>
</template>

<style lang="scss" scoped>

</style>
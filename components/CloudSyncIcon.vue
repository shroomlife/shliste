<script lang="ts" setup>
const googleStore = useGoogleStore()
</script>

<template>
  <UIcon
    v-if="googleStore.getIsSyncing"
    name="svg-spinners:3-dots-fade"
    class="text-green-500"
  />
</template>

<style lang="scss" scoped>

</style>

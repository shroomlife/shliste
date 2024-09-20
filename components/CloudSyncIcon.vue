<script lang="ts" setup>
const googleStore = useGoogleStore()
</script>

<template>
  <div class="flex items-center">
    <UIcon
      v-if="googleStore.getIsSyncing"
      name="svg-spinners:3-dots-fade"
      class="text-green-500"
      size="24"
    />
    <CloudSync />
  </div>
</template>

<style lang="scss" scoped>

</style>

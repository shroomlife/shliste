<script lang="ts" setup>
const googleStore = useGoogleStore()
</script>

<template>
  <div>
    <UIcon
      v-if="googleStore.getIsSyncing"
      name="svg-spinners:3-dots-fade"
      class="text-green-500"
    />
    <CloudSync />
  </div>
</template>

<style lang="scss" scoped>

</style>

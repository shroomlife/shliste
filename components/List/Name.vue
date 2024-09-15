<script lang="ts" setup>
const props = defineProps<{
  list: List
  h1?: boolean
}>()

const { list } = toRefs(props)
</script>

<template>
  <div

    class="flex items-center justify-between"
  >
    <component
      :is="props.h1 ? 'h1' : 'div'"
      class="text-3xl md:text-4xl font-bold"
    >
      {{ list.name }}
    </component>
  </div>
</template>

<style lang="scss" scoped>

</style>

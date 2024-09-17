<script lang="ts" setup>
const props = defineProps<{
  list?: List
  name?: string
  h1?: boolean
}>()
const { list } = toRefs(props)
const computedName = computed(() => props.name || list.value?.name || '')
</script>

<template>
  <div

    class="flex items-center justify-between"
  >
    <component
      :is="props.h1 ? 'h1' : 'div'"
      class="text-3xl md:text-4xl font-bold"
    >
      {{ computedName }}
    </component>
  </div>
</template>

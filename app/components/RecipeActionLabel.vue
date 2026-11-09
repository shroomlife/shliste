<script setup lang="ts">
defineProps<{ icon: string, trailing?: boolean }>()
</script>

<template>
  <span
    class="recipe-action-label"
    :class="{ trailing }"
  >
    <UIcon
      :name="icon"
      mode="svg"
      class="action-icon"
      aria-hidden="true"
    />
    <span class="action-text"><slot /></span>
  </span>
</template>

<style scoped>
.recipe-action-label { display: inline-flex; align-items: center; justify-content: center; gap: .48em; max-width: 100%; line-height: 1.2; vertical-align: middle; }
.action-icon { display: block; flex: none; width: 1.1em; height: 1.1em; }
.action-text { min-width: 0; transform: translateY(.10em); }
.trailing > .action-icon { order: 1; }
</style>

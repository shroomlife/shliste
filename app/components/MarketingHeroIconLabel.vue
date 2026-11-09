<script setup lang="ts">
defineProps<{ icon: string }>()
</script>

<template>
  <span class="hero-icon-label"><UIcon
    :name="icon"
    class="hero-icon-label__icon"
  /><span class="hero-icon-label__text"><slot /></span></span>
</template>

<style scoped>
.hero-icon-label{display:inline-grid;grid-template-columns:20px minmax(0,1fr);align-items:center;gap:8px;line-height:20px;text-align:left}
.hero-icon-label>.hero-icon-label__icon{display:block;width:20px;height:20px;align-self:center;translate:0 -.06em}
.hero-icon-label>.hero-icon-label__text{display:block;min-width:0;font:inherit;line-height:20px;color:inherit}
</style>

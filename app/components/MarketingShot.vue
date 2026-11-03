<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  alt: string
  caption?: string
  maxHeight?: string
}>(), {
  maxHeight: '420px',
})
</script>

<template>
  <figure class="mkt-shot-wrap">
    <div
      class="mkt-phone"
      :style="{ maxHeight }"
    >
      <img
        :src="src"
        :alt="alt"
        width="1080"
        height="2220"
        loading="lazy"
        class="block h-auto w-full object-cover object-top"
        :style="{ maxHeight }"
      >
    </div>
    <figcaption
      v-if="caption"
      class="mkt-muted mt-3 text-center text-xs leading-relaxed"
    >
      {{ caption }}
    </figcaption>
  </figure>
</template>

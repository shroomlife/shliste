<script setup lang="ts">
import type { MarketingStory } from '~/data/marketingStories'

const props = defineProps<{
  story: MarketingStory
  eager?: boolean
  article?: boolean
}>()
const imageBase = computed(() => `/images/alltag/${props.story.path.split('/').pop()}-v2`)
</script>

<template>
  <figure class="story-cover">
    <img
      :src="`${imageBase}.webp`"
      :srcset="`${imageBase}-small.webp 600w, ${imageBase}.webp 1200w`"
      :sizes="article ? '(max-width: 580px) calc(100vw - 58px), (max-width: 900px) 400px, 300px' : '(max-width: 560px) calc(100vw - 40px), (max-width: 1099px) 50vw, 390px'"
      :alt="story.coverAlt"
      width="1200"
      height="800"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
    >
    <figcaption><UIcon name="i-lucide-sparkles" /> KI-generiert</figcaption>
  </figure>
</template>

<style scoped>
.story-cover{position:relative;margin:0;overflow:hidden;border-radius:20px;background:#efe7df;aspect-ratio:3/2}.story-cover img{display:block;width:100%;height:100%;object-fit:cover}.story-cover figcaption{position:absolute;right:12px;bottom:12px;display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:20px;background:#fffaf2ed;color:#493c43;font-size:12px;line-height:1.25;font-weight:600}.story-cover .iconify{width:13px;height:13px;flex-shrink:0}
</style>

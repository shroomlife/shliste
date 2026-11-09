<script setup lang="ts">
import type { MarketingStory } from '~/data/marketingStories'

const props = defineProps<{ story: MarketingStory, eager?: boolean, article?: boolean }>()
const image = computed(() => {
  const base = `/images/illustrations/${props.story.path.split('/').pop()}`
  return props.story.cover ?? { src: `${base}.webp`, srcset: `${base}-small.webp 600w, ${base}-medium.webp 960w, ${base}.webp 1536w`, width: 1536, height: 1024 }
})
</script>

<template>
  <figure class="story-cover">
    <img
      :src="image.src"
      :srcset="image.srcset"
      :sizes="article ? '(max-width: 580px) calc(100vw - 58px), (max-width: 900px) 400px, 300px' : '(max-width: 560px) calc(100vw - 40px), (max-width: 1099px) 50vw, 390px'"
      :alt="story.coverAlt"
      :width="image.width"
      :height="image.height"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
    >
    <figcaption><MarketingAiLabel /></figcaption>
  </figure>
</template>

<style scoped>
.story-cover{container:ai-image / inline-size;position:relative;margin:0;overflow:hidden;border-radius:20px;background:#efe7df;aspect-ratio:3/2}.story-cover img{display:block;width:100%;height:100%;object-fit:cover}.story-cover figcaption{position:absolute;right:12px;bottom:12px;display:flex;align-items:center;gap:5px;padding:0;font-size:11px;line-height:1.25;font-weight:600}.story-cover .iconify{width:13px;height:13px;flex-shrink:0}
</style>

<script setup lang="ts">
/**
 * Stimmungsbild für Marketing-Sektionen: eine Illustration aus
 * `public/images/illustrations` mit KI-Kennzeichnung und optionaler Bildzeile.
 * `wide` beschneidet auf ein flacheres Band für Bilder über die volle Breite.
 */
const props = withDefaults(defineProps<{ name: string, alt: string, caption?: string, icon?: string, wide?: boolean }>(), { wide: false })
const base = computed(() => `/images/illustrations/${props.name}`)
</script>

<template>
  <figure
    class="mood-image"
    :class="{ 'mood-image--wide': wide }"
  >
    <div class="mood-image-art">
      <img
        :src="`${base}.webp`"
        :srcset="`${base}-small.webp 600w, ${base}-medium.webp 960w, ${base}.webp 1536w`"
        :sizes="wide ? '(min-width: 1280px) 1216px, 100vw' : '(min-width: 1024px) 560px, 100vw'"
        :alt="alt"
        width="1536"
        height="1024"
        loading="lazy"
        decoding="async"
      >
      <MarketingAiLabel />
    </div>
    <figcaption v-if="caption">
      <UIcon
        v-if="icon"
        :name="icon"
      /><span>{{ caption }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.mood-image{min-width:0;margin:0}
.mood-image-art{position:relative;overflow:hidden;border-radius:28px;box-shadow:0 22px 44px -30px color-mix(in srgb,var(--demo-accent) 70%,transparent);container:ai-image / inline-size}
.mood-image img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
.mood-image--wide img{aspect-ratio:2/1;object-position:center}
.mood-image-art :deep(.ai-label){position:absolute;right:14px;bottom:14px;font-size:.75rem}
.mood-image figcaption{display:flex;align-items:center;gap:10px;margin:14px 6px 0;font-size:.95rem;font-weight:650;line-height:1.35;color:var(--md-on-surface)}
.mood-image figcaption .iconify{flex:0 0 22px;width:22px;height:22px;color:var(--demo-accent)}
@media(max-width:700px){.mood-image-art{border-radius:22px}.mood-image--wide img{aspect-ratio:3/2;object-position:center}}
</style>

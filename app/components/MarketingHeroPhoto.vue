<script setup lang="ts">
const props = defineProps<{ scene: { asset: string, alt: string }, progress?: number }>()
// Every world uses the same illustrated visual language as the live recipe images.
const illustration = (name: string, alt: string) => ({ src: `/images/illustrations/${name}-small.webp`, srcset: `/images/illustrations/${name}-small.webp 600w, /images/illustrations/${name}-medium.webp 960w`, width: 1536, height: 1024, alt })
const plantBasedAssets = {
  friends: { src: '/images/recipes/lasagne.webp', srcset: undefined, width: 1200, height: 600, alt: 'KI-Rezeptillustration einer veganen Lasagne mit Gemüsefüllung und pflanzlicher Béchamel auf einem blauen Teller.' },
  holiday: illustration('holiday-breakfast', 'Illustration: Brötchen, Hummus und Kaffee am Fenster einer Ferienwohnung.'),
  wg: illustration('shared-coffee', 'Illustration: eine Tasse Kaffee mit Haferdrink auf hellem Leinen.'),
  moving: illustration('moving-first-evening', 'Illustration: zwei Frauen essen Brot und Hummus in ihrer neuen Wohnung.'),
  surprise: illustration('birthday-surprise', 'Illustration: ein eingepacktes Geschenk mit heller Schleife und Flieder.'),
  baking: { src: '/images/recipes/marmorkuchen.webp', srcset: undefined, width: 1200, height: 600, alt: 'KI-Rezeptillustration eines veganen Marmorkuchens mit Beeren und pflanzlicher Creme.' },
} as const
const image = computed(() => plantBasedAssets[props.scene.asset as keyof typeof plantBasedAssets] ?? plantBasedAssets.friends)
</script>

<template>
  <span class="hero-context-asset"><img
    class="hero-context-photo"
    :src="image.src"
    :srcset="image.srcset"
    sizes="(min-width: 2200px) 320px, (min-width: 1101px) 240px, 96px"
    :alt="image.alt"
    :width="image.width"
    :height="image.height"
    decoding="async"
    :style="{ transform: `scale(${1.015 + Math.min(1, Math.max(0, progress ?? 0)) * .025})` }"
  ><small class="hero-image-origin"><MarketingAiLabel compact /></small></span>
</template>

<style scoped>
.hero-context-photo{display:block;width:100%;height:100%;object-fit:cover;transform-origin:center;backface-visibility:hidden}
.hero-context-asset{position:relative;display:block;width:100%;height:100%;overflow:hidden}
.hero-image-origin{position:absolute;right:6px;bottom:6px;font-size:9px;line-height:13px;white-space:nowrap}
@media(max-width:1100px){.hero-image-origin{right:3px;bottom:3px;font-size:8px;line-height:11px}}
@media(prefers-reduced-motion:reduce){.hero-context-photo{transform:none!important}}
</style>

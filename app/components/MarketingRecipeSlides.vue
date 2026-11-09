<script setup lang="ts">
import { useDocumentVisibility, useElementVisibility, useMediaQuery } from '@vueuse/core'

const { slides } = defineProps<{ slides: { src: string, title: string, alt: string, to?: string }[] }>()
const frame = useTemplateRef<HTMLElement>('frame')
const visible = useElementVisibility(frame)
const tab = useDocumentVisibility()
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
const current = ref(0)
const paused = ref(false)
const hovering = ref(false)
const focused = ref(false)
const slide = computed(() => slides[current.value] ?? slides[0])
const ready = ref(false)

onMounted(() => {
  let previousStart = '', previousSlide = ''
  try {
    previousStart = sessionStorage.getItem('recipe-gallery-start') ?? ''
    previousSlide = sessionStorage.getItem('recipe-gallery-current') ?? ''
  }
  catch { /* Storage is optional. */ }
  const choices = slides.filter(item => item.src !== previousStart && item.src !== previousSlide)
  const start = choices[Math.floor(Math.random() * choices.length)] ?? slides.find(item => item.src !== previousStart) ?? slides[0]
  if (start) {
    current.value = slides.indexOf(start)
    try {
      sessionStorage.setItem('recipe-gallery-start', start.src)
    }
    catch { /* Private browsing. */ }
  }
  ready.value = true
})

function advance(offset: number) {
  current.value = (current.value + offset + slides.length) % slides.length
}

watchEffect(() => {
  if (ready.value && slide.value) {
    try {
      sessionStorage.setItem('recipe-gallery-current', slide.value.src)
    }
    catch { /* Private browsing. */ }
  }
})

watchEffect((cleanup) => {
  if (!ready.value || slides.length < 2 || reduced.value || paused.value || hovering.value || focused.value || !visible.value || tab.value !== 'visible') return
  const next = (current.value + 1) % slides.length
  const image = new Image()
  image.src = slides[next]!.src
  const timer = setTimeout(() => {
    current.value = next
  }, 5500)
  cleanup(() => clearTimeout(timer))
})
</script>

<template>
  <figure
    v-if="slide"
    ref="frame"
    class="recipe-slides mkt-hero-figure"
    aria-label="Rezeptillustrationen"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focused = true"
    @focusout="focused = frame?.contains($event.relatedTarget as Node) ?? false"
  >
    <div class="slide-art">
      <Transition name="recipe-fade">
        <img
          :key="slide.src"
          :src="slide.src"
          :alt="slide.alt"
          width="1200"
          height="600"
        >
      </Transition>
      <MarketingAiLabel />
    </div>
    <figcaption>
      <div class="slide-caption">
        <strong>{{ slide.title }}</strong>
        <NuxtLink
          v-if="slide.to"
          :to="slide.to"
        >Zum Rezept <UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
      </div>
      <div
        v-if="slides.length > 1"
        class="slide-controls"
      >
        <button
          type="button"
          aria-label="Vorheriges Rezeptbild"
          @click="advance(-1)"
        >
          <UIcon name="i-lucide-chevron-left" />
        </button>
        <button
          v-if="!reduced"
          type="button"
          :aria-label="paused ? 'Bildwechsel fortsetzen' : 'Bildwechsel pausieren'"
          @click="paused = !paused"
        >
          <UIcon :name="paused ? 'i-lucide-play' : 'i-lucide-pause'" />
        </button>
        <button
          type="button"
          aria-label="Nächstes Rezeptbild"
          @click="advance(1)"
        >
          <UIcon name="i-lucide-chevron-right" />
        </button>
      </div>
    </figcaption>
  </figure>
</template>

<style scoped>
.recipe-slides { min-width: 0; margin: 0; border-radius: 1.6rem; overflow: hidden; background: var(--md-surface-container); }
.slide-art { position: relative; isolation: isolate; aspect-ratio: 2; container: ai-image / inline-size; }
.slide-art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.recipe-fade-enter-active, .recipe-fade-leave-active { transition: opacity .55s ease; }
.recipe-fade-enter-from, .recipe-fade-leave-to { opacity: 0; }
.slide-art > .ai-label { position: absolute; left: 12px; bottom: 12px; }
figcaption { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem 1rem; padding: .85rem 1.15rem; }
.slide-caption { display: grid; align-content: center; min-height: 3.3rem; }
.slide-caption strong { font-size: 1.35rem; line-height: 1.15; }
.slide-caption a { display: inline-flex; align-items: center; gap: .3rem; width: fit-content; font-weight: 700; color: var(--demo-accent); }
.slide-controls { display: flex; align-items: center; }
.slide-controls button { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; }
.slide-controls button:hover { background: var(--demo-soft); }
.slide-controls button:focus-visible, .slide-caption a:focus-visible { outline: 2px solid var(--demo-accent); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .recipe-fade-enter-active, .recipe-fade-leave-active { transition: none; } }
</style>

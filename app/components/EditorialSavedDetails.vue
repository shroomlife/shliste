<script setup lang="ts">
import { parseEditorialMetadata, parseIllustration } from '~~/lib/editorial'
import type { RecipeStep } from '#shared/types/domain'
import { cacheEditorialImages } from '~/utils/editorial-cache'

const props = defineProps<{ metadata?: string | null, steps: readonly RecipeStep[] }>()
const meta = computed(() => parseEditorialMetadata(props.metadata))
const { isSignedIn } = useAuth()
const artwork = computed(() => meta.value
  ? [meta.value.hero, ...props.steps.map(s => parseIllustration(s.illustration)).filter(s => s !== null)]
  : [])
watch(() => artwork.value.map(image => image.src).join('|'), () => {
  if (import.meta.client && artwork.value.length) void cacheEditorialImages(artwork.value)
}, { immediate: true })
</script>

<template>
  <section
    v-if="meta"
    class="saved-editorial"
  >
    <details>
      <summary>Tipps & Aufbewahrung</summary>
      <div
        v-for="tip in meta.tips"
        :key="tip.title"
      >
        <h3>{{ tip.title }}</h3>
        <p>{{ tip.text }}</p>
      </div>
      <h3>Aufbewahrung</h3>
      <p>{{ meta.storage }}</p>
    </details>
    <p
      v-if="!isSignedIn"
      class="saved-editorial-note"
    >
      Ohne Anmeldung bleibt deine Rezeptsammlung in diesem Browser. Bilder werden hier für die Offline-Nutzung zwischengespeichert.
    </p>
  </section>
</template>

<style scoped>
.saved-editorial { margin-block: 8px; border-top: 1px solid var(--md-outline-variant); padding: 16px 4px 0; }
.saved-editorial summary { cursor: pointer; font-size: 1.15rem; font-weight: 700; }
.saved-editorial h3 { font-weight: 700; margin-top: .8rem; }
.saved-editorial p { line-height: 1.45; }
.saved-editorial-note { margin-top: .65rem; font-size: 1rem; color: var(--md-on-surface-variant); }
</style>

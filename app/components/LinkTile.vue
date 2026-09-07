<script setup lang="ts">
import type { LinkImageKind } from '#shared/types/domain'

/**
 * Die 48-Pixel-Kachel eines Link-Eintrags — Gegenstück zu
 * `LinkPreviewTile.kt` der Android-App.
 *
 * DREI DARSTELLUNGEN, EINE GRÖSSE:
 * - `preview`: das Bild der Seite, formatfüllend beschnitten (`object-cover`).
 * - `icon`: das Favicon, klein und mittig auf getöntem Grund. Ein Favicon ist
 *   oft 32 Pixel groß und würde formatfüllend zu Matsch.
 * - sonst: ein Kettensymbol. Das ist der Normalfall in den ersten Sekunden
 *   nach dem Teilen, denn der Server reichert erst nach dem Push an.
 *
 * Der ↗-Badge unten rechts sagt, was ein Tipp auslöst: Diese Kachel führt aus
 * der App heraus. Er sitzt in einem Kreis in Flächenfarbe und steht 4 Pixel
 * über, damit er sich auch von einem dunklen Vorschaubild abhebt.
 *
 * DIESE KOMPONENTE IST KEIN BEDIENELEMENT. Sie rendert nur; das `<a>` liegt
 * beim Aufrufer. Ein Link IN einem Knopf (oder umgekehrt) wäre verschachteltes
 * Bedienelement und für Tastatur wie Screenreader kaputt. Deshalb sind alle
 * Bilder hier `alt=""` und `aria-hidden`: Der Aufrufer beschriftet.
 */
const { url, linkImagePath = null, linkImageKind = null } = defineProps<{
  /** Die Adresse hinter der Kachel. Nur zum Zurücksetzen bei einem Wechsel. */
  url: string
  linkImagePath?: string | null
  linkImageKind?: LinkImageKind | null
}>()

/**
 * Ist das Laden des Bildes gescheitert?
 *
 * Passiert im Alltag: Der Server hat das Bild noch nicht, die Datei ist beim
 * Aufräumen verschwunden, oder man ist offline und der Cache ist leer. Dann
 * bleibt das Kettensymbol — eine kaputte Bildruine wäre die schlechtere Antwort.
 */
const failed = ref(false)

// Zurücksetzen, sobald sich das Ziel ändert: Sonst bliebe die Kachel für
// immer beim Ersatzsymbol, obwohl längst ein anderes Bild dranhinge.
watch(() => [url, linkImagePath], () => {
  failed.value = false
})

const previewUrl = computed(() => (failed.value ? null : resolveLinkPreviewUrl(linkImagePath)))

/** Was tatsächlich gezeigt wird — nach Bildpfad UND Ladeerfolg entschieden. */
const shown = computed<LinkImageKind | 'fallback'>(() => {
  if (previewUrl.value === null) return 'fallback'
  return linkImageKind === 'preview' || linkImageKind === 'icon' ? linkImageKind : 'fallback'
})
</script>

<template>
  <span class="relative block size-12 shrink-0">
    <span
      class="flex size-12 items-center justify-center overflow-hidden rounded-lg"
      :style="shown === 'preview' ? undefined : 'background: var(--md-secondary)'"
    >
      <img
        v-if="shown === 'preview' && previewUrl"
        :src="previewUrl"
        class="size-full object-cover"
        loading="lazy"
        decoding="async"
        alt=""
        aria-hidden="true"
        @error="failed = true"
      >
      <img
        v-else-if="shown === 'icon' && previewUrl"
        :src="previewUrl"
        class="size-6.5 object-contain"
        loading="lazy"
        decoding="async"
        alt=""
        aria-hidden="true"
        @error="failed = true"
      >
      <UIcon
        v-else
        name="i-lucide-link"
        class="size-6.5"
        style="color: var(--md-on-secondary)"
      />
    </span>

    <!-- Der ↗-Badge in Flächenfarbe: In hellem Erscheinungsbild ist das
         Weiß, in dunklem der dunkle Grund — wie `surface` in der
         Android-App. Eine feste Farbe würde in einem der beiden Modi
         verschwinden. -->
    <span
      class="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full"
      style="background: var(--md-surface)"
      aria-hidden="true"
    >
      <UIcon
        name="i-lucide-arrow-up-right"
        class="size-2.5"
        style="color: var(--md-primary)"
      />
    </span>
  </span>
</template>

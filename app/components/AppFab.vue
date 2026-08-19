<script setup lang="ts">
/**
 * Schwebender Aktionsknopf, wie ihn die Android-App kennt — aber nur auf
 * kleinen Schirmen. Auf dem Desktop uebernimmt der Knopf im Seitenkopf
 * (AppPageHeader), weil ein schwebender Kreis in der Ecke eines 1600 Pixel
 * breiten Fensters das klassische Handy-Klon-Signal ist.
 *
 * Radius und weiche Schattenstufe entsprechen dem Android-Vorbild, das
 * durchgehend flach gestaltet ist (shadowElevation 1dp).
 */
const { label, icon = 'i-lucide-plus' } = defineProps<{
  /** Wird als aria-label gesetzt, weil der Knopf nur ein Symbol zeigt */
  label: string
  icon?: string
}>()

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <UButton
    :icon="icon"
    :aria-label="label"
    size="xl"
    class="fixed right-5 bottom-24 z-10 size-14 justify-center rounded-2xl shadow-md lg:hidden"
    @click="emit('click')"
  />
</template>

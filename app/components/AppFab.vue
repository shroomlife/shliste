<script setup lang="ts">
/**
 * Schwebender Aktionsknopf, wie ihn die Android-App kennt — als Extended-FAB
 * mit Beschriftung (PrimaryFloatingButton.kt), aber nur auf kleinen Schirmen.
 * Auf dem Desktop übernimmt der Knopf im Seitenkopf (AppPageHeader), weil ein
 * schwebender Knopf in der Ecke eines 1600 Pixel breiten Fensters das
 * klassische Handy-Klon-Signal ist.
 *
 * Fläche und Schrift folgen dem Android-Vorbild: Markenfarbe, Radius 16px,
 * Text in 20px fett. Die weiße Schrift auf #E064B2 misst 3,16:1 — das
 * genügt WCAG AA, weil 20px fett als große Schrift gilt (dort 3:1).
 *
 * Der Abstand nach unten: 6rem = 72px fixe Bottom-Nav (h-18) plus 24px Luft,
 * dazu die Safe-Area (iOS-Homebar) — die Bar wächst um denselben Betrag,
 * der Knopf schwebt also immer knapp über ihr.
 */
const { label, icon = 'i-lucide-plus' } = defineProps<{
  /** Sichtbare Beschriftung, z. B. "Liste" — wie Androids caption. */
  label: string
  icon?: string
}>()

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <!-- state-layer statt der Hover-Töne von Nuxt UI: Die Markenfläche ist hier
       fest gesetzt und würde jede hover:bg-Klasse überdecken. -->
  <UButton
    :icon="icon"
    size="xl"
    class="state-layer fixed right-5 bottom-[calc(6rem_+_env(safe-area-inset-bottom,0px))] z-10 h-14 gap-2 rounded-lg px-5 text-[1.25rem] font-bold shadow-md lg:hidden"
    style="background-color: var(--md-primary); color: var(--md-on-primary)"
    @click="emit('click')"
  >
    {{ label }}
  </UButton>
</template>

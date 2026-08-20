<script setup lang="ts">
/**
 * Hell, dunkel oder wie das Gerät es sagt.
 *
 * WARUM DREI ZUSTÄNDE UND NICHT ZWEI: Ein reiner Umschalter kennt kein
 * "richte dich nach dem System" — wer sein Gerät abends automatisch dunkel
 * stellt, müsste die App jedes Mal von Hand nachziehen. Der dritte Zustand
 * kostet ein Symbol und nimmt genau diese Arbeit ab.
 *
 * DER STARTZUSTAND IST HELL, nicht "System": So steht es in der
 * Konfiguration (`colorMode.preference`). Wer es anders will, sagt es einmal
 * — die Wahl überlebt den Neustart, `@nuxtjs/color-mode` legt sie ab.
 *
 * Die Farben selbst stehen in `assets/css/main.css` als Material-3-Rollen und
 * stammen aus der Android-App. Bis hierher waren sie nur da: Die dunkle
 * Palette existierte, aber nichts hat sie je eingeschaltet.
 */
const colorMode = useColorMode()

/** Die Reihenfolge beim Weiterschalten. */
const ORDER = ['light', 'dark', 'system'] as const
type Mode = typeof ORDER[number]

const current = computed<Mode>(() => {
  const value = colorMode.preference
  return ORDER.includes(value as Mode) ? value as Mode : 'light'
})

const display = computed(() => {
  switch (current.value) {
    case 'dark':
      return { icon: 'i-lucide-moon', label: 'Dunkel' }
    case 'system':
      return { icon: 'i-lucide-monitor', label: 'Wie das System' }
    default:
      return { icon: 'i-lucide-sun', label: 'Hell' }
  }
})

function next(): void {
  const index = ORDER.indexOf(current.value)
  colorMode.preference = ORDER[(index + 1) % ORDER.length] as Mode
}
</script>

<template>
  <!-- ClientOnly, weil die Wahl im Speicher des Browsers liegt: Der Server
       kennt sie nicht und würde beim Rendern zwangsläufig das falsche Symbol
       zeigen, das die Hydration dann austauscht. -->
  <ClientOnly>
    <button
      type="button"
      class="flex size-9 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
      style="color: var(--md-on-surface-variant)"
      :title="`Darstellung: ${display.label}`"
      :aria-label="`Darstellung: ${display.label}. Weiterschalten.`"
      @click="next"
    >
      <UIcon
        :name="display.icon"
        class="size-5"
      />
    </button>

    <template #fallback>
      <span class="size-9" />
    </template>
  </ClientOnly>
</template>

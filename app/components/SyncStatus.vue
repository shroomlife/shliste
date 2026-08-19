<script setup lang="ts">
/**
 * Sync-Anzeige in der Rail. Farben und Bedeutungen stammen aus
 * SemanticColors.kt der Android-App, damit beide Clients dasselbe sagen.
 *
 * Solange die Sync-Schicht noch nicht steht, meldet die Anzeige ehrlich
 * "offline" statt einen Erfolg vorzutaeuschen.
 */
type Zustand = 'synchron' | 'laeuft' | 'wartet' | 'fehler' | 'offline'

const { zustand = 'offline' } = defineProps<{ zustand?: Zustand }>()

const darstellung = computed(() => {
  switch (zustand) {
    case 'synchron':
      return { icon: 'i-lucide-refresh-cw', farbe: 'var(--md-sync-success)', text: 'Synchron' }
    case 'laeuft':
      return { icon: 'i-lucide-loader-circle', farbe: 'var(--md-on-surface-variant)', text: 'Sync laeuft' }
    case 'wartet':
      return { icon: 'i-lucide-cloud-upload', farbe: 'var(--md-sync-warning)', text: 'Aenderungen warten' }
    case 'fehler':
      return { icon: 'i-lucide-triangle-alert', farbe: 'var(--md-delete-content)', text: 'Sync-Fehler' }
    default:
      return { icon: 'i-lucide-cloud-off', farbe: 'var(--md-on-surface-variant)', text: 'Offline' }
  }
})
</script>

<template>
  <div
    class="flex flex-col items-center gap-1"
    :title="darstellung.text"
  >
    <UIcon
      :name="darstellung.icon"
      class="size-4"
      :class="zustand === 'laeuft' && 'animate-spin motion-reduce:animate-none'"
      :style="{ color: darstellung.farbe }"
    />
    <span class="sr-only">{{ darstellung.text }}</span>
  </div>
</template>

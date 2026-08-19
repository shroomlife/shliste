<script setup lang="ts">
/**
 * Sync-Anzeige in der Rail. Farben und Bedeutungen stammen aus
 * SemanticColors.kt der Android-App, damit beide Clients dasselbe aussagen.
 *
 * Solange die Sync-Schicht noch nicht steht, meldet die Anzeige ehrlich
 * "offline" statt einen Erfolg vorzutaeuschen.
 */
export type SyncState = 'synced' | 'syncing' | 'pending' | 'error' | 'offline'

const { state = 'offline' } = defineProps<{ state?: SyncState }>()

const display = computed(() => {
  switch (state) {
    case 'synced':
      return { icon: 'i-lucide-refresh-cw', color: 'var(--md-sync-success)', label: 'Synchron' }
    case 'syncing':
      return { icon: 'i-lucide-loader-circle', color: 'var(--md-on-surface-variant)', label: 'Abgleich laeuft' }
    case 'pending':
      return { icon: 'i-lucide-cloud-upload', color: 'var(--md-sync-warning)', label: 'Aenderungen warten' }
    case 'error':
      return { icon: 'i-lucide-triangle-alert', color: 'var(--md-delete-content)', label: 'Abgleich fehlgeschlagen' }
    default:
      return { icon: 'i-lucide-cloud-off', color: 'var(--md-on-surface-variant)', label: 'Offline' }
  }
})
</script>

<template>
  <div
    class="flex flex-col items-center gap-1"
    :title="display.label"
  >
    <UIcon
      :name="display.icon"
      class="size-4"
      :class="state === 'syncing' && 'animate-spin motion-reduce:animate-none'"
      :style="{ color: display.color }"
    />
    <span class="sr-only">{{ display.label }}</span>
  </div>
</template>

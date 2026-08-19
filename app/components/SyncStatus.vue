<script setup lang="ts">
/**
 * Sync-Anzeige in der Rail. Farben und Bedeutungen stammen aus
 * SemanticColors.kt der Android-App, damit beide Clients dasselbe aussagen.
 *
 * Solange die Sync-Schicht noch nicht steht, meldet die Anzeige ehrlich
 * "offline" statt einen Erfolg vorzutäuschen.
 */
export type SyncState = 'synced' | 'syncing' | 'pending' | 'error' | 'offline'

const { state = 'offline', actionable = false } = defineProps<{
  state?: SyncState
  /**
   * Gibt es etwas zu tun? Dann wird aus der Anzeige ein Knopf.
   *
   * Heute ist das genau der Fall "welcher Stand gilt?" — eine Frage, die
   * gestellt wurde und noch offen ist. Ohne diesen Weg zurück wäre sie nach
   * dem ersten Schliessen unerreichbar.
   */
  actionable?: boolean
}>()

const emit = defineEmits<{ activate: [] }>()

const display = computed(() => {
  switch (state) {
    case 'synced':
      return { icon: 'i-lucide-refresh-cw', color: 'var(--md-sync-success)', label: 'Synchron' }
    case 'syncing':
      return { icon: 'i-lucide-loader-circle', color: 'var(--md-on-surface-variant)', label: 'Abgleich läuft' }
    case 'pending':
      return { icon: 'i-lucide-cloud-upload', color: 'var(--md-sync-warning)', label: 'Änderungen warten' }
    case 'error':
      return { icon: 'i-lucide-triangle-alert', color: 'var(--md-delete-content)', label: 'Abgleich fehlgeschlagen' }
    default:
      return { icon: 'i-lucide-cloud-off', color: 'var(--md-on-surface-variant)', label: 'Offline' }
  }
})
</script>

<template>
  <component
    :is="actionable ? 'button' : 'div'"
    class="flex flex-col items-center gap-1"
    :class="actionable && 'rounded-lg transition-opacity hover:opacity-70'"
    :type="actionable ? 'button' : undefined"
    :title="display.label"
    @click="actionable && emit('activate')"
  >
    <UIcon
      :name="display.icon"
      class="size-4"
      :class="state === 'syncing' && 'animate-spin motion-reduce:animate-none'"
      :style="{ color: display.color }"
    />
    <span class="sr-only">{{ display.label }}</span>
  </component>
</template>

<script setup lang="ts">
/**
 * Einheitlicher Seitenkopf für die Uebersichten (Listen, Rezepte).
 *
 * Die Aktion erscheint auf dem Desktop hier als beschrifteter Knopf und auf
 * Mobil stattdessen als schwebender Knopf (AppFab) — dieselbe Aktion, zwei
 * Darstellungen. Beide Uebersichten benutzen diese Komponente, damit sie
 * garantiert gleich aussehen und sich gleich verhalten.
 */
const { title, actionLabel } = defineProps<{
  title: string
  /** Beschriftung der Hauptaktion, z.B. "Neu" */
  actionLabel?: string
}>()

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
    <h1 class="text-[1.875rem] leading-8 font-extrabold">
      {{ title }}
    </h1>
    <UButton
      v-if="actionLabel"
      icon="i-lucide-plus"
      class="hidden rounded-full font-bold lg:flex"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </UButton>
  </header>
</template>

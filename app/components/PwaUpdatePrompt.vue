<script setup lang="ts">
/**
 * Bietet eine neue Fassung der App an.
 *
 * WARUM ÜBERHAUPT FRAGEN: Der Service Worker läuft mit `registerType: 'prompt'`.
 * Ein Selbstneuladen mitten im Einkauf wäre genau die Überraschung, die eine
 * App nicht liefern soll — der Eingabetext wäre weg, die Ansicht gesprungen.
 * Umgekehrt darf die neue Fassung nicht endlos warten, deshalb dieser Hinweis.
 *
 * Er steht in `app.vue` und damit auf jeder Seite: Eine Aktualisierung betrifft
 * die ganze App und nicht einen Bereich.
 *
 * Bewusst kein Toast: Ein Hinweis, der nach fünf Sekunden verschwindet, ist für
 * eine Entscheidung der falsche Ort. Diese Leiste bleibt, bis sie beantwortet
 * ist, und blockiert dabei nichts.
 */
const { $pwa } = useNuxtApp()

const isUpdating = ref(false)

async function applyUpdate(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    // `true` lädt die Seite nach dem Wechsel neu. Die Daten liegen in
    // IndexedDB und überleben das; ungesendete Änderungen bleiben schmutzig
    // und gehen beim nächsten Abgleich hinaus.
    await $pwa?.updateServiceWorker(true)
  }
  finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <!-- `$pwa` fehlt beim serverseitigen Rendern und wenn der Service Worker
       nicht registriert werden konnte. Beides ist kein Fehler, es gibt dann
       nur nichts anzubieten. -->
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-150"
    leave-to-class="opacity-0"
  >
    <div
      v-if="$pwa?.needRefresh"
      class="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-xl px-4 py-3 shadow-lg motion-reduce:transition-none"
      style="background: var(--md-surface-container-high); color: var(--md-on-surface)"
      role="status"
    >
      <UIcon
        name="i-lucide-refresh-cw"
        class="size-5 shrink-0"
        style="color: var(--md-primary)"
      />
      <span class="min-w-0 grow text-[1rem]">Eine neue Fassung steht bereit.</span>
      <UButton
        color="neutral"
        variant="ghost"
        class="shrink-0 font-bold"
        @click="$pwa?.cancelPrompt()"
      >
        Später
      </UButton>
      <UButton
        :loading="isUpdating"
        class="shrink-0 font-bold"
        @click="applyUpdate"
      >
        Neu laden
      </UButton>
    </div>
  </Transition>
</template>

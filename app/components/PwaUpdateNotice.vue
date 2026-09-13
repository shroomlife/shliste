<script setup lang="ts">
const { $pwa } = useNuxtApp()
const updating = ref(false)
const deferred = ref(false)
const error = ref<string | null>(null)

watch(() => $pwa?.needRefresh, () => {
  deferred.value = false
  error.value = null
})

async function update(): Promise<void> {
  if (!$pwa?.needRefresh || updating.value) return
  updating.value = true
  error.value = null
  try {
    await $pwa.updateServiceWorker(true)
  }
  catch {
    error.value = 'Das Update konnte nicht gestartet werden. Bitte versuche es erneut.'
  }
  finally {
    updating.value = false
  }
}
</script>

<template>
  <section
    v-if="$pwa?.needRefresh && !deferred"
    aria-label="App-Update"
    class="fixed inset-x-3 top-3 z-40 mx-auto max-w-lg rounded-2xl border p-4 shadow-sm"
    style="background: var(--md-surface-container); border-color: var(--md-outline-variant); color: var(--md-on-surface)"
  >
    <p
      role="status"
      class="text-sm font-semibold"
    >
      Ein Update ist bereit
    </p>
    <p
      class="mt-1 text-sm"
      style="color: var(--md-on-surface-variant)"
    >
      Speichere zuerst offene Eingaben – auch in anderen Tabs. Beim Update wird die App neu geladen.
    </p>
    <p
      v-if="error"
      role="alert"
      class="mt-2 text-sm"
    >
      {{ error }}
    </p>
    <div class="mt-3 flex justify-end gap-2">
      <UButton
        color="neutral"
        variant="ghost"
        :disabled="updating"
        @click="deferred = true"
      >
        Später
      </UButton>
      <UButton
        :loading="updating"
        @click="update"
      >
        Jetzt aktualisieren
      </UButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SyncConflictReport } from '../sync/engine/state'
import type { ConflictStrategy } from '../sync/engine/sync'

/**
 * Die Frage, die niemand automatisch beantworten kann.
 *
 * DER FALL: Auf diesem Gerät liegen Daten und auf dem Server auch, und es
 * lässt sich nicht beweisen, dass es dieselben sind. Automatisch
 * zusammenzuführen hieße, fremde Daten mit eigenen zu vermischen; automatisch
 * zu überschreiben hieße, welche zu verlieren. Beides darf eine App nicht von
 * sich aus tun.
 *
 * Die drei Wege sind dieselben wie in der Android-App, damit die Entscheidung
 * dort und hier dasselbe bedeutet.
 *
 * SCHLIESSBAR, UND ZWAR MIT ABSICHT: Die App ist ohne Konto und ohne Netz
 * vollständig benutzbar, der Abgleich ist ein Zusatz. Eine Frage über den
 * Abgleich darf deshalb nicht die Einkaufsliste blockieren, vor der jemand
 * gerade im Laden steht. Wer später entscheiden will, kommt über die
 * Abgleich-Anzeige zurück; bis dahin bleibt die Frage im Zustand stehen und
 * es wird nicht abgeglichen.
 */
const { conflict } = defineProps<{
  conflict: SyncConflictReport | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ resolve: [ConflictStrategy] }>()

const chosen = ref<ConflictStrategy | null>(null)

function choose(strategy: ConflictStrategy): void {
  if (chosen.value !== null) return
  chosen.value = strategy
  emit('resolve', strategy)
}

// Nach dem Schließen wieder freigeben, damit eine spätere Frage erneut
// beantwortbar ist.
watch(isOpen, (open) => {
  if (!open) chosen.value = null
})

/**
 * Wählt der Nutzer, wird geschlossen — die Antwort ist gegeben, das Ergebnis
 * meldet die Abgleich-Anzeige. Ein Dialog, der über dem laufenden Abgleich
 * stehen bleibt, hätte nichts mehr zu sagen.
 */
watch(chosen, (value) => {
  if (value !== null) isOpen.value = false
})

function countLabel(lists: number, recipes: number): string {
  const listPart = lists === 1 ? '1 Liste' : `${lists} Listen`
  const recipePart = recipes === 1 ? '1 Rezept' : `${recipes} Rezepte`
  return `${listPart}, ${recipePart}`
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Welcher Stand gilt?"
    description="Hier und auf dem Server liegen Daten. Was damit geschehen soll, entscheidest du."
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div
          class="flex gap-3 rounded-xl p-3.5"
          style="background: var(--md-surface-container)"
        >
          <div class="min-w-0 grow">
            <p
              class="text-[0.9375rem] font-bold"
              style="color: var(--md-on-surface-variant)"
            >
              Auf diesem Gerät
            </p>
            <p class="text-[1.0625rem]">
              {{ conflict ? countLabel(conflict.local.lists, conflict.local.recipes) : '' }}
            </p>
          </div>
          <span
            class="w-px shrink-0"
            style="background: var(--md-outline-variant)"
          />
          <div class="min-w-0 grow">
            <p
              class="text-[0.9375rem] font-bold"
              style="color: var(--md-on-surface-variant)"
            >
              Auf dem Server
            </p>
            <p class="text-[1.0625rem]">
              {{ conflict ? countLabel(conflict.server.lists, conflict.server.recipes) : '' }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <UButton
            :loading="chosen === 'merge'"
            :disabled="chosen !== null && chosen !== 'merge'"
            size="xl"
            class="justify-start rounded-xl font-bold"
            icon="i-lucide-git-merge"
            @click="choose('merge')"
          >
            Beides behalten
          </UButton>
          <p
            class="px-1 text-[0.9375rem]"
            style="color: var(--md-on-surface-variant); text-wrap: pretty"
          >
            Die üblichste Wahl. Beide Bestände bleiben erhalten; bei derselben
            Zeile gewinnt die jüngere Änderung.
          </p>

          <UButton
            :loading="chosen === 'pushLocal'"
            :disabled="chosen !== null && chosen !== 'pushLocal'"
            color="neutral"
            variant="subtle"
            size="xl"
            class="mt-2 justify-start rounded-xl font-bold"
            icon="i-lucide-cloud-upload"
            @click="choose('pushLocal')"
          >
            Dieses Gerät gilt
          </UButton>
          <p
            class="px-1 text-[0.9375rem]"
            style="color: var(--md-on-surface-variant); text-wrap: pretty"
          >
            Der Bestand von hier wird hochgeladen.
          </p>

          <UButton
            :loading="chosen === 'pullServer'"
            :disabled="chosen !== null && chosen !== 'pullServer'"
            color="neutral"
            variant="subtle"
            size="xl"
            class="mt-2 justify-start rounded-xl font-bold"
            icon="i-lucide-cloud-download"
            @click="choose('pullServer')"
          >
            Der Server gilt
          </UButton>
          <p
            class="px-1 text-[0.9375rem]"
            style="color: var(--md-delete-content); text-wrap: pretty"
          >
            Achtung: Die Daten auf diesem Gerät werden dabei verworfen und
            durch den Serverstand ersetzt.
          </p>
        </div>
      </div>
    </template>
  </UModal>
</template>

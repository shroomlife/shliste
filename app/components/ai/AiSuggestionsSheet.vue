<script setup lang="ts">
/**
 * AI-Vorschläge für eine Liste — Nachbau des Android-Sheets
 * (SuggestionSheet.kt) mit derselben Cache-Semantik:
 *
 * Beim ersten Öffnen zeigt das Sheet den gesyncten Cache
 * (`lastSuggestedItems` an der Liste), falls vorhanden — erst „Neu laden"
 * holt frische Vorschläge. Jeder frische Stand und jeder Rest nach dem
 * Hinzufügen wandert zurück in den Cache, damit die Android-App dieselben
 * Vorschläge sieht.
 *
 * Geschrieben wird hier NICHTS: Hinzufügen und Cache-Update meldet die
 * Komponente der Seite (`add`, `refreshed`), die über ihre bestehenden
 * Mutations-Wege schreibt.
 */
import { getRemovedItemNamesForList } from '~/ai/history'
import { postProcessSuggestions, splitSuggestionCache } from '~/ai/suggestions'
import { requestSuggestions } from '~/ai/transport'

const { listId, listName, cachedSuggestions, activeNames } = defineProps<{
  listId: string
  listName: string
  /** Der gesyncte Cache (`lastSuggestedItems`), Semikolon-separiert. */
  cachedSuggestions: string
  /** Namen der sichtbaren Einträge — sie werden aus den Vorschlägen gefiltert. */
  activeNames: readonly string[]
}>()

const emit = defineEmits<{
  /** Angehaktes hinzufügen; `remaining` ist der neue Cache-Stand. */
  add: [names: string[], remaining: string[]]
  /** Frisch geladen — die Seite schreibt den Stand in den Cache zurück. */
  refreshed: [items: string[]]
}>()

const open = defineModel<boolean>('open', { default: false })

const suggestions = ref<string[]>([])
const selected = ref<Set<string>>(new Set())
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

let controller: AbortController | null = null

const selectedCount = computed(() => selected.value.size)

async function loadFresh(): Promise<void> {
  controller?.abort()
  const active = new AbortController()
  controller = active

  isLoading.value = true
  errorMessage.value = null
  selected.value = new Set()

  // Der Verlauf (früher entfernte Einträge) macht die Vorschläge persönlich —
  // dieselben `pastItems`, die auch die Android-App mitschickt.
  const pastItems = await getRemovedItemNamesForList(listId)

  const result = await requestSuggestions(
    { listTitle: listName, activeItems: [...activeNames], pastItems },
    active.signal,
  )

  // Zwischenzeitlich geschlossen oder erneut geladen: Ergebnis verwerfen.
  if (controller !== active) return
  controller = null
  isLoading.value = false

  if (!result.ok) {
    if (!result.aborted) errorMessage.value = result.error
    return
  }

  const processed = postProcessSuggestions(result.value, activeNames)
  suggestions.value = processed
  emit('refreshed', processed)
}

function toggle(name: string): void {
  const next = new Set(selected.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  selected.value = next
}

function addSelected(): void {
  const names = suggestions.value.filter(name => selected.value.has(name))
  if (names.length === 0) return

  const remaining = suggestions.value.filter(name => !selected.value.has(name))
  suggestions.value = remaining
  selected.value = new Set()
  emit('add', names, remaining)
}

watch(open, (isOpen) => {
  if (!isOpen) {
    controller?.abort()
    controller = null
    isLoading.value = false
    return
  }

  // Cache-Semantik wie Android: Beim Öffnen zuerst der gespeicherte Stand,
  // frisch geladen wird nur ohne Cache oder auf ausdrücklichen Wunsch.
  errorMessage.value = null
  selected.value = new Set()
  const cached = splitSuggestionCache(cachedSuggestions)

  if (cached.length > 0) {
    suggestions.value = cached
    return
  }

  suggestions.value = []
  void loadFresh()
})
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="AI-Vorschläge"
    description="Wähle aus, was auf die Liste soll"
  >
    <div class="flex flex-col gap-3">
      <p
        v-if="errorMessage !== null"
        class="rounded-xl px-4 py-3 text-[0.9375rem]"
        style="background: #FDECF5; color: #B4235F"
      >
        {{ errorMessage }}
      </p>

      <div
        v-if="isLoading"
        class="flex flex-col items-center gap-3 py-8"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-9 animate-spin"
          style="color: var(--md-primary)"
        />
        <p
          class="text-[0.9375rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Vorschläge werden geladen…
        </p>
      </div>

      <p
        v-else-if="suggestions.length === 0 && errorMessage === null"
        class="py-6 text-center text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >
        Keine Vorschläge verfügbar
      </p>

      <div
        v-else-if="suggestions.length > 0"
        class="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto"
      >
        <label
          v-for="name in suggestions"
          :key="name"
          class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3"
          style="border-color: var(--md-outline-variant); background: var(--md-surface)"
        >
          <span class="min-w-0 truncate text-[1rem]">{{ name }}</span>
          <UCheckbox
            :model-value="selected.has(name)"
            :aria-label="`${name} auswählen`"
            @update:model-value="toggle(name)"
          />
        </label>
      </div>

      <div class="flex items-center justify-between gap-2 pt-1">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          class="font-bold"
          :disabled="isLoading"
          @click="loadFresh"
        >
          Neu laden
        </UButton>
        <UButton
          icon="i-lucide-plus"
          class="font-bold"
          :disabled="selectedCount === 0"
          @click="addSelected"
        >
          Hinzufügen ({{ selectedCount }})
        </UButton>
      </div>
    </div>
  </AppSheet>
</template>

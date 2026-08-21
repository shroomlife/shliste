<script setup lang="ts">
/**
 * AI-Bearbeitung einer Liste — Prompt oder Sprachaufnahme hinein,
 * Diff-Vorschau heraus. Nachbau des Android-Sheets (AiEditListSheet.kt):
 * dieselben Phasen (Eingabe, Laden, Vorschau), dieselben Diff-Farben,
 * dasselbe Matching über den mitgeschickten `idx`.
 *
 * Die Komponente verändert selbst NICHTS an den Daten: „Übernehmen" meldet
 * der Seite nur, welche Änderungen angehakt wurden (`apply`), und die Seite
 * wendet sie über ihre bestehenden Mutations-Wege an. So bleibt die eine
 * Schreibschicht die eine Schreibschicht.
 */
import type { EditedList } from '~/ai/contract'
import type { AiEditApplyPayload, DiffSourceItem, ListDiffEntry } from '~/ai/diff'
import { buildCurrentListPayload, computeListDiff, defaultDiffSelection } from '~/ai/diff'
import { EDIT_LIST_PHRASES } from '~/ai/phrases'
import { requestEditList, requestVoiceEditList } from '~/ai/transport'
import type { AiResult } from '~/ai/transport'
import { formatRecordingDuration } from '~/composables/useAudioRecorder'

const { listId, listName, items } = defineProps<{
  listId: string
  listName: string
  /** Sichtbare Einträge in Anzeige-Reihenfolge — daraus entsteht der `idx`. */
  items: readonly DiffSourceItem[]
}>()

const emit = defineEmits<{ apply: [payload: AiEditApplyPayload] }>()

const open = defineModel<boolean>('open', { default: false })

const phase = ref<'input' | 'loading' | 'preview'>('input')
const prompt = ref('')
const errorMessage = ref<string | null>(null)
const proposal = ref<EditedList | null>(null)
const diff = ref<ListDiffEntry[]>([])
const selected = ref<Set<number>>(new Set())

const recorder = useAudioRecorder()

/** Bricht die laufende Anfrage ab; lebt ausserhalb von Vue, keine Ansicht liest ihn. */
let controller: AbortController | null = null

const sheetTitle = computed(() => (phase.value === 'preview' ? 'Vorschau' : 'AI-Bearbeitung'))
const sheetDescription = computed(() =>
  phase.value === 'preview'
    ? 'Wähle aus, was übernommen werden soll'
    : 'Beschreibe deine Änderungen',
)

/** Der Listenname ändert sich mit? Wird als Banner über dem Diff gezeigt. */
const nameChanged = computed(() => {
  const target = proposal.value
  return target !== null && target.name.trim() !== listName
})

/** Nur echte Änderungen zählen für „Übernehmen (N)" — Unverändertes nicht. */
const selectedChangeCount = computed(() =>
  diff.value.filter((entry, index) => selected.value.has(index) && entry.kind !== 'unchanged').length,
)

const totalChangeCount = computed(() =>
  diff.value.filter(entry => entry.kind !== 'unchanged').length,
)

const hasAnyChange = computed(() =>
  nameChanged.value || diff.value.some(entry => entry.kind !== 'unchanged'),
)

interface DiffChip {
  label: string
  color: string
  background: string
}

const chips = computed<DiffChip[]>(() => {
  const count = (kind: ListDiffEntry['kind']): number =>
    diff.value.filter((entry, index) => entry.kind === kind && selected.value.has(index)).length

  const added = count('added')
  const removed = count('removed')
  const modified = count('modified')
  const renamed = count('renamed')

  const result: DiffChip[] = []
  if (added > 0) result.push({ label: `+${added}`, color: '#2D9C74', background: '#EFFAF5' })
  if (removed > 0) result.push({ label: `−${removed}`, color: '#F53F96', background: '#FDECF5' })
  if (modified > 0) result.push({ label: `~${modified}`, color: '#F97316', background: '#FFF7ED' })
  if (renamed > 0) result.push({ label: `→${renamed}`, color: '#F97316', background: '#FFF7ED' })
  return result
})

/**
 * Momentaufnahme der Einträge zum Zeitpunkt des Absendens. Der Server
 * rechnet bis zu fünf Minuten; währenddessen kann der Sync die Liste
 * verändern — der `idx` der Antwort zählt aber in GENAU dieses Array.
 */
function snapshotItems(): DiffSourceItem[] {
  return items.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, checked: item.checked }))
}

function begin(): AbortController {
  errorMessage.value = null
  phase.value = 'loading'
  controller = new AbortController()
  return controller
}

function finish(result: AiResult<EditedList>, snapshot: readonly DiffSourceItem[]): void {
  controller = null

  if (!result.ok) {
    // Nach einem Abbruch braucht es keine Fehlermeldung: Der Abbruch war gewollt.
    if (!result.aborted) errorMessage.value = result.error
    phase.value = 'input'
    return
  }

  proposal.value = result.value
  diff.value = computeListDiff(snapshot, result.value.items)
  selected.value = defaultDiffSelection(diff.value)
  phase.value = 'preview'
}

async function sendPrompt(): Promise<void> {
  const text = prompt.value.trim()
  if (text.length === 0 || phase.value === 'loading') return

  const snapshot = snapshotItems()
  const active = begin()
  const result = await requestEditList(
    { targetId: listId, prompt: text, currentList: buildCurrentListPayload(listName, snapshot) },
    active.signal,
  )
  finish(result, snapshot)
}

/** Mikrofon-Knopf: erster Druck startet, zweiter beendet und sendet. */
async function toggleRecording(): Promise<void> {
  if (phase.value === 'loading') return

  if (!recorder.isRecording.value) {
    await recorder.start()
    return
  }

  const recording = await recorder.stop()
  if (recording === null) return

  const snapshot = snapshotItems()
  const active = begin()
  const result = await requestVoiceEditList(
    recording,
    { targetId: listId, currentList: buildCurrentListPayload(listName, snapshot) },
    active.signal,
  )
  finish(result, snapshot)
}

function cancelRequest(): void {
  controller?.abort()
}

function toggleSelection(index: number): void {
  // Neue Set-Instanz statt Mutation: Vue verfolgt den Ref-Tausch zuverlässig.
  const next = new Set(selected.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  selected.value = next
}

function discardPreview(): void {
  proposal.value = null
  diff.value = []
  selected.value = new Set()
  phase.value = 'input'
}

function applySelection(): void {
  const target = proposal.value
  if (target === null) return

  const entries = diff.value.filter(
    (entry, index) => selected.value.has(index) && entry.kind !== 'unchanged',
  )

  emit('apply', { name: target.name, entries })
  open.value = false
}

/** Beim Schliessen alles zurücksetzen — auch eine noch laufende Anfrage. */
watch(open, (isOpen) => {
  if (isOpen) return
  controller?.abort()
  controller = null
  recorder.cancel()
  prompt.value = ''
  errorMessage.value = null
  discardPreview()
})

/* ------------------------------------------------------------------ *
 * Darstellung einer Diff-Zeile — Farben und Texte wie in Android.
 * ------------------------------------------------------------------ */

interface DiffRowView {
  prefix: string
  badgeColor: string
  background: string
  name: string
  detail: string | null
  strike: boolean
  dimmed: boolean
}

function checkedDetail(oldChecked: boolean, newChecked: boolean): string | null {
  if (oldChecked === newChecked) return null
  return newChecked ? '→ erledigt' : '→ offen'
}

function quantityDetail(oldQuantity: number, newQuantity: number): string | null {
  if (oldQuantity === newQuantity) return null
  return `${oldQuantity}× → ${newQuantity}×`
}

function rowView(entry: ListDiffEntry): DiffRowView {
  switch (entry.kind) {
    case 'added':
      return {
        prefix: '+',
        badgeColor: '#2D9C74',
        background: '#EFFAF5',
        name: entry.name,
        detail: entry.quantity > 1 ? `${entry.quantity}×` : null,
        strike: false,
        dimmed: false,
      }
    case 'removed':
      return {
        prefix: '−',
        badgeColor: '#F53F96',
        background: '#FDECF5',
        name: entry.name,
        detail: null,
        strike: true,
        dimmed: true,
      }
    case 'modified': {
      const parts = [
        quantityDetail(entry.oldQuantity, entry.newQuantity),
        checkedDetail(entry.oldChecked, entry.newChecked),
      ].filter(part => part !== null)
      return {
        prefix: '~',
        badgeColor: '#F97316',
        background: '#FFF7ED',
        name: entry.name,
        detail: parts.length > 0 ? parts.join(' · ') : null,
        strike: false,
        dimmed: false,
      }
    }
    case 'renamed': {
      const parts = [
        `"${entry.oldName}" → "${entry.newName}"`,
        quantityDetail(entry.oldQuantity, entry.newQuantity),
        checkedDetail(entry.oldChecked, entry.newChecked),
      ].filter(part => part !== null)
      return {
        prefix: '→',
        badgeColor: '#F97316',
        background: '#FFF7ED',
        name: entry.newName,
        detail: parts.join(' · '),
        strike: false,
        dimmed: false,
      }
    }
    case 'unchanged':
      return {
        prefix: '',
        badgeColor: 'transparent',
        background: 'transparent',
        name: entry.name,
        detail: entry.quantity > 1 ? `${entry.quantity}×` : null,
        strike: false,
        dimmed: true,
      }
  }
}

/** Einmal je Diff berechnet statt bei jedem Render je Zeile mehrfach. */
const diffRows = computed(() => diff.value.map(entry => ({
  unchanged: entry.kind === 'unchanged',
  view: rowView(entry),
})))
</script>

<template>
  <AppSheet
    v-model:open="open"
    :title="sheetTitle"
    :description="sheetDescription"
  >
    <!-- Phase 1: Eingabe -->
    <div
      v-if="phase === 'input'"
      class="flex flex-col gap-3"
    >
      <p
        v-if="errorMessage !== null"
        class="rounded-xl px-4 py-3 text-[0.9375rem]"
        style="background: #FDECF5; color: #B4235F"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="recorder.error.value !== null"
        class="rounded-xl px-4 py-3 text-[0.9375rem]"
        style="background: #FDECF5; color: #B4235F"
      >
        {{ recorder.error.value }}
      </p>

      <UTextarea
        v-model="prompt"
        placeholder="Füge Gurke und Kartoffeln hinzu"
        :rows="3"
        size="xl"
        :disabled="recorder.isRecording.value"
        :ui="{ root: 'w-full' }"
        @keyup.enter.exact="sendPrompt"
      />

      <div
        v-if="recorder.isRecording.value"
        class="flex items-center gap-2.5 px-1"
      >
        <span class="size-2.5 animate-pulse rounded-full bg-[#F53F96]" />
        <span
          class="text-[0.9375rem] tabular-nums"
          style="color: var(--md-on-surface-variant)"
        >Aufnahme läuft · {{ formatRecordingDuration(recorder.durationSeconds.value) }}</span>
      </div>

      <div class="flex items-center justify-between gap-2">
        <UButton
          :icon="recorder.isRecording.value ? 'i-lucide-square' : 'i-lucide-mic'"
          :color="recorder.isRecording.value ? 'error' : 'neutral'"
          variant="subtle"
          size="xl"
          class="rounded-xl"
          :aria-label="recorder.isRecording.value ? 'Aufnahme beenden und senden' : 'Änderungen einsprechen'"
          @click="toggleRecording"
        />
        <UButton
          icon="i-lucide-send"
          class="font-bold"
          :disabled="prompt.trim().length === 0 || recorder.isRecording.value"
          @click="sendPrompt"
        >
          Senden
        </UButton>
      </div>
    </div>

    <!-- Phase 2: Laden -->
    <AiLoadingState
      v-else-if="phase === 'loading'"
      :phrases="EDIT_LIST_PHRASES"
      @cancel="cancelRequest"
    />

    <!-- Phase 3: Diff-Vorschau -->
    <div
      v-else
      class="flex flex-col gap-3"
    >
      <div
        v-if="chips.length > 0"
        class="flex items-center gap-1.5"
      >
        <span
          v-for="chip in chips"
          :key="chip.label"
          class="rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold"
          :style="{ color: chip.color, background: chip.background }"
        >{{ chip.label }}</span>
        <span
          class="ml-auto text-[0.8125rem] tabular-nums"
          style="color: var(--md-on-surface-variant)"
        >{{ selectedChangeCount }}/{{ totalChangeCount }}</span>
      </div>

      <p
        v-if="nameChanged && proposal !== null"
        class="rounded-lg px-3 py-2 text-[0.875rem]"
        style="background: #FFF7ED; color: #F97316"
      >
        "{{ listName }}" &rarr; "{{ proposal.name }}"
      </p>

      <p
        v-if="!hasAnyChange"
        class="py-4 text-center text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >
        Keine Änderungen erkannt
      </p>

      <div
        v-else
        class="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto"
      >
        <label
          v-for="(row, index) in diffRows"
          :key="index"
          class="flex cursor-pointer items-stretch overflow-hidden rounded-lg"
          :style="{
            background: row.view.background,
            border: row.unchanged ? '1px solid var(--md-outline-variant)' : 'none',
          }"
        >
          <span
            v-if="row.view.prefix.length > 0"
            class="flex w-8 shrink-0 items-center justify-center text-[1rem] font-bold text-white"
            :style="{ background: row.view.badgeColor }"
          >{{ row.view.prefix }}</span>

          <span class="flex min-w-0 grow flex-col px-3.5 py-2.5">
            <span
              class="truncate text-[0.9375rem]"
              :class="row.view.strike && 'line-through'"
              :style="{
                color: row.unchanged ? 'var(--md-on-surface-variant)' : '#27272A',
                opacity: row.view.dimmed ? 0.6 : 1,
              }"
            >{{ row.view.name }}</span>
            <span
              v-if="row.view.detail !== null"
              class="truncate text-[0.8125rem]"
              :style="{ color: row.unchanged ? 'var(--md-on-surface-variant)' : row.view.badgeColor }"
            >{{ row.view.detail }}</span>
          </span>

          <span class="flex shrink-0 items-center pr-3">
            <UCheckbox
              :model-value="selected.has(index)"
              :aria-label="`${row.view.name} übernehmen`"
              @update:model-value="toggleSelection(index)"
            />
          </span>
        </label>
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <UButton
          color="neutral"
          variant="ghost"
          class="font-bold"
          @click="discardPreview"
        >
          Verwerfen
        </UButton>
        <UButton
          class="font-bold"
          :disabled="selectedChangeCount === 0 && !nameChanged"
          @click="applySelection"
        >
          Übernehmen ({{ selectedChangeCount }})
        </UButton>
      </div>
    </div>
  </AppSheet>
</template>

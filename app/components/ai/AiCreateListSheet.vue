<script setup lang="ts">
/**
 * Neue Liste per AI — drei Wege in einem Sheet: Sprache, Foto, Link.
 * Das Gegenstück zu den Android-Flows in Overview.kt (AudioRecordButton,
 * ImagePickerButton, Share-Intent für URLs).
 *
 * Die Komponente ruft nur die AI und meldet das geparste Ergebnis (`created`)
 * — anlegen tut die Seite über ihre bestehenden Composables. Während der
 * Server rechnet (bis zu fünf Minuten), rotieren die Ladesprüche der
 * Android-App, und Abbrechen bleibt jederzeit möglich.
 */
import type { GeneratedList } from '~/ai/contract'
import { IMAGE_TO_LIST_PHRASES, URL_TO_LIST_PHRASES, VOICE_TO_LIST_PHRASES } from '~/ai/phrases'
import { requestImageToList, requestUrlToList, requestVoiceToList } from '~/ai/transport'
import type { AiCreateMode, AiResult } from '~/ai/transport'
import { formatRecordingDuration } from '~/composables/useAudioRecorder'

const { mode } = defineProps<{ mode: AiCreateMode }>()

const emit = defineEmits<{ created: [result: GeneratedList] }>()

const open = defineModel<boolean>('open', { default: false })

const phase = ref<'input' | 'loading'>('input')
const errorMessage = ref<string | null>(null)

const recorder = useAudioRecorder()

const url = ref('')

const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const imageDescription = ref('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

let controller: AbortController | null = null

/** Grenzen der API-Route /ai/image-to-list. */
const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const SHEET_TEXTS: Record<AiCreateMode, { title: string, description: string, phrases: readonly string[] }> = {
  voice: {
    title: 'Liste per Sprache',
    description: 'Sag, was auf die Liste soll — die AI schreibt mit.',
    phrases: VOICE_TO_LIST_PHRASES,
  },
  photo: {
    title: 'Liste per Foto',
    description: 'Fotografiere einen Einkaufszettel — die AI liest ihn aus.',
    phrases: IMAGE_TO_LIST_PHRASES,
  },
  url: {
    title: 'Liste per Link',
    description: 'Füge einen Link ein — die AI holt die Liste heraus.',
    phrases: URL_TO_LIST_PHRASES,
  },
}

const texts = computed(() => SHEET_TEXTS[mode])

function begin(): AbortController {
  errorMessage.value = null
  phase.value = 'loading'
  controller = new AbortController()
  return controller
}

function finish(result: AiResult<GeneratedList>): void {
  controller = null
  phase.value = 'input'

  if (!result.ok) {
    if (!result.aborted) errorMessage.value = result.error
    return
  }

  emit('created', result.value)
  open.value = false
}

function cancelRequest(): void {
  controller?.abort()
}

/* ------------------------------------------------------------------ *
 * Sprache
 * ------------------------------------------------------------------ */

/** Erster Druck startet die Aufnahme, der zweite beendet und sendet sie. */
async function toggleRecording(): Promise<void> {
  if (phase.value === 'loading') return

  if (!recorder.isRecording.value) {
    errorMessage.value = null
    await recorder.start()
    return
  }

  const recording = await recorder.stop()
  if (recording === null) return

  const active = begin()
  finish(await requestVoiceToList(recording, active.signal))
}

/* ------------------------------------------------------------------ *
 * Foto
 * ------------------------------------------------------------------ */

function revokePreview(): void {
  if (imagePreview.value !== null) {
    URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = null
  }
}

function onFileSelected(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const file = input.files?.[0]
  // Dieselbe Datei erneut wählbar machen.
  input.value = ''
  if (file === undefined) return

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    errorMessage.value = 'Dieses Bildformat wird nicht unterstützt. Bitte wähle ein Bild als JPEG, PNG oder WebP.'
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    errorMessage.value = 'Das Bild ist zu gross — es darf höchstens 10 MB haben.'
    return
  }

  errorMessage.value = null
  revokePreview()
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

async function submitImage(): Promise<void> {
  const file = imageFile.value
  if (file === null || phase.value === 'loading') return

  const description = imageDescription.value.trim()
  const active = begin()
  finish(await requestImageToList(file, description.length > 0 ? description : null, active.signal))
}

/* ------------------------------------------------------------------ *
 * Link
 * ------------------------------------------------------------------ */

/**
 * Nimmt auch Eingaben ohne Schema an („rewe.de/…" wird zu https://…).
 * `null`, wenn daraus keine http(s)-Adresse wird.
 */
function normalizedUrl(): string | null {
  const raw = url.value.trim()
  if (raw.length === 0) return null

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.hostname.length === 0) return null
    return parsed.toString()
  }
  catch {
    return null
  }
}

async function submitUrl(): Promise<void> {
  if (phase.value === 'loading') return

  const target = normalizedUrl()
  if (target === null) {
    errorMessage.value = 'Das sieht nicht nach einer gültigen Adresse aus. Bitte prüfe den Link.'
    return
  }

  const active = begin()
  finish(await requestUrlToList(target, active.signal))
}

/** Beim Schliessen alles zurücksetzen — auch eine noch laufende Anfrage. */
watch(open, (isOpen) => {
  if (isOpen) return
  controller?.abort()
  controller = null
  recorder.cancel()
  phase.value = 'input'
  errorMessage.value = null
  url.value = ''
  imageFile.value = null
  imageDescription.value = ''
  revokePreview()
})

onUnmounted(revokePreview)
</script>

<template>
  <AppSheet
    v-model:open="open"
    :title="texts.title"
    :description="texts.description"
  >
    <AiLoadingState
      v-if="phase === 'loading'"
      :phrases="texts.phrases"
      @cancel="cancelRequest"
    />

    <div
      v-else
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

      <!-- Sprache -->
      <div
        v-if="mode === 'voice'"
        class="flex flex-col items-center gap-4 py-2"
      >
        <div
          v-if="recorder.isRecording.value"
          class="flex items-center gap-2.5"
        >
          <span class="size-2.5 animate-pulse rounded-full bg-[#F53F96]" />
          <span
            class="text-[1.125rem] font-bold tabular-nums"
          >{{ formatRecordingDuration(recorder.durationSeconds.value) }}</span>
        </div>

        <UButton
          :icon="recorder.isRecording.value ? 'i-lucide-square' : 'i-lucide-mic'"
          :color="recorder.isRecording.value ? 'error' : 'primary'"
          size="xl"
          class="rounded-2xl font-bold"
          @click="toggleRecording"
        >
          {{ recorder.isRecording.value ? 'Aufnahme beenden' : 'Aufnahme starten' }}
        </UButton>

        <p
          class="text-center text-[0.9375rem]"
          style="color: var(--md-on-surface-variant); text-wrap: pretty"
        >
          Nach dem Beenden wird die Aufnahme direkt mit AI analysiert.
        </p>
      </div>

      <!-- Foto -->
      <div
        v-else-if="mode === 'photo'"
        class="flex flex-col gap-3"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileSelected"
        >

        <img
          v-if="imagePreview !== null"
          :src="imagePreview"
          alt="Ausgewähltes Bild"
          class="max-h-56 w-full rounded-xl object-cover"
        >

        <UButton
          icon="i-lucide-image"
          color="neutral"
          variant="subtle"
          size="xl"
          class="justify-center rounded-xl font-bold"
          @click="fileInput?.click()"
        >
          {{ imageFile === null ? 'Foto auswählen' : 'Anderes Foto wählen' }}
        </UButton>

        <UInput
          v-model="imageDescription"
          placeholder="Beschreibung (optional)"
          size="xl"
          :ui="{ root: 'w-full' }"
        />

        <UButton
          icon="i-lucide-sparkles"
          size="xl"
          class="justify-center rounded-xl font-bold"
          :disabled="imageFile === null"
          @click="submitImage"
        >
          Analysieren
        </UButton>
      </div>

      <!-- Link -->
      <div
        v-else
        class="flex flex-col gap-3"
      >
        <UInput
          v-model="url"
          type="url"
          placeholder="https://…"
          icon="i-lucide-link"
          size="xl"
          autofocus
          :ui="{ root: 'w-full' }"
          @keyup.enter="submitUrl"
        />

        <UButton
          icon="i-lucide-sparkles"
          size="xl"
          class="justify-center rounded-xl font-bold"
          :disabled="url.trim().length === 0"
          @click="submitUrl"
        >
          Liste erstellen
        </UButton>
      </div>
    </div>
  </AppSheet>
</template>

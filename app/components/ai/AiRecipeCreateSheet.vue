<script setup lang="ts">
/**
 * Neues Rezept per AI — drei Wege in einem Sheet: Sprache, Foto, Link.
 * Das Rezept-Gegenstück zu AiCreateListSheet: dieselben Phasen, dieselbe
 * Fehlerhaltung, nur andere Routen und Verträge.
 *
 * Die Komponente ruft nur die AI und meldet das geparste Ergebnis (`created`)
 * — anlegen tut die Seite über ihre bestehenden Composables. Während der
 * Server rechnet (bis zu fünf Minuten), rotieren die Ladesprüche der
 * Android-App, und Abbrechen bleibt jederzeit möglich.
 */
import type { GeneratedRecipe } from '~/ai/recipeContract'
import { IMAGE_TO_RECIPE_PHRASES, URL_TO_RECIPE_PHRASES, VOICE_TO_RECIPE_PHRASES } from '~/ai/phrases'
import { requestImageToRecipe, requestUrlToRecipe, requestVoiceToRecipe } from '~/ai/transport'
import type { AiCreateMode, AiResult } from '~/ai/transport'
import { formatRecordingDuration } from '~/composables/useAudioRecorder'

const { mode, initialUrl = null } = defineProps<{
  mode: AiCreateMode
  /**
   * Eine Adresse, mit der das Link-Feld beim Öffnen vorbefüllt wird — der
   * Weg vom Teilen-Empfang hierher. Sonst müsste man dieselbe Adresse, die
   * man gerade geteilt hat, noch einmal von Hand eintippen.
   */
  initialUrl?: string | null
}>()

const emit = defineEmits<{ created: [result: GeneratedRecipe] }>()

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

/** Grenzen der API-Route /ai/image-to-recipe. */
const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const SHEET_TEXTS: Record<AiCreateMode, { title: string, description: string, phrases: readonly string[] }> = {
  voice: {
    title: 'Rezept per Sprache',
    description: 'Sprich dein Rezept ein. Die AI schreibt mit.',
    phrases: VOICE_TO_RECIPE_PHRASES,
  },
  photo: {
    title: 'Rezept per Foto',
    description: 'Fotografiere ein Rezept. Die AI liest es aus.',
    phrases: IMAGE_TO_RECIPE_PHRASES,
  },
  url: {
    title: 'Rezept per Link',
    description: 'Füge einen Link ein. Die AI holt das Rezept heraus.',
    phrases: URL_TO_RECIPE_PHRASES,
  },
}

const texts = computed(() => SHEET_TEXTS[mode])

function begin(): AbortController {
  errorMessage.value = null
  phase.value = 'loading'
  controller = new AbortController()
  return controller
}

function finish(result: AiResult<GeneratedRecipe>): void {
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
  finish(await requestVoiceToRecipe(recording, active.signal))
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
    errorMessage.value = 'Das Bild ist zu gross. Höchstens 10 MB sind möglich.'
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
  finish(await requestImageToRecipe(file, description.length > 0 ? description : null, active.signal))
}

/* ------------------------------------------------------------------ *
 * Link
 * ------------------------------------------------------------------ */

/**
 * Nimmt auch Eingaben ohne Schema an („chefkoch.de/…" wird zu https://…).
 * `null`, wenn daraus keine http(s)-Adresse wird.
 *
 * Zwei Schritte aus `app/utils/url.ts` statt einer eigenen Fassung: Das
 * Schema wird ergänzt, weil hier ein Mensch tippt, und danach gilt dieselbe
 * Prüfung wie überall sonst. Die Adresse geht dabei UNVERÄNDERT hinaus —
 * früher normalisierte `URL.toString()` sie noch (angehängter Schrägstrich,
 * kleingeschriebener Host), und die AI bekam eine andere Adresse zu sehen,
 * als der Mensch eingegeben hatte.
 */
function normalizedUrl(): string | null {
  return validHttpUrlOrNull(withHttpsPrefix(url.value))
}

async function submitUrl(): Promise<void> {
  if (phase.value === 'loading') return

  const target = normalizedUrl()
  if (target === null) {
    errorMessage.value = 'Das sieht nicht nach einer gültigen Adresse aus. Bitte prüfe den Link.'
    return
  }

  const active = begin()
  finish(await requestUrlToRecipe(target, active.signal))
}

watch(open, (isOpen) => {
  // Beim ÖFFNEN die mitgegebene Adresse übernehmen — beim Schliessen alles
  // zurücksetzen, auch eine noch laufende Anfrage.
  if (isOpen) {
    if (initialUrl !== null) url.value = initialUrl
    return
  }
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
          Rezept erstellen
        </UButton>
      </div>
    </div>
  </AppSheet>
</template>

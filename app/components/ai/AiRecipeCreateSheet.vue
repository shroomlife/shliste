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
import { MAX_IMAGE_COUNT, useAiImageSelection } from '~/composables/useAiImageSelection'
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

const imageDescription = ref('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
// Grenzen und Verkleinern der Bilder liegen im Composable, gespiegelt an /ai/image-to-recipe.
const {
  images,
  files: imageFiles,
  isFull: imagesFull,
  preparing: preparingImages,
  addFromInput: addImagesFromInput,
  removeImage,
  clear: clearImages,
} = useAiImageSelection((message) => {
  errorMessage.value = message
})

let controller: AbortController | null = null

const SHEET_TEXTS: Record<AiCreateMode, { title: string, description: string, phrases: readonly string[] }> = {
  voice: {
    title: 'Rezept per Sprache',
    description: 'Sprich dein Rezept ein. Die AI schreibt mit.',
    phrases: VOICE_TO_RECIPE_PHRASES,
  },
  photo: {
    title: 'Rezept per Foto',
    description: 'Fotografiere ein Rezept, bis zu fünf Bilder. Die AI liest sie aus.',
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

async function submitImage(): Promise<void> {
  const files = imageFiles.value
  if (files.length === 0 || preparingImages.value || phase.value === 'loading') return

  const description = imageDescription.value.trim()
  const active = begin()
  finish(await requestImageToRecipe(files, description.length > 0 ? description : null, active.signal))
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
  // Beim ÖFFNEN die mitgegebene Adresse übernehmen — beim Schließen alles
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
  imageDescription.value = ''
  clearImages()
})
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
          accept="image/jpeg,image/png,image/webp"
          multiple
          class="hidden"
          @change="addImagesFromInput"
        >

        <!-- Vorschaustreifen: Reihenfolge ist Auswahlreihenfolge. -->
        <ul
          v-if="images.length > 0"
          class="flex gap-2 overflow-x-auto py-1"
          aria-label="Ausgewählte Bilder"
        >
          <li
            v-for="(image, index) in images"
            :key="image.preview"
            class="relative shrink-0"
          >
            <img
              :src="image.preview"
              :alt="`Bild ${index + 1} von ${images.length}`"
              class="size-24 rounded-xl object-cover"
            >
            <UButton
              icon="i-lucide-x"
              color="neutral"
              size="xs"
              class="absolute -right-1.5 -top-1.5 rounded-full"
              :aria-label="`Bild ${index + 1} entfernen`"
              @click="removeImage(index)"
            />
          </li>
        </ul>

        <UButton
          icon="i-lucide-image"
          color="neutral"
          variant="subtle"
          size="xl"
          class="justify-center rounded-xl font-bold"
          :disabled="imagesFull"
          :loading="preparingImages"
          @click="fileInput?.click()"
        >
          {{ images.length === 0 ? 'Fotos auswählen' : `Weitere Fotos hinzufügen (${images.length} von ${MAX_IMAGE_COUNT})` }}
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
          :disabled="images.length === 0 || preparingImages"
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

<script setup lang="ts">
/**
 * „Schritt erklären" — Bestätigung, Erklärung, Speicherung. Nachbau der
 * Android-Flows (Bestätigungsdialog in Detail.kt + StepExplanationSheet.kt).
 *
 * Eine bereits gespeicherte Erklärung (`step.aiExplanation`, wird gesynct)
 * wird direkt gezeigt und NICHT neu geladen — jede Anfrage kostet Budget,
 * und die Erklärung eines unveränderten Schritts bleibt dieselbe. Nur ohne
 * gespeicherte Erklärung fragt das Sheet erst nach und ruft dann die AI.
 *
 * Die Komponente speichert selbst nichts: `explained` meldet der Seite die
 * neue Erklärung, und die schreibt sie über `setStepExplanation`.
 */
import type { ChatRecipePayload } from '~/ai/recipeContract'
import { requestExplainStep } from '~/ai/transport'

const { recipe, stepIndex, stepDescription, storedExplanation } = defineProps<{
  /** Das Rezept in der Anfrage-Form (Mengen bereits ganzzahlig). */
  recipe: ChatRecipePayload
  /** 0-basiert — die Anzeige zählt ab 1, die API ab 0. */
  stepIndex: number
  stepDescription: string
  /** Bereits gespeicherte Erklärung des Schritts, falls vorhanden. */
  storedExplanation: string | null
}>()

const emit = defineEmits<{ explained: [explanation: string] }>()

const open = defineModel<boolean>('open', { default: false })

const phase = ref<'confirm' | 'loading' | 'result'>('confirm')
const explanation = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

let controller: AbortController | null = null

const sheetTitle = computed(() =>
  phase.value === 'result' ? `Schritt ${stepIndex + 1} erklärt` : 'Schritt erklären?',
)
const sheetDescription = computed(() =>
  phase.value === 'result' ? stepDescription : 'Möchtest du diesen Schritt genauer erklärt haben?',
)

// `immediate`: Die Seite hängt das Sheet erst beim ersten Öffnen in den Baum
// (v-if auf dem Ziel-Schritt) — dann steht `open` beim Mounten schon auf true
// und ein nicht-immediates watch würde die Initialisierung verpassen.
watch(open, (isOpen) => {
  if (isOpen) {
    errorMessage.value = null
    if (storedExplanation !== null && storedExplanation.length > 0) {
      explanation.value = storedExplanation
      phase.value = 'result'
    }
    else {
      explanation.value = null
      phase.value = 'confirm'
    }
    return
  }
  controller?.abort()
  controller = null
}, { immediate: true })

async function fetchExplanation(): Promise<void> {
  errorMessage.value = null
  phase.value = 'loading'
  controller = new AbortController()

  const result = await requestExplainStep(
    { recipe, stepIndex, stepDescription },
    controller.signal,
  )
  controller = null

  if (!result.ok) {
    if (result.aborted) {
      // Der Abbruch war gewollt — zurück zur Frage, ohne Fehlermeldung.
      phase.value = 'confirm'
      return
    }
    errorMessage.value = result.error
    phase.value = 'confirm'
    return
  }

  explanation.value = result.value
  phase.value = 'result'
  emit('explained', result.value)
}

function cancelRequest(): void {
  controller?.abort()
}
</script>

<template>
  <AppSheet
    v-model:open="open"
    :title="sheetTitle"
    :description="sheetDescription"
  >
    <!-- Phase 1: Bestätigung -->
    <div
      v-if="phase === 'confirm'"
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
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant); text-wrap: pretty"
      >
        {{ stepDescription }}
      </p>

      <div class="flex justify-end gap-2 pt-1">
        <UButton
          color="neutral"
          variant="ghost"
          class="font-bold"
          @click="open = false"
        >
          Nein
        </UButton>
        <UButton
          icon="i-lucide-sparkles"
          class="font-bold"
          @click="fetchExplanation"
        >
          {{ errorMessage !== null ? 'Erneut versuchen' : 'Ja' }}
        </UButton>
      </div>
    </div>

    <!-- Phase 2: Laden -->
    <div
      v-else-if="phase === 'loading'"
      class="flex flex-col items-center gap-4 py-6"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-9 animate-spin"
        style="color: var(--md-primary)"
      />
      <p
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >
        Erklärung wird generiert...
      </p>
      <UButton
        color="neutral"
        variant="outline"
        class="font-bold"
        @click="cancelRequest"
      >
        Abbrechen
      </UButton>
    </div>

    <!-- Phase 3: Erklärung — schlichter Text, pre-wrap erhält die Nummerierung.
         v-text statt Interpolation: pre-wrap würde die Einrückung des
         Templates sonst als sichtbaren Leerraum rendern. -->
    <div
      v-else
      class="max-h-[55vh] overflow-y-auto"
    >
      <p
        class="text-[0.9375rem] whitespace-pre-wrap"
        style="text-wrap: pretty"
        v-text="explanation"
      />
    </div>
  </AppSheet>
</template>

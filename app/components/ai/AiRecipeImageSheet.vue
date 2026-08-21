<script setup lang="ts">
/**
 * „Neues Bild generieren?" — Bestätigung, Generierung, Upload. Nachbau des
 * Android-Dialogs (Detail.kt) samt der Ladesprüche von recipe-to-image.
 *
 * Die Generierung kann bis zu fünf Minuten dauern; solange rotieren die
 * Sprüche und Abbrechen bleibt möglich. Das fertige Bild wird sofort nach
 * `/sync/images/upload` gebracht — erst als `sync:`-Referenz kommt es auf
 * allen Geräten an. `generated` meldet der Seite die Referenz, und die
 * schreibt `imagePath` über den bestehenden Update-Weg.
 */
import { base64ToWebpBlob, uploadRecipeImage } from '~/ai/images'
import { RECIPE_TO_IMAGE_PHRASES } from '~/ai/phrases'
import { requestRecipeToImage } from '~/ai/transport'

const { recipeId, recipeText } = defineProps<{
  recipeId: string
  /** Der Bild-Prompt im Android-Format (`buildRecipeImageText`). */
  recipeText: string
}>()

const emit = defineEmits<{ generated: [imageRef: string] }>()

const open = defineModel<boolean>('open', { default: false })

const phase = ref<'confirm' | 'loading'>('confirm')
const errorMessage = ref<string | null>(null)

let controller: AbortController | null = null

async function generate(): Promise<void> {
  if (phase.value === 'loading') return

  errorMessage.value = null
  phase.value = 'loading'
  controller = new AbortController()

  const result = await requestRecipeToImage({ recipeId, recipeText }, controller.signal)
  controller = null
  phase.value = 'confirm'

  if (!result.ok) {
    if (!result.aborted) errorMessage.value = result.error
    return
  }

  const blob = base64ToWebpBlob(result.value)
  if (blob === null) {
    errorMessage.value = 'Die AI hat ein unbrauchbares Bild geliefert. Bitte versuche es erneut.'
    return
  }

  const upload = await uploadRecipeImage(recipeId, blob)
  if (!upload.ok) {
    errorMessage.value = upload.error
    return
  }

  emit('generated', upload.value)
  open.value = false
}

function cancelRequest(): void {
  controller?.abort()
}

/** Beim Schliessen alles zurücksetzen — auch eine noch laufende Anfrage. */
watch(open, (isOpen) => {
  if (isOpen) return
  controller?.abort()
  controller = null
  phase.value = 'confirm'
  errorMessage.value = null
})
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Neues Bild generieren?"
    description="Ein neues Bild für dieses Rezept wird generiert. Das kann einen Moment dauern."
  >
    <AiLoadingState
      v-if="phase === 'loading'"
      :phrases="RECIPE_TO_IMAGE_PHRASES"
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
          @click="generate"
        >
          {{ errorMessage !== null ? 'Erneut versuchen' : 'Ja' }}
        </UButton>
      </div>
    </div>
  </AppSheet>
</template>

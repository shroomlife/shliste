<script setup lang="ts">
/**
 * Wartezustand eines AI-Vorgangs: Spinner, rotierender Spruch, Abbrechen.
 *
 * Die Sprüche rotieren wie in der Android-App (AiJobCard.kt), damit die bis
 * zu fünf Minuten Serverzeit nicht wie ein Einfrieren wirken. `aria-live`
 * bleibt aus: Ein Screenreader soll nicht alle paar Sekunden einen neuen
 * Scherz vorgelesen bekommen — der Abbrechen-Knopf ist die relevante Bedienung.
 */
const { phrases } = defineProps<{
  /** Rotierende Ladesprüche; der erste erscheint sofort. */
  phrases: readonly string[]
}>()

const emit = defineEmits<{ cancel: [] }>()

const phraseIndex = ref(0)
const currentPhrase = computed(() => phrases[phraseIndex.value % Math.max(1, phrases.length)] ?? 'Wird analysiert...')

let ticker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  ticker = setInterval(() => {
    phraseIndex.value += 1
  }, 2800)
})

onUnmounted(() => {
  if (ticker !== null) clearInterval(ticker)
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <UIcon
      name="i-lucide-loader-circle"
      class="size-9 animate-spin"
      style="color: var(--md-primary)"
    />
    <p
      class="text-[1rem]"
      style="color: var(--md-on-surface-variant)"
    >
      {{ currentPhrase }}
    </p>
    <UButton
      color="neutral"
      variant="outline"
      class="font-bold"
      @click="emit('cancel')"
    >
      Abbrechen
    </UButton>
  </div>
</template>

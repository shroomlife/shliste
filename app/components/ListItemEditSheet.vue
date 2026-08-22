<script setup lang="ts">
/**
 * Eintrag bearbeiten — Name und Menge, das Pendant zu Androids
 * ListItemEditSheet.kt über dem AppSheet-Muster der App.
 *
 * Die Mengensteuerung übersetzt Androids NumberSliderInput sinngemäss auf
 * Zeigegeräte: grosse Minus- und Plus-Knöpfe (44 Pixel, WCAG 2.2 SC 2.5.8)
 * fürs Feinjustieren und eine Ziffernreihe 1–9 für den schnellen Griff — die
 * allermeisten Einkäufe liegen in genau diesem Bereich. Der Wertebereich ist
 * derselbe wie auf Android: 1 bis 999.
 *
 * Gespeichert wird erst auf den Knopf: Das Blatt arbeitet auf einer lokalen
 * Kopie, Abbrechen verwirft sie folgenlos. Was beim Speichern tatsächlich
 * geschrieben wird, entscheidet `updateItem` im Composable — dort wird der
 * Eintrag frisch nachgeschlagen und nur Geändertes gestempelt.
 */
const { item = null } = defineProps<{
  /** Name und Menge des Eintrags, wie sie beim Öffnen übernommen werden. */
  item?: { name: string, quantity: number } | null
}>()

/** Offen-Zustand liegt beim Aufrufer, damit er das Blatt steuern kann. */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ save: [changes: { name: string, quantity: number }] }>()

const name = ref('')
const quantity = ref(QUANTITY_MIN)

// Beim ÖFFNEN übernehmen, nicht fortlaufend: Während das Blatt offen ist,
// darf ein Sync den Eintrag ändern, ohne dem Menschen ins Feld zu tippen.
watch(open, (isOpen) => {
  if (!isOpen || item === null) return
  name.value = item.name
  quantity.value = clampQuantity(item.quantity)
})

const canSave = computed(() => name.value.trim().length > 0)

// Als computed statt Konstanten-Vergleich im Template: Auto-Importe stehen
// dem Template-Typecheck (vue-tsc) nicht zur Verfügung, und die Frage "geht
// noch weniger/mehr?" ist ohnehin die eigentliche Aussage.
const canDecrease = computed(() => quantity.value > QUANTITY_MIN)
const canIncrease = computed(() => quantity.value < QUANTITY_MAX)

function setQuantity(value: number): void {
  quantity.value = clampQuantity(value)
}

function submit(): void {
  if (!canSave.value) return
  open.value = false
  emit('save', { name: name.value.trim(), quantity: quantity.value })
}
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Eintrag bearbeiten"
    description="Name und Menge anpassen"
  >
    <div class="flex flex-col gap-5">
      <UInput
        v-model="name"
        size="xl"
        autofocus
        enterkeyhint="done"
        aria-label="Name des Eintrags"
        :ui="{ root: 'w-full' }"
        @keyup.enter="submit"
      />

      <div class="flex flex-col gap-2.5">
        <span
          class="text-[0.9375rem] font-bold"
          style="color: var(--md-on-surface-variant)"
        >Menge</span>

        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40"
            style="background: var(--md-surface-high)"
            :disabled="!canDecrease"
            aria-label="Menge verringern"
            @click="setQuantity(quantity - 1)"
          >
            <UIcon
              name="i-lucide-minus"
              class="size-5"
            />
          </button>

          <!-- aria-live, damit der Screenreader den neuen Wert ansagt — die
               Knöpfe selbst ändern ihn nur stumm. -->
          <span
            class="min-w-16 text-center text-[1.375rem] font-bold"
            style="color: var(--md-primary)"
            aria-live="polite"
          >{{ quantity }}&times;</span>

          <button
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40"
            style="background: var(--md-surface-high)"
            :disabled="!canIncrease"
            aria-label="Menge erhöhen"
            @click="setQuantity(quantity + 1)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-5"
            />
          </button>
        </div>

        <div class="flex gap-1">
          <button
            v-for="digit in 9"
            :key="digit"
            type="button"
            class="flex h-10 min-w-0 grow items-center justify-center rounded-sm text-[1.0625rem] font-bold transition-colors"
            :style="digit === quantity
              ? 'background: var(--md-secondary); color: var(--md-on-secondary)'
              : 'background: var(--md-surface-low); color: var(--md-on-surface-variant)'"
            :aria-label="`Menge ${digit}`"
            :aria-pressed="digit === quantity"
            @click="setQuantity(digit)"
          >
            {{ digit }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          class="font-bold"
          @click="open = false"
        >
          Abbrechen
        </UButton>
        <UButton
          :disabled="!canSave"
          class="font-bold"
          @click="submit"
        >
          Speichern
        </UButton>
      </div>
    </template>
  </AppSheet>
</template>

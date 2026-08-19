<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

/**
 * Eine Zeile der Einkaufsliste.
 *
 * Anatomie und Farben stammen aus der Android-App (SemanticColors.kt):
 * abgehakte Eintraege werden gedaempft und durchgestrichen, die Mengenkachel
 * wechselt dabei auf den gedaempften Ton.
 *
 * `justChanged` loest den einen orchestrierten Bewegungsmoment der App aus:
 * eine Zeile, die gerade ein anderes Geraet geaendert hat, leuchtet kurz auf
 * und traegt links eine Akzentleiste. Die Spezifikation dazu steht in
 * SemanticColors.deltaFlashSurface.
 *
 * Barrierefreiheit: Die ganze Zeile ist ein Knopf mit mindestens 44 Pixel
 * Hoehe, damit sie auch am Handy sicher zu treffen ist (WCAG 2.2 SC 2.5.8).
 */
const { item, justChanged = false, changedBy = null } = defineProps<{
  item: ListItem
  /** Wurde die Zeile gerade von einem anderen Geraet geaendert? */
  justChanged?: boolean
  /** Anzeigename der Person, die geaendert hat */
  changedBy?: string | null
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="flex min-h-14 w-full items-center gap-3.5 rounded-lg px-2 text-left transition-colors"
    :class="[justChanged && 'delta-flash', item.checked && 'opacity-65']"
    :aria-pressed="item.checked"
    @click="emit('toggle')"
  >
    <span
      class="flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
      :style="item.checked
        ? 'background: var(--md-check-content); border-color: var(--md-check-content)'
        : 'border-color: var(--md-on-surface-variant)'"
    >
      <UIcon
        v-if="item.checked"
        name="i-lucide-check"
        class="size-4 text-white"
      />
    </span>

    <span class="flex min-w-0 grow flex-col">
      <span
        class="truncate text-[1.375rem]"
        :class="item.checked && 'line-through'"
      >{{ item.name }}</span>
      <span
        v-if="justChanged && changedBy"
        class="text-[0.875rem] font-bold"
        style="color: var(--md-primary)"
      >{{ changedBy }} gerade</span>
    </span>

    <span
      v-if="item.quantity > 1"
      class="flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 text-[1.0625rem] font-bold"
      :style="item.checked
        ? 'background: var(--md-muted-surface)'
        : 'background: var(--md-surface-high)'"
    >{{ item.quantity }}&times;</span>
  </button>
</template>

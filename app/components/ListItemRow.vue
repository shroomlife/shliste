<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

/**
 * Eine Zeile der Einkaufsliste.
 *
 * Anatomie und Farben stammen aus der Android-App (SemanticColors.kt):
 * abgehakte Einträge werden gedämpft und durchgestrichen, die Mengenkachel
 * wechselt dabei auf den gedämpften Ton.
 *
 * `justChanged` löst den einen orchestrierten Bewegungsmoment der App aus:
 * eine Zeile, die gerade ein anderes Gerät geändert hat, leuchtet kurz auf
 * und trägt links eine Akzentleiste. Die Spezifikation dazu steht in
 * SemanticColors.deltaFlashSurface.
 *
 * Barrierefreiheit: Die ganze Zeile ist ein Knopf mit mindestens 44 Pixel
 * Höhe, damit sie auch am Handy sicher zu treffen ist (WCAG 2.2 SC 2.5.8).
 */
const { item, justChanged = false, changedBy = null, sortable = false } = defineProps<{
  item: ListItem
  /** Wurde die Zeile gerade von einem anderen Gerät geändert? */
  justChanged?: boolean
  /** Anzeigename der Person, die geändert hat */
  changedBy?: string | null
  /**
   * Im Sortiermodus bekommt die Zeile einen Anfasser zum Ziehen — und nur
   * dann. Beim Einkaufen soll niemand versehentlich umsortieren, und ein
   * dauerhafter Griff an jeder Zeile macht aus einer ruhigen Liste ein
   * Werkzeugbrett. Dieselbe Entscheidung wie in der Android-App.
   */
  sortable?: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <!-- Im Sortiermodus ist die Zeile ein Container mit Anfasser, sonst der
       schlichte Knopf von vorher: Ein Anfasser IM Knopf waere verschachteltes
       Bedienelement und fuer Tastatur wie Screenreader kaputt. -->
  <div
    v-if="sortable"
    class="flex min-h-14 w-full items-center gap-1 rounded-lg pl-1 transition-colors"
    :class="item.checked && 'opacity-65'"
    style="background: var(--md-surface-container)"
  >
    <span
      class="drag-handle flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing"
      style="color: var(--md-on-surface-variant); touch-action: none"
      aria-hidden="true"
    >
      <UIcon
        name="i-lucide-grip-vertical"
        class="size-5"
      />
    </span>
    <span
      class="min-w-0 grow truncate px-1 text-[1.375rem]"
      :class="item.checked && 'line-through'"
    >{{ item.name }}</span>
    <span
      v-if="item.quantity > 1"
      class="mr-2 flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 text-[1.0625rem] font-bold"
      style="background: var(--md-surface-high)"
    >{{ item.quantity }}&times;</span>
  </div>

  <button
    v-else
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

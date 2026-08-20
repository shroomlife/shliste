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

const emit = defineEmits<{ toggle: [], remove: [] }>()
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

  <!-- Ausserhalb des Sortiermodus: Abhaken und Löschen. Beides sind eigene
       Knöpfe nebeneinander und nicht ineinander — verschachtelte
       Bedienelemente sind ungültiges HTML und für Tastatur wie Screenreader
       kaputt. -->
  <div
    v-else
    class="state-layer group flex min-h-14 w-full items-center rounded-lg transition-colors"
    :class="[justChanged && 'delta-flash', item.checked && 'opacity-65']"
  >
    <button
      type="button"
      class="flex min-h-14 min-w-0 grow items-center gap-3.5 rounded-lg px-2 text-left"
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

    <!-- Auf grossen Schirmen erst bei Hover oder Fokus, auf schmalen immer:
         Dort gibt es kein Hover, und eine unsichtbare Bedienung ist keine.
         Die Farbe ist der Löschton aus SemanticColors.kt. -->
    <button
      type="button"
      class="mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
      style="color: var(--md-delete-content)"
      :aria-label="`${item.name} entfernen`"
      @click="emit('remove')"
    >
      <UIcon
        name="i-lucide-trash-2"
        class="size-4"
      />
    </button>
  </div>
</template>

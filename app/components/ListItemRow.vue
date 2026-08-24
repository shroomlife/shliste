<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

/**
 * Eine Zeile der Einkaufsliste.
 *
 * Anatomie und Farben stammen aus der Android-App (ListItemContent.kt und
 * SemanticColors.kt): links die Mengenkachel in voller Zeilenhöhe, rechts die
 * Aktionsflächen — grün zum Abhaken auf offenen Zeilen, orange (Rückgängig)
 * und pink (Entfernen) auf abgehakten. Abgehakte Namen stehen in halber
 * Deckkraft statt durchgestrichen, die Mengenkachel wechselt auf den
 * gedämpften Ton.
 *
 * DIE BEDIENLOGIK IST DIE DER ANDROID-APP: Ein Tipp auf den Namensbereich
 * öffnet das Bearbeiten-Blatt, abgehakt wird ausschliesslich über die
 * Aktionsflächen rechts. Vorher hakte der Tipp ab und Bearbeiten lag auf
 * einem Long-Press — also genau umgekehrt zur App, was auf beiden Geräten
 * dieselbe Bewegung zu zwei verschiedenen Ergebnissen führen liess. Die
 * grüne Fläche ist gross, sichtbar und trifft sich sicher; der Name ist es
 * nicht, und ein versehentliches Abhaken beim Zielen kostete mehr als ein
 * versehentlich geöffnetes Blatt.
 *
 * KEIN STIFT. Es gab einmal einen zusätzlichen Knopf zum Bearbeiten, der bei
 * Hover erschien. Er war doppelt gemoppelt (die Zeile selbst öffnet ja das
 * Blatt) und fühlte sich kaputt an: Wer die Zeile überfährt, sieht ihn
 * auftauchen, aber er leuchtet nicht mit — zwei Flächen, die sich einen
 * Hover teilen sollten und es nicht taten. Rechts stehen jetzt nur noch die
 * Aktionen, die etwas TUN: abhaken, rückgängig, entfernen.
 *
 * Diese Aktionsflächen sind eigene Knöpfe NEBEN dem Namensknopf, nie darin:
 * verschachtelte Bedienelemente sind ungültiges HTML und für Tastatur wie
 * Screenreader kaputt.
 *
 * `justChanged` löst den einen orchestrierten Bewegungsmoment der App aus:
 * eine Zeile, die gerade ein anderes Gerät geändert hat, leuchtet kurz auf
 * und trägt links eine Akzentleiste. Die Spezifikation dazu steht in
 * SemanticColors.deltaFlashSurface.
 *
 * Barrierefreiheit: Alle Knöpfe halten mindestens 44 Pixel Zeilenhöhe, damit
 * sie auch am Handy sicher zu treffen sind (WCAG 2.2 SC 2.5.8).
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

const emit = defineEmits<{ toggle: [], remove: [], edit: [] }>()
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

  <!-- Ausserhalb des Sortiermodus: die Android-Anatomie. Mengenkachel links,
       Namensknopf in der Mitte, Aktionsflächen rechts — alles Geschwister
       in voller Zeilenhöhe (items-stretch), wie in ListItemContent.kt. -->
  <div
    v-else
    class="group flex min-h-14 w-full items-stretch rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors"
    :class="[justChanged && 'delta-flash']"
    style="background: var(--md-surface)"
  >
    <!-- Mengenkachel: nur ab 2 Stück — die 1 ist der Normalfall und kein
         Etikett wert. Abgehakt wechselt sie auf den gedämpften Ton. -->
    <span
      v-if="item.quantity > 1"
      class="flex min-w-11 shrink-0 items-center justify-center rounded-l-sm px-2 text-[1.25rem] font-bold"
      :style="item.checked
        ? 'background: var(--md-muted-surface); color: var(--md-on-surface-variant)'
        : 'background: var(--md-secondary); color: var(--md-on-secondary)'"
    >{{ item.quantity }}&times;</span>

    <button
      type="button"
      class="state-layer flex min-h-14 min-w-0 grow items-center rounded-sm px-3.5 py-2 text-left"
      :aria-label="`${item.name} bearbeiten`"
      @click="emit('edit')"
    >
      <span class="flex min-w-0 grow flex-col">
        <span
          class="truncate text-[1.25rem]"
          :class="item.checked && 'opacity-50'"
        >{{ item.name }}</span>
        <span
          v-if="justChanged && changedBy"
          class="text-[0.875rem] font-bold"
          style="color: var(--md-primary)"
        >{{ changedBy }} gerade</span>
      </span>
    </button>

    <!-- Offene Zeile: die grüne Abhak-Fläche (SemanticColors.itemCheckSurface).
         DER einzige Weg zum Abhaken — gross, sichtbar, sicher zu treffen. -->
    <button
      v-if="!item.checked"
      type="button"
      class="flex w-14 shrink-0 items-center justify-center rounded-r-sm"
      style="background: var(--md-check-surface); color: var(--md-check-content)"
      :aria-label="`${item.name} abhaken`"
      @click="emit('toggle')"
    >
      <UIcon
        name="i-lucide-check"
        class="size-6"
      />
    </button>

    <!-- Abgehakte Zeile: Rückgängig (orange) und Entfernen (pink)
         nebeneinander, wie in der Android-App. -->
    <template v-else>
      <button
        type="button"
        class="flex w-13 shrink-0 items-center justify-center"
        style="background: var(--md-undo-surface); color: var(--md-undo-content)"
        :aria-label="`${item.name} wieder auf offen setzen`"
        @click="emit('toggle')"
      >
        <UIcon
          name="i-lucide-undo-2"
          class="size-6"
        />
      </button>
      <button
        type="button"
        class="flex w-13 shrink-0 items-center justify-center rounded-r-sm"
        style="background: var(--md-delete-surface); color: var(--md-delete-content)"
        :aria-label="`${item.name} entfernen`"
        @click="emit('remove')"
      >
        <UIcon
          name="i-lucide-x"
          class="size-6"
        />
      </button>
    </template>
  </div>
</template>

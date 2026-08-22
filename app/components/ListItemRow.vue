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
 * Die Bedienlogik bleibt die der PWA: Ein Tipp auf den Namensbereich hakt ab
 * oder wieder auf, Erledigtes wandert in den eigenen Block. Die Aktionsflächen
 * sind zusätzliche, sichtbare Griffe — und eigene Knöpfe NEBEN dem
 * Namensknopf, nie darin: verschachtelte Bedienelemente sind ungültiges HTML
 * und für Tastatur wie Screenreader kaputt.
 *
 * Bearbeiten öffnet sich über den Stift oder einen Long-Press auf den
 * Namensbereich (500 ms, bricht bei mehr als 8 px Bewegung ab — dieselben
 * Schwellen wie ein Plattform-Long-Press). Der Stift ist die sichtbare,
 * WCAG-taugliche Alternative: Eine Geste, die man nicht sehen kann, ist
 * keine Bedienung.
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

const haptics = useHaptics()

/** Nach so viel Halten gilt der Druck als Long-Press (Plattform-Konvention). */
const LONG_PRESS_MS = 500

/** Mehr Bewegung als das ist ein Wischen oder Scrollen, kein Halten. */
const MOVE_TOLERANCE_PX = 8

let longPressTimer: ReturnType<typeof setTimeout> | null = null
let pressStart: { x: number, y: number } | null = null

/**
 * Nach einem ausgelösten Long-Press feuert der Browser beim Loslassen noch
 * ein Click-Ereignis — das ist nur das Ende derselben Geste und darf nicht
 * zusätzlich abhaken.
 */
let longPressFired = false

function onNamePointerDown(event: PointerEvent): void {
  // Nur der primäre Zeiger mit der Haupttaste: Die rechte Maustaste und ein
  // zweiter Finger sollen kein Bearbeiten öffnen.
  if (!event.isPrimary || event.button !== 0) return

  pressStart = { x: event.clientX, y: event.clientY }
  longPressFired = false
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    longPressFired = true
    // Haptik SYNCHRON im Moment des Auslösens — wie beim Abhaken auf der
    // Seite: ein Summen, das der Geste hinterherläuft, fühlt sich kaputt an.
    haptics.longPress()
    emit('edit')
  }, LONG_PRESS_MS)
}

function onNamePointerMove(event: PointerEvent): void {
  if (longPressTimer === null || pressStart === null) return

  const distance = Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y)
  if (distance > MOVE_TOLERANCE_PX) cancelLongPress()
}

function cancelLongPress(): void {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  pressStart = null
}

function onNameClick(event: MouseEvent): void {
  if (longPressFired) {
    longPressFired = false
    // Verschluckt wird nur der Klick derselben Geste. Eine Tastatur-
    // Aktivierung (detail === 0) ist nie das Ende eines Long-Press — sie
    // darf auch dann abhaken, wenn zuvor eine Geste ohne Klick endete.
    if (event.detail !== 0) return
  }
  emit('toggle')
}

// Ein laufender Timer darf die Komponente nicht überleben — sonst feuert er
// ins Leere einer bereits entfernten Zeile.
onBeforeUnmount(cancelLongPress)
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
      :aria-pressed="item.checked"
      @click="onNameClick"
      @pointerdown="onNamePointerDown"
      @pointermove="onNamePointerMove"
      @pointerup="cancelLongPress"
      @pointerleave="cancelLongPress"
      @pointercancel="cancelLongPress"
      @contextmenu.prevent
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

    <!-- Der Stift: sichtbarer Einstieg ins Bearbeiten, gleichwertig zum
         Long-Press. Auf grossen Schirmen erst bei Hover oder Fokus, auf
         schmalen immer — dort gibt es kein Hover, und eine unsichtbare
         Bedienung ist keine. -->
    <button
      type="button"
      class="flex size-9 shrink-0 items-center justify-center self-center rounded-sm opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
      style="color: var(--md-on-surface-variant)"
      :aria-label="`${item.name} bearbeiten`"
      @click="emit('edit')"
    >
      <UIcon
        name="i-lucide-pencil"
        class="size-4"
      />
    </button>

    <!-- Offene Zeile: die grüne Abhak-Fläche (SemanticColors.itemCheckSurface).
         Zusätzlich zum Zeilen-Tap — der grosse, immer sichtbare Griff. -->
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

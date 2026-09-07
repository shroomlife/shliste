/**
 * Ziehen und Ablegen für eine Liste von Zeilen.
 *
 * WARUM SORTABLE.JS UND NICHTS SELBSTGEBAUTES: Ziehen auf dem Handy ist im
 * Detail unangenehm — Zeigererfassung, verhindertes Scrollen, automatisches
 * Weiterrollen am Rand, abgebrochene Gesten. Das ist gelöste Arbeit, und eine
 * eigene Fassung wäre genau die Sorte Rad-Neuerfindung, die man erst im Laden
 * bemerkt. Sortable.js hat selbst keine Abhängigkeiten.
 *
 * WARUM DER DOM ZURÜCKGESETZT WIRD: Sortable verschiebt beim Ablegen echte
 * DOM-Knoten. Vue rendert dieselbe Liste aus seinen Daten. Blieben beide
 * Änderungen stehen, stünde die Zeile doppelt verschoben da. Deshalb wird die
 * Bewegung im DOM sofort rückgängig gemacht und ausschließlich über die Daten
 * neu gerendert — die Daten bleiben die einzige Wahrheit.
 *
 * Nur im Browser: Sortable braucht echte Knoten. Auf dem Server passiert
 * nichts, was folgenlos ist, weil der App-Bereich ohnehin client-seitig
 * rendert.
 */
import Sortable from 'sortablejs'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'

export interface UseDragSortOptions {
  /**
   * Solange `false`, ist nichts ziehbar. Der Sortiermodus ist ein eigener
   * Zustand — beim Einkaufen soll niemand versehentlich umsortieren.
   */
  enabled: MaybeRefOrGetter<boolean>
  /** CSS-Auswahl des Anfassers innerhalb einer Zeile. */
  handle: string
  /**
   * Eine Zeile wurde abgelegt. Die Indizes zählen in der angezeigten Liste;
   * `to` ist die Position OHNE die gezogene Zeile, so wie Sortable es meldet.
   */
  onMove: (from: number, to: number) => void
}

export function useDragSort(
  container: Readonly<ShallowRef<HTMLElement | null>>,
  options: UseDragSortOptions,
): void {
  let sortable: Sortable | null = null

  function destroy(): void {
    sortable?.destroy()
    sortable = null
  }

  function create(element: HTMLElement): void {
    // Wer Bewegung abbestellt hat, bekommt keine: Die Zeile springt dann
    // sofort an ihren Platz, statt dorthin zu gleiten. Das Ziehen selbst
    // bleibt unverändert — es ist die Handlung des Nutzers und keine
    // Verzierung.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    sortable = Sortable.create(element, {
      handle: options.handle,
      animation: prefersReducedMotion ? 0 : 150,
      // Der Anfasser ist klein; ohne diese Schwelle löst schon ein Wackeln
      // beim Tippen eine Bewegung aus.
      touchStartThreshold: 4,
      ghostClass: 'drag-ghost',
      onEnd: (event) => {
        const from = event.oldIndex
        const to = event.newIndex
        if (from === undefined || to === undefined || from === to) return

        // Sortable hat den Knoten bereits umgehängt. Zurückstecken, bevor Vue
        // rendert — sonst zählt die Bewegung zweimal.
        const parent = event.from
        const reference = parent.children[from] ?? null
        parent.insertBefore(event.item, reference)

        options.onMove(from, to)
      },
    })
  }

  function reconcile(): void {
    const element = container.value
    const shouldRun = toValue(options.enabled) && element !== null

    if (!shouldRun) {
      destroy()
      return
    }

    // Neu aufsetzen statt umkonfigurieren: Der Container kann zwischendurch
    // ausgetauscht worden sein, und Sortable hängt an genau einem Knoten.
    destroy()
    if (element !== null) create(element)
  }

  onMounted(() => {
    watch([() => toValue(options.enabled), container], () => {
      reconcile()
    }, { immediate: true, flush: 'post' })
  })

  onBeforeUnmount(destroy)
}

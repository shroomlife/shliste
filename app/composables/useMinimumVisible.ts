import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * Ein Zustand, der — einmal sichtbar geworden — mindestens `ms` lang
 * sichtbar bleibt.
 *
 * Für Ladeanzeigen: Ist die Arbeit schneller als ein Blick (eine Seite, die
 * uns nach einer halben Sekunde aussperrt), blitzt die Anzeige sonst nur auf
 * und wirkt wie ein Fehler. Das Ende wird verzögert, nie der Anfang — und nur
 * die DARSTELLUNG. Was die Anzeige bedeutet (etwa die Löschsperre), folgt
 * weiter dem echten Zustand.
 */
export function useMinimumVisible(source: Readonly<Ref<boolean>>, ms: number): Readonly<Ref<boolean>> {
  const visible = ref(source.value)
  let shownAt = source.value ? Date.now() : 0
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (active) => {
    clearTimeout(timer)
    if (active) {
      if (!visible.value) shownAt = Date.now()
      visible.value = true
      return
    }
    const rest = ms - (Date.now() - shownAt)
    if (rest <= 0) {
      visible.value = false
      return
    }
    timer = setTimeout(() => {
      visible.value = false
    }, rest)
  })

  onScopeDispose(() => clearTimeout(timer))
  return visible
}

/**
 * Flächen, die gerade ein anderes Gerät geändert hat.
 *
 * DAS IST DER EINE BEWEGUNGSMOMENT DER APP. Nicht Zierat: Er ist die sichtbare
 * Belohnung des ganzen Echtzeit-Umbaus. Wer im Laden steht und sieht, wie eine
 * Zeile aufleuchtet, weil daheim jemand etwas abgehakt hat, versteht ohne ein
 * Wort Erklärung, dass die Liste geteilt ist und lebt.
 *
 * Zwei Sekunden, genau wie in der Android-App (`markRecentlyUpdated`): lang
 * genug zum Wahrnehmen, kurz genug, dass die Liste nicht dauerhaft blinkt.
 *
 * Die Markierung kommt vom Ereignis und nicht von den Daten. Sie kann deshalb
 * einen Wimpernschlag vor dem Datenstand liegen — der Abruf des Deltas braucht
 * seine Zeit. Zwei Sekunden decken das ab, und im schlimmsten Fall leuchtet
 * eine Zeile, die schon aktuell war.
 *
 * JE ID EINE LAUFENDE NUMMER, kein bloßes "ja/nein". Dieselbe Id kann erneut
 * gemeldet werden, während sie noch leuchtet — beim Abhaken mehrerer Einträge
 * derselben Liste ist das der Normalfall, denn jede Änderung meldet auch die
 * Liste. Ohne die Nummer nahm der Zeitgeber der ERSTEN Meldung die Markierung
 * zurück, während die zweite noch laufen sollte.
 */
export const FLASH_DURATION_MS = 2_000

/**
 * Welche dieser Ids leuchten gerade schon?
 *
 * Für die genügt es nicht, sie erneut einzutragen: Eine laufende
 * CSS-Animation läuft nicht neu an, nur weil ihre Klasse nochmals gesetzt
 * wird. Sie müssen die Klasse erst verlieren (siehe `mark`).
 */
export function alreadyMarked(
  marks: ReadonlyMap<string, number>,
  ids: readonly string[],
): string[] {
  return ids.filter(id => marks.has(id))
}

/**
 * Nimmt die Markierungen EINES Aufrufs zurück, und nur diese.
 *
 * Trägt eine Id inzwischen eine neuere Nummer, wurde sie nach diesem Aufruf
 * erneut gemeldet und bleibt stehen. Ihr eigener Zeitgeber räumt sie später
 * ab. Gibt zurück, ob sich etwas geändert hat — nur dann muss die Oberfläche
 * neu zeichnen.
 */
export function releaseMarks(
  marks: Map<string, number>,
  ids: readonly string[],
  stamp: number,
): boolean {
  let changed = false
  for (const id of ids) {
    if (marks.get(id) !== stamp) continue
    marks.delete(id)
    changed = true
  }
  return changed
}

export function useRecentlyChanged() {
  // Ein Zähler an der Seite: `useState` mit einer Map erkennt Änderungen an
  // der Map selbst nicht, weil die Referenz dieselbe bleibt. Statt bei jeder
  // Markierung eine neue Map zu bauen, wird gezählt.
  const marks = useState<Map<string, number>>('recently-changed', () => new Map())
  const version = useState<number>('recently-changed-version', () => 0)
  const counter = useState<number>('recently-changed-counter', () => 0)

  function apply(ids: readonly string[]): void {
    counter.value += 1
    const stamp = counter.value

    for (const id of ids) marks.value.set(id, stamp)
    version.value += 1

    setTimeout(() => {
      if (releaseMarks(marks.value, ids, stamp)) version.value += 1
    }, FLASH_DURATION_MS)
  }

  /**
   * Merkt sich Ids für die Dauer des Aufleuchtens.
   *
   * Leuchtet eine der Ids bereits, verliert sie ihre Markierung für genau
   * einen Bildlauf und bekommt sie danach neu. Das ist kein Kunstgriff um des
   * Kunstgriffs willen, sondern die Bedingung des Browsers: Entfernen und
   * erneutes Setzen einer Klasse innerhalb desselben Bildlaufs sieht er gar
   * nicht, die Animation liefe also nicht neu an. Zwei verschachtelte
   * `requestAnimationFrame` sind das dokumentierte Mittel — das erste läuft
   * noch vor dem Zeichnen des aktuellen Standes, das zweite danach.
   *
   * Android braucht diesen Umweg nicht: Dort setzt `Modifier.deltaFlash` die
   * Animation über `snapTo` selbst zurück.
   */
  function mark(newIds: readonly string[]): void {
    if (newIds.length === 0 || import.meta.server) return

    const running = alreadyMarked(marks.value, newIds)
    if (running.length === 0) {
      apply(newIds)
      return
    }

    for (const id of running) marks.value.delete(id)
    version.value += 1
    requestAnimationFrame(() => requestAnimationFrame(() => apply(newIds)))
  }

  /** Leuchtet diese Fläche gerade? */
  const isRecent = computed(() => {
    // Der Zähler wird gelesen, damit Vue die Abhängigkeit kennt.
    void version.value
    return (id: string): boolean => marks.value.has(id)
  })

  return { mark, isRecent }
}

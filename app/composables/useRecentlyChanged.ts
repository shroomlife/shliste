/**
 * Zeilen, die gerade ein anderes Gerät geändert hat.
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
 */
export const FLASH_DURATION_MS = 2_000

export function useRecentlyChanged() {
  // Ein Zähler an der Seite: `useState` mit einem Set erkennt Änderungen am
  // Set selbst nicht, weil die Referenz dieselbe bleibt. Statt bei jeder
  // Markierung ein neues Set zu bauen, wird gezählt.
  const ids = useState<Set<string>>('recently-changed', () => new Set())
  const version = useState<number>('recently-changed-version', () => 0)

  /**
   * Merkt sich Ids für die Dauer des Aufleuchtens.
   *
   * Je Aufruf ein eigener Zeitgeber: Wird dieselbe Id kurz darauf erneut
   * gemeldet, verlängert das ihre Zeit, statt sie vorzeitig zu beenden.
   */
  function mark(newIds: readonly string[]): void {
    if (newIds.length === 0 || import.meta.server) return

    for (const id of newIds) ids.value.add(id)
    version.value += 1

    setTimeout(() => {
      for (const id of newIds) ids.value.delete(id)
      version.value += 1
    }, FLASH_DURATION_MS)
  }

  /** Leuchtet diese Zeile gerade? */
  const isRecent = computed(() => {
    // Der Zähler wird gelesen, damit Vue die Abhängigkeit kennt.
    void version.value
    return (id: string): boolean => ids.value.has(id)
  })

  return { mark, isRecent }
}

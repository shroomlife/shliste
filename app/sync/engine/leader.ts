/**
 * Nur ein Tab gleicht gleichzeitig ab.
 *
 * WARUM DAS NÖTIG IST
 *
 * Bis hierher hatte jeder offene Tab seine eigene Sync-Schleife, seinen eigenen
 * Mutex und seine eigene Vorstellung davon, was gerade läuft — gegen DIESELBE
 * IndexedDB. Zwei Tabs konnten also gleichzeitig ziehen, zusammenführen und
 * schreiben. Der Mutex in `sync.ts` schützt davor nicht: Er lebt im
 * Arbeitsspeicher genau eines Tabs.
 *
 * Die Folgen sind unauffällig und teuer: doppelte Abfragen, doppelte Arbeit,
 * und im schlechtesten Fall zwei Läufe, die sich gegenseitig ihre gerade
 * geschriebenen Dirty-Flags wegnehmen.
 *
 * WARUM WEB LOCKS UND KEIN EIGENER APPARAT
 *
 * `navigator.locks` gibt die Sperre beim Schließen des Tabs von selbst frei —
 * auch beim Absturz, auch beim harten Beenden. Eine selbstgebaute Sperre über
 * IndexedDB oder localStorage bräuchte dafür ein Wasserzeichen, einen
 * Zeitgeber, der es erneuert, und eine Regel, ab wann eine fremde Sperre als
 * verwaist gilt. Das ist genau die Sorte Maschinerie, die dann selbst ausfällt.
 *
 * WAS PASSIERT, WENN DIE SPERRE BELEGT IST — ZWEI ANTWORTEN
 *
 * Für Zeitgeber und Ereignisse: nichts. `ifAvailable` heißt, der Aufruf kehrt
 * sofort zurück, statt sich anzustellen. Eine Warteschlange aus Zeitgebern
 * entlüde sich beim Freiwerden auf einmal und führe denselben Lauf mehrfach.
 *
 * Für eine ausdrückliche Handlung des Nutzers: anstellen. Wer auf "Jetzt
 * abgleichen" drückt oder einen Konflikt entscheidet, hat genau einen Wunsch
 * geäußert — den still fallenzulassen, weil ein anderer Tab gerade arbeitet,
 * sieht aus wie eine kaputte App. Ein Tastendruck ist eine Warteschlange von
 * eins, und der Knopf ist so lange in seinem Ladezustand.
 */

/** Name der Sperre. Ein fester Wert, damit ihn alle Tabs teilen. */
export const SYNC_LOCK_NAME = 'shliste-sync'

/**
 * Der Ausschnitt der Web-Locks-API, den dieses Modul braucht.
 *
 * Eigene Form statt der eingebauten Typen: So lässt sich die Sperre im Test
 * einsetzen, ohne einen Browser nachzubauen, und der Rückfall unten wird
 * überhaupt prüfbar.
 */
export interface LockManagerLike {
  request: (
    name: string,
    options: { mode: 'exclusive', ifAvailable?: true },
    callback: (lock: unknown | null) => Promise<void>,
  ) => Promise<void>
}

/**
 * Was tun, wenn ein anderer Tab die Sperre hält?
 *
 * `skipIfBusy` — sofort zurückkehren. Für alles, was von selbst wiederkommt:
 * Zeitgeber, Echtzeit-Ereignisse, Herzschlag.
 * `waitForTurn` — anstellen und danach laufen. Für ausdrückliche Handlungen
 * des Nutzers, die sonst wirkungslos verpuffen würden.
 */
export type LeaderMode = 'skipIfBusy' | 'waitForTurn'

export interface LeaderOptions {
  mode?: LeaderMode
  /** Einsetzbar für den Test; sonst die Web-Locks-API des Browsers. */
  locks?: LockManagerLike
}

/** Ergebnis eines Versuchs, unter der Sperre zu laufen. */
export type LeaderOutcome<T>
  = | { readonly ran: true, readonly value: T }
    | { readonly ran: false }

/**
 * Führt `arbeit` aus, sofern gerade kein anderer Tab abgleicht.
 *
 * OHNE WEB LOCKS läuft die Arbeit einfach direkt — genau wie bisher. Ein
 * Browser ohne diese Fähigkeit soll nicht schlechter dastehen als vor diesem
 * Umbau, sondern nur nicht besser. Die Fähigkeitsprüfung ist deshalb ein
 * Rückfall, kein Abbruch.
 */
export async function runAsLeader<T>(
  arbeit: () => Promise<T>,
  options: LeaderOptions = {},
): Promise<LeaderOutcome<T>> {
  const locks = options.locks ?? (globalThis.navigator?.locks as LockManagerLike | undefined)

  if (locks === undefined) {
    return { ran: true, value: await arbeit() }
  }

  let ergebnis: LeaderOutcome<T> = { ran: false }
  // Ohne `ifAvailable` stellt sich die Anfrage an — das ist die ganze
  // Unterscheidung, die Web Locks dafür brauchen.
  const anfrage = options.mode === 'waitForTurn'
    ? { mode: 'exclusive' as const }
    : { mode: 'exclusive' as const, ifAvailable: true as const }

  await locks.request(SYNC_LOCK_NAME, anfrage, async (lock) => {
    // `null` heißt: Die Sperre ist belegt, ein anderer Tab arbeitet gerade.
    // Beim Anstellen kann das nicht vorkommen, die Prüfung kostet aber nichts.
    if (lock === null) return
    ergebnis = { ran: true, value: await arbeit() }
  })

  return ergebnis
}

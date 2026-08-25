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
 * `navigator.locks` gibt die Sperre beim Schliessen des Tabs von selbst frei —
 * auch beim Absturz, auch beim harten Beenden. Eine selbstgebaute Sperre über
 * IndexedDB oder localStorage bräuchte dafür ein Wasserzeichen, einen
 * Zeitgeber, der es erneuert, und eine Regel, ab wann eine fremde Sperre als
 * verwaist gilt. Das ist genau die Sorte Maschinerie, die dann selbst ausfällt.
 *
 * WAS PASSIERT, WENN DIE SPERRE BELEGT IST
 *
 * Nichts. `ifAvailable` heisst: Läuft der Abgleich schon woanders, kehrt dieser
 * Aufruf sofort zurück, statt sich anzustellen. Anstehen wäre hier falsch — die
 * Auslöser sind Zeitgeber und Ereignisse, und eine Warteschlange davon würde
 * sich beim Freiwerden auf einmal entladen.
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
    options: { mode: 'exclusive', ifAvailable: true },
    callback: (lock: unknown | null) => Promise<void>,
  ) => Promise<void>
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
  locks: LockManagerLike | undefined = globalThis.navigator?.locks as LockManagerLike | undefined,
): Promise<LeaderOutcome<T>> {
  if (locks === undefined) {
    return { ran: true, value: await arbeit() }
  }

  let ergebnis: LeaderOutcome<T> = { ran: false }

  await locks.request(SYNC_LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
    // `null` heisst: Die Sperre ist belegt, ein anderer Tab arbeitet gerade.
    if (lock === null) return
    ergebnis = { ran: true, value: await arbeit() }
  })

  return ergebnis
}

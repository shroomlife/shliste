/**
 * Klärt beim Start, ob eine Sitzung besteht — und bleibt dran, bis die Frage
 * beantwortet ist.
 *
 * Warum ein Plugin und nicht eine Komponente: Von dieser Auskunft hängen
 * inzwischen mehrere Teile ab — der Anmeldeknopf, die Sync-Anzeige, der
 * Abgleich selbst und die Echtzeit-Verbindung. Hänge sie am Mounten einer
 * einzelnen Komponente, wäre sie beim nächsten Umbau der Oberfläche
 * unbemerkt weg.
 *
 * `.client`, weil das Session-Cookie httpOnly ist: Ein Aufruf während des
 * serverseitigen Renderns hätte die Cookies des Besuchers nicht dabei und
 * bekäme verlässlich "abgemeldet" zurück — ein Ergebnis, das die Hydration
 * gleich darauf widerlegen würde.
 *
 * Bewusst ohne `await`: Die Oberfläche ist ohne Konto vollständig benutzbar
 * und soll nicht auf eine Netzantwort warten, bevor sie erscheint.
 *
 * WARUM NACHVERSUCHE: Ein einziger gescheiterter Aufruf hat die App früher für
 * die gesamte Sitzung ausgesperrt. `loadSession()` behält bei einem Fehler
 * bewusst den bekannten Zustand — beim Kaltstart IST der bekannte Zustand aber
 * nur der Startwert "abgemeldet", und der galt ab da als Auskunft. Kein
 * Abgleich mehr, kein Offline-Band (es hängt an `isSignedIn`), und der
 * Anmeldeknopf gesperrt mit "auf diesem Server nicht eingerichtet", weil auch
 * die Client-Konfiguration aus diesem Aufruf kommt. Zurück führte kein Weg:
 * Jeder Pfad, der die Frage neu gestellt hätte, prüft vorher selbst auf eine
 * Anmeldung. Der Regelfall dafür ist der Start der installierten App ohne
 * Netz — die Hülle kommt aus dem Cache, `/api/**` steht auf der Denylist.
 *
 * Deshalb hier: eine kurze Staffel eigener Versuche für den Aussetzer beim
 * Start, danach die beiden Ereignisse, die eine echte Änderung der Lage
 * melden. Ein Zeitgeber, der in die Ewigkeit weiterläuft, wäre für eine Frage,
 * die sich beim nächsten Blick auf die App ohnehin klärt, der falsche Aufwand.
 */

/** Abstände der Nachversuche in Millisekunden, danach übernehmen die Ereignisse. */
const RETRY_DELAYS_MS = [1_000, 5_000, 20_000]

export default defineNuxtPlugin(() => {
  const { loadSession, isSessionKnown } = useAuth()

  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false

  function scheduleRetry(): void {
    if (isSessionKnown.value || timer !== null) return

    const delay = RETRY_DELAYS_MS[attempt]
    if (delay === undefined) return

    attempt += 1
    timer = setTimeout(() => {
      timer = null
      ask()
    }, delay)
  }

  function ask(): void {
    // Eine beantwortete Frage wird nicht erneut gestellt, und zwei Aufrufe
    // gleichzeitig würden sich nur gegenseitig überschreiben.
    if (isSessionKnown.value || inFlight) return

    inFlight = true
    void loadSession().finally(() => {
      inFlight = false
      scheduleRetry()
    })
  }

  ask()

  // Netz wieder da: der Grund, aus dem der Startaufruf am häufigsten scheitert.
  window.addEventListener('online', ask)

  // Zurück in der App: deckt den Fall ab, dass die Staffel oben aufgebraucht
  // ist und sich in der Zwischenzeit etwas geändert hat.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ask()
  })
})

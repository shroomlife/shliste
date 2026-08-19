/**
 * Die Echtzeit-Verbindung des Browsers zu api.shliste.app.
 *
 * WARUM ES EINEN TICKET-UMWEG GIBT: `EventSource` kann keine Header setzen,
 * weder `Authorization` noch die HMAC-Header der API. Der Browser holt sich
 * deshalb über die eigene BFF ein kurzlebiges Einmal-Ticket und hängt es an die
 * Stream-Adresse. Das Session-JWT dürfte dort niemals stehen, ein Ticket schon:
 * es ist einmal einlösbar und nach rund 30 Sekunden ohnehin tot.
 *
 * WARUM DER EINGEBAUTE RECONNECT NICHT TAUGT: `EventSource` verbindet nach
 * einem Abbruch von selbst neu, und zwar mit derselben Adresse. Das Ticket
 * darin ist zu diesem Zeitpunkt bereits eingelöst und abgelaufen, der Browser
 * liefe also dauerhaft in 401. Deshalb wird bei jedem Fehler geschlossen und
 * mit eigenem Backoff sowie frischem Ticket neu verbunden.
 *
 * Der Backoff entspricht dem Android-Client (SyncEventSource.kt): 2 Sekunden,
 * Verdopplung bis 60 Sekunden, dazu 25 Prozent Streuung nach oben wie unten,
 * damit nach einem Serverneustart nicht alle Geräte im Gleichtakt anklopfen.
 *
 * Diese Datei kennt weder Vue noch Nuxt. Sie ist absichtlich nur Zustand plus
 * Rückrufe, damit sie ohne Netz und ohne Komponente geprüft werden kann.
 */
import { getLastEventId, setLastEventId } from '~/db/repositories'
import { parseRealtimeEvent, SYNC_NEEDED, type RealtimeEvent } from './events'

/** Erster Wartewert nach einem Abbruch. */
export const INITIAL_BACKOFF_MS = 2_000

/** Obergrenze der Wartezeit. Darüber hinaus bringt längeres Warten nichts. */
export const MAX_BACKOFF_MS = 60_000

/** Streuung der Wartezeit, 25 Prozent nach oben wie nach unten. */
export const BACKOFF_JITTER_RATIO = 0.25

/**
 * Ab so vielen Fehlversuchen in Folge gilt der Stream als unzuverlässig.
 *
 * Ein einzelner Abbruch ist Alltag: Netzwechsel, Proxy-Timeout, oder der
 * Server schliesst die älteste Verbindung, sobald ein Konto mehr als fünf
 * offen hat. Erst mehrere Fehlschläge ohne einen einzigen erfolgreichen
 * Verbindungsaufbau bedeuten, dass Echtzeit gerade nicht funktioniert und der
 * Aufrufer auf Abfrage im Minutentakt umstellen sollte.
 */
export const DEGRADED_AFTER_FAILURES = 3

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'reconnecting'

export interface RealtimeConnectionOptions {
  /** Basisadresse der API, z.B. https://api.shliste.app */
  apiBase: string
  /** Holt ein frisches Einmal-Ticket. Wird vor JEDEM Verbindungsaufbau gerufen. */
  requestTicket: () => Promise<string>
  /** Ein empfangenes, entdupliziertes Ereignis. */
  onEvent: (event: RealtimeEvent) => void
  onStatus?: (status: RealtimeStatus) => void
  /** Meldet, sobald `DEGRADED_AFTER_FAILURES` erreicht ist, und danach je Fehlversuch. */
  onDegraded?: (consecutiveFailures: number) => void
  /** Nur für Tests: die Zufallsquelle der Streuung austauschbar machen. */
  random?: () => number
}

export interface RealtimeConnection {
  /** Verbindet, falls noch nicht verbunden. Mehrfach aufrufbar. */
  start: () => void
  /** Trennt und räumt Verbindung sowie Zeitgeber ab. Mehrfach aufrufbar. */
  stop: () => void
}

/** Die beiden Zahlen einer Redis-Stream-Id. */
export interface StreamId {
  millis: number
  sequence: number
}

/**
 * Zerlegt eine Redis-Stream-Id der Form `{epochMillis}-{sequence}`.
 *
 * `null` heisst "nicht deutbar". Beide Teile müssen sichere Ganzzahlen sein,
 * sonst wäre der Vergleich darunter wertlos.
 */
export function parseStreamId(id: string): StreamId | null {
  const dash = id.indexOf('-')
  if (dash <= 0 || dash === id.length - 1) return null

  const millisPart = id.slice(0, dash)
  const sequencePart = id.slice(dash + 1)

  // Number() schluckt Leerraum, Vorzeichen und Exponentialschreibweise. Ein
  // Stream-Teil besteht ausschliesslich aus Ziffern.
  if (!/^\d+$/.test(millisPart) || !/^\d+$/.test(sequencePart)) return null

  const millis = Number(millisPart)
  const sequence = Number(sequencePart)
  if (!Number.isSafeInteger(millis) || !Number.isSafeInteger(sequence)) return null

  return { millis, sequence }
}

/**
 * Ist `candidate` jünger als `last`?
 *
 * ZEICHENVERGLEICH REICHT NICHT: Die Zahlen haben keine feste Länge. `'10-0'`
 * ist als Zeichenkette kleiner als `'9-0'`, als Stream-Id aber grösser.
 *
 * Nicht deutbare Ids gelten als jünger. Die Deduplizierung ist eine
 * Optimierung gegen das Überlappungsfenster zwischen Nachlieferung und
 * Live-Zustellung; im Zweifel wird ein Ereignis lieber doppelt verarbeitet als
 * verschluckt. Doppelt heisst hier nur: ein zweiter, folgenloser Delta-Abruf.
 */
export function isNewerEventId(candidate: string, last: string | null): boolean {
  if (last === null) return true

  const next = parseStreamId(candidate)
  if (next === null) return true

  const previous = parseStreamId(last)
  if (previous === null) return true

  if (next.millis !== previous.millis) return next.millis > previous.millis
  return next.sequence > previous.sequence
}

/** Verdoppelt die Wartezeit bis zur Obergrenze. */
export function nextBackoffMs(current: number): number {
  return Math.min(current * 2, MAX_BACKOFF_MS)
}

/**
 * Legt die Streuung auf die Wartezeit.
 *
 * `random` liefert wie `Math.random` einen Wert in [0, 1). Daraus wird ein
 * Faktor in [0.75, 1.25]. Die Zufallsquelle ist ein Parameter, damit ein Test
 * die Ränder des Bandes gezielt treffen kann.
 */
export function backoffDelayMs(base: number, random: () => number = Math.random): number {
  const spread = base * BACKOFF_JITTER_RATIO * (random() * 2 - 1)
  return Math.round(base + spread)
}

/**
 * Baut die Stream-Adresse.
 *
 * Beide Werte werden kodiert: Das Ticket ist zwar hexadezimal und der Cursor
 * ein Zahlenpaar, aber beides kommt von aussen und gehört deshalb nicht
 * ungeprüft in eine Adresse.
 */
export function buildStreamUrl(apiBase: string, ticket: string, lastEventId: string | null): string {
  const base = apiBase.replace(/\/+$/, '')
  const query = new URLSearchParams({ ticket })
  if (lastEventId !== null) query.set('lastEventId', lastEventId)
  return `${base}/realtime/events?${query.toString()}`
}

/**
 * Erzeugt eine Verbindung. Sie ist zunächst untätig, erst `start()` verbindet.
 *
 * Der Aufrufer bekommt bewusst kein `EventSource` in die Hand: Wer die
 * Verbindung von aussen anfassen kann, kann auch deren eingebauten Reconnect
 * wieder anwerfen.
 */
export function createRealtimeConnection(options: RealtimeConnectionOptions): RealtimeConnection {
  const random = options.random ?? Math.random

  let source: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let backoffMs = INITIAL_BACKOFF_MS
  let consecutiveFailures = 0
  let status: RealtimeStatus = 'idle'

  /** "Diese Verbindung ist gewollt." Nur `start` setzt, nur `stop` löscht. */
  let wanted = false

  /**
   * Nummer des laufenden Verbindungsversuchs.
   *
   * Zwischen Ticket-Abruf und `new EventSource` liegt ein `await`. Ein `stop()`
   * in genau diesem Fenster bliebe sonst folgenlos und liesse eine ungewollte
   * Verbindung zurück. Jeder Versuch merkt sich seine Nummer und bricht ab,
   * sobald sie überholt wurde.
   */
  let attempt = 0

  let lastEventId: string | null = null
  let lastEventIdLoaded = false

  /**
   * Stand diese Verbindung schon einmal?
   *
   * Überlebt `stop()` mit Absicht: Auch eine gewollte Pause (Tab im
   * Hintergrund) hinterlässt eine Lücke, und beim Fortsetzen ist ein
   * vollständiger Abgleich genauso nötig wie nach einem Abbruch.
   */
  let hasBeenOpen = false

  function setStatus(next: RealtimeStatus): void {
    if (status === next) return
    status = next
    options.onStatus?.(next)
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer === null) return
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  function closeSource(): void {
    if (source === null) return
    // Erst die Rückrufe lösen, dann schliessen: ein bereits eingereihtes
    // Ereignis würde sonst noch zugestellt und den Zustand weiterdrehen.
    source.onopen = null
    source.onmessage = null
    source.onerror = null
    source.close()
    source = null
  }

  /**
   * Merkt sich den Cursor des Streams.
   *
   * Bewusst ohne `await`: Der Cursor ist eine Optimierung für den nächsten
   * Verbindungsaufbau. Auf das Schreiben in IndexedDB zu warten würde die
   * Ereignisverarbeitung serialisieren, ohne dass jemand auf das Ergebnis
   * angewiesen wäre. Ein Fehler bedeutet lediglich eine Nachlieferung mehr.
   */
  function rememberEventId(id: string): void {
    lastEventId = id
    void setLastEventId(id).catch(() => undefined)
  }

  function handleMessage(event: MessageEvent<string>): void {
    // Kommentarzeilen (`: connected`, `: heartbeat`) reicht der Browser gar
    // nicht durch. Hier landen ausschliesslich echte Ereignisse.
    const id = event.lastEventId
    if (id.length > 0) {
      if (!isNewerEventId(id, lastEventId)) return
      rememberEventId(id)
    }

    options.onEvent(parseRealtimeEvent(event.data) ?? SYNC_NEEDED)
  }

  function handleOpen(): void {
    backoffMs = INITIAL_BACKOFF_MS
    consecutiveFailures = 0
    setStatus('open')

    if (hasBeenOpen) {
      // Nach einer Unterbrechung liefert der Server ab dem Cursor nach, aber
      // nur begrenzt (100 Ereignisse, und der Stream selbst hält rund 1000).
      // Nach langer Pause oder ganz ohne Cursor bleibt deshalb eine Lücke, die
      // nur ein vollständiger Abgleich schliesst. Der Zeitpunkt ist Absicht:
      // beim Abbruch selbst ist ohnehin kein Netz da, um etwas zu holen. Gilt
      // ebenso beim Fortsetzen nach einer gewollten Pause.
      options.onEvent(SYNC_NEEDED)
    }
    hasBeenOpen = true
  }

  /** Jeder ungewollte Abbruch, egal ob Ticket, Netz oder Server. */
  function handleFailure(): void {
    closeSource()
    if (!wanted) return

    consecutiveFailures += 1
    if (consecutiveFailures >= DEGRADED_AFTER_FAILURES) {
      options.onDegraded?.(consecutiveFailures)
    }

    scheduleReconnect()
  }

  function scheduleReconnect(): void {
    if (!wanted || reconnectTimer !== null) return

    const delay = backoffDelayMs(backoffMs, random)
    backoffMs = nextBackoffMs(backoffMs)
    setStatus('reconnecting')

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, delay)
  }

  async function connect(): Promise<void> {
    if (!wanted || source !== null) return

    const mine = ++attempt
    setStatus('connecting')

    if (!lastEventIdLoaded) {
      // Der Cursor überlebt einen Neustart der App. Ohne ihn beginnt der
      // Stream ohne Nachlieferung, und alles zwischen zwei Sitzungen wäre erst
      // beim nächsten vollständigen Abgleich zu sehen.
      lastEventId = await getLastEventId().catch(() => null)
      lastEventIdLoaded = true
      if (!wanted || mine !== attempt) return
    }

    let ticket: string
    try {
      ticket = await options.requestTicket()
    }
    catch {
      // Kein Ticket heisst: keine Sitzung, kein Netz, oder die BFF ist gerade
      // nicht erreichbar. Alle drei sind vorübergehend behandelbar.
      if (!wanted || mine !== attempt) return
      handleFailure()
      return
    }

    if (!wanted || mine !== attempt) return

    const next = new EventSource(buildStreamUrl(options.apiBase, ticket, lastEventId))
    source = next
    next.onopen = handleOpen
    next.onmessage = handleMessage
    next.onerror = () => {
      // Ab hier würde `EventSource` von selbst mit derselben, inzwischen
      // wertlosen Adresse weiterprobieren. Genau das unterbindet das
      // `closeSource` in `handleFailure`.
      if (source !== next) return
      handleFailure()
    }
  }

  return {
    start(): void {
      if (wanted) return
      wanted = true
      backoffMs = INITIAL_BACKOFF_MS
      consecutiveFailures = 0
      void connect()
    },

    stop(): void {
      wanted = false
      // Laufende Versuche entwerten, sonst verbindet ein noch offener
      // Ticket-Abruf nach dem Trennen doch noch.
      attempt += 1
      clearReconnectTimer()
      closeSource()
      backoffMs = INITIAL_BACKOFF_MS
      consecutiveFailures = 0
      setStatus('idle')
    },
  }
}

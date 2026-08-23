/// <reference types="bun" />
/**
 * Der Zustandsautomat der Verbindung, mit einem nachgebauten `EventSource`.
 *
 * Geprüft wird der Totmann-Schalter: Eine halb offene Verbindung meldet keinen
 * Fehler und liefert keine Ereignisse mehr — nur die ausbleibenden Herzschläge
 * verraten sie. Genau dieses Verhalten lässt sich in keinem Browsertest
 * vernünftig herstellen, wohl aber hier mit gestellten Zeitgebern.
 *
 * Die reinen Bausteine (Stream-Ids, Backoff, Adressbau) stehen in
 * `connection.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, jest, mock, test } from 'bun:test'

// Ohne diesen Ersatz würde `getLastEventId()` auf IndexedDB warten, das es
// ausserhalb eines Browsers nicht gibt — der Aufruf löste sich nie auf und der
// Verbindungsaufbau käme nie über sein erstes `await` hinaus.
let gespeicherterCursor: string | null = null
mock.module('~/db/repositories', () => ({
  getLastEventId: () => Promise.resolve(gespeicherterCursor),
  setLastEventId: (value: string | null) => {
    gespeicherterCursor = value
    return Promise.resolve()
  },
}))

const {
  createRealtimeConnection,
  DEGRADED_AFTER_FAILURES,
  INITIAL_BACKOFF_MS,
  LIVENESS_TIMEOUT_MS,
  MAX_BACKOFF_MS,
} = await import('./connection')

/** Der zuletzt gebaute Ersatz — die Tests sprechen ihn direkt an. */
let letzteQuelle: FakeEventSource | null = null
let gebauteQuellen = 0

/**
 * Ein `EventSource`, das nichts tut, bis ein Test es anstösst.
 *
 * Bewusst kein automatisches `open`: Der Zeitpunkt des Verbindungsaufbaus ist
 * in mehreren Zusicherungen genau das, worauf es ankommt.
 */
class FakeEventSource {
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  private listeners = new Map<string, Set<() => void>>()

  constructor(readonly url: string) {
    registriere(this)
  }

  addEventListener(type: string, handler: () => void): void {
    const set = this.listeners.get(type) ?? new Set()
    set.add(handler)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, handler: () => void): void {
    this.listeners.get(type)?.delete(handler)
  }

  close(): void {
    this.closed = true
  }

  // --- Anstösse für die Tests ---

  emitOpen(): void {
    this.onopen?.()
  }

  emitHeartbeat(): void {
    for (const handler of this.listeners.get('heartbeat') ?? []) handler()
  }

  /** Anzahl der noch eingetragenen Zuhörer eines Typs. */
  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0
  }
}

/** Getrennt von der Klasse, damit kein `this` in eine Variable wandert. */
function registriere(quelle: FakeEventSource): void {
  letzteQuelle = quelle
  gebauteQuellen += 1
}

interface Aufbau {
  events: string[]
  /** Jede Meldung von `onDegraded`, in der Reihenfolge des Auftretens. */
  degraded: number[]
  stop: () => void
}

/**
 * Baut eine gestartete Verbindung und wartet, bis das `EventSource` steht.
 *
 * Zwischen `start()` und dem Konstruktoraufruf liegen zwei `await` (Cursor und
 * Ticket). `flush()` arbeitet die Mikrotasks ab, ohne einen Zeitgeber zu
 * bewegen — sonst liefe die Frist mit, die gerade geprüft werden soll.
 */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

function aufbauen(): Aufbau {
  const events: string[] = []
  const degraded: number[] = []
  const connection = createRealtimeConnection({
    apiBase: 'https://api.shliste.app',
    requestTicket: () => Promise.resolve('t'.repeat(64)),
    onEvent: event => events.push(event.type),
    onDegraded: failures => degraded.push(failures),
    random: () => 0.5,
  })
  connection.start()
  return { events, degraded, stop: connection.stop }
}

/**
 * Einmal aufbauen, wahlweise einen Rahmen liefern, dann verstummen lassen.
 *
 * Die grosszügige zweite Wartezeit deckt jede Stufe des Backoff ab — der Test
 * interessiert sich für die Eskalation, nicht für die genaue Wartezeit.
 */
async function eineRunde(mitRahmen: boolean): Promise<void> {
  await flush()
  letzteQuelle?.emitOpen()
  if (mitRahmen) letzteQuelle?.emitHeartbeat()
  jest.advanceTimersByTime(LIVENESS_TIMEOUT_MS + 1)
  jest.advanceTimersByTime(MAX_BACKOFF_MS + 1)
}

beforeEach(() => {
  jest.useFakeTimers()
  letzteQuelle = null
  gebauteQuellen = 0
  gespeicherterCursor = null
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource
})

afterEach(() => {
  jest.useRealTimers()
  delete (globalThis as { EventSource?: unknown }).EventSource
})

describe('Totmann-Schalter', () => {
  test('abonniert den benannten Herzschlag', async () => {
    const { stop } = aufbauen()
    await flush()

    // Ohne diesen Zuhörer wäre der Herzschlag unsichtbar: Er erreicht
    // `onmessage` ausdrücklich nicht.
    expect(letzteQuelle?.listenerCount('heartbeat')).toBe(1)
    stop()
  })

  test('schlägt zu, wenn die Herzschläge ausbleiben', async () => {
    const { stop } = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()

    const ersteQuelle = letzteQuelle
    expect(ersteQuelle?.closed).toBe(false)

    // Kein Fehler, kein Ereignis — nur Stille. Genau der Zustand, den eine
    // halb offene Verbindung hinterlässt.
    jest.advanceTimersByTime(LIVENESS_TIMEOUT_MS + 1)

    expect(ersteQuelle?.closed).toBe(true)
    stop()
  })

  test('baut nach dem Zuschlagen mit Backoff neu auf', async () => {
    const { stop } = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    expect(gebauteQuellen).toBe(1)

    jest.advanceTimersByTime(LIVENESS_TIMEOUT_MS + 1)
    // Die Wartezeit ist der übliche Backoff, hier ohne Streuung (random 0.5).
    jest.advanceTimersByTime(INITIAL_BACKOFF_MS + 1)
    await flush()

    expect(gebauteQuellen).toBe(2)
    stop()
  })

  test('ein Herzschlag setzt die Frist zurück', async () => {
    const { stop } = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    const quelle = letzteQuelle

    // Kurz vor Fristablauf ein Lebenszeichen — danach muss wieder die volle
    // Frist zur Verfügung stehen.
    jest.advanceTimersByTime(LIVENESS_TIMEOUT_MS - 1_000)
    quelle?.emitHeartbeat()
    jest.advanceTimersByTime(LIVENESS_TIMEOUT_MS - 1_000)

    expect(quelle?.closed).toBe(false)

    jest.advanceTimersByTime(2_000)
    expect(quelle?.closed).toBe(true)
    stop()
  })

  test('läuft erst ab dem Verbindungsaufbau', async () => {
    const { stop } = aufbauen()
    await flush()
    const quelle = letzteQuelle

    // Solange `onopen` nicht kam, gibt es nichts zu bewachen: Ein hängender
    // Verbindungsaufbau ist Sache des Browsers und endet in `onerror`.
    jest.advanceTimersByTime(LIVENESS_TIMEOUT_MS * 2)
    expect(quelle?.closed).toBe(false)
    stop()
  })

  test('eine Verbindung, die nie einen Rahmen liefert, steigert sich', async () => {
    const { degraded, stop } = aufbauen()

    // Kopfzeilen kommen an, der Rumpf nie — das Bild eines puffernden Proxys
    // oder eines Captive Portals.
    for (let runde = 0; runde < DEGRADED_AFTER_FAILURES; runde++) await eineRunde(false)
    await flush()

    // Würde `onopen` allein schon als Beweis gelten, stünden Wartezeit und
    // Fehlerzähler nach jeder Runde wieder auf null: eine Schleife im immer
    // gleichen Takt, die nie auf Abfrage im Minutentakt umschaltet.
    expect(degraded.length).toBeGreaterThan(0)
    stop()
  })

  test('ein gelieferter Rahmen macht die Verbindung wieder unverdächtig', async () => {
    const { degraded, stop } = aufbauen()

    for (let runde = 0; runde < DEGRADED_AFTER_FAILURES + 1; runde++) await eineRunde(true)
    await flush()

    // Ein Strom, der liefert und dann abreisst, ist Alltag — Netzwechsel,
    // Serverneustart. Das darf sich nicht zu "Echtzeit geht nicht" aufsummieren.
    expect(degraded).toEqual([])
    stop()
  })

  test('nach stop() schlägt keine Frist mehr zu', async () => {
    const { stop } = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    stop()

    const vorher = gebauteQuellen
    jest.advanceTimersByTime(LIVENESS_TIMEOUT_MS * 3)
    await flush()

    // Ein zurückgebliebener Zeitgeber würde eine getrennte Verbindung wieder
    // aufwecken — im Hintergrund-Tab genau das, was vermieden werden soll.
    expect(gebauteQuellen).toBe(vorher)
  })
})

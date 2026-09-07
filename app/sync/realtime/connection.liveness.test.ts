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
// außerhalb eines Browsers nicht gibt — der Aufruf löste sich nie auf und der
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
 * Ein `EventSource`, das nichts tut, bis ein Test es anstößt.
 *
 * Bewusst kein automatisches `open`: Der Zeitpunkt des Verbindungsaufbaus ist
 * in mehreren Zusicherungen genau das, worauf es ankommt.
 */
class FakeEventSource {
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  private listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>()

  constructor(readonly url: string) {
    registriere(this)
  }

  addEventListener(type: string, handler: (event: MessageEvent<string>) => void): void {
    const set = this.listeners.get(type) ?? new Set()
    set.add(handler)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, handler: (event: MessageEvent<string>) => void): void {
    this.listeners.get(type)?.delete(handler)
  }

  close(): void {
    this.closed = true
  }

  // --- Anstöße für die Tests ---

  emitOpen(): void {
    this.onopen?.()
  }

  /**
   * Der Herzschlag trägt seit dem 25.08.2026 eine Nutzlast: die
   * Änderungsnummer des Kontos. Der Standardwert bildet die ältere API nach,
   * die einen leeren Rahmen schickte.
   */
  emitHeartbeat(data = '{}'): void {
    const event = { data } as MessageEvent<string>
    for (const handler of this.listeners.get('heartbeat') ?? []) handler(event)
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
  /** Jede vom Herzschlag gemeldete Änderungsnummer, in Reihenfolge. */
  seqs: number[]
  /** Jede Meldung von `onDegraded`, in der Reihenfolge des Auftretens. */
  degraded: number[]
  /** Wie oft `onProven` gemeldet hat — der Beweis, dass wirklich etwas fließt. */
  proven: number
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
  const seqs: number[] = []
  const aufbau = {
    events,
    degraded,
    seqs,
    proven: 0,
    // Platzhalter: das echte `stop` kommt erst nach dem Aufbau der Verbindung.
    stop: (): void => {},
  }
  const connection = createRealtimeConnection({
    apiBase: 'https://api.shliste.app',
    requestTicket: () => Promise.resolve('t'.repeat(64)),
    onEvent: event => events.push(event.type),
    onDegraded: failures => degraded.push(failures),
    onProven: () => { aufbau.proven += 1 },
    onChangeSeq: seq => seqs.push(seq),
    random: () => 0.5,
  })
  connection.start()
  aufbau.stop = connection.stop
  return aufbau
}

/**
 * Einmal aufbauen, wahlweise einen Rahmen liefern, dann verstummen lassen.
 *
 * Die großzügige zweite Wartezeit deckt jede Stufe des Backoff ab — der Test
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

    // Ein Strom, der liefert und dann abreißt, ist Alltag — Netzwechsel,
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

describe('Bewiesen ist erst, was auch fließt', () => {
  test('ein bloßes open beweist NICHTS', async () => {
    /*
     * DER EIGENTLICHE FALL. Eine EventSource meldet `open`, sobald die
     * Antwortkopfzeilen da sind — ob je ein Byte Nutzlast folgt, sagt das
     * nicht. Vorher hat `useRealtime` genau daraufhin den degradierten Zustand
     * aufgehoben, und `useSync` hat die Minuten-Reserve abgeschaltet. Eine
     * offene, aber stumme Leitung ließ den Tab damit bis zur
     * 60-Sekunden-Frist ohne jeden Weg an neue Daten.
     */
    const aufbau = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()

    expect(aufbau.proven).toBe(0)
    aufbau.stop()
  })

  test('der erste Rahmen beweist die Leitung', async () => {
    const aufbau = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    letzteQuelle?.emitHeartbeat()

    expect(aufbau.proven).toBe(1)
    aufbau.stop()
  })

  test('weitere Rahmen melden nicht erneut', async () => {
    // Der Zustand ist erreicht, nicht wiederholt zu erreichen. Ein Melden bei
    // jedem Herzschlag wäre alle 15 Sekunden ein Schreibvorgang auf einen
    // reaktiven Wert, der sich gar nicht ändert.
    const aufbau = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    letzteQuelle?.emitHeartbeat()
    letzteQuelle?.emitHeartbeat()
    letzteQuelle?.emitHeartbeat()

    expect(aufbau.proven).toBe(1)
    aufbau.stop()
  })
})

describe('Änderungsnummer im Herzschlag', () => {
  test('meldet die Nummer aus der Nutzlast', async () => {
    /*
     * DER GRUND FÜR DIE GANZE MECHANIK: Der Herzschlag entsteht LOKAL im
     * API-Prozess, nicht in Redis. Fällt Redis aus, schlägt er weiter, während
     * kein einziges Ereignis mehr durchkommt — der Tab sieht eine kerngesunde
     * Leitung und ist trotzdem blind. Diese Zahl ist dann das Einzige, woran
     * er es merkt.
     */
    const aufbau = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    letzteQuelle?.emitHeartbeat(JSON.stringify({ seq: 42 }))

    expect(aufbau.seqs).toEqual([42])
    aufbau.stop()
  })

  test('die Nummer 0 wird gemeldet, nicht verschluckt', async () => {
    // Ein frisches Konto steht auf 0. Würde die 0 als "keine Nummer" gelten,
    // bekäme genau dieses Konto nie einen Vergleichswert.
    const aufbau = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    letzteQuelle?.emitHeartbeat(JSON.stringify({ seq: 0 }))

    expect(aufbau.seqs).toEqual([0])
    aufbau.stop()
  })

  test('ein leerer Rahmen meldet nichts und bleibt trotzdem ein Lebenszeichen', async () => {
    // So sah der Rahmen vor dem 25.08.2026 aus. Eine ältere API ist kein
    // Fehlerfall, sondern der Normalfall von gestern — und der Herzschlag muss
    // seine erste Aufgabe weiter erfüllen.
    const aufbau = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    letzteQuelle?.emitHeartbeat('{}')

    expect(aufbau.seqs).toEqual([])
    expect(aufbau.proven).toBe(1)
    aufbau.stop()
  })

  test('eine kaputte Nutzlast entwertet den Herzschlag NICHT', async () => {
    // Die wichtigste Zusicherung hier: Eine unlesbare Zahl darf nicht dazu
    // führen, dass die Verbindung als tot gilt. Sonst würde aus einer
    // Kleinigkeit ein Verbindungsabbruch alle 15 Sekunden.
    const aufbau = aufbauen()
    await flush()
    letzteQuelle?.emitOpen()
    letzteQuelle?.emitHeartbeat('{kaputt')
    letzteQuelle?.emitHeartbeat(JSON.stringify({ seq: 'sieben' }))

    expect(aufbau.seqs).toEqual([])
    expect(aufbau.proven).toBe(1)
    aufbau.stop()
  })
})

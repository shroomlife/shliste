/**
 * Vertrag der reinen Bausteine der Verbindung.
 *
 * Geprüft wird alles, was ohne Netz auskommt: der Vergleich der Stream-Ids
 * (die Deduplizierung hängt daran), die Wartezeiten des Backoff und der Bau der
 * Stream-Adresse. Der Zustandsautomat selbst braucht ein `EventSource` und
 * gehört damit in einen Browsertest, nicht hierher.
 */
import { describe, expect, test } from 'bun:test'
import {
  BACKOFF_JITTER_RATIO,
  buildStreamUrl,
  INITIAL_BACKOFF_MS,
  isNewerEventId,
  MAX_BACKOFF_MS,
  backoffDelayMs,
  nextBackoffMs,
  parseStreamId,
} from './connection'

describe('parseStreamId', () => {
  test('zerlegt eine gültige Id', () => {
    expect(parseStreamId('1755600000000-7')).toEqual({ millis: 1755600000000, sequence: 7 })
    expect(parseStreamId('0-0')).toEqual({ millis: 0, sequence: 0 })
  })

  test('lehnt alles ab, was keine zwei Ziffernblöcke sind', () => {
    expect(parseStreamId('')).toBeNull()
    expect(parseStreamId('1755600000000')).toBeNull()
    expect(parseStreamId('-7')).toBeNull()
    expect(parseStreamId('1755600000000-')).toBeNull()
    expect(parseStreamId('abc-7')).toBeNull()
    expect(parseStreamId('1-2-3')).toBeNull()
    expect(parseStreamId('1e3-0')).toBeNull()
    expect(parseStreamId(' 1-0')).toBeNull()
    expect(parseStreamId('1.5-0')).toBeNull()
  })

  test('lehnt Zahlen jenseits der sicheren Ganzzahlen ab', () => {
    // Ein Vergleich, den Number nicht mehr exakt abbildet, wäre schlimmer als
    // gar kein Vergleich: er verwürfe stillschweigend echte Ereignisse.
    expect(parseStreamId('99999999999999999999-0')).toBeNull()
  })
})

describe('isNewerEventId', () => {
  test('vergleicht numerisch, nicht als Zeichenkette', () => {
    // DER FALL, DEN EIN ZEICHENVERGLEICH FALSCH MACHT: '10-0' < '9-0' als
    // Zeichenkette, aber 10 > 9 als Zahl.
    expect(isNewerEventId('10-0', '9-0')).toBe(true)
    expect(isNewerEventId('9-0', '10-0')).toBe(false)
    expect(isNewerEventId('100-0', '99-0')).toBe(true)
  })

  test('vergleicht bei gleichem Zeitstempel die Sequenz', () => {
    expect(isNewerEventId('5-10', '5-9')).toBe(true)
    expect(isNewerEventId('5-9', '5-10')).toBe(false)
    expect(isNewerEventId('5-3', '5-3')).toBe(false)
  })

  test('ohne Cursor ist jedes Ereignis neu', () => {
    expect(isNewerEventId('1-0', null)).toBe(true)
  })

  test('nicht deutbare Ids gelten als neuer', () => {
    // Im Zweifel doppelt verarbeiten statt verschlucken: ein doppeltes
    // Ereignis kostet einen folgenlosen Delta-Abruf, ein verschlucktes kostet
    // Daten bis zum nächsten Abgleich.
    expect(isNewerEventId('kaputt', '9-0')).toBe(true)
    expect(isNewerEventId('9-0', 'kaputt')).toBe(true)
    expect(isNewerEventId('', '')).toBe(true)
  })
})

describe('nextBackoffMs', () => {
  test('verdoppelt bis zum Deckel', () => {
    expect(nextBackoffMs(INITIAL_BACKOFF_MS)).toBe(4_000)
    expect(nextBackoffMs(4_000)).toBe(8_000)
    expect(nextBackoffMs(8_000)).toBe(16_000)
    expect(nextBackoffMs(16_000)).toBe(32_000)
  })

  test('überschreitet den Deckel nie', () => {
    expect(nextBackoffMs(32_000)).toBe(MAX_BACKOFF_MS)
    expect(nextBackoffMs(MAX_BACKOFF_MS)).toBe(MAX_BACKOFF_MS)
  })

  test('erreicht den Deckel in der erwarteten Anzahl Schritte', () => {
    let value = INITIAL_BACKOFF_MS
    let steps = 0
    while (value < MAX_BACKOFF_MS) {
      value = nextBackoffMs(value)
      steps += 1
    }
    // 2s, 4s, 8s, 16s, 32s, 60s
    expect(steps).toBe(5)
  })
})

describe('backoffDelayMs', () => {
  test('trifft die Ränder des Streubandes', () => {
    expect(backoffDelayMs(2_000, () => 0.5)).toBe(2_000)
    expect(backoffDelayMs(2_000, () => 0)).toBe(1_500)
    expect(backoffDelayMs(2_000, () => 1)).toBe(2_500)
  })

  test('bleibt bei echtem Zufall im Band', () => {
    const base = MAX_BACKOFF_MS
    const lower = base * (1 - BACKOFF_JITTER_RATIO)
    const upper = base * (1 + BACKOFF_JITTER_RATIO)

    for (let i = 0; i < 500; i++) {
      const delay = backoffDelayMs(base)
      expect(delay >= lower && delay <= upper).toBe(true)
    }
  })

  test('streut überhaupt', () => {
    // Ohne Streuung klopfen nach einem Serverneustart alle Geräte im
    // Gleichtakt an. Ein konstanter Rückgabewert wäre also ein Fehler.
    const values = new Set<number>()
    for (let i = 0; i < 200; i++) {
      values.add(backoffDelayMs(MAX_BACKOFF_MS))
    }
    expect(values.size).toBeGreaterThan(1)
  })
})

describe('buildStreamUrl', () => {
  test('hängt das Ticket an', () => {
    expect(buildStreamUrl('https://api.shliste.app', 'abc123', null))
      .toBe('https://api.shliste.app/realtime/events?ticket=abc123')
  })

  test('gibt den Cursor mit, damit der Server nachliefert', () => {
    expect(buildStreamUrl('https://api.shliste.app', 'abc123', '1755600000000-0'))
      .toBe('https://api.shliste.app/realtime/events?ticket=abc123&lastEventId=1755600000000-0')
  })

  test('verträgt einen abschliessenden Schrägstrich in der Basisadresse', () => {
    expect(buildStreamUrl('https://api.shliste.app//', 'abc123', null))
      .toBe('https://api.shliste.app/realtime/events?ticket=abc123')
  })

  test('kodiert Werte, die von aussen kommen', () => {
    const url = buildStreamUrl('https://api.shliste.app', 'a&b=c', null)
    expect(url).toBe('https://api.shliste.app/realtime/events?ticket=a%26b%3Dc')
  })
})

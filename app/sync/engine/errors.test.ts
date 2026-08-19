/**
 * Die Fehlerklassifizierung.
 *
 * Sie beantwortet für jede Ebene darüber dieselbe Frage: gleich noch einmal
 * versuchen, später, oder nie? Eine falsche Einordnung ist teuer — ein
 * dauerhaft abgelehnter Push, der als "später erneut" gilt, läuft in eine
 * Endlosschleife und von dort ins Rate-Limit.
 */
import { describe, expect, test } from 'bun:test'
import {
  SyncError,
  classifyHttpStatus,
  describeSyncError,
  isRetryable,
  parseRetryAfter,
  toSyncError,
} from './errors'

describe('classifyHttpStatus', () => {
  test('401 heisst: die Sitzung ist tot', () => {
    expect(classifyHttpStatus(401)).toBe('auth')
  })

  test('429 heisst: warten, dann erneut', () => {
    expect(classifyHttpStatus(429)).toBe('rateLimited')
  })

  test('408 ist trotz 4xx vorübergehend', () => {
    // Ein Timeout beschreibt die Übertragung, nicht die Anfrage.
    expect(classifyHttpStatus(408)).toBe('transient')
  })

  test('alle übrigen 4xx sind dauerhaft', () => {
    for (const status of [400, 403, 404, 409, 413, 422]) {
      expect(classifyHttpStatus(status)).toBe('permanent')
    }
  })

  test('5xx ist vorübergehend', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyHttpStatus(status)).toBe('transient')
    }
  })

  test('ein unerwarteter Status gilt als vorübergehend', () => {
    // Unklar ist kein Grund, dauerhaft aufzugeben.
    expect(classifyHttpStatus(302)).toBe('transient')
  })
})

describe('parseRetryAfter', () => {
  const now = new Date('2026-08-19T10:00:00.000Z')

  test('reine Sekunden werden zu Millisekunden', () => {
    expect(parseRetryAfter('30', now)).toBe(30_000)
  })

  test('Leerraum stört nicht', () => {
    expect(parseRetryAfter('  30  ', now)).toBe(30_000)
  })

  test('ein HTTP-Datum wird zur verbleibenden Wartezeit', () => {
    expect(parseRetryAfter('Wed, 19 Aug 2026 10:01:00 GMT', now)).toBe(60_000)
  })

  test('ein Datum in der Vergangenheit heisst "sofort", nicht "negativ"', () => {
    expect(parseRetryAfter('Wed, 19 Aug 2026 09:59:00 GMT', now)).toBe(0)
  })

  test('ein halb-numerischer Wert wird nicht geraten', () => {
    // "12abc" als 12 zu lesen würde einen kaputten Header verschleiern.
    expect(parseRetryAfter('12abc', now)).toBeNull()
  })

  test('fehlend, leer oder unlesbar ergibt null', () => {
    expect(parseRetryAfter(null, now)).toBeNull()
    expect(parseRetryAfter(undefined, now)).toBeNull()
    expect(parseRetryAfter('', now)).toBeNull()
    expect(parseRetryAfter('irgendwann', now)).toBeNull()
  })
})

describe('isRetryable', () => {
  test('vorübergehend, offline und Rate-Limit dürfen wiederholt werden', () => {
    for (const kind of ['transient', 'offline', 'rateLimited'] as const) {
      expect(isRetryable(new SyncError('x', { kind }))).toBe(true)
    }
  })

  test('dauerhaft und Sitzungsende werden nicht wiederholt', () => {
    for (const kind of ['permanent', 'auth'] as const) {
      expect(isRetryable(new SyncError('x', { kind }))).toBe(false)
    }
  })
})

describe('SyncError', () => {
  test('trägt Status und Wartezeit mit sich', () => {
    const error = new SyncError('Zu viele Anfragen', { kind: 'rateLimited', status: 429, retryAfterMs: 5000 })

    expect(error instanceof Error).toBe(true)
    expect(error.name).toBe('SyncError')
    expect(error.status).toBe(429)
    expect(error.retryAfterMs).toBe(5000)
  })

  test('ohne Angabe stehen Status und Wartezeit auf null statt undefined', () => {
    const error = new SyncError('kaputt', { kind: 'transient' })

    expect(error.status).toBeNull()
    expect(error.retryAfterMs).toBeNull()
  })
})

describe('toSyncError', () => {
  test('ein bestehender SyncError bleibt unverändert', () => {
    const original = new SyncError('schon eingeordnet', { kind: 'permanent', status: 422 })

    expect(toSyncError(original)).toBe(original)
  })

  test('ein Netzwerkfehler wird zu "offline"', () => {
    // `fetch` wirft bei DNS- und Verbindungsproblemen ein nacktes TypeError.
    const error = toSyncError(new TypeError('Failed to fetch'))

    expect(error.kind).toBe('offline')
    expect(error.message).toContain('Failed to fetch')
  })

  test('auch ein geworfener Nicht-Fehler wird eingeordnet', () => {
    expect(toSyncError('irgendwas').kind).toBe('offline')
  })
})

describe('describeSyncError', () => {
  test('jede Art bekommt einen eigenen Satz', () => {
    const kinds = ['auth', 'rateLimited', 'permanent', 'transient', 'offline'] as const
    const messages = kinds.map(kind => describeSyncError(new SyncError('Details', { kind })))

    expect([...new Set(messages)]).toHaveLength(kinds.length)
  })
})

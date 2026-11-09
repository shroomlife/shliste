import { describe, expect, test } from 'bun:test'
import {
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
  googleAnalyticsCookieNames,
  isTrackedPath,
  parseStoredConsent,
  serializeConsent,
} from './analyticsConsent'

const TAG = 24 * 60 * 60 * 1000
const jetzt = new Date('2026-11-09T18:00:00.000Z')
const vorTagen = (tage: number): Date => new Date(jetzt.getTime() - tage * TAG)

describe('parseStoredConsent', () => {
  test('ohne Eintrag ist noch nicht gefragt', () => {
    expect(parseStoredConsent(null, jetzt)).toBeNull()
  })

  test('eine gespeicherte Entscheidung kommt unverändert zurück', () => {
    expect(parseStoredConsent(serializeConsent('granted', jetzt), jetzt)).toBe('granted')
    expect(parseStoredConsent(serializeConsent('denied', jetzt), jetzt)).toBe('denied')
  })

  test('Ja und Nein gelten genau 90 Tage', () => {
    expect(CONSENT_MAX_AGE_DAYS).toBe(90)
    expect(parseStoredConsent(serializeConsent('granted', vorTagen(90)), jetzt)).toBe('granted')
    expect(parseStoredConsent(serializeConsent('denied', vorTagen(90)), jetzt)).toBe('denied')
    expect(parseStoredConsent(serializeConsent('granted', vorTagen(90.01)), jetzt)).toBeNull()
    expect(parseStoredConsent(serializeConsent('denied', vorTagen(90.01)), jetzt)).toBeNull()
  })

  test('ein Zeitpunkt in der Zukunft oder ohne gültiges Datum fragt neu', () => {
    expect(parseStoredConsent(serializeConsent('granted', vorTagen(-1)), jetzt)).toBeNull()
    expect(parseStoredConsent(JSON.stringify({ choice: 'granted', version: CONSENT_VERSION, decidedAt: 'gestern' }), jetzt)).toBeNull()
    expect(parseStoredConsent(JSON.stringify({ choice: 'granted', version: CONSENT_VERSION }), jetzt)).toBeNull()
  })

  test('eine Entscheidung aus einer älteren Version fragt neu', () => {
    const alt = JSON.stringify({ choice: 'granted', version: CONSENT_VERSION - 1, decidedAt: jetzt.toISOString() })
    expect(parseStoredConsent(alt, jetzt)).toBeNull()
  })

  test('kaputte oder fremde Werte fragen neu', () => {
    expect(parseStoredConsent('kein json', jetzt)).toBeNull()
    expect(parseStoredConsent('null', jetzt)).toBeNull()
    expect(parseStoredConsent('"granted"', jetzt)).toBeNull()
    expect(parseStoredConsent(JSON.stringify({ choice: 'vielleicht', version: CONSENT_VERSION, decidedAt: jetzt.toISOString() }), jetzt)).toBeNull()
  })
})

describe('isTrackedPath', () => {
  test('die öffentliche Website wird gemessen', () => {
    expect(isTrackedPath('/')).toBe(true)
    expect(isTrackedPath('/rezepte/linsen-dal')).toBe(true)
    expect(isTrackedPath('/warteliste')).toBe(true)
    expect(isTrackedPath('/rezept-import/abc')).toBe(true)
    expect(isTrackedPath('/apple')).toBe(true)
  })

  test('die App bleibt ohne Messung', () => {
    expect(isTrackedPath('/app')).toBe(false)
    expect(isTrackedPath('/app/lists')).toBe(false)
    expect(isTrackedPath('/app/recipes/123')).toBe(false)
    expect(isTrackedPath('/app?x=1')).toBe(false)
  })
})

describe('googleAnalyticsCookieNames', () => {
  test('nennt Besucher- und Sitzungscookie der Mess-ID', () => {
    expect(googleAnalyticsCookieNames('G-XRRVDNBWGN')).toEqual(['_ga', '_ga_XRRVDNBWGN'])
  })
})

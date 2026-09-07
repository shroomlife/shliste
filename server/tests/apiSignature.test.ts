/**
 * Tests der Signaturbildung.
 *
 * Der Algorithmus ist rein: gleiche Eingaben, gleiche Header. Die erwarteten
 * Hex-Werte sind fest verdrahtet und nicht im Test nachgerechnet — ein Test,
 * der dieselbe Formel noch einmal aufschreibt, prüft nur sich selbst und würde
 * jede Änderung am Format klaglos mitmachen.
 *
 * Ausführen: `bun test server/tests`
 */
import { describe, expect, test } from 'bun:test'
import { buildSignatureMessage, createSignatureHeaders, hashBody } from '../utils/apiSignature'

const SECRET = 'test-secret-nicht-in-produktion'
const TIMESTAMP = 1_700_000_000_000
const API_BASE = 'https://api.shliste.app'

/** sha256 des leeren Strings — die bekannteste Prüfsumme überhaupt. */
const EMPTY_BODY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

describe('hashBody', () => {
  test('ohne Body den Hash des leeren Strings', () => {
    expect(hashBody()).toBe(EMPTY_BODY_HASH)
    expect(hashBody('')).toBe(EMPTY_BODY_HASH)
  })

  test('Body mit Inhalt ergibt einen anderen Hash', () => {
    const body = JSON.stringify({ lists: [], recipes: [] })

    expect(hashBody(body)).toBe('737702f2817c76255a9d9b34ecb849b778719a9b9d2651c1261427ea71369aa9')
    expect(hashBody(body)).not.toBe(EMPTY_BODY_HASH)
  })
})

describe('buildSignatureMessage', () => {
  test('Reihenfolge und Trennzeichen sind METHOD|pathname|timestamp|bodyHash', () => {
    expect(buildSignatureMessage('GET', '/sync/pull', TIMESTAMP, EMPTY_BODY_HASH))
      .toBe(`GET|/sync/pull|${TIMESTAMP}|${EMPTY_BODY_HASH}`)
  })

  test('die Methode wird in Großbuchstaben geschrieben', () => {
    expect(buildSignatureMessage('post', '/sync/push', TIMESTAMP, EMPTY_BODY_HASH))
      .toBe(`POST|/sync/push|${TIMESTAMP}|${EMPTY_BODY_HASH}`)
  })
})

describe('createSignatureHeaders', () => {
  test('GET ohne Body', () => {
    expect(createSignatureHeaders(SECRET, 'GET', '/sync/pull', '', TIMESTAMP)).toEqual({
      'x-auth-timestamp': String(TIMESTAMP),
      'x-auth-signature': '69750bb7f33757ea49507145c9d6b375f0010466653e23a19ce9b07cf7f08e67',
      'x-auth-body-hash': EMPTY_BODY_HASH,
    })
  })

  test('POST mit Body', () => {
    const body = JSON.stringify({ lists: [], recipes: [] })

    expect(createSignatureHeaders(SECRET, 'POST', '/sync/push', body, TIMESTAMP)).toEqual({
      'x-auth-timestamp': String(TIMESTAMP),
      'x-auth-signature': 'b713b3c736085c1b19baaeef652dfbaf3e4171d9d20dc6739dc47bb11bb190ad',
      'x-auth-body-hash': '737702f2817c76255a9d9b34ecb849b778719a9b9d2651c1261427ea71369aa9',
    })
  })

  test('ein anderes Secret ergibt eine andere Signatur', () => {
    const mine = createSignatureHeaders(SECRET, 'GET', '/sync/pull', '', TIMESTAMP)
    const other = createSignatureHeaders('anderes-secret', 'GET', '/sync/pull', '', TIMESTAMP)

    expect(other['x-auth-signature']).not.toBe(mine['x-auth-signature'])
  })

  test('ohne Zeitstempel wird die aktuelle Uhrzeit genommen', () => {
    const before = Date.now()
    const headers = createSignatureHeaders(SECRET, 'GET', '/sync/status')
    const after = Date.now()

    const timestamp = Number(headers['x-auth-timestamp'])
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})

describe('der Query-String geht nicht in die Signatur ein', () => {
  // apiFetch bildet den zu signierenden Pfad genau so: aus der fertigen URL,
  // nicht aus dem übergebenen String. Der Query-String landet in url.search.
  const pathnameOf = (path: string): string => new URL(path, API_BASE).pathname

  test('URL mit Query ergibt denselben pathname', () => {
    expect(pathnameOf('/sync/pull?since=2026-08-19T00:00:00.000Z')).toBe('/sync/pull')
    expect(pathnameOf('/sync/pull')).toBe('/sync/pull')
  })

  test('gleiche Header mit und ohne Query', () => {
    const withQuery = createSignatureHeaders(
      SECRET,
      'GET',
      pathnameOf('/sync/pull?since=2026-08-19T00:00:00.000Z&limit=500'),
      '',
      TIMESTAMP,
    )
    const withoutQuery = createSignatureHeaders(SECRET, 'GET', pathnameOf('/sync/pull'), '', TIMESTAMP)

    expect(withQuery).toEqual(withoutQuery)
  })

  test('wer den Query trotzdem mitsigniert, erzeugt eine andere Signatur', () => {
    // Der Gegenbeweis: die API rechnet nur über den pathname und würde eine so
    // gebildete Signatur mit 403 ablehnen.
    const correct = createSignatureHeaders(SECRET, 'GET', '/sync/pull', '', TIMESTAMP)
    const wrong = createSignatureHeaders(SECRET, 'GET', '/sync/pull?since=2026-08-19', '', TIMESTAMP)

    expect(wrong['x-auth-signature']).not.toBe(correct['x-auth-signature'])
  })
})

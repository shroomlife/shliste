/// <reference types="bun" />
/**
 * Tests der Zeitstempel-Hilfen.
 *
 * Das Format ist Teil des API-Vertrags — ein Fehler hier bedeutet HTTP 422
 * auf den gesamten Push. Deshalb wird es hier so kleinlich geprüft.
 */
import { describe, expect, test } from 'bun:test'
import {
  compareIso,
  fromIso,
  isAtOrBefore,
  isIsoUtc,
  ISO_UTC_PATTERN,
  nowIso,
  toIso,
} from './timestamps'

describe('toIso', () => {
  test('schreibt genau drei Millisekundenstellen', () => {
    expect(toIso(new Date(Date.UTC(2026, 7, 19, 10, 15, 0, 0)))).toBe('2026-08-19T10:15:00.000Z')
  })

  test('füllt einstellige Millisekunden auf drei Stellen auf', () => {
    expect(toIso(new Date(Date.UTC(2026, 7, 19, 10, 15, 0, 5)))).toBe('2026-08-19T10:15:00.005Z')
  })

  test('rechnet eine Ortszeit mit Zeitzonenversatz nach UTC um', () => {
    expect(toIso(new Date('2026-08-19T12:15:00+02:00'))).toBe('2026-08-19T10:15:00.000Z')
  })

  test('wirft bei einem ungültigen Date statt still Unsinn zu liefern', () => {
    expect(() => toIso(new Date('kein Datum'))).toThrowError(TypeError)
  })
})

describe('nowIso', () => {
  test('entspricht dem geforderten Muster', () => {
    expect(ISO_UTC_PATTERN.test(nowIso())).toBe(true)
  })

  test('ist immer 24 Zeichen lang', () => {
    expect(nowIso()).toHaveLength(24)
  })

  test('liegt beim aktuellen Zeitpunkt', () => {
    const distance = Math.abs(fromIso(nowIso()).getTime() - Date.now())
    expect(distance).toBeLessThan(5000)
  })
})

describe('fromIso', () => {
  test('liefert denselben Zeitpunkt zurück', () => {
    const stamp = '2026-08-19T10:15:00.123Z'
    expect(toIso(fromIso(stamp))).toBe(stamp)
  })

  test.each([
    // Ohne Millisekunden — das schreibt die alte Web-App, die API lehnt es ab.
    '2026-08-19T10:15:00Z',
    // Zu wenige Stellen.
    '2026-08-19T10:15:00.00Z',
    // Zu viele Stellen (Nanosekunden aus manchen Backends).
    '2026-08-19T10:15:00.123456Z',
    // Zeitzonenversatz statt UTC.
    '2026-08-19T12:15:00.000+02:00',
    // Leerzeichen statt T.
    '2026-08-19 10:15:00.000Z',
    'irgendwas',
    '',
  ])('lehnt %p ab', (value) => {
    expect(() => fromIso(value)).toThrowError(RangeError)
  })
})

describe('isIsoUtc', () => {
  test('erkennt einen gültigen Zeitstempel', () => {
    expect(isIsoUtc('2026-08-19T10:15:00.000Z')).toBe(true)
  })

  test.each([
    '2026-08-19T10:15:00Z',
    '2026-08-19T10:15:00.000+02:00',
    42,
    null,
    undefined,
    {},
  ])('weist %p zurück', (value) => {
    expect(isIsoUtc(value)).toBe(false)
  })
})

describe('compareIso', () => {
  test('ordnet den älteren Zeitstempel nach vorn', () => {
    expect(compareIso('2026-08-19T10:15:00.000Z', '2026-08-19T10:15:00.001Z')).toBe(-1)
    expect(compareIso('2026-08-19T10:15:00.001Z', '2026-08-19T10:15:00.000Z')).toBe(1)
    expect(compareIso('2026-08-19T10:15:00.000Z', '2026-08-19T10:15:00.000Z')).toBe(0)
  })

  test('stimmt über viele Zeitpunkte hinweg mit der Datumsordnung überein', () => {
    // Deterministischer Pseudozufall: ein fester Startwert, damit ein
    // Fehlschlag reproduzierbar ist und der Test nicht flackert.
    let state = 1234567
    const random = (): number => {
      state = (state * 1103515245 + 12345) % 2147483648
      return state / 2147483648
    }

    const base = Date.UTC(2020, 0, 1)
    const span = 10 * 365 * 24 * 60 * 60 * 1000
    const stamps = Array.from({ length: 500 }, () => toIso(new Date(base + Math.floor(random() * span))))

    const lexicographic = [...stamps].sort(compareIso)
    const chronological = [...stamps].sort((a, b) => fromIso(a).getTime() - fromIso(b).getTime())

    expect(lexicographic).toEqual(chronological)
  })
})

describe('isAtOrBefore', () => {
  test('zählt den identischen Zeitpunkt als "nicht später"', () => {
    expect(isAtOrBefore('2026-08-19T10:15:00.000Z', '2026-08-19T10:15:00.000Z')).toBe(true)
  })

  test('unterscheidet auf die Millisekunde genau', () => {
    expect(isAtOrBefore('2026-08-19T10:15:00.000Z', '2026-08-19T10:15:00.001Z')).toBe(true)
    expect(isAtOrBefore('2026-08-19T10:15:00.001Z', '2026-08-19T10:15:00.000Z')).toBe(false)
  })
})

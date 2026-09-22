/// <reference types="bun" />
/**
 * Die Uhren-Warnung: Gegenstück zu `ClockSkewPolicyTest` auf Android.
 *
 * Die beiden Richtungen sind nicht symmetrisch, und genau das steht hier fest.
 * Eine nachgehende Uhr ist die gefährlichere: Der Push wird mit 200 quittiert,
 * der eigene Wert setzt sich aber nicht durch, und der Mensch sieht seinen Text
 * beim nächsten Abgleich zurückspringen. Ohne Erklärung.
 */
import { describe, expect, test } from 'bun:test'
import { CLOCK_SKEW_TOLERANCE_MS, describeClockSkew, judgeClockSkew } from './clock-skew'

const JETZT = Date.parse('2026-09-22T12:00:00.000Z')

describe('judgeClockSkew', () => {
  test('ohne Serverzeit gibt es kein Urteil', () => {
    expect(judgeClockSkew(null, JETZT).kind).toBe('unknown')
  })

  test('eine Abweichung von Sekunden ist keine Meldung wert', () => {
    // Jedes Gerät weicht um Sekunden ab. Eine Warnung darüber wäre Lärm.
    expect(judgeClockSkew(JETZT - 8_000, JETZT).kind).toBe('fine')
    expect(judgeClockSkew(JETZT + 8_000, JETZT).kind).toBe('fine')
  })

  test('genau an der Toleranz wird noch nicht gewarnt', () => {
    // Dieselben fünf Minuten, die der Server als Toleranz benutzt.
    expect(judgeClockSkew(JETZT - CLOCK_SKEW_TOLERANCE_MS, JETZT).kind).toBe('fine')
  })

  test('eine vorgehende Uhr wird als solche erkannt', () => {
    const urteil = judgeClockSkew(JETZT - 8 * 60_000, JETZT)
    expect(urteil).toEqual({ kind: 'ahead', byMs: 8 * 60_000 })
  })

  test('eine nachgehende Uhr wird als solche erkannt', () => {
    const urteil = judgeClockSkew(JETZT + 8 * 60_000, JETZT)
    expect(urteil).toEqual({ kind: 'behind', byMs: 8 * 60_000 })
  })
})

describe('describeClockSkew', () => {
  test('bei gesunder Uhr gibt es nichts zu sagen', () => {
    expect(describeClockSkew({ kind: 'fine' })).toBeNull()
    expect(describeClockSkew({ kind: 'unknown' })).toBeNull()
  })

  test('die nachgehende Uhr warnt vor dem Verlust EIGENER Änderungen', () => {
    const satz = describeClockSkew({ kind: 'behind', byMs: 8 * 60_000 })
    expect(satz).toContain('8 Minuten nach')
    expect(satz).toContain('Deine Änderungen')
  })

  test('die vorgehende Uhr warnt vor dem Verlust FREMDER Änderungen', () => {
    const satz = describeClockSkew({ kind: 'ahead', byMs: 8 * 60_000 })
    expect(satz).toContain('8 Minuten vor')
    expect(satz).toContain('von anderen Geräten')
  })

  test('der Satz sagt auch, was zu tun ist', () => {
    // Wer nur "Änderungen können verlorengehen" liest, weiss nicht weiter.
    expect(describeClockSkew({ kind: 'behind', byMs: 9 * 60_000 })).toContain('automatisch')
  })

  test('eine Minute heisst "eine Minute", nicht "1 Minuten"', () => {
    expect(describeClockSkew({ kind: 'ahead', byMs: 6 * 60_000 })).toContain('6 Minuten')
    expect(describeClockSkew({ kind: 'ahead', byMs: 60_000 })).toContain('eine Minute')
  })
})

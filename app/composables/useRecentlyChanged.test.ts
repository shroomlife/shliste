/// <reference types="bun" />
/**
 * Tests der reinen Funktionen aus `useRecentlyChanged.ts`.
 *
 * Geprüft wird die Buchführung über die Markierungen — genau die Stelle, an
 * der der Fehler saß: Wird eine Id erneut gemeldet, während sie noch leuchtet,
 * durfte der Zeitgeber der ersten Meldung sie nicht mehr abräumen.
 *
 * Der Rest des Composables ist Verdrahtung: `useState`, ein Zeitgeber und zwei
 * `requestAnimationFrame`, die es nur im Browser gibt.
 */
import { describe, expect, test } from 'bun:test'
import { alreadyMarked, releaseMarks } from './useRecentlyChanged'

describe('alreadyMarked', () => {
  test('nennt nur die Ids, die bereits leuchten', () => {
    const marks = new Map([['a', 1], ['b', 1]])
    expect(alreadyMarked(marks, ['a', 'c'])).toEqual(['a'])
  })

  test('ist leer, wenn keine der Ids leuchtet', () => {
    expect(alreadyMarked(new Map(), ['a', 'b'])).toEqual([])
  })
})

describe('releaseMarks', () => {
  test('nimmt die eigenen Markierungen zurück', () => {
    const marks = new Map([['a', 7], ['b', 7]])
    expect(releaseMarks(marks, ['a', 'b'], 7)).toBe(true)
    expect(marks.size).toBe(0)
  })

  test('lässt eine inzwischen erneut gemeldete Id stehen', () => {
    // 'a' wurde nach dem ersten Aufruf noch einmal gemeldet und trägt deshalb
    // die neuere Nummer 8. Der Zeitgeber der Meldung 7 darf sie nicht abräumen.
    const marks = new Map([['a', 8], ['b', 7]])

    expect(releaseMarks(marks, ['a', 'b'], 7)).toBe(true)

    expect(marks.get('a')).toBe(8)
    expect(marks.has('b')).toBe(false)
  })

  test('meldet keine Änderung, wenn nichts zurückzunehmen war', () => {
    const marks = new Map([['a', 8]])
    expect(releaseMarks(marks, ['a'], 7)).toBe(false)
    expect(marks.get('a')).toBe(8)
  })

  test('verträgt Ids, die gar nicht mehr eingetragen sind', () => {
    const marks = new Map<string, number>()
    expect(releaseMarks(marks, ['weg'], 7)).toBe(false)
  })
})

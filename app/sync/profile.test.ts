/**
 * Das Einlesen der Antwort auf das Ändern des eigenen Namens.
 *
 * Der Aufruf selbst ist eine dünne Hülle um `requestJson` und steht deshalb
 * nicht im Test.
 */
import { describe, expect, test } from 'bun:test'
import { parseProfileNames } from './profile'

describe('parseProfileNames', () => {
  test('liest den gezeigten und den eigenen Namen', () => {
    expect(parseProfileNames({ displayName: 'Robin', customDisplayName: 'Robin' }))
      .toEqual({ displayName: 'Robin', customDisplayName: 'Robin' })
  })

  test('ohne eigenen Namen gilt der Google-Name', () => {
    expect(parseProfileNames({ displayName: 'Robin G.', customDisplayName: null }))
      .toEqual({ displayName: 'Robin G.', customDisplayName: null })
  })

  test('eine abweichende Antwort ergibt null', () => {
    expect(parseProfileNames({ displayName: 'Robin' })).toBeNull()
    expect(parseProfileNames({ displayName: 1, customDisplayName: null })).toBeNull()
    expect(parseProfileNames([])).toBeNull()
    expect(parseProfileNames(null)).toBeNull()
  })
})

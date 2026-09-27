/**
 * Einengen rund um den eigenen Namen (server/utils/profile.ts).
 *
 * Entscheidend ist der Unterschied zwischen `null` und "fehlt": `null` ist ein
 * gültiger Wunsch (wieder den Google-Namen zeigen), ein fehlendes Feld ist ein
 * kaputter Body und darf bei der API nie als Zurücksetzen ankommen.
 *
 * Ausführen: `bun test server/tests`
 */
import { describe, expect, test } from 'bun:test'
import { parseDisplayNameInput, parseProfileNames } from '../utils/profile'

describe('parseDisplayNameInput', () => {
  test('ein Name wird unverändert weitergereicht', () => {
    expect(parseDisplayNameInput({ displayName: '  Robin  ' })).toBe('  Robin  ')
  })

  test('null ist ein gültiger Wert und heißt "Google-Name"', () => {
    expect(parseDisplayNameInput({ displayName: null })).toBeNull()
  })

  test('ein fehlendes oder falsch getyptes Feld ist ungültig', () => {
    expect(parseDisplayNameInput({})).toBeUndefined()
    expect(parseDisplayNameInput({ displayName: 42 })).toBeUndefined()
    expect(parseDisplayNameInput(null)).toBeUndefined()
    expect(parseDisplayNameInput('Robin')).toBeUndefined()
  })
})

describe('parseProfileNames', () => {
  test('liest beide Namen', () => {
    expect(parseProfileNames({ displayName: 'Robin', customDisplayName: 'Robin' }))
      .toEqual({ displayName: 'Robin', customDisplayName: 'Robin' })
  })

  test('ohne eigenen Namen bleibt customDisplayName null', () => {
    expect(parseProfileNames({ displayName: 'Robin G.', customDisplayName: null }))
      .toEqual({ displayName: 'Robin G.', customDisplayName: null })
  })

  test('überzählige Felder fallen weg', () => {
    expect(parseProfileNames({ displayName: 'A', customDisplayName: null, userId: 7 }))
      .toEqual({ displayName: 'A', customDisplayName: null })
  })

  test('eine abweichende Antwort ergibt null', () => {
    expect(parseProfileNames({ displayName: 'A' })).toBeNull()
    expect(parseProfileNames({ displayName: 1, customDisplayName: null })).toBeNull()
    expect(parseProfileNames(null)).toBeNull()
  })
})

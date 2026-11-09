import { describe, expect, test } from 'bun:test'
import { aiServiceError } from './serviceError'

describe('AI error ownership', () => {
  test('operator budget is never described as personal quota or a short wait', () => {
    const message = aiServiceError({ code: 'AI_OPERATOR_BUDGET_EXHAUSTED', error: 'Too many requests' })!
    expect(message).toContain('Budget des Dienstes')
    expect(message).not.toContain('Dein heutiges Kontingent')
    expect(message).not.toContain('Moment')
  })
  test('personal quotas and busy leases remain distinct', () => {
    expect(aiServiceError({ code: 'USER_QUOTA_EXCEEDED' })).toContain('Dein heutiges Kontingent')
    expect(aiServiceError({ code: 'AI_BUSY' })).toContain('beiden KI-Aufträge')
    expect(aiServiceError({ code: 'QUOTA_UNAVAILABLE' })).toContain('vorübergehend')
    // Seit dem Wechsel auf Claude meldet die API Überlastung als 503 AI_PROVIDER_BUSY.
    expect(aiServiceError({ code: 'AI_PROVIDER_BUSY' })).toContain('gleich noch einmal')
  })
  test('eine Quelle ohne Rezept nennt den anderen Weg und keinen neuen Versuch', () => {
    // Der Servertext wird vom Code überstimmt, damit der Wortlaut in der App liegt.
    const message = aiServiceError({ code: 'AI_SOURCE_NO_RECIPE', error: 'Leider konnten wir kein Rezept auslesen.' })!
    expect(message).toStartWith('Leider konnten wir kein Rezept auslesen.')
    expect(message).toContain('fotografieren')
    expect(message).not.toContain('erneut')
    expect(aiServiceError({ code: 'AI_SOURCE_NO_CONTENT' })).toContain('keine Liste')
    expect(aiServiceError({ code: 'AI_SOURCE_UNREADABLE' })).toContain('lässt sich nicht auslesen')
  })
  test('unknown payloads do not invent a budget diagnosis', () => {
    for (const payload of [null, 'error', {}, { code: 'UNKNOWN' }]) expect(aiServiceError(payload)).toBeNull()
  })
})

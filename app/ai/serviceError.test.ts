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
  test('unknown payloads do not invent a budget diagnosis', () => {
    for (const payload of [null, 'error', {}, { code: 'UNKNOWN' }]) expect(aiServiceError(payload)).toBeNull()
  })
})

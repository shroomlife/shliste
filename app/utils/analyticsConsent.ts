/**
 * Reine Regeln rund um die Statistik-Zustimmung, ohne Nuxt und ohne DOM,
 * damit sie für sich testbar bleiben.
 *
 * Die Zustimmung liegt nur im localStorage des Browsers. Jede Entscheidung,
 * Ja wie Nein, gilt 90 Tage; danach fragt der Banner neu. Steigt die Version,
 * fragt er ebenfalls neu, etwa wenn ein weiterer Dienst dazukommt.
 */

export const CONSENT_STORAGE_KEY = 'shliste:consent:v1'
export const CONSENT_VERSION = 1
export const CONSENT_MAX_AGE_DAYS = 90
const CONSENT_MAX_AGE_MS = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000

export type ConsentChoice = 'granted' | 'denied'

export interface StoredConsent {
  choice: ConsentChoice
  version: number
  decidedAt: string
}

function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === 'granted' || value === 'denied'
}

/**
 * Liest eine gespeicherte Entscheidung. Alles Unlesbare, eine alte Version
 * oder eine Entscheidung älter als 90 Tage zählt als „noch nicht gefragt“.
 */
export function parseStoredConsent(raw: string | null, now: Date): ConsentChoice | null {
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  if (!('choice' in parsed) || !('version' in parsed) || !('decidedAt' in parsed)) return null
  if (parsed.version !== CONSENT_VERSION) return null
  if (typeof parsed.decidedAt !== 'string') return null

  const decidedAt = Date.parse(parsed.decidedAt)
  const age = now.getTime() - decidedAt
  if (Number.isNaN(decidedAt) || age < 0 || age > CONSENT_MAX_AGE_MS) return null

  return isConsentChoice(parsed.choice) ? parsed.choice : null
}

export function serializeConsent(choice: ConsentChoice, decidedAt: Date): string {
  const stored: StoredConsent = { choice, version: CONSENT_VERSION, decidedAt: decidedAt.toISOString() }
  return JSON.stringify(stored)
}

/** Nur die öffentliche Website wird gemessen. Die App unter /app bleibt ohne Google. */
export function isTrackedPath(path: string): boolean {
  return !/^\/app(?:[/?#]|$)/.test(path)
}

/**
 * Namen der Cookies, die gtag.js für eine Mess-ID setzt: `_ga` für die
 * Besucherkennung und `_ga_<ID ohne „G-“>` für die Sitzung.
 */
export function googleAnalyticsCookieNames(measurementId: string): string[] {
  return ['_ga', `_ga_${measurementId.replace(/^G-/, '')}`]
}

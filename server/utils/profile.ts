/**
 * Einengen rund um den eigenen Anzeigenamen (PUT /sync/profile der API).
 *
 * Rein und ohne Nitro-Kontext, damit beides ohne Netz testbar ist. Kürzen und
 * Zusammenziehen der Leerzeichen macht die API; hier wird nur die Gestalt
 * geprüft, sonst gäbe es zwei Stellen mit derselben Regel.
 */
import type { ProfileNames } from '#shared/types/domain'
import { isRecord } from './guards'

/**
 * Der Body vom Browser: `{ displayName: string | null }`.
 * `undefined` heißt "kein gültiger Body", `null` ist ein gültiger Wert.
 */
export function parseDisplayNameInput(body: unknown): string | null | undefined {
  if (!isRecord(body)) return undefined
  const { displayName } = body
  if (displayName === null || typeof displayName === 'string') return displayName
  return undefined
}

/** Die Antwort der API. `null`, wenn sie nicht dem Vertrag entspricht. */
export function parseProfileNames(payload: unknown): ProfileNames | null {
  if (!isRecord(payload)) return null

  const { displayName, customDisplayName } = payload
  if (displayName !== null && typeof displayName !== 'string') return null
  if (customDisplayName !== null && typeof customDisplayName !== 'string') return null

  return { displayName, customDisplayName }
}

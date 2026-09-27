/**
 * Der eigene Name — der Weg zur API.
 *
 * Läuft über die eigene Route `server/api/auth/profile.put.ts` und nicht über
 * den Sync-Proxy: Dort wird nach der Antwort auch das Profil-Cookie
 * fortgeschrieben.
 */
import type { ProfileNames } from '../../shared/types/domain'
import { SyncError } from './engine/errors'
import { isRecord } from './engine/json'
import { requestJson } from './engine/transport'

/** Engt die Antwort ein. `null`, wenn sie nicht dem Vertrag entspricht. */
export function parseProfileNames(value: unknown): ProfileNames | null {
  if (!isRecord(value)) return null

  const { displayName, customDisplayName } = value
  if (displayName !== null && typeof displayName !== 'string') return null
  if (customDisplayName !== null && typeof customDisplayName !== 'string') return null

  return { displayName, customDisplayName }
}

/**
 * Speichert den eigenen Namen. Ein leerer Name heißt: wieder den aus dem
 * Google-Konto zeigen. Kürzen und Kappen macht die API.
 */
export async function saveDisplayName(displayName: string): Promise<ProfileNames> {
  const trimmed = displayName.trim()
  const response = await requestJson('/api/auth/profile', {
    method: 'PUT',
    body: { displayName: trimmed === '' ? null : trimmed },
  })

  const names = parseProfileNames(response)
  if (names === null) {
    throw new SyncError('Die Antwort des Servers passte nicht zum Namen.', { kind: 'transient' })
  }
  return names
}

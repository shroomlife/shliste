/**
 * Anmeldung: Google-ID-Token gegen eine Session der API eintauschen.
 *
 * Der Browser besorgt sich per Google Identity Services ein ID-Token und
 * schickt es hierher. Geprüft wird es ausschliesslich von der API (Signatur,
 * Aussteller und aud gegen GOOGLE_CLIENT_ID) — diese Schicht leitet es nur
 * signiert weiter und verwahrt danach das Ergebnis.
 */
import { apiFetch } from '../../utils/apiFetch'
import { isRecord } from '../../utils/guards'
import type { UserProfile } from '#shared/types/domain'
import { parseUserProfile, persistSession } from '../../utils/session'

interface ApiSession {
  sessionToken: string
  profile: UserProfile
}

export default defineEventHandler(async (event): Promise<UserProfile> => {
  const body: unknown = await readBody(event)
  const idToken = isRecord(body) && typeof body.idToken === 'string' ? body.idToken.trim() : ''

  if (idToken.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Es wurde kein Google-ID-Token übermittelt.',
    })
  }

  // Fehler der API (etwa 401 bei ungültigem Token) reicht apiFetch mit Status
  // und Meldung durch — hier ist nichts abzufangen.
  const payload = await apiFetch('/auth/google', {
    method: 'POST',
    rawBody: JSON.stringify({ idToken }),
  })

  const session = parseApiSession(payload)
  if (session === null) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Unerwartete Antwort von api.shliste.app beim Anmelden.',
    })
  }

  persistSession(event, session.sessionToken, session.profile)

  // Ausschliesslich das Anzeigeprofil. Das sessionToken bleibt im
  // httpOnly-Cookie und taucht in keiner Antwort an den Browser auf — sonst
  // stünde es sofort wieder im Zugriff von JavaScript und wäre nichts mehr wert.
  return session.profile
})

/** Engt die Antwort von POST /auth/google ein. */
function parseApiSession(payload: unknown): ApiSession | null {
  if (!isRecord(payload)) return null

  const { sessionToken } = payload
  if (typeof sessionToken !== 'string' || sessionToken.length === 0) return null

  const profile = parseUserProfile(payload.user)
  if (profile === null) return null

  return { sessionToken, profile }
}

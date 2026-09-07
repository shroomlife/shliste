/**
 * Anmeldung: Google-ID-Token gegen eine Session der API eintauschen.
 *
 * Der Browser besorgt sich per Google Identity Services ein ID-Token und
 * schickt es hierher. Geprüft wird es ausschließlich von der API (Signatur,
 * Aussteller und aud gegen GOOGLE_CLIENT_ID) — diese Schicht leitet es nur
 * signiert weiter und verwahrt danach das Ergebnis.
 *
 * `supportsRefresh: true` meldet der API, dass diese BFF den stillen Refresh
 * beherrscht: Sie antwortet dann mit einem kurzlebigen Session-JWT (1 h) PLUS
 * einem rotierenden Refresh-Token statt des alten 30-Tage-JWT. Beide wandern
 * in httpOnly-Cookies (siehe session.ts); erneuert wird in sessionRefresh.ts.
 */
import { apiFetch } from '../../utils/apiFetch'
import { isRecord } from '../../utils/guards'
import type { UserProfile } from '#shared/types/domain'
import { parseUserProfile, persistSession, type RefreshGrant } from '../../utils/session'

interface ApiSession {
  sessionToken: string
  profile: UserProfile
  /** null, falls die API (noch) ohne Refresh-Token antwortet. */
  refresh: RefreshGrant | null
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
    rawBody: JSON.stringify({ idToken, supportsRefresh: true }),
    clientIp: resolveVisitorIp(event),
  })

  const session = parseApiSession(payload)
  if (session === null) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Unerwartete Antwort von api.shliste.app beim Anmelden.',
    })
  }

  persistSession(event, session.sessionToken, session.profile, session.refresh ?? undefined)

  // Ausschließlich das Anzeigeprofil. Session- und Refresh-Token bleiben in
  // httpOnly-Cookies und tauchen in keiner Antwort an den Browser auf — sonst
  // stünden sie sofort wieder im Zugriff von JavaScript und wären nichts mehr wert.
  return session.profile
})

/** Engt die Antwort von POST /auth/google ein. */
function parseApiSession(payload: unknown): ApiSession | null {
  if (!isRecord(payload)) return null

  const { sessionToken } = payload
  if (typeof sessionToken !== 'string' || sessionToken.length === 0) return null

  const profile = parseUserProfile(payload.user)
  if (profile === null) return null

  return { sessionToken, profile, refresh: parseRefreshGrant(payload) }
}

/**
 * Refresh-Token und dessen Laufzeit, falls die API sie mitgeschickt hat.
 *
 * Fehlt eines von beiden, wird OHNE Refresh weitergemacht statt die Anmeldung
 * scheitern zu lassen: Das ist exakt das Alt-Verhalten (30-Tage-JWT) und
 * deckt eine API ab, die das Flag noch nicht kennt.
 */
function parseRefreshGrant(payload: Record<string, unknown>): RefreshGrant | null {
  const { refreshToken, refreshExpiresIn } = payload
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) return null
  if (typeof refreshExpiresIn !== 'number' || !(refreshExpiresIn > 0)) return null

  return { refreshToken, refreshExpiresIn }
}

/**
 * Session-Cookies der BFF.
 *
 * Drei Cookies, alle httpOnly:
 *
 * 1. Das Session-JWT der API. Es ist der Schlüssel zu allen Daten des Kontos
 *    und darf JavaScript deshalb NIE erreichen — ein einziges eingeschleustes
 *    Skript (fremdes Paket, XSS in einer Abhängigkeit) könnte es sonst auslesen
 *    und dauerhaft anderswo verwenden. httpOnly nimmt dem Browser genau diese
 *    Möglichkeit: das Token existiert nur zwischen Browser-Kernel und Server.
 * 2. Das Anzeigeprofil. Nach einem Reload muss die Oberfläche wissen, wer
 *    angemeldet ist; die API hat dafür keinen Endpunkt (`/auth/google` liefert
 *    das Profil nur beim Anmelden). Es steht ebenfalls httpOnly, weil der
 *    Client es über `/api/auth/me` bekommt und ein zweiter Lesepfad nur die
 *    Angriffsfläche vergrössert.
 * 3. Das Refresh-Token. Mit ihm holt sich die BFF still ein frisches
 *    Session-JWT, sobald das alte abläuft (siehe sessionRefresh.ts). Es ist
 *    noch wertvoller als das JWT — wer es hat, kann sich beliebig lange
 *    frische Sitzungen ausstellen lassen — und steht deshalb erst recht
 *    httpOnly. Bestands-Sessions aus der Zeit vor dem Refresh (30-Tage-JWT)
 *    haben dieses Cookie nicht und funktionieren unverändert weiter; einen
 *    stillen Refresh gibt es für sie eben nicht, bis zum nächsten Login.
 *
 * Dass ein Nutzer sein eigenes Profil-Cookie fälschen könnte, ist unkritisch:
 * es dient allein der Anzeige im eigenen Browser. Jede Berechtigung hängt am
 * JWT, das die API selbst signiert und prüft.
 */
import type { H3Event } from 'h3'
import type { UserProfile } from '#shared/types/domain'
import { isRecord } from './guards'

// Der Typ wird hier nur benutzt, nicht weitergereicht: app/ und server/ sind
// getrennte Build-Bereiche und dürfen nicht voneinander abhängen, shared/ ist
// der dafür vorgesehene gemeinsame Bereich. Wer den Typ braucht, holt ihn von
// dort — ein Weiterexport wäre ein zweiter Name für dieselbe Sache und hätte
// Nuxt bei den automatischen Importen zwei gleichnamige Kandidaten geliefert.

export const SESSION_COOKIE = 'shliste_session'
export const PROFILE_COOKIE = 'shliste_profile'
export const REFRESH_COOKIE = 'shliste_refresh'

/**
 * 30 Tage, in Sekunden — die Lebensdauer von Sessions OHNE Refresh-Token.
 *
 * Das ist die Alt-Welt: ein 30-Tage-JWT, das die API vor der Umstellung auf
 * `supportsRefresh` ausgegeben hat (oder weiterhin ausgibt, wenn das Flag
 * fehlt). Diese Sessions bleiben voll funktionsfähig, bis das JWT abläuft.
 */
const LEGACY_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** Vom Login gelieferte Refresh-Daten (POST /auth/google bzw. /auth/refresh). */
export interface RefreshGrant {
  refreshToken: string
  /** Restlaufzeit des Refresh-Tokens in Sekunden — bestimmt die Cookie-Lebensdauer. */
  refreshExpiresIn: number
}

/**
 * `as const` statt einer weiten Signatur, damit `sameSite` das Literal 'lax'
 * bleibt und nicht zu `string` verallgemeinert wird.
 *
 * - `secure`: nur über TLS. Browser machen für http://localhost eine Ausnahme,
 *   die lokale Entwicklung bleibt also möglich.
 * - `sameSite: 'lax'`: das Cookie geht bei fremden Formular-POSTs nicht mit.
 *   Damit sind die schreibenden Proxy-Routen ohne eigenes CSRF-Token geschützt,
 *   während der Nutzer beim Aufruf aus einem Link oder Lesezeichen angemeldet bleibt.
 *
 * `maxAge` steht bewusst NICHT hier: Es hängt davon ab, ob die Session ein
 * Refresh-Token hat (dann lebt das Cookie so lange wie dieses) oder nicht
 * (dann die 30 Legacy-Tage).
 */
const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
} as const

/**
 * Request-gebundener Carry des ROTIERTEN Token-Paars.
 *
 * `setCookie` schreibt in die ANTWORT — `getCookie` liest aber weiter die
 * REQUEST-Header. Liest derselbe Request nach einer Rotation die Cookies
 * erneut (der eine erzwungene Wiederholungsversuch nach einem Upstream-401),
 * bekäme er sonst das schon VERBRAUCHTE Refresh-Token und reichte es der
 * API als Wiederverwendung ein — die daraufhin die ganze Session-Familie
 * widerriefe. Der Carry hält deshalb das frische Paar am Event fest; die
 * Lese-Funktionen bevorzugen ihn vor dem Request-Cookie.
 *
 * WeakMap statt event.context: typsicher ohne Modul-Augmentation, und der
 * Eintrag stirbt mit dem Event.
 */
interface RotatedSessionCarry {
  sessionToken: string
  refreshToken: string
}

const rotatedCarry = new WeakMap<H3Event, RotatedSessionCarry>()

/**
 * Schreibt Session, Profil und (falls vorhanden) Refresh-Token nach
 * erfolgreicher Anmeldung.
 *
 * WARUM ALLE DREI COOKIES DIESELBE LEBENSDAUER BEKOMMEN: Das Session-JWT der
 * Refresh-Welt läuft nach einer Stunde ab — sein COOKIE darf trotzdem nicht
 * nach einer Stunde verschwinden. Der stille Refresh (sessionRefresh.ts)
 * liest das abgelaufene JWT aus genau diesem Cookie, um dessen `exp` zu
 * erkennen, und ersetzt es dann. Verschwände das Cookie mit dem JWT, sähe
 * jede Route "keine Session" und der Nutzer wäre trotz gültigem Refresh-Token
 * scheinbar abgemeldet. Die Cookie-Familie lebt und stirbt deshalb im
 * Gleichschritt mit dem Refresh-Token.
 */
export function persistSession(
  event: H3Event,
  sessionToken: string,
  profile: UserProfile,
  refresh?: RefreshGrant,
): void {
  const maxAge = refresh?.refreshExpiresIn ?? LEGACY_MAX_AGE_SECONDS

  setCookie(event, SESSION_COOKIE, sessionToken, { ...BASE_COOKIE_OPTIONS, maxAge })
  setCookie(event, PROFILE_COOKIE, JSON.stringify(profile), { ...BASE_COOKIE_OPTIONS, maxAge })

  if (refresh !== undefined) {
    setCookie(event, REFRESH_COOKIE, refresh.refreshToken, { ...BASE_COOKIE_OPTIONS, maxAge })
    rotatedCarry.set(event, { sessionToken, refreshToken: refresh.refreshToken })
  }
}

/**
 * Schreibt die Cookies nach einem gelungenen stillen Refresh neu.
 *
 * Das Refresh-Token ROTIERT: Die API gibt bei jedem Refresh ein neues aus und
 * entwertet das alte. Beide Cookies müssen deshalb gemeinsam ersetzt werden.
 * Das Profil-Cookie wird, sofern lesbar, mit derselben Lebensdauer erneuert —
 * sonst liefe es einer über Monate rollierenden Session irgendwann davon und
 * die Oberfläche stünde ohne Anzeigenamen da.
 */
export function persistRefreshedTokens(
  event: H3Event,
  sessionToken: string,
  refresh: RefreshGrant,
): void {
  const maxAge = refresh.refreshExpiresIn

  setCookie(event, SESSION_COOKIE, sessionToken, { ...BASE_COOKIE_OPTIONS, maxAge })
  setCookie(event, REFRESH_COOKIE, refresh.refreshToken, { ...BASE_COOKIE_OPTIONS, maxAge })
  rotatedCarry.set(event, { sessionToken, refreshToken: refresh.refreshToken })

  const profile = readProfile(event)
  if (profile !== null) {
    setCookie(event, PROFILE_COOKIE, JSON.stringify(profile), { ...BASE_COOKIE_OPTIONS, maxAge })
  }
}

/** Das Session-JWT, oder undefined wenn keine Session besteht. */
export function readSessionToken(event: H3Event): string | undefined {
  return rotatedCarry.get(event)?.sessionToken ?? getCookie(event, SESSION_COOKIE)
}

/** Das Refresh-Token, oder undefined bei Legacy-Sessions und Abgemeldeten. */
export function readRefreshToken(event: H3Event): string | undefined {
  return rotatedCarry.get(event)?.refreshToken ?? getCookie(event, REFRESH_COOKIE)
}

/**
 * Das gespeicherte Anzeigeprofil.
 *
 * Der Cookie-Inhalt ist trotz httpOnly kein vertrauenswürdiger Kanal — ein
 * Client kann jeden Header senden. Deshalb wird geparst und eingeengt statt
 * gecastet; kaputter Inhalt ergibt null und nicht ein halb gefülltes Objekt.
 */
export function readProfile(event: H3Event): UserProfile | null {
  const raw = getCookie(event, PROFILE_COOKIE)
  if (raw === undefined) return null

  try {
    return parseUserProfile(JSON.parse(raw))
  }
  catch {
    return null
  }
}

/** Meldet ab: alle drei Cookies löschen (und den Rotations-Carry dazu). */
export function clearSessionCookies(event: H3Event): void {
  rotatedCarry.delete(event)
  deleteCookie(event, SESSION_COOKIE, BASE_COOKIE_OPTIONS)
  deleteCookie(event, PROFILE_COOKIE, BASE_COOKIE_OPTIONS)
  deleteCookie(event, REFRESH_COOKIE, BASE_COOKIE_OPTIONS)
}

/**
 * Engt einen beliebigen Wert auf das Profil ein, das der Client sehen darf.
 *
 * Wird für zwei Quellen genutzt: die Antwort der API beim Anmelden und den
 * Cookie-Inhalt bei späteren Aufrufen. Alles, was nicht zum Profil gehört —
 * etwa die interne Ganzzahl-Id der API — fällt dabei weg.
 */
export function parseUserProfile(value: unknown): UserProfile | null {
  if (!isRecord(value)) return null

  const { userId, email, displayName, photoUrl } = value
  if (typeof userId !== 'string' || userId.length === 0) return null
  if (typeof email !== 'string' || email.length === 0) return null

  return {
    userId,
    email,
    displayName: typeof displayName === 'string' ? displayName : null,
    photoUrl: typeof photoUrl === 'string' ? photoUrl : null,
  }
}

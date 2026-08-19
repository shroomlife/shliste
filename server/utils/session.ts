/**
 * Session-Cookies der BFF.
 *
 * Zwei Cookies, beide httpOnly:
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

/** 30 Tage, in Sekunden. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * `as const` statt einer weiten Signatur, damit `sameSite` das Literal 'lax'
 * bleibt und nicht zu `string` verallgemeinert wird.
 *
 * - `secure`: nur über TLS. Browser machen für http://localhost eine Ausnahme,
 *   die lokale Entwicklung bleibt also möglich.
 * - `sameSite: 'lax'`: das Cookie geht bei fremden Formular-POSTs nicht mit.
 *   Damit sind die schreibenden Proxy-Routen ohne eigenes CSRF-Token geschützt,
 *   während der Nutzer beim Aufruf aus einem Link oder Lesezeichen angemeldet bleibt.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
} as const

/** Schreibt Session und Profil nach erfolgreicher Anmeldung. */
export function persistSession(event: H3Event, sessionToken: string, profile: UserProfile): void {
  setCookie(event, SESSION_COOKIE, sessionToken, COOKIE_OPTIONS)
  setCookie(event, PROFILE_COOKIE, JSON.stringify(profile), COOKIE_OPTIONS)
}

/** Das Session-JWT, oder undefined wenn keine Session besteht. */
export function readSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE)
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

/** Meldet ab: beide Cookies löschen. */
export function clearSessionCookies(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, COOKIE_OPTIONS)
  deleteCookie(event, PROFILE_COOKIE, COOKIE_OPTIONS)
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

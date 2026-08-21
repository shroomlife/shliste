import { SESSION_COOKIE } from '../utils/session'

/**
 * Eingeloggte landen direkt bei ihren Listen, nicht auf der Startseite.
 *
 * Serverseitig als Middleware, weil die Startseite prerendered ist: Ihr
 * statisches HTML wird ohne Seiten-Handler ausgeliefert, ein Redirect im
 * Seitencode käme also erst nach dem Client-Start. Die Middleware läuft vor
 * der Auslieferung und spart den sichtbaren Umweg über die Landing-Page.
 *
 * Geprüft wird nur, OB das Sitzungs-Cookie existiert — nicht, ob es noch
 * gültig ist. Das ist Absicht: Die Gültigkeit kennt allein die API, und eine
 * Prüfung pro Seitenaufruf wäre ein Request zu viel. Mit abgelaufener Sitzung
 * zeigt der App-Bereich ohnehin den Anmelde-Zustand — derselbe Ort, an dem
 * man sich neu anmeldet.
 *
 * 302 statt 301: Die Antwort hängt am Cookie und darf nicht dauerhaft
 * gecacht werden.
 */
export default defineEventHandler((event) => {
  if (event.method !== 'GET') return
  if (getRequestURL(event).pathname !== '/') return

  const accept = getRequestHeader(event, 'accept') ?? ''
  if (!accept.includes('text/html')) return

  if (getCookie(event, SESSION_COOKIE) === undefined) return

  return sendRedirect(event, '/app/lists', 302)
})

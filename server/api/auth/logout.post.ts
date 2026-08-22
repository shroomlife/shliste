/**
 * Abmelden: Session bei der API widerrufen, dann alle Cookies löschen.
 *
 * Seit dem Refresh-Umbau gibt es echten Widerruf: `POST /auth/logout`
 * entwertet das Refresh-Token samt Session-Familie (idempotent). Das
 * kurzlebige Session-JWT läuft danach binnen einer Stunde von selbst aus.
 * Legacy-Sessions ohne Refresh-Token kennen weiterhin keinen Widerruf —
 * dort heisst Abmelden wie bisher: Der Browser gibt das Token her und kann
 * es nicht zurückholen, weil er es wegen httpOnly nie zu Gesicht bekommen hat.
 *
 * Der Widerruf ist BEST EFFORT: Eine gerade nicht erreichbare API darf das
 * Abmelden nicht verhindern — die Cookies fallen in jedem Fall, und ein
 * verwaistes Refresh-Token läuft serverseitig ab.
 *
 * POST und nicht GET, damit kein Prefetch und kein <img>-Aufruf eine Sitzung
 * beenden kann.
 */
import { apiFetch } from '../../utils/apiFetch'
import { clearSessionCookies, readRefreshToken } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const refreshToken = readRefreshToken(event)

  if (refreshToken !== undefined) {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        rawBody: JSON.stringify({ refreshToken }),
        clientIp: resolveVisitorIp(event),
      })
    }
    catch (error) {
      console.warn(
        '[auth/logout] Widerruf bei der API fehlgeschlagen (Cookies werden trotzdem gelöscht):',
        error instanceof Error ? error.message : error,
      )
    }
  }

  clearSessionCookies(event)
  return { ok: true }
})

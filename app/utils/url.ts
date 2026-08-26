/**
 * Adressen lesen und prüfen — eine Regel für die ganze App.
 *
 * DIE WICHTIGSTE ZUSAGE: `validHttpUrlOrNull` gibt die GETRIMMTE EINGABE
 * zurück und niemals `URL.toString()`. Eine normalisierte Adresse ist ein
 * ANDERER Wert als die getippte: `https://kochwelt.de` würde zu
 * `https://kochwelt.de/`, `HTTPS://Rewe.DE` zu `https://rewe.de/`. Weil
 * dasselbe Feld auf drei Plattformen geprüft wird (API `sanitizeItemUrl`,
 * Android `validHttpUrlOrNull`, hier), müsste jede Seite exakt gleich
 * normalisieren — sonst schreibt jedes Gerät beim nächsten Speichern einen
 * minimal anderen Wert und das Feld wandert im Kreis. Kappen und Ablehnen ja,
 * Umschreiben nie.
 *
 * Rein und ohne Vue: Die Funktionen werden mit `bun test` ohne Nuxt geprüft,
 * deshalb stehen hier keine Auto-Importe und keine `~`-Pfade.
 *
 * Gegenstücke, die dieselben Regeln tragen:
 * - `api.shliste.app/src/routes/sync/item-url.ts`
 * - `android-app/.../utils/LinkUtils.kt`
 */

/** Obergrenze einer Adresse — Spiegel von `SYNC_FIELD_LIMITS.ITEM_URL`. */
const URL_MAX_LENGTH = 2000

/**
 * Liest eine Web-Adresse.
 *
 * `null` bei allem, was keine absolute http(s)-Adresse mit Hostnamen ist —
 * inklusive kaputter Eingaben, die `new URL` werfen lässt. Zugangsdaten
 * werden hier NICHT geprüft: Für die Frage „welcher Host ist das" sind sie
 * belanglos, und `URL.hostname` enthält sie ohnehin nicht. Die Ablehnung
 * gehört in `validHttpUrlOrNull`, wo entschieden wird, was gespeichert wird.
 */
export function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  }
  catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (parsed.hostname.length === 0) return null

  return parsed
}

/** Ist das eine Web-Adresse? Der Wachposten vor jedem `href`. */
export function isHttpUrl(value: string): boolean {
  return parseHttpUrl(value) !== null
}

/**
 * Die geprüfte Adresse oder `null` — der eine Prüfer für jedes `url`-Feld.
 *
 * Abgelehnt wird, was nicht gespeichert werden darf: fremde Schemata,
 * fehlender Hostname, Zugangsdaten (sie lägen im Klartext auf dem Server und
 * auf jedem Gerät einer geteilten Liste) und alles über 2000 Zeichen. Ein
 * leerer Wert ist keine Adresse, sondern `null`.
 */
export function validHttpUrlOrNull(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null

  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > URL_MAX_LENGTH) return null

  const parsed = parseHttpUrl(trimmed)
  if (parsed === null) return null
  if (parsed.username.length > 0 || parsed.password.length > 0) return null

  return trimmed
}

/**
 * Ergänzt ein fehlendes Schema durch `https://`.
 *
 * NUR für Eingabefelder, in die Menschen von Hand tippen (die beiden
 * KI-Blätter und die `www.`-Erkennung der Eingabezeile). Ein Wert, der aus
 * dem Abgleich kommt, wird nie ergänzt — dort heisst „kein Schema" schlicht
 * „keine Adresse".
 *
 * Ein bereits vorhandenes Schema bleibt stehen, auch ein fremdes: `ftp://x`
 * zu `https://ftp://x` zu machen wäre Unsinn, und die Prüfung danach lehnt es
 * ohnehin ab.
 */
export function withHttpsPrefix(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return trimmed
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/**
 * Der Host einer Adresse: kleingeschrieben, ohne führendes `www.`, ohne Port
 * und ohne Zugangsdaten.
 *
 * Nur das führende `www.` fällt weg — `shop.rewe.de` bleibt vollständig
 * stehen, weil die Subdomain dort etwas bedeutet.
 *
 * Ein leerer String heisst „kein lesbarer Host". Die Anzeige fällt dann auf
 * die Adresse selbst zurück (siehe `listItemDisplay.ts`).
 */
export function hostOf(url: string | null | undefined): string {
  if (url === null || url === undefined) return ''

  const parsed = parseHttpUrl(url)
  if (parsed === null) return ''

  const host = parsed.hostname.toLowerCase()
  return host.startsWith('www.') ? host.slice(4) : host
}

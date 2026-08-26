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

/** Das letzte C0-Steuerzeichen (U+001F) und U+007F. */
const LAST_C0_CONTROL = 0x1F
const DELETE_CHARACTER = 0x7F

/**
 * Steuerzeichen, die in einer Adresse nichts zu suchen haben: C0 (U+0000
 * bis U+001F) und U+007F.
 *
 * Als Schleife und nicht als Zeichenklasse in einem regulären Ausdruck: Ein
 * Muster mit diesen Zeichen trägt sie als unsichtbare Bytes im Quelltext. Das
 * ist schwer zu lesen, beim Bearbeiten leicht zu zerstören, und eslint
 * verbietet es zu Recht (`no-control-regex`). Zwei Zahlenvergleiche sagen
 * dasselbe, nur sichtbar.
 *
 * WARUM DAS EINE EIGENE PRÜFUNG BRAUCHT, und zwar VOR dem Parsen: Der
 * WHATWG-Parser ENTFERNT Tabulator, Zeilenvorschub und Wagenrücklauf
 * stillschweigend aus der Eingabe, bevor er sie liest. Eine Adresse mit
 * einem Zeilenumbruch mitten im Hostnamen ergibt deshalb klaglos einen
 * sauberen Host — und der Umbruch steckt danach immer noch in der
 * Zeichenkette, die wir zurückgeben und speichern würden. Ein Leerzeichen an
 * derselben Stelle wird korrekt abgelehnt; ein Umbruch schmuggelte sich also
 * an genau der Prüfung vorbei, die den Hostnamen schützt.
 *
 * ABGEGRENZT VOM LEERZEICHEN, das ausdrücklich ERLAUBT bleibt: U+0020 ist
 * kein Steuerzeichen. Im Hostnamen lehnt der Parser es von sich aus ab, ab
 * dem Pfad ist "https://x.de/a b" eine gültige Adresse — und der Server sieht
 * das genauso. Wer hier pauschal auf Nicht-Leerraum prüfte, würde eine längst
 * gespeicherte, gültige Adresse beim nächsten Sanitize-Durchlauf auf `null`
 * setzen, an einer Zeile, die aus einem ganz anderen Grund schmutzig ist.
 * Genau dieser Datenverlust ist im Android-Repo aufgetreten.
 */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= LAST_C0_CONTROL || code === DELETE_CHARACTER) return true
  }
  return false
}

/** Der Teil zwischen `://` und dem nächsten `/`, `?` oder `#`. */
const AUTHORITY_PATTERN = /^https?:\/\/([^/?#]*)/i

/**
 * Liest eine Web-Adresse.
 *
 * `null` bei allem, was keine absolute http(s)-Adresse mit Hostnamen ist —
 * inklusive kaputter Eingaben, die `new URL` werfen lässt. Zugangsdaten
 * werden hier NICHT geprüft: Für die Frage „welcher Host ist das" sind sie
 * belanglos, und `URL.hostname` enthält sie ohnehin nicht. Die Ablehnung
 * gehört in `validHttpUrlOrNull`, wo entschieden wird, was gespeichert wird.
 *
 * Steuerzeichen fliegen dagegen schon HIER raus, damit alle drei Aufrufer
 * (`isHttpUrl` als Wachposten vor jedem `href`, `hostOf` für die Anzeige,
 * `validHttpUrlOrNull` fürs Speichern) dieselbe Antwort geben.
 */
export function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (hasControlCharacter(trimmed)) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  }
  catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (parsed.hostname.length === 0) return null

  // `new URL('https:///x')` liefert den Hostnamen `x`: Der Parser überliest
  // einen LEEREN Autoritätsteil einfach. Die Prüfung eine Zeile darüber greift
  // deshalb nie. Eine Adresse ohne Autorität ist aber keine, und der
  // Android-Client lehnt sie über sein Muster ohnehin ab — ohne diese Zeile
  // liefen die Plattformen genau hier auseinander.
  if ((AUTHORITY_PATTERN.exec(trimmed)?.[1] ?? '').length === 0) return null

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
 * fehlender Hostname, Steuerzeichen, Zugangsdaten (sie lägen im Klartext auf
 * dem Server und auf jedem Gerät einer geteilten Liste) und alles über 2000
 * Zeichen. Ein leerer Wert ist keine Adresse, sondern `null`.
 *
 * NICHT abgelehnt wird ein Leerzeichen ab dem Pfad. Diese Funktion läuft an
 * JEDER Schreibstelle, nicht nur an frisch getippten Eingaben — eine strenge
 * Prüfung würde eine längst gespeicherte, gültige Adresse beim nächsten
 * Schreibvorgang stillschweigend löschen. „Kein innerer Leerraum" ist
 * ausschliesslich eine Regel der Eingabezeile (`detectLinkInput`).
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

/**
 * Ist das, was jemand in die Eingabezeile getippt hat, ein Link?
 *
 * Die Regel muss auf allen drei Plattformen buchstabengleich gelten, sonst
 * entsteht aus derselben Eingabe auf dem Handy ein Link und im Browser ein
 * Eintrag namens „https://…". Festgenagelt ist sie in
 * `app/sync/merge/link-fixtures.json` (Tabelle `detectLinkInput`), die in
 * allen drei Repos gegen die jeweilige Umsetzung läuft.
 *
 * BEWUSST ENG: Nur eine vollständige Adresse oder ein `www.`-Host zählen. Ein
 * blosses „rewe.de" bleibt ein gewöhnlicher Eintrag — Menschen schreiben
 * Einkaufszettel voller Wörter mit Punkt („Dr. Oetker", „ca. 500g"), und aus
 * jedem davon einen Link zu machen wäre die schlechtere Überraschung.
 */
import { validHttpUrlOrNull } from './url'

/** Eine vollständige Adresse mit Schema, ohne inneren Leerraum. */
const FULL_URL = /^https?:\/\/\S+$/i

/**
 * Ein Host, der mit `www.` beginnt und mindestens einen weiteren Punkt trägt.
 * `www.x` genügt nicht: Ohne Endung ist das kein Hostname, sondern ein Wort.
 */
const WWW_HOST = /^www\.\S+\.\S+$/i

/** Das Ergebnis einer erkannten Adresse. */
export interface DetectedLink {
  url: string
}

/**
 * Erkennt einen Link in der getrimmten Eingabe.
 *
 * `null` heisst „gewöhnlicher Eintrag" — der Aufrufer legt dann eine Zeile
 * mit diesem Namen an. Bei einem Treffer legt er eine Zeile mit `url` und
 * LEEREM Namen an; angezeigt wird dann der Seitentitel oder der Host
 * (`listItemDisplay.ts`).
 */
export function detectLinkInput(raw: string): DetectedLink | null {
  const trimmed = raw.trim()

  const candidate = FULL_URL.test(trimmed)
    ? trimmed
    : WWW_HOST.test(trimmed)
      ? `https://${trimmed}`
      : null

  if (candidate === null) return null

  // Die abschliessende Prüfung fängt, was die Muster durchlassen: Zugangsdaten
  // in der Adresse, überlange Werte, kaputte Klammern.
  const url = validHttpUrlOrNull(candidate)
  return url === null ? null : { url }
}

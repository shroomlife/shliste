/**
 * Zeitstempel-Hilfen der lokalen Persistenz.
 *
 * Warum eine eigene Datei statt `new Date().toISOString()` an der Aufrufstelle:
 * Das Format ist Teil des API-Vertrags, nicht Geschmackssache. Alles läuft
 * durch `toIso()`, damit es genau eine Stelle gibt, an der das Format
 * garantiert wird — und genau eine Stelle, an der ein Verstoss auffällt.
 *
 * Importe sind bewusst relativ: die Unit-Tests laufen unter `bun test` ohne
 * Nuxt und ohne dessen `~`-Alias-Auflösung.
 */
import type { IsoUtc } from '../../shared/types/domain'

/**
 * ISO-8601 UTC mit exakt drei Millisekundenstellen, z. B. 2026-08-19T10:15:00.000Z
 *
 * Nicht verhandelbar: Die API validiert per Regex. Ein abweichender Wert
 * bedeutet HTTP 422 auf den GESAMTEN Push, nicht nur auf die betroffene
 * Zeile — ein einziger schiefer Zeitstempel blockiert also die Synchronisation
 * des kompletten Geräts.
 */
export const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/** Prüft einen unbekannten Wert, bevor er als Zeitstempel benutzt wird. */
export function isIsoUtc(value: unknown): value is IsoUtc {
  return typeof value === 'string' && ISO_UTC_PATTERN.test(value)
}

/**
 * Wandelt ein Date in das API-Format.
 *
 * `Date#toISOString()` liefert die drei Millisekundenstellen nur für Jahre
 * zwischen 1000 und 9999; ausserhalb davon schaltet es auf die erweiterte
 * Schreibweise mit Vorzeichen um (±YYYYYY). Deshalb wird das Ergebnis geprüft
 * und im Zweifel sofort geworfen: ein kaputter Zeitstempel in der Datenbank
 * fällt sonst erst Tage später beim Push auf und ist dann nicht mehr
 * zuzuordnen.
 */
export function toIso(date: Date): IsoUtc {
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Ungültiges Date kann nicht in einen Zeitstempel gewandelt werden.')
  }

  const value = date.toISOString()
  if (!ISO_UTC_PATTERN.test(value)) {
    throw new RangeError(`Zeitstempel verletzt das API-Format: ${value}`)
  }

  return value
}

/** Jetzt, im API-Format. Die einzige Quelle für neue Zeitstempel. */
export function nowIso(): IsoUtc {
  return toIso(new Date())
}

/**
 * Wandelt einen Zeitstempel zurück in ein Date.
 *
 * Prüft vorher das Format: `new Date('irgendwas')` liefert still ein Invalid
 * Date, das erst viel später als NaN auffällt.
 */
export function fromIso(value: IsoUtc): Date {
  if (!ISO_UTC_PATTERN.test(value)) {
    throw new RangeError(`Zeitstempel verletzt das API-Format: ${value}`)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Zeitstempel ist kein gültiges Datum: ${value}`)
  }

  return date
}

/**
 * Vergleicht zwei Zeitstempel chronologisch.
 *
 * Da das Format feste Breite hat, immer in UTC vorliegt und von gross nach
 * klein aufgebaut ist, stimmt die Zeichenordnung exakt mit der Zeitordnung
 * überein. Das spart bei jedem Vergleich zwei `Date`-Objekte — und die
 * Sortierungen laufen bei jedem Rendern der Listenansicht.
 */
export function compareIso(a: IsoUtc, b: IsoUtc): number {
  if (a === b) {
    return 0
  }
  return a < b ? -1 : 1
}

/** Wahr, wenn `value` zeitgleich oder älter als `limit` ist. */
export function isAtOrBefore(value: IsoUtc, limit: IsoUtc): boolean {
  return compareIso(value, limit) <= 0
}

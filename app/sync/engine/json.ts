/**
 * Das Einengen fremder Antworten.
 *
 * WARUM ÜBERHAUPT: Alles, was über das Netz kommt, ist `unknown`. Ein Cast
 * darauf wäre eine Behauptung ohne Beleg — und der erste Fehler fiele dann
 * irgendwo tief in der Datenbank auf, wo niemand mehr weiss, aus welchem Feld
 * er stammt. Diese Helfer prüfen an der Kante und liefern `null`, wenn ein
 * Wert nicht dem Vertrag entspricht.
 *
 * Alle Funktionen sind rein und damit ohne Netz und ohne IndexedDB testbar.
 */
import type { FieldTimestamps, IsoUtc } from '../../../shared/types/domain'
import { toIso } from '../../db/timestamps'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Ein fehlendes Feld ist kein Array, sondern eine leere Menge. */
export function readArray(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key]
  return Array.isArray(value) ? value : []
}

export function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key]
  return typeof value === 'string' ? value : null
}

/** Pflichtfeld mit Ersatzwert — für Felder, die die API mit Default belegt. */
export function readStringOr(source: Record<string, unknown>, key: string, fallback: string): string {
  return readString(source, key) ?? fallback
}

/** `null` und ein fehlendes Feld sind hier dasselbe: kein Wert. */
export function readNullableString(source: Record<string, unknown>, key: string): string | null {
  return readString(source, key)
}

export function readBooleanOr(source: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = source[key]
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Zahlen kommen als JSON-Number. `NaN` und `Infinity` gibt es in JSON nicht,
 * über einen manipulierten Proxy aber sehr wohl — deshalb die Endlichkeitsprüfung.
 */
export function readNumberOr(source: Record<string, unknown>, key: string, fallback: number): number {
  const value = source[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Das Zeitformat der API: ISO-UTC, Millisekunden OPTIONAL.
 *
 * Die API erlaubt beide Schreibweisen (`ISO_UTC_TIMESTAMP_PATTERN` in
 * `api.shliste.app/src/routes/sync/schemas.ts`), weil Javas
 * `Instant.toString()` die `.000` weglässt.
 *
 * Exportiert, weil der Push dasselbe Muster braucht: Was hereinkommt, wird
 * daran geprüft, und was hinausgeht, muss ihm genügen (siehe `push.ts`). Zwei
 * Abschriften desselben Vertrags wären zwei Gelegenheiten auseinanderzulaufen.
 */
export const API_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

/**
 * Liest einen Zeitstempel und normalisiert ihn auf GENAU drei
 * Millisekundenstellen.
 *
 * DAS NORMALISIEREN IST NICHT KOSMETIK: Lokal wird chronologisch über die
 * Zeichenordnung verglichen (`compareIso` in `app/db/timestamps.ts`, siehe
 * Begründung dort). In dieser Ordnung ist "…00:00Z" GRÖSSER als
 * "…00:00.000Z", obwohl beide denselben Zeitpunkt meinen. Eine ungekürzte
 * Serverangabe würde damit jede Snapshot-Prüfung beim Löschen der
 * Dirty-Flags verfälschen.
 */
export function readIso(source: Record<string, unknown>, key: string): IsoUtc | null {
  const value = source[key]
  if (typeof value !== 'string' || !API_ISO_PATTERN.test(value)) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return toIso(date)
}

/** Wie `readIso`, aber `null` ist ein gültiger Wert (Tombstone-Felder). */
export function readNullableIso(source: Record<string, unknown>, key: string): IsoUtc | null {
  return readIso(source, key)
}

/**
 * Feldweise Zeitstempel.
 *
 * Einzelne kaputte Einträge werden verworfen statt die ganze Zeile zu
 * kippen: Ein unbrauchbarer Stempel bedeutet im Merge "ältestmöglich" und
 * verliert damit jeden Vergleich — das ist die sichere Richtung. Die Werte
 * bleiben unnormalisiert, weil das Merge sie numerisch über `Date.parse`
 * vergleicht (siehe `app/sync/merge/field-lww.ts`) und die API beide
 * Schreibweisen annimmt.
 */
export function readFieldTimestamps(source: Record<string, unknown>, key: string): FieldTimestamps | null {
  const value = source[key]
  if (!isRecord(value)) return null

  const result: FieldTimestamps = {}
  for (const [field, stamp] of Object.entries(value)) {
    if (typeof stamp === 'string' && API_ISO_PATTERN.test(stamp)) {
      result[field] = stamp
    }
  }

  return result
}

/**
 * Liest ein Array von Serverzeilen und lässt die unbrauchbaren weg.
 *
 * Bewusst kein Abbruch beim ersten Fehler: Eine kaputte Zeile darf den
 * Abgleich des ganzen Geräts nicht anhalten.
 */
export function parseAll<T>(values: readonly unknown[], parse: (value: unknown) => T | null): T[] {
  const parsed: T[] = []
  for (const value of values) {
    const row = parse(value)
    if (row !== null) parsed.push(row)
  }
  return parsed
}

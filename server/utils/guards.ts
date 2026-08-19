/**
 * Kleine Typwächter für Werte, die von aussen kommen.
 *
 * Antworten der API sind zur Laufzeit `unknown`: JSON aus einem fremden Prozess
 * ist ein Versprechen, kein Beweis. Statt es per Cast zu behaupten, wird es hier
 * eingeengt — ein abweichendes Format fällt damit an der Grenze auf und nicht
 * erst irgendwo tief im Client.
 */

/** Wahr für jedes nicht-null Objekt, inklusive Arrays. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

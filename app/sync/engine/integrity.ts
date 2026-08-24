/**
 * Wann darf die App von sich aus den vollständigen Serverstand ziehen?
 *
 * Gegenstück: `sync/IntegrityPolicy.kt` in der Android-App. Die Regeln sind
 * absichtlich Wort für Wort dieselben — sie stammen aus zwei Fehlern, die einem
 * Tester in freier Wildbahn passiert sind und dort zwei unbeaufsichtigte
 * Vollabgleiche samt Datenbanksicherung ausgelöst haben:
 *
 * 1. NOCH NICHT HOCHGELADENE ZEILEN GALTEN ALS SCHADEN. Wer etwas anlegt und
 *    dessen Zeile noch nicht beim Server ist, hat zwangsläufig eine andere
 *    Prüfsumme. Das ist der Normalzustand „hab ich noch nicht abgeschickt".
 *    Schlimmer noch: Ein voller Abgleich überschreibt solche Zeilen
 *    absichtlich nicht, er könnte die Abweichung also gar nicht auflösen.
 *
 * 2. DER VERSUCH WURDE BEIM NEUSTART VERGESSEN. Die Sperre lebte nur im
 *    Arbeitsspeicher; jeder Neustart gab einen weiteren vollen Abruf frei —
 *    auf unverändertem Serverstand, mit unverändertem Ergebnis.
 *
 * Rein: keine Datenbank, keine Uhr, kein Netz. Zeit und Zustand kommen als
 * Parameter herein, heraus kommt ein Urteil.
 */

/**
 * Frühestens so lange nach dem letzten Versuch darf wieder abgeglichen werden.
 *
 * Der Vergleich mit der zuletzt geprüften Serverprüfsumme fängt den häufigen
 * Fall ab: gleicher Serverstand, gleiches Ergebnis, kein zweiter Versuch. Er
 * reicht aber nicht, wenn sich der Server dauernd ändert — in einer geteilten
 * Liste, an der jemand anderes arbeitet, wäre die Prüfsumme bei jedem Abgleich
 * neu. Bliebe dann lokal etwas dauerhaft schief, liefe der volle Abruf endlos.
 */
export const MIN_HEAL_INTERVAL_MS = 12 * 60 * 60 * 1000

export type IntegrityVerdict
  /** Kein Serverstand bekannt — es gibt nichts zu beurteilen. */
  = | { kind: 'unknown' }
    /** Bestand stimmt überein. */
    | { kind: 'in-sync' }
    /** Abweichung, vollständig durch noch nicht hochgeladene Zeilen erklärt. */
    | { kind: 'pending', count: number }
    /** Echte Abweichung, ein voller Serverabgleich ist gerechtfertigt. */
    | { kind: 'heal' }
    /** Echte Abweichung, aber ein Versuch dagegen lief bereits. */
    | { kind: 'already-tried', reason: string }

export interface IntegrityInput {
  /** Prüfsumme des Servers über den reinen Inhalt (`contentHashV2`). */
  serverHash: string | null
  /** Dieselbe Prüfsumme über den lokalen Bestand. */
  localHash: string | null
  /** Anzahl lokaler Zeilen, die noch hochmüssen. */
  pendingChanges: number
  /** Serverprüfsumme, gegen die zuletzt abgeglichen wurde. */
  lastHealedHash: string | null
  /** Zeitpunkt des letzten Versuchs, 0 wenn nie. */
  lastHealedAt: number
  now: number
}

export function evaluateIntegrity(input: IntegrityInput): IntegrityVerdict {
  const { serverHash, localHash, pendingChanges, lastHealedHash, lastHealedAt, now } = input

  if (serverHash === null || localHash === null) return { kind: 'unknown' }
  if (serverHash === localHash) return { kind: 'in-sync' }

  // REIHENFOLGE IST WICHTIG: Der Test auf offene Änderungen kommt VOR den
  // Sperren. Sonst verbrauchte ein völlig normaler Zwischenstand den einen
  // Versuch, der später einer echten Abweichung zusteht.
  if (pendingChanges > 0) return { kind: 'pending', count: pendingChanges }

  if (lastHealedHash !== null && lastHealedHash === serverHash) {
    return { kind: 'already-tried', reason: 'derselbe Serverstand wurde bereits abgeglichen' }
  }

  const seitLetztem = now - lastHealedAt
  if (lastHealedAt > 0 && seitLetztem < MIN_HEAL_INTERVAL_MS) {
    return {
      kind: 'already-tried',
      reason: `letzter Versuch vor ${Math.round(seitLetztem / 60_000)} Minuten`,
    }
  }

  return { kind: 'heal' }
}

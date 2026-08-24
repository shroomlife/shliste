/// <reference types="bun" />
/**
 * Dieselben Zusicherungen wie `IntegrityPolicyTest` in der Android-App.
 *
 * Bewusst Zeile für Zeile parallel gehalten: Laufen die beiden Regelwerke
 * auseinander, verhalten sich die Clients auf demselben Konto verschieden — und
 * das fiele erst auf, wenn eines von beiden anfängt, ohne Anlass alles neu zu
 * laden. Genau das ist einmal passiert.
 */
import { describe, expect, test } from 'bun:test'
import { evaluateIntegrity, MIN_HEAL_INTERVAL_MS, type IntegrityInput } from './integrity'

const JETZT = 1_800_000_000_000
const SERVER_A = 'aaaaaaaa'
const SERVER_B = 'bbbbbbbb'

function urteil(over: Partial<IntegrityInput> = {}) {
  return evaluateIntegrity({
    serverHash: SERVER_A,
    localHash: 'cccccccc',
    pendingChanges: 0,
    lastHealedHash: null,
    lastHealedAt: 0,
    now: JETZT,
    ...over,
  })
}

describe('die beiden echten Fehlerbilder', () => {
  test('offene Änderungen erklären eine Abweichung und rechtfertigen keinen Abruf', () => {
    // Wer etwas anlegt, dessen Zeile noch aussteht, hat zwangsläufig eine
    // andere Prüfsumme. Ein voller Abruf könnte daran auch nichts ändern: Er
    // überschreibt Zeilen mit offenen Änderungen absichtlich nicht.
    expect(urteil({ pendingChanges: 1 })).toEqual({ kind: 'pending', count: 1 })
  })

  test('gegen denselben Serverstand wird kein zweites Mal abgeglichen', () => {
    // Der Zeitpunkt liegt bewusst WEIT zurück: Sonst fänge die Zeitsperre den
    // Fall ab und dieser Test bewiese nichts über die Sperre auf den Stand.
    const ergebnis = urteil({
      lastHealedHash: SERVER_A,
      lastHealedAt: JETZT - MIN_HEAL_INTERVAL_MS - 1,
    })

    expect(ergebnis.kind).toBe('already-tried')
  })
})

describe('Normalbetrieb', () => {
  test('gleiche Prüfsummen heissen synchron', () => {
    expect(urteil({ localHash: SERVER_A })).toEqual({ kind: 'in-sync' })
  })

  test('ohne Serverstand gibt es nichts zu beurteilen', () => {
    expect(urteil({ serverHash: null })).toEqual({ kind: 'unknown' })
    expect(urteil({ localHash: null })).toEqual({ kind: 'unknown' })
  })

  test('eine echte Abweichung ohne Vorgeschichte wird abgeglichen', () => {
    expect(urteil()).toEqual({ kind: 'heal' })
  })

  test('ein neuer Serverstand darf wieder, wenn genug Zeit vergangen ist', () => {
    const ergebnis = urteil({
      serverHash: SERVER_B,
      lastHealedHash: SERVER_A,
      lastHealedAt: JETZT - MIN_HEAL_INTERVAL_MS - 1,
    })

    expect(ergebnis).toEqual({ kind: 'heal' })
  })

  test('ein neuer Serverstand kurz nach dem letzten Versuch wartet', () => {
    // Sonst liefe in einer geteilten Liste, an der jemand anderes arbeitet,
    // der volle Abruf endlos: Die Serverprüfsumme wäre bei jedem Abgleich neu.
    const ergebnis = urteil({
      serverHash: SERVER_B,
      lastHealedHash: SERVER_A,
      lastHealedAt: JETZT - 60_000,
    })

    expect(ergebnis.kind).toBe('already-tried')
  })

  test('offene Änderungen verbrauchen den Versuch nicht', () => {
    // Die Reihenfolge der Prüfungen ist Absicht.
    expect(urteil({ pendingChanges: 3 }).kind).toBe('pending')
    expect(urteil({ pendingChanges: 0 })).toEqual({ kind: 'heal' })
  })
})

describe('Gleichlauf mit Android', () => {
  test('dieselbe Mindestwartezeit von zwölf Stunden', () => {
    // Gegenstück: IntegrityPolicy.MIN_HEAL_INTERVAL_MS. Laufen die Zahlen
    // auseinander, verhalten sich Handy und Browser auf demselben Konto
    // verschieden — ohne dass irgendetwas darauf hinweist.
    expect(MIN_HEAL_INTERVAL_MS).toBe(12 * 60 * 60 * 1000)
  })
})

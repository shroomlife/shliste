/// <reference types="bun" />
/**
 * Wer taugt als Vorschlagsquelle?
 *
 * DER FALLSTRICK, den der letzte Test festnagelt: Diese Projektion liest rohe
 * Zeilen aus IndexedDB, an `repositories.ts` vorbei. Ein Filter `url !== null`
 * hätte jede Zeile aus der Zeit vor dem Feld erwischt — die trägt den
 * Schlüssel nämlich gar nicht, und `undefined !== null` ist wahr. Damit wären
 * ausgerechnet die Einträge aus den Vorschlägen geflogen, die sie tragen.
 */
import { describe, expect, test } from 'bun:test'
import { isSuggestionSource } from './history'

const rausgeworfen = { deletedAt: null, removed: true, name: 'Milch', url: null }

describe('isSuggestionSource', () => {
  test('eine rausgeworfene Zeile mit Namen zählt', () => {
    expect(isSuggestionSource(rausgeworfen)).toBe(true)
  })

  test('eine sichtbare Zeile ist kein Verlauf', () => {
    expect(isSuggestionSource({ ...rausgeworfen, removed: false })).toBe(false)
  })

  test('eine gelöschte Zeile zählt nicht', () => {
    expect(isSuggestionSource({ ...rausgeworfen, deletedAt: '2026-08-20T10:00:00.000Z' })).toBe(false)
  })

  test('ein Name aus lauter Leerzeichen ist kein Vorschlag', () => {
    expect(isSuggestionSource({ ...rausgeworfen, name: '   ' })).toBe(false)
  })

  test('ein Link-Eintrag ist keine Vorschlagsquelle', () => {
    expect(isSuggestionSource({ ...rausgeworfen, url: 'https://kochwelt.de/x' })).toBe(false)
  })

  test('eine Altzeile ohne den Schlüssel bleibt im Verlauf', () => {
    const altzeile = { deletedAt: null, removed: true, name: 'Butter' }
    expect(isSuggestionSource(altzeile)).toBe(true)
  })
})

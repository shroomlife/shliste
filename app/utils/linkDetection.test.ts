/// <reference types="bun" />
/**
 * Wann macht die Eingabezeile aus einem Text einen Link?
 *
 * Die Fallsammlung dazu ist `app/sync/merge/link-fixtures.json` und läuft in
 * allen drei Repos (siehe `link-fixtures.test.ts`). Hier stehen nur die
 * Eigenschaften, die sich als Datensatz schlecht ausdrücken lassen.
 */
import { describe, expect, test } from 'bun:test'
import { detectLinkInput } from './linkDetection'

describe('detectLinkInput', () => {
  test('ein Treffer liefert die Adresse in einem Objekt', () => {
    // Ein Objekt statt eines nackten Strings, damit „kein Link" (null) sich
    // nicht mit „leerer Link" verwechseln lässt.
    expect(detectLinkInput('https://kochwelt.de/x')).toEqual({ url: 'https://kochwelt.de/x' })
  })

  test('kein Treffer ist null und nicht etwa ein leeres Objekt', () => {
    expect(detectLinkInput('Milch')).toBeNull()
  })

  test('die Adresse wird nie umgeschrieben', () => {
    const getippt = 'HTTPS://Kochwelt.DE/Rezept?a=1#x'
    expect(detectLinkInput(getippt)?.url).toBe(getippt)
  })

  test('das ergänzte https bleibt der einzige Eingriff', () => {
    expect(detectLinkInput('www.Rewe.DE/angebote')?.url).toBe('https://www.Rewe.DE/angebote')
  })

  test('eine überlange Adresse ist ein gewöhnlicher Eintrag', () => {
    // Sie fiele sonst erst am Schema der API auf, und zwar mit einem 422 auf
    // den GESAMTEN Push.
    expect(detectLinkInput(`https://beispiel.de/${'a'.repeat(2000)}`)).toBeNull()
  })
})

/// <reference types="bun" />
/**
 * Die eine Regel für die drei Server-Spiegel — an einer Stelle geprüft, an
 * drei Stellen benutzt (lokaler Schreibweg, Pull, Konfliktantwort des Pushs).
 *
 * DIE FRAGE, DIE SIE BEANTWORTET: Gehören Titel und Vorschaubild noch zu der
 * Adresse, die die Zeile gleich tragen wird? Sonst klebte man den Titel einer
 * Seite an einen Link, der längst woandershin zeigt.
 */
import { describe, expect, test } from 'bun:test'
import { emptyLinkMirrors, linkMirrorsFor } from './link-mirrors'

const LEER = { linkTitle: null, linkImagePath: null, linkImageKind: null }

/** Eine angereicherte Zeile, wie der Server sie liefert. */
const angereichert = {
  url: 'https://kochwelt.de/rezept',
  linkTitle: 'Ofenkartoffeln mit Kräuterquark',
  linkImagePath: 'link:0123456789abcdef0123456789abcdef.webp',
  linkImageKind: 'preview' as const,
}

describe('linkMirrorsFor', () => {
  test('gleiche Adresse: die Spiegel kommen wörtlich mit', () => {
    expect(linkMirrorsFor(angereichert, angereichert.url)).toEqual({
      linkTitle: 'Ofenkartoffeln mit Kräuterquark',
      linkImagePath: 'link:0123456789abcdef0123456789abcdef.webp',
      linkImageKind: 'preview',
    })
  })

  test('andere Adresse: sie beschreiben eine fremde Seite und bleiben weg', () => {
    expect(linkMirrorsFor(angereichert, 'https://rewe.de/angebote')).toEqual(LEER)
  })

  test('gar keine Adresse mehr: ebenfalls weg', () => {
    expect(linkMirrorsFor(angereichert, null)).toEqual(LEER)
  })

  test('ohne Quelle gibt es nichts zu übernehmen', () => {
    expect(linkMirrorsFor(undefined, 'https://kochwelt.de/rezept')).toEqual(LEER)
  })

  test('auch ein leerer Serverstand wird wörtlich übernommen', () => {
    // Ein Zurücksetzen auf dem Server ist eine Aussage: Die Anreicherung hat
    // aufgegeben, oder die Seite hat kein Bild. Das muss ankommen, sonst
    // stünde ein alter Titel für immer da.
    const zurueckgesetzt = { url: 'https://kochwelt.de/rezept', ...LEER }
    expect(linkMirrorsFor(zurueckgesetzt, 'https://kochwelt.de/rezept')).toEqual(LEER)
  })

  test('zwei Zeilen ohne Adresse gelten als dieselbe', () => {
    expect(linkMirrorsFor({ url: null, ...LEER }, null)).toEqual(LEER)
  })

  test('die Eingabe wird nicht mutiert', () => {
    const quelle = { ...angereichert }
    linkMirrorsFor(quelle, 'https://rewe.de/angebote')
    expect(quelle).toEqual(angereichert)
  })
})

describe('emptyLinkMirrors', () => {
  test('liefert jedes Mal ein frisches Objekt', () => {
    // Sonst teilten sich alle Aufrufer eine Instanz, und wer sie irgendwo
    // in eine Zeile spreizt und dort nachträglich anfasst, änderte sie für
    // alle anderen mit.
    const erst = emptyLinkMirrors()
    const dann = emptyLinkMirrors()
    expect(erst).toEqual(LEER)
    expect(erst).not.toBe(dann)
  })
})

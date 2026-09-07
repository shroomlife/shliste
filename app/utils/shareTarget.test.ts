/// <reference types="bun" />
/**
 * Was aus einem Teilen-Vorgang bei uns ankommt.
 *
 * Die Formen sind absichtlich chaotisch getestet: Android-Apps füllen die drei
 * Felder nach Gutdünken. Chrome schickt die Adresse in `url`, viele Apps
 * packen sie mitten in einen Fließtext in `text`, manche schicken nur einen
 * Betreff in `title`. Dieselbe Reihenfolge gilt im Android-Client
 * (`ShareReceiveExtractor`).
 */
import { describe, expect, test } from 'bun:test'
import { extractSharedLink, firstQueryValue } from './shareTarget'

describe('firstQueryValue', () => {
  test('ein String kommt durch', () => {
    expect(firstQueryValue('abc')).toBe('abc')
  })

  test('aus einer Mehrfachangabe zählt die erste', () => {
    // Der Browser darf denselben Parameter mehrfach anhängen; `route.query`
    // liefert dann ein Array.
    expect(firstQueryValue(['erst', 'dann'])).toBe('erst')
  })

  test('alles andere ist nichts', () => {
    expect(firstQueryValue(undefined)).toBeNull()
    expect(firstQueryValue(null)).toBeNull()
    expect(firstQueryValue([])).toBeNull()
    expect(firstQueryValue(42)).toBeNull()
    expect(firstQueryValue([null])).toBeNull()
  })
})

describe('extractSharedLink', () => {
  test('die Adresse aus url gewinnt vor der aus text', () => {
    const result = extractSharedLink({
      url: 'https://kochwelt.de/rezept',
      text: 'Schau mal: https://etwas-anderes.de/x',
      title: 'Ofenkartoffeln',
    })
    expect(result?.url).toBe('https://kochwelt.de/rezept')
    expect(result?.title).toBe('Ofenkartoffeln')
  })

  test('ohne url wird der Fließtext durchsucht', () => {
    const result = extractSharedLink({ text: 'Schau mal: https://kochwelt.de/rezept — lecker!' })
    expect(result?.url).toBe('https://kochwelt.de/rezept')
  })

  test('zuletzt zählt auch der Betreff', () => {
    const result = extractSharedLink({ title: 'https://kochwelt.de/rezept', text: 'Milch' })
    expect(result?.url).toBe('https://kochwelt.de/rezept')
  })

  test('Satzzeichen am Ende gehören zum Satz, nicht zur Adresse', () => {
    expect(extractSharedLink({ text: 'Guck hier: https://kochwelt.de/x.' })?.url)
      .toBe('https://kochwelt.de/x')
    expect(extractSharedLink({ text: 'Guck (https://kochwelt.de/x)' })?.url)
      .toBe('https://kochwelt.de/x')
    expect(extractSharedLink({ text: 'https://kochwelt.de/x,' })?.url)
      .toBe('https://kochwelt.de/x')
  })

  test('ein Pfad, der auf einen Punkt endet, bleibt ganz', () => {
    // Nur der ABSCHLIESSENDE Satzpunkt fällt weg, nicht der in der Adresse.
    expect(extractSharedLink({ text: 'https://kochwelt.de/rezept.html' })?.url)
      .toBe('https://kochwelt.de/rezept.html')
  })

  test('ohne Adresse bleibt der Text als Name übrig', () => {
    const result = extractSharedLink({ text: '  Milch kaufen  ' })
    expect(result).toEqual({ url: null, title: '', text: 'Milch kaufen' })
  })

  test('nur Whitespace ist nichts zum Teilen', () => {
    expect(extractSharedLink({ text: '   ', title: '  ', url: ' ' })).toBeNull()
  })

  test('gar nichts ist auch nichts', () => {
    expect(extractSharedLink({})).toBeNull()
  })

  test('ein Betreff allein reicht nicht', () => {
    // Ein Betreff wird nie als Name gespeichert (er beschreibt die Seite, nicht
    // den Eintrag). Ohne Adresse und ohne Text gibt es also nichts anzulegen —
    // dieselbe Regel wie `SharePayload.isEmpty` im Android-Client.
    expect(extractSharedLink({ title: 'Irgendein Betreff' })).toBeNull()
  })

  test('eine Adresse mit Zugangsdaten zählt nicht als Adresse', () => {
    const result = extractSharedLink({ url: 'https://wer:geheim@beispiel.de/x', text: 'Notiz' })
    expect(result).toEqual({ url: null, title: '', text: 'Notiz' })
  })

  test('ein fremdes Schema wird gar nicht erst gefunden', () => {
    expect(extractSharedLink({ url: 'mailto:wer@beispiel.de', text: 'Notiz' })?.url).toBeNull()
  })
})

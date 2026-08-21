/// <reference types="bun" />
/**
 * Tests der Antwort-Parser. Die Antworten der AI-Routen sind fremdes JSON —
 * hier wird belegt, dass kaputte Formen zu `null` werden und nie zu halben
 * Objekten, und dass das Fehlerfeld unabhängig vom HTTP-Status gelesen wird.
 */
import { describe, expect, test } from 'bun:test'
import {
  normalizeQuantity,
  parseEditedList,
  parseGeneratedList,
  parseSuggestions,
  readAiError,
} from './contract'

describe('readAiError', () => {
  test('liest das Fehlerfeld — auch bei sonst gültiger Form', () => {
    expect(readAiError({ error: 'Prompt rejected by moderation policy' }))
      .toBe('Prompt rejected by moderation policy')
  })

  test('kein Fehlerfeld, leeres Feld oder kein Objekt ergibt null', () => {
    expect(readAiError({ suggestions: [] })).toBeNull()
    expect(readAiError({ error: '' })).toBeNull()
    expect(readAiError('kaputt')).toBeNull()
    expect(readAiError(null)).toBeNull()
  })
})

describe('normalizeQuantity', () => {
  test('rundet und hebt auf mindestens 1', () => {
    expect(normalizeQuantity(2.6)).toBe(3)
    expect(normalizeQuantity(0)).toBe(1)
    expect(normalizeQuantity(-4)).toBe(1)
    expect(normalizeQuantity(Number.NaN)).toBe(1)
  })
})

describe('parseEditedList', () => {
  test('liest die gültige Form samt idx null für neue Einträge', () => {
    const payload = {
      list: {
        name: 'Wocheneinkauf',
        items: [
          { idx: 0, name: 'Milch', quantity: 1, checked: false },
          { idx: null, name: 'Gurke', quantity: 2, checked: true },
        ],
      },
    }

    expect(parseEditedList(payload)).toEqual({
      name: 'Wocheneinkauf',
      items: [
        { idx: 0, name: 'Milch', quantity: 1, checked: false },
        { idx: null, name: 'Gurke', quantity: 2, checked: true },
      ],
    })
  })

  test('ein negativer oder gebrochener idx wird zu null (neuer Eintrag)', () => {
    const payload = {
      list: { name: 'L', items: [{ idx: -1, name: 'A', quantity: 1, checked: false }, { idx: 1.5, name: 'B', quantity: 1, checked: false }] },
    }

    expect(parseEditedList(payload)?.items.map(item => item.idx)).toEqual([null, null])
  })

  test('kaputte Formen ergeben null, Einträge ohne Namen fallen weg', () => {
    expect(parseEditedList(null)).toBeNull()
    expect(parseEditedList({})).toBeNull()
    expect(parseEditedList({ list: { name: '', items: [] } })).toBeNull()

    const withBroken = parseEditedList({
      list: { name: 'L', items: [{ idx: 0, name: '   ', quantity: 1, checked: false }, 'kaputt'] },
    })
    expect(withBroken?.items).toEqual([])
  })
})

describe('parseGeneratedList', () => {
  test('liest Liste, Einträge und sourceUrl', () => {
    const payload = {
      list: { name: 'Grillabend', items: [{ name: 'Würstchen', quantity: 8 }] },
      sourceUrl: 'https://example.com/rezept',
    }

    expect(parseGeneratedList(payload)).toEqual({
      name: 'Grillabend',
      items: [{ name: 'Würstchen', quantity: 8 }],
      sourceUrl: 'https://example.com/rezept',
    })
  })

  test('fehlende Menge wird zu 1, fehlende sourceUrl zu null', () => {
    const result = parseGeneratedList({ list: { name: 'L', items: [{ name: 'Salz' }] } })
    expect(result).toEqual({ name: 'L', items: [{ name: 'Salz', quantity: 1 }], sourceUrl: null })
  })

  test('ganz ohne Namen und Einträge gilt die Antwort als gescheitert', () => {
    expect(parseGeneratedList({ list: { name: '', items: [] } })).toBeNull()
    expect(parseGeneratedList({})).toBeNull()
  })

  test('ohne Namen, aber mit Einträgen greift der Ersatzname', () => {
    const result = parseGeneratedList({ list: { name: ' ', items: [{ name: 'Brot', quantity: 1 }] } })
    expect(result?.name).toBe('Neue Liste')
  })
})

describe('parseSuggestions', () => {
  test('liest nur Strings aus dem Array', () => {
    expect(parseSuggestions({ suggestions: ['Milch', 7, 'Brot', null] })).toEqual(['Milch', 'Brot'])
  })

  test('ohne Array ergibt null', () => {
    expect(parseSuggestions({})).toBeNull()
    expect(parseSuggestions({ suggestions: 'Milch' })).toBeNull()
  })
})

/// <reference types="bun" />
/**
 * Tests der Rezept-Antwort-Parser und der Anfrage-Bauer. Die Antworten der
 * AI-Routen sind fremdes JSON — hier wird belegt, dass kaputte Formen zu
 * `null` werden und nie zu halben Objekten, und dass die Anfrage-Formen
 * exakt das liefern, was die API validiert (ganzzahlige Mengen, das
 * Android-Format des Bild-Prompts).
 */
import { describe, expect, test } from 'bun:test'
import {
  buildChatRecipePayload,
  buildRecipeImageText,
  parseChatReply,
  parseEditedRecipe,
  parseExplanation,
  parseGeneratedRecipe,
  parseImageData,
  parseVoiceChatReply,
} from './recipeContract'

describe('parseGeneratedRecipe', () => {
  test('liest die gültige Form samt imageData und sourceUrl', () => {
    const payload = {
      recipe: {
        name: 'Linsencurry',
        ingredients: [
          { name: 'Rote Linsen', quantity: 1 },
          { name: 'Kokosmilch', quantity: 2 },
        ],
        steps: [
          { description: 'Linsen waschen.' },
          { description: 'Alles köcheln lassen.' },
        ],
      },
      imageData: 'QUJD',
      sourceUrl: 'https://example.com/rezept',
    }

    expect(parseGeneratedRecipe(payload)).toEqual({
      name: 'Linsencurry',
      ingredients: [
        { name: 'Rote Linsen', quantity: 1 },
        { name: 'Kokosmilch', quantity: 2 },
      ],
      steps: [
        { description: 'Linsen waschen.' },
        { description: 'Alles köcheln lassen.' },
      ],
      imageData: 'QUJD',
      sourceUrl: 'https://example.com/rezept',
    })
  })

  test('fehlende Extras werden null, Mengen werden normalisiert', () => {
    const parsed = parseGeneratedRecipe({
      recipe: {
        name: 'Salat',
        ingredients: [{ name: 'Gurke', quantity: 2.6 }, { name: 'Tomate', quantity: -1 }],
        steps: [],
      },
    })

    expect(parsed).not.toBeNull()
    expect(parsed?.imageData).toBeNull()
    expect(parsed?.sourceUrl).toBeNull()
    expect(parsed?.ingredients).toEqual([
      { name: 'Gurke', quantity: 3 },
      { name: 'Tomate', quantity: 1 },
    ])
  })

  test('unbrauchbare Zeilen fallen heraus statt halb hineinzukommen', () => {
    const parsed = parseGeneratedRecipe({
      recipe: {
        name: 'Suppe',
        ingredients: [{ name: '   ' }, 'kaputt', { name: 'Lauch' }],
        steps: [{ description: '' }, null, { description: 'Schneiden.' }],
      },
    })

    expect(parsed?.ingredients).toEqual([{ name: 'Lauch', quantity: 1 }])
    expect(parsed?.steps).toEqual([{ description: 'Schneiden.' }])
  })

  test('ein leeres Rezept und kaputte Formen ergeben null', () => {
    expect(parseGeneratedRecipe({ recipe: { name: '', ingredients: [], steps: [] } })).toBeNull()
    expect(parseGeneratedRecipe({ recipe: 'kaputt' })).toBeNull()
    expect(parseGeneratedRecipe(null)).toBeNull()
    expect(parseGeneratedRecipe({ error: 'kaputt' })).toBeNull()
  })

  test('ohne Namen, aber mit Inhalt, greift der Standardname', () => {
    const parsed = parseGeneratedRecipe({
      recipe: { name: '', ingredients: [{ name: 'Mehl', quantity: 1 }], steps: [] },
    })
    expect(parsed?.name).toBe('Neues Rezept')
  })
})

describe('parseEditedRecipe', () => {
  test('liest die gültige Form samt idx null für neue Zeilen', () => {
    const payload = {
      recipe: {
        name: 'Linsencurry',
        ingredients: [
          { idx: 0, name: 'Rote Linsen', quantity: 1 },
          { idx: null, name: 'Ingwer', quantity: 1 },
        ],
        steps: [
          { idx: 1, description: 'Alles köcheln lassen.' },
          { idx: null, description: 'Mit Koriander servieren.' },
        ],
      },
    }

    expect(parseEditedRecipe(payload)).toEqual({
      name: 'Linsencurry',
      ingredients: [
        { idx: 0, name: 'Rote Linsen', quantity: 1 },
        { idx: null, name: 'Ingwer', quantity: 1 },
      ],
      steps: [
        { idx: 1, description: 'Alles köcheln lassen.' },
        { idx: null, description: 'Mit Koriander servieren.' },
      ],
    })
  })

  test('ungültige idx-Werte werden zu null (neue Zeile) statt zu Müll', () => {
    const parsed = parseEditedRecipe({
      recipe: {
        name: 'Salat',
        ingredients: [{ idx: -1, name: 'Gurke', quantity: 1 }, { idx: 1.5, name: 'Tomate', quantity: 1 }],
        steps: [{ idx: 'x', description: 'Mischen.' }],
      },
    })

    expect(parsed?.ingredients.map(row => row.idx)).toEqual([null, null])
    expect(parsed?.steps[0]?.idx).toBeNull()
  })

  test('ohne Namen oder ohne Rezept-Objekt ergibt null', () => {
    expect(parseEditedRecipe({ recipe: { name: '', ingredients: [], steps: [] } })).toBeNull()
    expect(parseEditedRecipe({})).toBeNull()
    expect(parseEditedRecipe('kaputt')).toBeNull()
  })
})

describe('Text-Antworten', () => {
  test('parseChatReply liest reply, leere und kaputte Formen ergeben null', () => {
    expect(parseChatReply({ reply: 'Etwa 30 Minuten.' })).toBe('Etwa 30 Minuten.')
    expect(parseChatReply({ reply: '' })).toBeNull()
    expect(parseChatReply({})).toBeNull()
    expect(parseChatReply(null)).toBeNull()
  })

  test('parseVoiceChatReply braucht Transkript UND Antwort', () => {
    expect(parseVoiceChatReply({ userMessage: 'Wie lange?', reply: '30 Minuten.' }))
      .toEqual({ userMessage: 'Wie lange?', reply: '30 Minuten.' })
    expect(parseVoiceChatReply({ userMessage: '', reply: '30 Minuten.' })).toBeNull()
    expect(parseVoiceChatReply({ userMessage: 'Wie lange?' })).toBeNull()
    expect(parseVoiceChatReply(null)).toBeNull()
  })

  test('parseExplanation und parseImageData lesen genau ihr Feld', () => {
    expect(parseExplanation({ explanation: '1. Zuerst…' })).toBe('1. Zuerst…')
    expect(parseExplanation({})).toBeNull()
    expect(parseImageData({ imageData: 'QUJD' })).toBe('QUJD')
    expect(parseImageData({ imageData: '' })).toBeNull()
    expect(parseImageData('kaputt')).toBeNull()
  })
})

describe('buildChatRecipePayload', () => {
  test('rundet Mengen auf ganze Zahlen ab 1 — die API validiert t.Integer', () => {
    const payload = buildChatRecipePayload(
      'Salat',
      [{ name: 'Gurke', quantity: 2.6 }, { name: 'Tomate', quantity: 0 }],
      [{ description: 'Schneiden.' }],
    )

    expect(payload).toEqual({
      name: 'Salat',
      ingredients: [
        { name: 'Gurke', quantity: 3 },
        { name: 'Tomate', quantity: 1 },
      ],
      steps: [{ description: 'Schneiden.' }],
    })
  })
})

describe('buildRecipeImageText', () => {
  test('baut exakt das Android-Format (AiJobRepository.kt) samt End-Newline', () => {
    const text = buildRecipeImageText(
      'Linsencurry',
      [{ name: 'Rote Linsen', quantity: 1 }, { name: 'Kokosmilch', quantity: 2 }],
      [{ description: 'Linsen waschen.' }, { description: 'Köcheln lassen.' }],
    )

    expect(text).toBe([
      'Linsencurry',
      '',
      'Zutaten:',
      '- Rote Linsen (1)',
      '- Kokosmilch (2)',
      '',
      'Schritte:',
      '1. Linsen waschen.',
      '2. Köcheln lassen.',
      '',
    ].join('\n'))
  })
})

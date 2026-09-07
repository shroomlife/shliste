/// <reference types="bun" />
/**
 * Die Regeln, die diese Datei festnagelt, stammen NICHT aus einer Norm, sondern
 * aus `components/MarkdownText.kt` der Android-App. Beide Clients zeigen
 * dieselbe gesyncte Nachricht; laufen die Regeln auseinander, sieht dieselbe
 * Antwort auf Handy und Schirm verschieden aus.
 *
 * DAS FEHLERBILD, das den Anlass gab: Die PWA zeigte Antworten als reinen Text,
 * also mit sichtbaren Sternchen mitten im Satz ("**vegane Fischstäbchen**"),
 * während Android sie längst fett setzte.
 */
import { describe, expect, test } from 'bun:test'
import { parseInline, parseMarkdown } from './markdown'

describe('parseInline', () => {
  test('einfacher Text bleibt ein Stück', () => {
    expect(parseInline('Guten Appetit')).toEqual([{ text: 'Guten Appetit', bold: false }])
  })

  test('eine fette Stelle mitten im Satz', () => {
    expect(parseInline('nimm **vegane** Butter')).toEqual([
      { text: 'nimm ', bold: false },
      { text: 'vegane', bold: true },
      { text: ' Butter', bold: false },
    ])
  })

  test('zwei fette Stellen werden nicht zu einer langen', () => {
    // Ohne das nicht-gierige `.+?` verschlänge der Ausdruck alles zwischen dem
    // ersten und dem letzten Sternchenpaar zu EINEM fetten Block.
    expect(parseInline('**a** und **b**')).toEqual([
      { text: 'a', bold: true },
      { text: ' und ', bold: false },
      { text: 'b', bold: true },
    ])
  })

  test('am Rand entstehen keine leeren Stücke', () => {
    expect(parseInline('**ganz fett**')).toEqual([{ text: 'ganz fett', bold: true }])
  })

  test('ein einzelnes Sternchenpaar ohne Ende bleibt Text', () => {
    expect(parseInline('2 ** 3 ist acht')).toEqual([{ text: '2 ** 3 ist acht', bold: false }])
  })

  test('leere Sternchen werden nicht zu einer leeren fetten Stelle', () => {
    expect(parseInline('Trenner **** hier')).toEqual([{ text: 'Trenner **** hier', bold: false }])
  })

  test('eine leere Zeile ergibt keine Stücke', () => {
    expect(parseInline('')).toEqual([])
  })
})

describe('parseMarkdown', () => {
  test('Aufzählung mit Bindestrich', () => {
    expect(parseMarkdown('- Backzeit im Blick behalten')).toEqual([
      { kind: 'bullet', segments: [{ text: 'Backzeit im Blick behalten', bold: false }] },
    ])
  })

  test('Sternchen und Punkt zählen genauso als Aufzählung', () => {
    // Alle drei Zeichen stehen so auch in der Android-Fassung.
    const zeichen = ['-', '*', '•']
    for (const z of zeichen) {
      expect(parseMarkdown(`${z} Punkt`)).toEqual([
        { kind: 'bullet', segments: [{ text: 'Punkt', bold: false }] },
      ])
    }
  })

  test('nummerierte Zeile behält ihre Nummer', () => {
    expect(parseMarkdown('12. Ofen vorheizen')).toEqual([
      { kind: 'numbered', marker: '12', segments: [{ text: 'Ofen vorheizen', bold: false }] },
    ])
  })

  test('Aufzählung mit fetter Stelle', () => {
    expect(parseMarkdown('- **Panade beachten**: wird schneller dunkel')).toEqual([
      {
        kind: 'bullet',
        segments: [
          { text: 'Panade beachten', bold: true },
          { text: ': wird schneller dunkel', bold: false },
        ],
      },
    ])
  })

  test('eingerückte Aufzählung zählt auch', () => {
    expect(parseMarkdown('   - eingerückt')).toEqual([
      { kind: 'bullet', segments: [{ text: 'eingerückt', bold: false }] },
    ])
  })

  test('Leerzeilen fallen weg', () => {
    // Der Abstand zwischen den Blöcken trägt die Trennung; ein leerer Absatz
    // wäre eine zweite, doppelte Aussage darüber.
    expect(parseMarkdown('erste Zeile\n\n\nzweite Zeile')).toEqual([
      { kind: 'paragraph', segments: [{ text: 'erste Zeile', bold: false }] },
      { kind: 'paragraph', segments: [{ text: 'zweite Zeile', bold: false }] },
    ])
  })

  test('eine ganze Antwort im Stil des Modells', () => {
    const antwort = [
      'Ja, du kannst vegane Fischstäbchen nehmen — im Rezept sind sogar **vegane Tiefkühl-Fischstäbchen** gemeint.',
      '',
      'Falls du **keine TK-Fischstäbchen** nimmst:',
      '',
      '- **Backzeit im Blick behalten**: sie brauchen oft **etwas kürzer**.',
      '- **Nicht zu weich einarbeiten**: lieber vorsichtig unterheben.',
      '',
      '1. Ofen vorheizen',
      '2. Auflaufform einfetten',
    ].join('\n')

    const blocks = parseMarkdown(antwort)

    expect(blocks.map(b => b.kind)).toEqual([
      'paragraph', 'paragraph', 'bullet', 'bullet', 'numbered', 'numbered',
    ])
    expect(blocks[0]?.segments.some(s => s.bold && s.text === 'vegane Tiefkühl-Fischstäbchen')).toBe(true)
    const zweiterPunkt = blocks[3]
    expect(zweiterPunkt?.kind).toBe('bullet')
    expect(zweiterPunkt?.segments[0]).toEqual({ text: 'Nicht zu weich einarbeiten', bold: true })
    expect(blocks[5]).toEqual({
      kind: 'numbered',
      marker: '2',
      segments: [{ text: 'Auflaufform einfetten', bold: false }],
    })
  })

  test('Text ohne jede Auszeichnung bleibt unverändert', () => {
    expect(parseMarkdown('Ganz normale Antwort ohne Sternchen.')).toEqual([
      { kind: 'paragraph', segments: [{ text: 'Ganz normale Antwort ohne Sternchen.', bold: false }] },
    ])
  })

  test('eine leere Antwort ergibt keine Blöcke', () => {
    expect(parseMarkdown('')).toEqual([])
    expect(parseMarkdown('   \n  \n')).toEqual([])
  })

  test('was wir NICHT können, bleibt sichtbarer Text', () => {
    // Bewusst festgehalten: Überschriften, Links und Codeblöcke deckt Android
    // auch nicht ab. Wer das ändert, ändert es in beiden Clients.
    expect(parseMarkdown('# Überschrift')).toEqual([
      { kind: 'paragraph', segments: [{ text: '# Überschrift', bold: false }] },
    ])
    expect(parseMarkdown('[Link](https://example.com)')).toEqual([
      { kind: 'paragraph', segments: [{ text: '[Link](https://example.com)', bold: false }] },
    ])
  })
})

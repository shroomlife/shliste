import { describe, expect, test } from 'bun:test'
import { emptyItemImageMirrors, itemImageMirrorsFor, normalizeItemName } from './item-image-mirrors'

const BILD = 'item:0123456789abcdef0123456789abcdef.webp'

describe('normalizeItemName', () => {
  test('wortgleich mit der API: Ränder, Leerräume, Kleinschreibung, NFC', () => {
    expect(normalizeItemName('  Gurke ')).toBe('gurke')
    expect(normalizeItemName('Feld\t  Salat')).toBe('feld salat')
    expect(normalizeItemName('Müsli')).toBe(normalizeItemName('Müsli'))
  })
})

describe('itemImageMirrorsFor', () => {
  const quelle = { name: 'Gurke', itemImagePath: BILD, itemImagePending: false }

  test('derselbe Name behält das Bild, auch anders geschrieben', () => {
    expect(itemImageMirrorsFor(quelle, ' gurke')).toEqual({ itemImagePath: BILD, itemImagePending: false })
  })

  test('ein anderer Name räumt das Bild weg', () => {
    expect(itemImageMirrorsFor(quelle, 'Tomate')).toEqual(emptyItemImageMirrors())
  })

  test('ohne Quelle gibt es nichts', () => {
    expect(itemImageMirrorsFor(undefined, 'Gurke')).toEqual(emptyItemImageMirrors())
  })

  test('der Zustand in Arbeit kommt mit', () => {
    expect(itemImageMirrorsFor({ ...quelle, itemImagePath: null, itemImagePending: true }, 'Gurke').itemImagePending).toBe(true)
  })
})

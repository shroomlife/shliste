import { describe, expect, test } from 'bun:test'
import { parseList } from './entities'

const BASIS = {
  id: 'l1', name: 'Wocheneinkauf', color: '#AABBCC', secret: false, lastSuggestedItems: '', sourceUrl: null,
  createdAt: '2026-11-17T08:00:00.000Z', updatedAt: '2026-11-17T08:00:00.000Z', deletedAt: null, fieldTimestamps: null,
}

describe('parseList — Schalter KI-Bilder (SHL-11)', () => {
  test('der Wert des Servers kommt an', () => {
    expect(parseList({ ...BASIS, itemImages: true })?.itemImages).toBe(true)
  })

  test('ein älterer Server ohne das Feld heißt aus', () => {
    expect(parseList(BASIS)?.itemImages).toBe(false)
  })
})

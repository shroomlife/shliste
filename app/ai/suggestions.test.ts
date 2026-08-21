/// <reference types="bun" />
/**
 * Tests der Vorschlags-Nachbearbeitung und des Cache-Formats.
 *
 * Das Cache-Format (`lastSuggestedItems`, Semikolon-separiert) wird
 * gesynct und von der Android-App mitgelesen — die Round-Trip-Tests hier
 * sichern genau diese Kompatibilität ab.
 */
import { describe, expect, test } from 'bun:test'
import {
  joinSuggestionCache,
  postProcessSuggestions,
  splitSuggestionCache,
  SUGGESTION_COUNT,
} from './suggestions'

describe('postProcessSuggestions', () => {
  test('trimmt und entfernt führende Aufzählungszeichen', () => {
    expect(postProcessSuggestions(['- Milch ', '* Brot', '• Eier', '  Butter'], []))
      .toEqual(['Milch', 'Brot', 'Eier', 'Butter'])
  })

  test('dedupliziert case-insensitiv', () => {
    expect(postProcessSuggestions(['Milch', 'milch', 'MILCH', 'Brot'], []))
      .toEqual(['Milch', 'Brot'])
  })

  test('filtert bereits aktive Einträge heraus', () => {
    expect(postProcessSuggestions(['Milch', 'Brot'], ['milch ']))
      .toEqual(['Brot'])
  })

  test('verwirft Leeres und kappt bei sieben', () => {
    const raw = ['', '   ', '- ', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const result = postProcessSuggestions(raw, [])

    expect(result).toHaveLength(SUGGESTION_COUNT)
    expect(result).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  })
})

describe('Cache-Format', () => {
  test('Round-Trip bleibt verlustfrei', () => {
    const items = ['Milch', 'Brot', 'Eier']
    expect(splitSuggestionCache(joinSuggestionCache(items))).toEqual(items)
  })

  test('leere und verwaiste Teile fallen beim Lesen weg', () => {
    expect(splitSuggestionCache(';Milch; ;Brot;')).toEqual(['Milch', 'Brot'])
    expect(splitSuggestionCache('')).toEqual([])
  })

  test('schreibt Semikolon-separiert wie die Android-App', () => {
    expect(joinSuggestionCache(['Milch', 'Brot'])).toBe('Milch;Brot')
  })
})

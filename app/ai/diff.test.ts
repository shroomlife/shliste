/// <reference types="bun" />
/**
 * Tests des Listen-Diffs — der Kern der AI-Bearbeitungs-Vorschau.
 *
 * Der Algorithmus muss sich exakt wie sein Android-Vorbild verhalten
 * (`computeListDiff` in AiEditListSheet.kt): Matching über `idx`, jeder
 * Index höchstens einmal, Umbenennung vor Mengen-/Statusänderung, und was
 * im Vorschlag fehlt, gilt als entfernt.
 */
import { describe, expect, test } from 'bun:test'
import type { EditedListItem } from './contract'
import {
  buildCurrentListPayload,
  computeListDiff,
  defaultDiffSelection,
  hasEffectiveChanges,
  type DiffSourceItem,
} from './diff'

function item(id: string, name: string, quantity = 1, checked = false): DiffSourceItem {
  return { id, name, quantity, checked }
}

function proposed(idx: number | null, name: string, quantity = 1, checked = false): EditedListItem {
  return { idx, name, quantity, checked }
}

describe('buildCurrentListPayload', () => {
  test('vergibt den idx als Position im Array', () => {
    const payload = buildCurrentListPayload('Wocheneinkauf', [
      item('a', 'Milch'),
      item('b', 'Brot', 2, true),
    ])

    expect(payload).toEqual({
      name: 'Wocheneinkauf',
      items: [
        { idx: 0, name: 'Milch', quantity: 1, checked: false },
        { idx: 1, name: 'Brot', quantity: 2, checked: true },
      ],
    })
  })
})

describe('computeListDiff', () => {
  test('ohne idx ist ein Eintrag neu', () => {
    const diff = computeListDiff([item('a', 'Milch')], [
      proposed(0, 'Milch'),
      proposed(null, 'Gurke'),
    ])

    expect(diff).toEqual([
      { kind: 'unchanged', name: 'Milch', quantity: 1, checked: false },
      { kind: 'added', name: 'Gurke', quantity: 1, checked: false },
    ])
  })

  test('fehlt ein Eintrag im Vorschlag, gilt er als entfernt', () => {
    const diff = computeListDiff([item('a', 'Milch'), item('b', 'Brot')], [
      proposed(0, 'Milch'),
    ])

    expect(diff).toEqual([
      { kind: 'unchanged', name: 'Milch', quantity: 1, checked: false },
      { kind: 'removed', itemId: 'b', name: 'Brot', quantity: 1 },
    ])
  })

  test('eine Mengenänderung wird als modified erkannt', () => {
    const diff = computeListDiff([item('a', 'Paprika', 2)], [
      proposed(0, 'Paprika', 5),
    ])

    expect(diff).toEqual([{
      kind: 'modified',
      itemId: 'a',
      name: 'Paprika',
      oldQuantity: 2,
      newQuantity: 5,
      oldChecked: false,
      newChecked: false,
    }])
  })

  test('ein neuer Name gewinnt gegen die Mengenänderung: renamed', () => {
    const diff = computeListDiff([item('a', 'Tomaten', 2)], [
      proposed(0, 'Cherrytomaten', 3),
    ])

    expect(diff).toEqual([{
      kind: 'renamed',
      itemId: 'a',
      oldName: 'Tomaten',
      newName: 'Cherrytomaten',
      oldQuantity: 2,
      newQuantity: 3,
      oldChecked: false,
      newChecked: false,
    }])
  })

  test('Namensvergleich ist case-insensitiv und ignoriert Randleerzeichen', () => {
    const diff = computeListDiff([item('a', ' Milch ')], [
      proposed(0, 'milch'),
    ])

    expect(diff[0]?.kind).toBe('unchanged')
  })

  test('derselbe idx zweimal: der zweite Eintrag gilt als neu', () => {
    const diff = computeListDiff([item('a', 'Milch')], [
      proposed(0, 'Milch'),
      proposed(0, 'Hafermilch'),
    ])

    expect(diff).toEqual([
      { kind: 'unchanged', name: 'Milch', quantity: 1, checked: false },
      { kind: 'added', name: 'Hafermilch', quantity: 1, checked: false },
    ])
  })

  test('ein idx ausserhalb des Arrays gilt als neu', () => {
    const diff = computeListDiff([item('a', 'Milch')], [
      proposed(7, 'Butter'),
    ])

    expect(diff).toEqual([
      { kind: 'added', name: 'Butter', quantity: 1, checked: false },
      { kind: 'removed', itemId: 'a', name: 'Milch', quantity: 1 },
    ])
  })
})

describe('defaultDiffSelection', () => {
  test('wählt alles Geänderte an, Unverändertes bleibt abgewählt', () => {
    const diff = computeListDiff([item('a', 'Milch'), item('b', 'Brot')], [
      proposed(0, 'Milch'),
      proposed(null, 'Gurke'),
    ])

    // 0 = unchanged Milch, 1 = added Gurke, 2 = removed Brot
    expect(defaultDiffSelection(diff)).toEqual(new Set([1, 2]))
  })
})

describe('hasEffectiveChanges', () => {
  test('ein reiner Namenswechsel der Liste zählt als Änderung', () => {
    const diff = computeListDiff([item('a', 'Milch')], [proposed(0, 'Milch')])

    expect(hasEffectiveChanges(diff, 'Einkauf', { name: 'Wocheneinkauf', items: [] })).toBe(true)
    expect(hasEffectiveChanges(diff, 'Einkauf', { name: 'Einkauf', items: [] })).toBe(false)
  })
})

/// <reference types="bun" />
/**
 * Tests der reinen Funktionen aus `useListDetail.ts`.
 *
 * Geprüft wird alles, was ohne IndexedDB und ohne Vue auskommt: die
 * Reihenfolge der Einträge, ihre Aufteilung in offen und erledigt, der
 * Ordnungswert für einen neuen Eintrag und das Zurückschneiden einer
 * gespeicherten Zeile auf die setzbaren Felder.
 *
 * Der Rest des Composables ist Verdrahtung: Er ruft die Repositories auf, die
 * ihre eigenen Tests haben, und lebt ansonsten im Browser.
 */
import { describe, expect, test } from 'bun:test'
import type { ListItem } from '../../shared/types/domain'
import { groupByChecked, nextOrderIndex, sortOpenFirst, toItemDraft } from './useListDetail'

const NOW = '2026-08-19T10:15:00.000Z'

function makeItem(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: 'item-1',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    fieldTimestamps: null,
    listId: 'list-1',
    name: 'Milch',
    quantity: 1,
    checked: false,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    url: null,
    linkTitle: null,
    linkImagePath: null,
    linkImageKind: null,
    createdBy: null,
    modifiedBy: null,
    ...overrides,
  }
}

describe('sortOpenFirst', () => {
  test('stellt offene Einträge vor die erledigten', () => {
    const sorted = sortOpenFirst([
      makeItem({ id: 'a', checked: true }),
      makeItem({ id: 'b', checked: false }),
      makeItem({ id: 'c', checked: true }),
      makeItem({ id: 'd', checked: false }),
    ])

    expect(sorted.map(item => item.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  test('behält innerhalb beider Gruppen die gelieferte Reihenfolge', () => {
    const sorted = sortOpenFirst([
      makeItem({ id: 'a', checked: false, orderIndex: 3 }),
      makeItem({ id: 'b', checked: true, orderIndex: 1 }),
      makeItem({ id: 'c', checked: false, orderIndex: 2 }),
      makeItem({ id: 'd', checked: true, orderIndex: 0 }),
    ])

    // Die manuelle Reihenfolge kommt aus `getItemsForList` und wird hier nicht
    // erneut berechnet — nur die beiden Gruppen werden getrennt.
    expect(sorted.map(item => item.id)).toEqual(['a', 'c', 'b', 'd'])
  })

  test('lässt die übergebene Liste unangetastet', () => {
    const items = [
      makeItem({ id: 'a', checked: true }),
      makeItem({ id: 'b', checked: false }),
    ]

    sortOpenFirst(items)

    expect(items.map(item => item.id)).toEqual(['a', 'b'])
  })

  test('kommt mit einer leeren Liste zurecht', () => {
    expect(sortOpenFirst([])).toEqual([])
  })
})

describe('groupByChecked', () => {
  test('teilt in offene und erledigte Einträge', () => {
    const groups = groupByChecked([
      makeItem({ id: 'a', checked: false }),
      makeItem({ id: 'b', checked: true }),
      makeItem({ id: 'c', checked: false }),
    ])

    expect(groups.open.map(item => item.id)).toEqual(['a', 'c'])
    expect(groups.done.map(item => item.id)).toEqual(['b'])
  })

  test('liefert bei ausschliesslich erledigten Einträgen eine leere offene Gruppe', () => {
    const groups = groupByChecked([makeItem({ checked: true })])

    expect(groups.open).toHaveLength(0)
    expect(groups.done).toHaveLength(1)
  })

  test('liefert für eine leere Liste zwei leere Gruppen', () => {
    const groups = groupByChecked([])

    expect(groups.open).toHaveLength(0)
    expect(groups.done).toHaveLength(0)
  })
})

describe('nextOrderIndex', () => {
  test('setzt den ersten Eintrag auf 0', () => {
    expect(nextOrderIndex([])).toBe(0)
  })

  test('reiht hinter dem höchsten bestehenden Wert ein', () => {
    expect(nextOrderIndex([
      makeItem({ orderIndex: 0 }),
      makeItem({ orderIndex: 7 }),
      makeItem({ orderIndex: 3 }),
    ])).toBe(8)
  })

  test('richtet sich nach dem höchsten Wert, nicht nach der Anzahl', () => {
    // Nach dem Entfernen mittlerer Einträge klaffen Lücken. Ein neuer Eintrag
    // muss trotzdem hinten landen und darf keinen belegten Wert erben.
    expect(nextOrderIndex([makeItem({ orderIndex: 42 })])).toBe(43)
  })

  test('gibt auch bei negativen Bestandswerten nie einen negativen Wert zurück', () => {
    // Negative Werte gehören nicht zum Modell, könnten aber aus fremden Daten
    // kommen. Die untere Schranke bleibt 0, damit ein neuer Eintrag nicht
    // versehentlich vor allen anderen einsortiert wird.
    expect(nextOrderIndex([makeItem({ orderIndex: -5 })])).toBe(0)
  })
})

describe('toItemDraft', () => {
  test('lässt die von der Datenschicht geführten Felder weg', () => {
    const draft = toItemDraft(makeItem())
    const keys = Object.keys(draft)

    expect(keys).not.toContain('createdAt')
    expect(keys).not.toContain('updatedAt')
    expect(keys).not.toContain('fieldTimestamps')
  })

  test('lässt die drei Server-Spiegel weg', () => {
    // Sie gehören dem Server. Was lokal mit ihnen passiert, entscheidet allein
    // `linkFieldsAfterWrite` anhand der Adresse.
    const keys = Object.keys(toItemDraft(makeItem({
      url: 'https://kochwelt.de/x',
      linkTitle: 'Ofenkartoffeln',
      linkImagePath: 'link:0123456789abcdef0123456789abcdef.webp',
      linkImageKind: 'preview',
    })))

    expect(keys).toContain('url')
    expect(keys).not.toContain('linkTitle')
    expect(keys).not.toContain('linkImagePath')
    expect(keys).not.toContain('linkImageKind')
  })

  test('übernimmt alle setzbaren Felder unverändert', () => {
    const item = makeItem({
      id: 'item-9',
      listId: 'list-9',
      name: 'Hafermilch',
      quantity: 3,
      checked: true,
      removed: false,
      orderIndex: 5,
      sortKey: 'a0',
      url: 'https://kochwelt.de/rezept',
      createdBy: 'user-1',
      modifiedBy: 'user-2',
      deletedAt: null,
    })

    expect(toItemDraft(item)).toEqual({
      id: 'item-9',
      listId: 'list-9',
      name: 'Hafermilch',
      quantity: 3,
      checked: true,
      removed: false,
      orderIndex: 5,
      sortKey: 'a0',
      url: 'https://kochwelt.de/rezept',
      createdBy: 'user-1',
      modifiedBy: 'user-2',
      deletedAt: null,
    })
  })

  test('behält den Löschmarker, damit ein Tombstone nicht verlorengeht', () => {
    const draft = toItemDraft(makeItem({ deletedAt: NOW, removed: true }))

    expect(draft.deletedAt).toBe(NOW)
    expect(draft.removed).toBe(true)
  })
})

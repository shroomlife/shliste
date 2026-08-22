// snapshot.test.ts — der Interop-Punkt der Lösch-Historie
//
// Zwei Vertragsseiten: Der WRITER muss die Vereinigung beider Client-Formen
// emittieren (Androids kotlinx-Reader ist strikt und braucht `uuid`/`order`
// als Pflichtfelder), der PARSER muss beide Formen lesen und auf keinem
// Pfad werfen (ein am Limit gekappter Snapshot ist kaputtes JSON).
import { describe, expect, test } from 'bun:test'
import type { ListItem, RecipeIngredient, RecipeStep } from '../../shared/types/domain'
import {
  ingredientSnapshotJson,
  listItemSnapshotJson,
  parseHistorySnapshot,
  stepSnapshotJson,
} from './snapshot'

const item: ListItem = {
  id: 'item-1',
  listId: 'liste-1',
  name: 'Milch',
  quantity: 2,
  checked: false,
  removed: false,
  orderIndex: 3,
  sortKey: 'a0',
  createdBy: 'robin-uuid',
  modifiedBy: null,
  createdAt: '2026-08-22T10:00:00.000Z',
  updatedAt: '2026-08-22T10:00:00.000Z',
  deletedAt: null,
  fieldTimestamps: {},
}

describe('Snapshot-Writer (Vereinigungs-Format)', () => {
  test('Listeneintrag trägt beide Feldnamen — Androids Pflichtfelder inklusive', () => {
    const raw = JSON.parse(listItemSnapshotJson(item)) as Record<string, unknown>
    expect(raw['uuid']).toBe('item-1')
    expect(raw['id']).toBe('item-1')
    expect(raw['order']).toBe(3)
    expect(raw['orderIndex']).toBe(3)
    expect(raw['name']).toBe('Milch')
    expect(raw['quantity']).toBe(2)
  })

  test('Mengen werden ganzzahlig geschrieben — kotlinx dekodiert Int strikt', () => {
    const broken = { ...item, quantity: 2.5 }
    const raw = JSON.parse(listItemSnapshotJson(broken)) as Record<string, unknown>
    expect(raw['quantity']).toBe(2)

    const nan = { ...item, quantity: Number.NaN }
    const rawNan = JSON.parse(listItemSnapshotJson(nan)) as Record<string, unknown>
    expect(rawNan['quantity']).toBe(1)
  })

  test('Zutat und Schritt tragen ihre Android-Pflichtfelder', () => {
    const ingredient: RecipeIngredient = {
      id: 'zutat-1', recipeId: 'rezept-1', name: 'Mehl', quantity: 500,
      orderIndex: 1, sortKey: null, createdBy: null, modifiedBy: null,
      createdAt: '2026-08-22T10:00:00.000Z', updatedAt: '2026-08-22T10:00:00.000Z',
      deletedAt: null, fieldTimestamps: {},
    }
    const rawIngredient = JSON.parse(ingredientSnapshotJson(ingredient)) as Record<string, unknown>
    expect(rawIngredient['uuid']).toBe('zutat-1')
    expect(rawIngredient['quantity']).toBe(500)

    const step: RecipeStep = {
      id: 'schritt-1', recipeId: 'rezept-1', description: 'Rühren',
      orderIndex: 2, sortKey: null, isChecked: false, aiExplanation: null,
      createdBy: null, modifiedBy: null,
      createdAt: '2026-08-22T10:00:00.000Z', updatedAt: '2026-08-22T10:00:00.000Z',
      deletedAt: null, fieldTimestamps: {},
    }
    const rawStep = JSON.parse(stepSnapshotJson(step)) as Record<string, unknown>
    expect(rawStep['uuid']).toBe('schritt-1')
    expect(rawStep['order']).toBe(2)
    expect(rawStep['description']).toBe('Rühren')
  })
})

describe('parseHistorySnapshot', () => {
  test('liest die Android-Form: uuid, kotlinx-Defaults fehlen im JSON', () => {
    const parsed = parseHistorySnapshot('list_item', '{"uuid":"a1","name":"Butter"}')
    expect(parsed).toEqual({ entityType: 'list_item', id: 'a1', name: 'Butter', quantity: 1 })
  })

  test('liest die eigene Form zurück (Roundtrip)', () => {
    const parsed = parseHistorySnapshot('list_item', listItemSnapshotJson(item))
    expect(parsed).toEqual({ entityType: 'list_item', id: 'item-1', name: 'Milch', quantity: 2 })
  })

  test('Schritt: Android-Form mit order statt orderIndex', () => {
    const parsed = parseHistorySnapshot('recipe_step', '{"uuid":"s1","description":"Kneten","order":4}')
    expect(parsed).toEqual({ entityType: 'recipe_step', id: 's1', description: 'Kneten' })
  })

  test('wirft auf keinem Pfad: gekapptes JSON, kein Objekt, leerer Name', () => {
    expect(parseHistorySnapshot('list_item', '{"uuid":"a1","name":"Butt')).toBeNull()
    expect(parseHistorySnapshot('list_item', '42')).toBeNull()
    expect(parseHistorySnapshot('list_item', '{"uuid":"a1","name":"  "}')).toBeNull()
    expect(parseHistorySnapshot('recipe_step', '{"uuid":"s1"}')).toBeNull()
  })

  test('Unsinns-Mengen werden auf eine gültige Menge gezogen', () => {
    expect(parseHistorySnapshot('recipe_ingredient', '{"uuid":"z1","name":"Salz","quantity":-3}'))
      .toEqual({ entityType: 'recipe_ingredient', id: 'z1', name: 'Salz', quantity: 1 })
  })
})

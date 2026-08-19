/// <reference types="bun" />
/**
 * Tests der reinen Funktionen aus `useRecipeDetail.ts`.
 *
 * Geprüft wird, was ohne IndexedDB und ohne Vue auskommt: der Ordnungswert
 * für einen neuen Eintrag und der Fortschritt über die Schritte.
 *
 * Der Rest des Composables ist Verdrahtung: Er ruft die Repositories auf, die
 * ihre eigenen Tests haben, und lebt ansonsten im Browser.
 */
import { describe, expect, test } from 'bun:test'
import { nextOrderIndex, stepProgress } from './useRecipeDetail'

describe('nextOrderIndex', () => {
  test('der erste Eintrag bekommt 0', () => {
    expect(nextOrderIndex([])).toBe(0)
  })

  test('ein neuer Eintrag landet hinter allen bestehenden', () => {
    expect(nextOrderIndex([{ orderIndex: 0 }, { orderIndex: 1 }])).toBe(2)
  })

  test('Lücken in der Ordnung stören nicht', () => {
    // Nach einer Löschung ist die Folge nicht mehr lückenlos. Entscheidend ist
    // allein, dass der neue Wert grösser als jeder vorhandene ist — sonst
    // sprünge der Eintrag an eine willkürliche Stelle.
    expect(nextOrderIndex([{ orderIndex: 0 }, { orderIndex: 7 }])).toBe(8)
  })

  test('auch eine unsortierte Vorlage ergibt den richtigen Wert', () => {
    expect(nextOrderIndex([{ orderIndex: 5 }, { orderIndex: 2 }])).toBe(6)
  })
})

describe('stepProgress', () => {
  test('ohne Schritte gibt es keinen Fortschritt', () => {
    // Nicht 100: Ein leeres Rezept ist nicht fertig gekocht.
    expect(stepProgress([])).toBe(0)
  })

  test('alle abgehakt sind 100 Prozent', () => {
    expect(stepProgress([{ isChecked: true }, { isChecked: true }])).toBe(100)
  })

  test('die Hälfte ergibt 50', () => {
    expect(stepProgress([{ isChecked: true }, { isChecked: false }])).toBe(50)
  })

  test('gerundet wird auf ganze Prozent', () => {
    expect(stepProgress([{ isChecked: true }, { isChecked: false }, { isChecked: false }])).toBe(33)
  })
})

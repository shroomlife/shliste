import { describe, expect, test } from 'bun:test'
import { bakingRecipes, combineBakingIngredients, bakingAmount } from './christmasBaking'

describe('Weihnachtsbäckerei Einkaufsliste', () => {
  test('führt gemeinsame Zutaten zusammen und behält Extras der Sorten', () => {
    const items = combineBakingIngredients(['vanille', 'schoko', 'marmelade'], 1)
    expect(items.find(item => item.id === 'mehl')?.amount).toBe(730)
    expect(items.find(item => item.id === 'margarine')?.amount).toBe(375)
    expect(items.find(item => item.id === 'haferdrink')?.amount).toBe(105)
    expect(items.find(item => item.id === 'konfituere')?.amount).toBe(80)
    expect(new Set(items.map(item => item.id)).size).toBe(items.length)
  })
  test('skaliert nur gewählte Sorten, ohne die Grundrezepte zu verändern', () => {
    const items = combineBakingIngredients(['vanille', 'schoko'], 2)
    expect(items.find(item => item.id === 'mehl')?.amount).toBe(960)
    expect(items.find(item => item.id === 'kakao')?.amount).toBe(40)
    expect(items.some(item => item.id === 'konfituere')).toBe(false)
    expect(bakingRecipes[0]!.ingredients[0]!.amount).toBe(250)
    expect(combineBakingIngredients([], 1)).toEqual([])
  })
  test('formatiert Einkaufsgewichte deutsch und lässt Flüssigkeiten in ml', () => {
    expect(bakingAmount({ id: 'x', name: 'Mehl', amount: 1460, unit: 'g' })).toBe('1,46 kg')
    expect(bakingAmount({ id: 'x', name: 'Drink', amount: 105, unit: 'ml' })).toBe('105 ml')
  })
})

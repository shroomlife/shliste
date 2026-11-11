import { describe, expect, test } from 'bun:test'
import { chooseThemeMotion } from './theme-motion'

describe('theme image playback selection', () => {
  const first = Symbol('baking')
  const second = Symbol('raclette')
  const both = (firstDistance: number, secondDistance: number) => [
    { id: first, imageArea: 1000, visibleArea: 1000, centerDistance: firstDistance },
    { id: second, imageArea: 1000, visibleArea: 1000, centerDistance: secondDistance },
  ]
  test('selects the image closest to the visible center, even when both are fully visible', () => {
    expect(chooseThemeMotion(both(260, 40), null)).toBe(second)
    expect(chooseThemeMotion(both(260, 40), first)).toBe(second)
  })
  test('prefers the center over the larger visible area', () => {
    expect(chooseThemeMotion([{ id: first, imageArea: 1000, visibleArea: 900, centerDistance: 300 }, { id: second, imageArea: 1000, visibleArea: 600, centerDistance: 50 }], null)).toBe(second)
  })
  test('stops when neither image is meaningfully visible', () => {
    expect(chooseThemeMotion([{ id: first, imageArea: 1000, visibleArea: 110, centerDistance: 0 }, { id: second, imageArea: 0, visibleArea: 0, centerDistance: 0 }], first)).toBeNull()
  })
  test('stays stable inside the tolerance, then hands over', () => {
    expect(chooseThemeMotion(both(130, 100), first, null, 40)).toBe(first)
    expect(chooseThemeMotion(both(150, 100), first, null, 40)).toBe(second)
  })
  test('uses the visible area to resolve an exact tie', () => {
    expect(chooseThemeMotion([{ id: first, imageArea: 1000, visibleArea: 500, centerDistance: 80 }, { id: second, imageArea: 1000, visibleArea: 900, centerDistance: 80 }], null)).toBe(second)
  })
  test('a hovered image wins over the centered one', () => {
    expect(chooseThemeMotion(both(20, 300), first, second, 40)).toBe(second)
  })
  test('ignores a hovered image that is not visible', () => {
    expect(chooseThemeMotion([{ id: first, imageArea: 1000, visibleArea: 1000, centerDistance: 20 }, { id: second, imageArea: 1000, visibleArea: 50, centerDistance: 600 }], null, second)).toBe(first)
  })
})

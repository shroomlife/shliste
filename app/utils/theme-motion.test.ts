import { describe, expect, test } from 'bun:test'
import { chooseThemeMotion } from './theme-motion'

describe('theme image playback selection', () => {
  const first = Symbol('baking')
  const second = Symbol('raclette')
  test('selects only the largest visible image area', () => {
    expect(chooseThemeMotion([{ id: first, imageArea: 1000, visibleArea: 200, centerDistance: 0 }, { id: second, imageArea: 1000, visibleArea: 800, centerDistance: 200 }], null)).toBe(second)
  })
  test('stops when neither image is meaningfully visible', () => {
    expect(chooseThemeMotion([{ id: first, imageArea: 1000, visibleArea: 110, centerDistance: 0 }, { id: second, imageArea: 0, visibleArea: 0, centerDistance: 0 }], first)).toBeNull()
  })
  test('stays stable at nearly equal areas, then hands over', () => {
    const images = [{ id: first, imageArea: 1000, visibleArea: 760, centerDistance: 10 }, { id: second, imageArea: 1000, visibleArea: 780, centerDistance: 0 }]
    expect(chooseThemeMotion(images, first)).toBe(first)
    images[0]!.visibleArea = 700
    expect(chooseThemeMotion(images, first)).toBe(second)
  })
  test('uses center proximity to resolve a fresh tie', () => {
    expect(chooseThemeMotion([{ id: first, imageArea: 1000, visibleArea: 1000, centerDistance: 100 }, { id: second, imageArea: 1000, visibleArea: 1000, centerDistance: 10 }], null)).toBe(second)
  })
})

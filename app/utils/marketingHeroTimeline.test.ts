import { describe, expect, test } from 'bun:test'
import { HERO_DURATION, HERO_COMPACT_DURATION, heroMoments, marketingHeroFrame } from './marketingHeroTimeline'

describe('hero story', () => {
  test('compact story only swaps lists and recipes, with a seamless loop and no recording', () => {
    for (let t = 0; t < HERO_COMPACT_DURATION * 3; t += 20) {
      const frame = marketingHeroFrame(t, true)
      expect(frame.recording || frame.processing).toBe(false)
      expect([frame.created, frame.voiceNote]).toEqual([0, 0])
      expect([0, 1]).toContain(frame.moment)
    }
    expect(marketingHeroFrame(4400, true).pager).toBe(1)
    for (const t of [0, HERO_COMPACT_DURATION - 1, HERO_COMPACT_DURATION]) {
      const frame = marketingHeroFrame(t, true)
      expect([frame.pager, frame.swipeOpacity, frame.moment]).toEqual([0, 0, 0])
    }
  })
  test('recording and processing only happen on the settled list page', () => {
    for (let t = 0; t < HERO_DURATION; t += 10) {
      const frame = marketingHeroFrame(t)
      if (frame.recording || frame.processing) {
        expect(frame.pager).toBe(0)
        expect(frame.sliding).toBe(false)
      }
      expect(frame.recording && frame.processing).toBe(false)
      expect(frame.pager).toBeGreaterThanOrEqual(0)
      expect(frame.pager).toBeLessThanOrEqual(1)
      if (frame.created > 0) expect(frame.recording || frame.processing).toBe(false)
      for (const height of frame.wave) {
        expect(height).toBeGreaterThanOrEqual(4)
        expect(height).toBeLessThanOrEqual(24)
      }
    }
  })
  test('manual moments expose all four parts of the story', () => {
    expect(heroMoments.map(t => marketingHeroFrame(t).moment)).toEqual([0, 1, 2, 3])
    expect(marketingHeroFrame(heroMoments[1]).pager).toBe(1)
    expect(marketingHeroFrame(heroMoments[2]).recording).toBe(true)
    expect(marketingHeroFrame(heroMoments[3]).created).toBe(1)
  })
  test('the loop returns to the same settled view without a page jump', () => {
    for (const t of [0, HERO_DURATION - 1, HERO_DURATION]) {
      const frame = marketingHeroFrame(t)
      expect([frame.pager, frame.created, frame.swipeOpacity]).toEqual([0, 0, 0])
      expect(frame.recording).toBe(false)
    }
  })
})

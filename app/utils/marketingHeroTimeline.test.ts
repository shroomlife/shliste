import { describe, expect, test } from 'bun:test'
import { heroDuration, heroMomentTimes, marketingHeroFrame, heroHandoffFrame, HERO_HANDOFF_SWAP, HERO_HANDOFF_DURATION } from './marketingHeroTimeline'
import { marketingHeroWorlds } from '../data/marketingHeroWorlds'

describe('six hero stories', () => {
  test('each desktop story exposes its own complete sequence and settles before looping', () => {
    for (let world = 0; world < 6; world++) {
      const moments = heroMomentTimes(false, world)
      expect(moments.length).toBe(marketingHeroWorlds[world]!.moments.length)
      expect(moments.map(t => marketingHeroFrame(t, false, world).moment)).toEqual(moments.map((_, i) => i))
      expect(marketingHeroFrame(0, false, world).moment).toBe(0)
      for (const t of [heroDuration(false, world) - 1500, heroDuration(false, world) - 1, heroDuration(false, world), heroDuration(false, world) + 500]) {
        const frame = marketingHeroFrame(t, false, world)
        expect(frame.moment).toBe(moments.length - 1)
        expect(frame.recording).toBe(false)
      }
    }
  })
  test('shared edits are reviewed before applying and synced only afterwards', () => {
    const preview = marketingHeroFrame(15100, false, 0)
    expect(preview.preview).toBe(true)
    expect(preview.applied).toBe(false)
    expect(preview.synced).toBe(false)
    const applied = marketingHeroFrame(19400, false, 0)
    expect(applied.applied).toBe(true)
    expect(applied.preview).toBe(false)
    expect(applied.synced).toBe(false)
    expect(marketingHeroFrame(23700, false, 0).synced).toBe(true)
    expect(marketingHeroFrame(11800, false, 0).words).toBe(1)
  })
  test('recording never overlaps navigation or an applied change', () => {
    for (let world = 0; world < 6; world++) {
      for (let t = 0; t < heroDuration(false, world); t += 40) {
        const frame = marketingHeroFrame(t, false, world)
        if (frame.recording) {
          expect(world).toBe(0)
          expect(frame.detail).toBe(true)
          expect(frame.editing).toBe(true)
          expect(frame.sliding || frame.applied || frame.preview).toBe(false)
        }
      }
    }
  })
  test('compact screens keep the simple list and recipe tour without extra overlays', () => {
    for (let world = 0; world < 6; world++) {
      expect(heroMomentTimes(true, world).length).toBe(2)
      for (let t = 0; t < heroDuration(true, world); t += 50) {
        const frame = marketingHeroFrame(t, true, world)
        expect(frame.recording || frame.detail || frame.editing).toBe(false)
        expect([0, 1]).toContain(frame.moment)
      }
    }
  })
  test('world swap happens with content hidden and arrivals settle exactly', () => {
    expect(heroHandoffFrame(-1)).toEqual({ opacity: 1, shift: 0, scale: 1 })
    expect(heroHandoffFrame(HERO_HANDOFF_SWAP - 1).opacity).toBe(0)
    expect(heroHandoffFrame(HERO_HANDOFF_SWAP).opacity).toBe(0)
    expect(heroHandoffFrame(HERO_HANDOFF_DURATION)).toEqual({ opacity: 1, shift: 0, scale: 1 })
    for (let time = 0; time <= HERO_HANDOFF_DURATION; time += 16) {
      const frame = heroHandoffFrame(time)
      expect(frame.opacity).toBeGreaterThanOrEqual(0)
      expect(frame.opacity).toBeLessThanOrEqual(1)
      expect(Math.abs(frame.shift)).toBeLessThanOrEqual(12)
    }
    for (let world = 0; world < 6; world++) {
      expect(marketingHeroFrame(heroDuration(true, world) - 1, true, world).moment).toBe(1)
    }
  })
  test('secret contents close again when returning to the overview', () => {
    expect(marketingHeroFrame(11500, false, 4).detail).toBe(true)
    expect(marketingHeroFrame(19500, false, 4).detail).toBe(false)
  })
})

import { describe, expect, test } from 'bun:test'
import { holidayListScroll, isListTitleClipped } from './marketingListScroll'

describe('Android list-title handoff', () => {
  test('hands off at the first clipped edge, not after the title disappears', () => {
    expect(isListTitleClipped(0, 12, 110, 400)).toBe(false)
    expect(isListTitleClipped(12, 12, 110, 400)).toBe(false)
    expect(isListTitleClipped(13, 12, 110, 400)).toBe(true)
    expect(isListTitleClipped(80, 12, 110, 400)).toBe(true)
    expect(isListTitleClipped(200, 12, 110, 400)).toBe(true)
    expect(isListTitleClipped(0, 12, 110, 100)).toBe(true)
  })
  test('scrolls down, holds for checking, then returns only after the title tap', () => {
    expect(holidayListScroll(3500).progress).toBe(0)
    expect(holidayListScroll(9000).progress).toBe(0.46)
    expect(holidayListScroll(14000).progress).toBe(1)
    expect(holidayListScroll(15500).progress).toBe(1)
    expect(holidayListScroll(19500)).toEqual({ progress: 1, returnCue: true, returnCueProgress: 0.625 })
    expect(holidayListScroll(21800)).toEqual({ progress: 0, returnCue: false, returnCueProgress: 1 })
    expect(holidayListScroll(23999).progress).toBe(0)
  })
  test('the title tap follows playback time, including pausing and seeking backwards', () => {
    expect(holidayListScroll(18999).returnCueProgress).toBe(0)
    expect(holidayListScroll(19000).returnCue).toBe(true)
    expect(holidayListScroll(19240).returnCueProgress).toBe(0.3)
    expect(holidayListScroll(19500).returnCueProgress).toBe(0.625)
    // Reading the same paused frame cannot consume or restart the tap cue.
    const paused = holidayListScroll(19500)
    expect(holidayListScroll(19500)).toEqual(paused)
    expect(holidayListScroll(19240).returnCueProgress).toBe(0.3)
    expect(holidayListScroll(19800).returnCue).toBe(false)
    expect(holidayListScroll(19800).returnCueProgress).toBe(1)
    expect(holidayListScroll(0).returnCueProgress).toBe(0)
  })
  test('motion is bounded, continuous and reversible without a phase reset', () => {
    for (let t = 0; t <= 24000; t += 16) {
      const current = holidayListScroll(t).progress
      const next = holidayListScroll(t + 16).progress
      expect(current).toBeGreaterThanOrEqual(0)
      expect(current).toBeLessThanOrEqual(1)
      expect(Math.abs(next - current)).toBeLessThan(0.016)
      if (t < 19000) expect(next).toBeGreaterThanOrEqual(current)
      if (t >= 19800) expect(next).toBeLessThanOrEqual(current)
    }
  })
})

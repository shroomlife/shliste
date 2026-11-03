/** A single clock keeps the pager, microphone and outcome mutually consistent. */
export const HERO_DURATION = 22800
export const HERO_COMPACT_DURATION = 10000
export const heroMoments = [0, 4400, 11900, 17700] as const
const clamp = (n: number) => Math.max(0, Math.min(1, n))
// Critically damped settling, with exact endpoints so no page peeks through at rest.
function settle(time: number, start: number, duration: number) {
  const x = clamp((time - start) / duration)
  return x === 0 || x === 1 ? x : (1 - (1 + 10 * x) * Math.exp(-10 * x)) / (1 - 11 * Math.exp(-10))
}
export function marketingHeroFrame(time: number, compact = false) {
  const duration = compact ? HERO_COMPACT_DURATION : HERO_DURATION
  const t = ((time % duration) + duration) % duration
  const pager = settle(t, 2600, 800) * (1 - settle(t, 8200, 800))
  const sliding = (t > 2600 && t < 3400) || (t > 8200 && t < 9000)
  const recording = !compact && t >= 10400 && t < 14600
  const processing = !compact && t >= 14600 && t < 16200
  const created = compact ? 0 : settle(t, 16200, 900) * (1 - settle(t, 21400, 800))
  const moment = compact ? (t < 2600 || t >= 9000 ? 0 : 1) : t < 2600 || t >= 21400 ? 0 : t < 9000 ? 1 : t < 16200 ? 2 : 3
  const recordingTime = Math.max(0, t - 10400)
  const wave = Array.from({ length: 4 }, (_, i) => {
    const amplitude = 0.48 + 0.25 * Math.sin(recordingTime / 370) + 0.16 * Math.sin(recordingTime / 113)
    const phase = recordingTime / 800 * Math.PI * 2 + i * 1.2
    return 4 + 20 * clamp(amplitude * (0.7 + 0.3 * (Math.sin(phase) * 0.5 + 0.5)))
  })
  const swipeTime = t < 5800 ? (t - 2600) / 800 : (t - 8200) / 800
  return { t, pager, sliding, recording, processing, created, moment, wave,
    seconds: Math.min(4, Math.floor(recordingTime / 1000)),
    voiceNote: compact ? 0 : settle(t, 9600, 600) * (1 - settle(t, 21000, 600)),
    words: clamp(recordingTime / 3200),
    swipeX: t < 5800 ? 78 - clamp(swipeTime) * 56 : 22 + clamp(swipeTime) * 56,
    swipeOpacity: sliding ? Math.sin(clamp(swipeTime) * Math.PI) * 0.65 : 0,
  }
}

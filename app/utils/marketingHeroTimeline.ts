/** A single clock keeps the pager, microphone and outcome mutually consistent. */
export const HERO_COMPACT_DURATION = 10000
export const heroCompactMoments = [0, 4400] as const
export const HERO_SHARED_DURATION = 28000
export const heroSharedMoments = [0, 3600, 6600, 8900, 15100, 19400, 23700] as const
export const everydayMoments = [0, 3500, 7500, 11500, 15500, 19500] as const
export const heroDuration = (compact: boolean, world: number) => compact ? HERO_COMPACT_DURATION : world === 0 ? HERO_SHARED_DURATION : 24000
export const heroMomentTimes = (compact: boolean, world: number): readonly number[] => compact ? heroCompactMoments : world === 0 ? heroSharedMoments : everydayMoments
const clamp = (n: number) => Math.max(0, Math.min(1, n))
// Critically damped settling, with exact endpoints so no page peeks through at rest.
function settle(time: number, start: number, duration: number) {
  const x = clamp((time - start) / duration)
  return x === 0 || x === 1 ? x : (1 - (1 + 10 * x) * Math.exp(-10 * x)) / (1 - 11 * Math.exp(-10))
}
export function marketingHeroFrame(time: number, compact = false, world = 0) {
  const duration = heroDuration(compact, world)
  const t = Math.max(0, Math.min(time, duration - 1))
  if (!compact) return world === 0 ? sharedEditFrame(t) : everydayFrame(t, world)
  const pager = settle(t, 2600, 800)
  const sliding = t > 2600 && t < 3400
  const moment = t < 2600 ? 0 : 1
  const swipeTime = t < 5800 ? (t - 2600) / 800 : (t - 8200) / 800
  return { detail: false, editing: false, preview: false, applied: false, synced: false,
    t, pager, sliding, recording: false, processing: false, created: 0, moment,
    wave: [4, 4, 4, 4], seconds: 0, voiceNote: 0, words: 0,
    swipeX: t < 5800 ? 78 - clamp(swipeTime) * 56 : 22 + clamp(swipeTime) * 56,
    swipeOpacity: sliding ? Math.sin(clamp(swipeTime) * Math.PI) * 0.65 : 0,
  }
}

// Existing shared list: open, choose AI editing, dictate, review, apply, sync.
function sharedEditFrame(t: number) {
  const detail = t >= 2800
  const editing = t >= 5600 && t < 18500
  const recording = t >= 7400 && t < 11800
  const processing = t >= 11800 && t < 14000
  const preview = t >= 14000 && t < 18500
  const applied = t >= 18500
  const synced = t >= 22500
  const recordingTime = Math.max(0, t - 7400)
  const moment = t >= 22500 ? 6 : t >= 18500 ? 5 : t >= 14000 ? 4 : t >= 7400 ? 3 : t >= 5600 ? 2 : t >= 2800 ? 1 : 0
  return { t, detail, editing, preview, applied, synced, recording, processing, moment,
    pager: 0, sliding: false, created: applied ? 1 : 0,
    seconds: Math.min(4, Math.floor(recordingTime / 1000)),
    wave: Array.from({ length: 4 }, (_, i) => 5 + 15 * (0.5 + 0.5 * Math.sin(recordingTime / 190 + i * 1.3))),
    words: clamp(recordingTime / 3900),
    voiceNote: settle(t, 6200, 650),
    swipeX: 50, swipeOpacity: 0,
  }
}

function everydayFrame(t: number, world: number) {
  const moment = t >= 19000 ? 5 : t >= 15000 ? 4 : t >= 11000 ? 3 : t >= 7000 ? 2 : t >= 3000 ? 1 : 0
  const recipePager = world === 5 ? settle(t, 2600, 800) : 0
  const recipeSliding = world === 5 && (t > 2600 && t < 3400)
  return { t, moment, detail: moment > 0 && !(world === 4 && moment === 5) && (world !== 5 || t >= 3400), editing: false, preview: false, applied: moment >= 3, synced: world === 1 && moment === 5,
    recording: false, processing: false, pager: recipePager, sliding: recipeSliding, created: 0,
    seconds: 0, wave: [4, 4, 4, 4], words: 0, voiceNote: 0, swipeX: 50, swipeOpacity: 0,
  }
}

// A separate handoff owns the world boundary. No story rewinds before it.
export const HERO_HANDOFF_SWAP = 520
export const HERO_HANDOFF_DURATION = 1600
export function heroHandoffFrame(time: number) {
  if (time < 0) return { opacity: 1, shift: 0, scale: 1 }
  if (time < HERO_HANDOFF_SWAP) {
    const p = clamp(time / 460)
    const ease = p * p * (3 - 2 * p)
    return { opacity: 1 - ease, shift: -8 * ease, scale: 1 - 0.012 * ease }
  }
  const p = clamp((time - HERO_HANDOFF_SWAP) / (HERO_HANDOFF_DURATION - HERO_HANDOFF_SWAP))
  const ease = 1 - Math.pow(1 - p, 3)
  return { opacity: ease, shift: 12 * (1 - ease), scale: 0.988 + 0.012 * ease }
}

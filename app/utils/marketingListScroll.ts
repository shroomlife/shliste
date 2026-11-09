const clamp = (n: number) => Math.max(0, Math.min(1, n))

// Deliberately paced for reading; title geometry and caption spring follow Android.
// One clock drives the content, so pause, seeking and the return trip stay in sync.
function glide(time: number, start: number, duration: number) {
  const p = clamp((time - start) / duration)
  return p * p * p * (p * (p * 6 - 15) + 10)
}

export function holidayListScroll(time: number) {
  const down = 0.46 * glide(time, 7000, 1800) + 0.54 * glide(time, 11000, 2000)
  return {
    progress: down * (1 - glide(time, 19800, 2000)),
    returnCue: time >= 19000 && time < 19800,
    returnCueProgress: clamp((time - 19000) / 800),
  }
}

// SharedCardState uses minFractionVisible=1. The title transfers as soon as its
// card header is clipped, not when the last title pixel has left the viewport.
export function isListTitleClipped(scroll: number, top: number, height: number, viewport: number) {
  return top - scroll < -0.5 || top + height - scroll > viewport + 0.5
}

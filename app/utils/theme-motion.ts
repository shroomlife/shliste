export interface ThemeImageVisibility {
  id: symbol
  visibleArea: number
  imageArea: number
  centerDistance: number
}

/** Only image rectangles count, never the surrounding card or its text. */
export function chooseThemeMotion(images: ThemeImageVisibility[], current: symbol | null): symbol | null {
  const candidates = images.filter(image => image.imageArea > 0 && image.visibleArea / image.imageArea >= 0.12)
  candidates.sort((a, b) => b.visibleArea - a.visibleArea || a.centerDistance - b.centerDistance)
  const best = candidates[0]
  if (!best) return null
  const previous = candidates.find(image => image.id === current)
  // A small dead band avoids flickering at the boundary between two pictures.
  if (previous && previous.visibleArea >= best.visibleArea * 0.95) return previous.id
  return best.id
}

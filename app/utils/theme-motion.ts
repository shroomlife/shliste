export interface ThemeImageVisibility {
  id: symbol
  visibleArea: number
  imageArea: number
  centerDistance: number
}

/**
 * Es bewegt sich das Bild, das der sichtbaren Mitte am nächsten ist. Ein
 * Bild unter dem Zeiger oder mit Tastaturfokus hat Vorrang vor der Mitte.
 * Nur Bildflächen zählen, nie die umgebende Karte oder ihr Text.
 */
export function chooseThemeMotion(images: ThemeImageVisibility[], current: symbol | null, hovered: symbol | null = null, tolerance = 0): symbol | null {
  const candidates = images.filter(image => image.imageArea > 0 && image.visibleArea / image.imageArea >= 0.12)
  if (candidates.some(image => image.id === hovered)) return hovered
  candidates.sort((a, b) => a.centerDistance - b.centerDistance || b.visibleArea - a.visibleArea)
  const best = candidates[0]
  if (!best) return null
  const previous = candidates.find(image => image.id === current)
  // Die Toleranz verhindert Flackern, wenn zwei Bilder fast gleich weit von der Mitte liegen.
  if (previous && previous.centerDistance <= best.centerDistance + tolerance) return previous.id
  return best.id
}

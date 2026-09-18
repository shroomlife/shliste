/**
 * Bilder VOR dem Hochladen verkleinern.
 *
 * Die API verkleinert jedes Bild ohnehin auf 1920 Pixel Kante und JPEG mit
 * Qualität 85 (`api.shliste.app/src/routes/ai/image-to-*.ts`). Hier passiert
 * exakt dasselbe, nur zehnmal früher: Ein rohes Handyfoto wiegt 4 bis 12 MB,
 * verkleinert 0,3 bis 1,5 MB. Bei bis zu fünf Bildern je Import entscheidet
 * das darüber, ob der Upload über Mobilfunk in die Frist passt.
 *
 * `fitWithin` ist rein und wird mit `bun test` geprüft. `downscaleImage`
 * braucht `createImageBitmap` und ein Canvas, also einen Browser, und wird
 * am Gerät geprüft.
 *
 * Gegenstück im Android-Client: `ai/AiJobFileUtils.kt`.
 */

/** Längste Kante nach dem Verkleinern, Spiegel von `MAX_IMAGE_DIMENSION` in der API. */
export const MAX_IMAGE_EDGE = 1920

/** JPEG-Qualität, Spiegel von `.jpeg({ quality: 85 })` in der API. */
export const JPEG_QUALITY = 0.85

export interface Dimensions {
  width: number
  height: number
}

/**
 * Zielmaße, damit die längste Kante höchstens `maxEdge` misst. Das
 * Seitenverhältnis bleibt, kleinere Bilder werden nie vergrößert, und die
 * Maße sind ganze Pixel, weil ein Canvas nichts anderes kennt.
 */
export function fitWithin(width: number, height: number, maxEdge: number): Dimensions {
  if (!(width > 0 && height > 0 && maxEdge > 0)) {
    throw new RangeError(`Ungültige Bildmaße: ${width}x${height}, Kante ${maxEdge}`)
  }

  const longest = Math.max(width, height)
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) }
  }

  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** `urlaub.HEIC` wird zu `urlaub.jpg`, ein Name ohne Endung bekommt eine. */
export function jpegFileName(originalName: string): string {
  const trimmed = originalName.trim()
  const dot = trimmed.lastIndexOf('.')
  const base = dot > 0 ? trimmed.slice(0, dot) : trimmed
  return `${base.length > 0 ? base : 'bild'}.jpg`
}

/**
 * Liefert das verkleinerte JPEG oder, wenn der Browser das Bild nicht
 * dekodieren kann, die ORIGINALDATEI. Das ist kein stilles Schlucken: Das
 * Original geht dann an die API, und deren Allowlist und Größengrenze
 * antworten mit einer Meldung, die das Sheet anzeigt.
 */
export async function downscaleImage(file: File): Promise<File> {
  let bitmap: ImageBitmap
  try {
    // `from-image` dreht nach EXIF, sonst käme ein Hochkantfoto liegend an.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  catch {
    return file
  }

  try {
    const target = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height

    const context = canvas.getContext('2d')
    if (context === null) return file
    context.drawImage(bitmap, 0, 0, target.width, target.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (blob === null) return file

    return new File([blob], jpegFileName(file.name), { type: 'image/jpeg', lastModified: file.lastModified })
  }
  finally {
    bitmap.close()
  }
}

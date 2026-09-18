/**
 * Die Bildauswahl für den Foto-Import, geteilt von Listen- und Rezept-Sheet.
 *
 * Bis zu fünf Bilder je Import, alle beschreiben EINE Liste beziehungsweise
 * EIN Rezept (Doppelseite, langer Kassenbon, Screenshot plus Screenshot). Die
 * Reihenfolge ist die Auswahlreihenfolge, und Hinzufügen in mehreren Runden
 * ist erlaubt, bis fünf voll sind.
 *
 * Grenzen sind der Spiegel der API-Routen /ai/image-to-list und
 * /ai/image-to-recipe: 1 bis 5 Dateien im Feld `file`, je höchstens 10 MB,
 * zusammen höchstens 20 MB, als JPEG, PNG oder WebP. Geprüft wird die Größe
 * NACH dem Verkleinern, weil erst das die Zahl ist, die hochgeladen wird.
 *
 * Eine Auswahl wird ganz oder gar nicht übernommen: Wer fünf Bilder wählt und
 * eines davon ist ein PDF, bekommt eine Meldung und nichts Halbes im Streifen.
 */
import { downscaleImage } from '~/utils/downscaleImage'

export const MAX_IMAGE_COUNT = 5
const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_REQUEST_BYTES = 20 * 1024 * 1024

export interface SelectedImage {
  file: File
  /** Object-URL für die Vorschau, wird beim Entfernen freigegeben. */
  preview: string
}

export function useAiImageSelection(setError: (message: string | null) => void) {
  const images = ref<SelectedImage[]>([])
  /** Während des Verkleinerns; die Knöpfe sind so lange gesperrt. */
  const preparing = ref(false)

  const files = computed(() => images.value.map(image => image.file))
  const isFull = computed(() => images.value.length >= MAX_IMAGE_COUNT)

  function removeImage(index: number): void {
    const removed = images.value[index]
    if (removed === undefined) return
    URL.revokeObjectURL(removed.preview)
    images.value = images.value.filter((_, position) => position !== index)
  }

  function clear(): void {
    for (const image of images.value) URL.revokeObjectURL(image.preview)
    images.value = []
  }

  /** Nimmt die Auswahl eines `<input type="file" multiple>` entgegen. */
  async function addFromInput(event: Event): Promise<void> {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return

    const chosen = Array.from(input.files ?? [])
    // Dieselbe Datei erneut wählbar machen.
    input.value = ''
    if (chosen.length === 0 || preparing.value) return

    if (images.value.length + chosen.length > MAX_IMAGE_COUNT) {
      setError('Höchstens fünf Bilder sind möglich.')
      return
    }
    if (chosen.some(file => !ALLOWED_IMAGE_TYPES.has(file.type))) {
      setError('Dieses Bildformat wird nicht unterstützt. Bitte wähle Bilder als JPEG, PNG oder WebP.')
      return
    }

    preparing.value = true
    try {
      const prepared = await Promise.all(chosen.map(file => downscaleImage(file)))

      if (prepared.some(file => file.size > MAX_IMAGE_BYTES)) {
        setError('Ein Bild ist zu groß. Höchstens 10 MB je Bild sind möglich.')
        return
      }
      const totalBytes = files.value.reduce((sum, file) => sum + file.size, 0)
        + prepared.reduce((sum, file) => sum + file.size, 0)
      if (totalBytes > MAX_REQUEST_BYTES) {
        setError('Die Bilder sind zusammen zu groß. Höchstens 20 MB je Import sind möglich.')
        return
      }

      setError(null)
      images.value = [
        ...images.value,
        ...prepared.map(file => ({ file, preview: URL.createObjectURL(file) })),
      ]
    }
    finally {
      preparing.value = false
    }
  }

  onUnmounted(clear)

  return { images, files, isFull, preparing, addFromInput, removeImage, clear }
}

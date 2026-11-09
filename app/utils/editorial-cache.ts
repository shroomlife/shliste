import { isEditorialImage, type RecipeIllustration } from '../../lib/editorial'

export const EDITORIAL_CACHE = 'shliste-editorial-v1'
export async function cacheEditorialImages(images: readonly RecipeIllustration[]): Promise<{ total: number, cached: number }> {
  const urls = [...new Set(images.filter(isEditorialImage).map(image => image.src))]
  if (!('caches' in globalThis)) return { total: urls.length, cached: 0 }
  let cached = 0
  try {
    const cache = await caches.open(EDITORIAL_CACHE)
    for (const url of urls) {
      try {
        if (await cache.match(url)) {
          cached++
          continue
        }
        const response = await fetch(url, { cache: 'no-cache' })
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) continue
        await cache.put(url, response)
        cached++
      }
      catch { /* Ein fehlendes Bild darf die restlichen Downloads nicht abbrechen. */ }
    }
  }
  catch { /* CacheStorage ist beispielsweise bei erschöpftem Speicher nicht verfügbar. */ }
  return { total: urls.length, cached }
}

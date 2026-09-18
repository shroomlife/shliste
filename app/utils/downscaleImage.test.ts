/// <reference types="bun" />
/**
 * Die Geometrie des Verkleinerns. Der Canvas-Teil läuft nur im Browser und
 * wird am Gerät geprüft; hier steht das, was ohne Browser beweisbar ist.
 */
import { describe, expect, test } from 'bun:test'
import { fitWithin, jpegFileName, MAX_IMAGE_EDGE } from './downscaleImage'

describe('fitWithin', () => {
  test('a landscape photo is scaled to the maximum edge', () => {
    expect(fitWithin(4032, 3024, MAX_IMAGE_EDGE)).toEqual({ width: 1920, height: 1440 })
  })

  test('a portrait photo is scaled by its longer side', () => {
    expect(fitWithin(3024, 4032, MAX_IMAGE_EDGE)).toEqual({ width: 1440, height: 1920 })
  })

  test('a small image is never enlarged', () => {
    expect(fitWithin(800, 600, MAX_IMAGE_EDGE)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(1920, 1080, MAX_IMAGE_EDGE)).toEqual({ width: 1920, height: 1080 })
  })

  test('dimensions are whole pixels', () => {
    const result = fitWithin(4001, 2999, 1920)
    expect(Number.isInteger(result.width)).toBe(true)
    expect(Number.isInteger(result.height)).toBe(true)
    expect(result.width).toBe(1920)
  })

  test('an extreme panorama keeps at least one pixel on the short side', () => {
    expect(fitWithin(100_000, 10, 1920)).toEqual({ width: 1920, height: 1 })
  })

  test('nonsense dimensions are rejected instead of producing an empty canvas', () => {
    expect(() => fitWithin(0, 100, 1920)).toThrow('Ungültige Bildmaße')
    expect(() => fitWithin(100, Number.NaN, 1920)).toThrow('Ungültige Bildmaße')
    expect(() => fitWithin(100, 100, 0)).toThrow('Ungültige Bildmaße')
  })
})

describe('jpegFileName', () => {
  test('the extension is replaced', () => {
    expect(jpegFileName('urlaub.HEIC')).toBe('urlaub.jpg')
    expect(jpegFileName('IMG_0001.png')).toBe('IMG_0001.jpg')
  })

  test('a name without extension gets one', () => {
    expect(jpegFileName('zettel')).toBe('zettel.jpg')
  })

  test('a dot at the start is not an extension', () => {
    expect(jpegFileName('.versteckt')).toBe('.versteckt.jpg')
  })

  test('an empty name still yields a usable file name', () => {
    expect(jpegFileName('   ')).toBe('bild.jpg')
  })
})

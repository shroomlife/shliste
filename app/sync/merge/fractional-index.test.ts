/**
 * Vertrag des Bruchindex.
 *
 * Die festgenagelten Schlüssel unten stammen nicht aus dieser Datei, sondern
 * sind gegen `api.shliste.app/src/lib/fractional-index.ts` abgeglichen. Ein
 * Schlüssel, den das Web vergibt, wird von API und Android nur noch verglichen,
 * nie neu berechnet — weicht die Erzeugung ab, sortieren die Geräte dieselbe
 * Liste unterschiedlich.
 */
import { describe, expect, test } from 'bun:test'
import { generateKeyBetween, generateNKeysBetween } from './fractional-index'

describe('generateKeyBetween', () => {
  test('erzeugt ohne Nachbarn den Startschlüssel', () => {
    expect(generateKeyBetween(null, null)).toBe('aV')
  })

  test('trifft die Schlüssel der API zeichengenau', () => {
    expect(generateKeyBetween('a0', null)).toBe('a1')
    expect(generateKeyBetween(null, 'a0')).toBe('Zz')
    expect(generateKeyBetween('a0', 'a1')).toBe('a0V')
    expect(generateKeyBetween('a0', 'a2')).toBe('a1')
    expect(generateKeyBetween('a0V', 'a1')).toBe('a0l')
    expect(generateKeyBetween('az', null)).toBe('b00')
    expect(generateKeyBetween(null, 'Zz')).toBe('Zy')
  })

  test('liegt immer echt zwischen den Nachbarn', () => {
    const a = 'a0'
    const b = 'a1'
    const between = generateKeyBetween(a, b)

    expect(a < between).toBe(true)
    expect(between < b).toBe(true)
  })

  test('bleibt beim Anhängen aufsteigend', () => {
    let previous: string | null = null
    for (let i = 0; i < 200; i++) {
      const next = generateKeyBetween(previous, null)
      if (previous !== null) expect(previous < next).toBe(true)
      previous = next
    }
  })

  test('bleibt beim Voranstellen absteigend', () => {
    let next: string | null = null
    for (let i = 0; i < 200; i++) {
      const previous = generateKeyBetween(null, next)
      if (next !== null) expect(previous < next).toBe(true)
      next = previous
    }
  })

  test('hält die Ordnung auch bei tiefer Verschachtelung', () => {
    let low = 'a0'
    let high = 'a1'
    for (let i = 0; i < 200; i++) {
      const middle = generateKeyBetween(low, high)
      expect(low < middle).toBe(true)
      expect(middle < high).toBe(true)
      if (i % 2 === 0) low = middle
      else high = middle
    }
  })

  test('wirft, wenn die Grenzen gleich oder verdreht sind', () => {
    // Zwischen zwei gleichen Grenzen gibt es keinen Platz. Ein still
    // zurückgegebener Schlüssel würde die Sortierung auf jedem Gerät anders
    // zerlegen.
    expect(() => generateKeyBetween('a1', 'a1')).toThrow()
    expect(() => generateKeyBetween('a2', 'a1')).toThrow()
  })

  test('sättigt am oberen Rand — bekanntes Verhalten der API-Fassung', () => {
    // "zz" ist der grösste Integer-Teil. Die API-Fassung gibt hier "zz"
    // zurück, statt einen grösseren Schlüssel zu bilden. Das ist hier bewusst
    // festgehalten, damit niemand es einseitig im Web "repariert": Die drei
    // Implementierungen dürfen sich nur gemeinsam ändern. Erreichbar ist der
    // Rand praktisch nicht, Schlüssel wachsen nur logarithmisch.
    expect(generateKeyBetween('zz', null)).toBe('zz')
  })
})

describe('generateNKeysBetween', () => {
  test('liefert für n = 0 nichts', () => {
    expect(generateNKeysBetween(null, null, 0)).toEqual([])
  })

  test('trifft die Schlüsselketten der API zeichengenau', () => {
    expect(generateNKeysBetween(null, null, 5)).toEqual(['aV', 'aW', 'aX', 'aY', 'aZ'])
    // Bewusst NICHT gleichmässig verteilt: Jeder Schlüssel entsteht zwischen
    // seinem Vorgänger und b, die Abstände werden nach hinten kleiner. Wer das
    // ändert, ändert die Sortierung gegenüber API und Android.
    expect(generateNKeysBetween('a0', 'a1', 3)).toEqual(['a0V', 'a0l', 'a0t'])
  })

  test('liefert streng aufsteigende Schlüssel innerhalb der Grenzen', () => {
    const keys = generateNKeysBetween('a0', 'a1', 10)

    expect(keys).toHaveLength(10)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key === undefined) throw new Error(`Schlüssel ${i} fehlt`)
      expect('a0' < key).toBe(true)
      expect(key < 'a1').toBe(true)
      const previous = keys[i - 1]
      if (previous !== undefined) expect(previous < key).toBe(true)
    }
  })
})

describe('Kopfzeichen-Grenze Z nach a', () => {
  /*
   * REGRESSION: `incInt` sprang von 'Z' auf '[' statt auf 'a' und warf damit
   * "Ungültiges Kopfzeichen". Erreichbar war das im Alltag — 'Zz' vergibt die
   * Implementierung selbst, und danach warf jedes Anhängen.
   *
   * Der Fehler steckte gleichlautend in API, PWA und Android. Diese Fälle
   * gehören deshalb in alle drei Testsuiten.
   */
  test('hängt hinter dem kleinsten Schlüssel an, statt zu werfen', () => {
    expect(generateKeyBetween('Zz', null)).toBe('a0')
  })

  test('hält dabei die Reihenfolge ein', () => {
    expect('Zz' < generateKeyBetween('Zz', null)).toBe(true)
  })

  test('überlebt wiederholtes Voranstellen über die Kopfzeichen-Grenze hinweg', () => {
    let smallest = generateKeyBetween(null, null)
    for (let step = 0; step < 70; step += 1) {
      const next = generateKeyBetween(null, smallest)
      expect(next < smallest).toBe(true)
      // Nach jedem Schritt muss auch das Anhängen möglich bleiben.
      expect(() => generateKeyBetween(next, null)).not.toThrow()
      smallest = next
    }
    expect(smallest).toBe('ZN')
  })
})

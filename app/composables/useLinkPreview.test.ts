/// <reference types="bun" />
/**
 * Der Wachposten vor dem `src` der Vorschaukachel.
 *
 * Der Pfad kommt zwar vom eigenen Server, wird aber behandelt wie jede fremde
 * Eingabe: Käme über ein manipuliertes Feld etwas anderes als 32 Hex-Zeichen
 * durch, ließe sich eine beliebige Adresse in ein `<img src>` schreiben.
 */
import { describe, expect, test } from 'bun:test'
import { resolveLinkPreviewUrl } from './useLinkPreview'

const HASH = '0123456789abcdef0123456789abcdef'

describe('resolveLinkPreviewUrl', () => {
  test('macht aus dem Serverpfad die Adresse der eigenen BFF', () => {
    expect(resolveLinkPreviewUrl(`link:${HASH}.webp`)).toBe(`/api/link-previews/${HASH}`)
  })

  test('ohne Pfad gibt es kein Bild', () => {
    expect(resolveLinkPreviewUrl(null)).toBeNull()
    expect(resolveLinkPreviewUrl(undefined)).toBeNull()
    expect(resolveLinkPreviewUrl('')).toBeNull()
  })

  test('nur genau 32 Hex-Zeichen, kleingeschrieben', () => {
    expect(resolveLinkPreviewUrl(`link:${HASH.slice(0, 31)}.webp`)).toBeNull()
    expect(resolveLinkPreviewUrl(`link:${HASH}a.webp`)).toBeNull()
    expect(resolveLinkPreviewUrl(`link:${HASH.toUpperCase()}.webp`)).toBeNull()
  })

  test('Pfadtricks und fremde Schemata fallen durch', () => {
    expect(resolveLinkPreviewUrl('link:../../etc/passwd.webp')).toBeNull()
    expect(resolveLinkPreviewUrl(`sync:${HASH}.webp`)).toBeNull()
    expect(resolveLinkPreviewUrl(`https://fremd.de/${HASH}.webp`)).toBeNull()
    expect(resolveLinkPreviewUrl(`link:${HASH}.webp?x=1`)).toBeNull()
    expect(resolveLinkPreviewUrl(`link:${HASH}.png`)).toBeNull()
  })

  test('ein Zeilenumbruch hebelt das Muster nicht aus', () => {
    // In manchen Sprachen (Python, Perl) trifft `$` auch VOR einem
    // abschließenden Zeilenumbruch, und dieselbe Prüfung stünde dort offen.
    // JavaScript tut das nicht — festgehalten, damit es beim Portieren des
    // Musters in ein anderes Repo nicht unbemerkt kippt.
    expect(resolveLinkPreviewUrl(`link:${HASH}.webp\n`)).toBeNull()
    expect(resolveLinkPreviewUrl(`link:${HASH}.webp\nlink:${HASH}.webp`)).toBeNull()
  })
})

import { describe, expect, test } from 'bun:test'
import { resolveItemImageUrl } from './itemImage'

describe('resolveItemImageUrl', () => {
  test('das Format der API wird zur BFF-Adresse', () => {
    expect(resolveItemImageUrl('item:0123456789abcdef0123456789abcdef.webp')).toBe('/api/item-images/0123456789abcdef0123456789abcdef')
  })

  test('alles andere ergibt kein Bild', () => {
    expect(resolveItemImageUrl(null)).toBeNull()
    expect(resolveItemImageUrl('link:0123456789abcdef0123456789abcdef.webp')).toBeNull()
    expect(resolveItemImageUrl('item:../../etc.webp')).toBeNull()
    expect(resolveItemImageUrl('item:0123456789ABCDEF0123456789abcdef.webp')).toBeNull()
  })
})

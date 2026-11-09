import { describe, expect, it } from 'bun:test'
import { androidRecipeLinks } from './android-recipe-link'

describe('Android recipe handoff', () => {
  it('keeps the same recipe, edition and copy choice in the app and browser fallback', () => {
    const links = androidRecipeLinks('french-onion-pasta', 2, true, 'http://127.0.0.1:3010')
    expect(links.app).toBe('shliste://recipe/french-onion-pasta?version=2&copy=1')
    expect(links.intent).toContain('package=com.shroomlife.shliste;')
    expect(links.intent).toContain(encodeURIComponent('http://127.0.0.1:3010' + links.path))
  })
  it('rejects injection and invalid versions', () => {
    for (const id of ['../pasta', 'pasta#Intent;end', '', 'https://evil.test']) expect(() => androidRecipeLinks(id, 1)).toThrow()
    for (const version of [0, -1, 1.5, NaN]) expect(() => androidRecipeLinks('pasta', version)).toThrow()
  })
})

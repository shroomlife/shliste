/// <reference types="bun" />
/**
 * Tests der Bildpfad-Auflösung aus `useRecipeImage.ts`.
 *
 * Die Funktion ist rein und entscheidet nur über die Form des Pfads — ob die
 * Referenz existiert und dem Konto gehört, prüft der BFF-Proxy zur Laufzeit.
 */
import { describe, expect, test } from 'bun:test'
import { resolveRecipeImageUrl, SYNC_IMAGE_PREFIX } from './useRecipeImage'

/** Eine Referenz in der Form, die der Server vergibt: userUuid/recipeId/hash12.webp */
const SERVER_REF = '0f8fad5b-d9cb-469f-a165-70867728950e/7c9e6679-7425-40de-944b-e07fc1f90ae7/1a2b3c4d5e6f.webp'

describe('resolveRecipeImageUrl', () => {
  test('ohne Bildpfad kein Bild', () => {
    expect(resolveRecipeImageUrl(null)).toBeNull()
  })

  test('ein lokaler Android-Pfad ist für die PWA nicht auflösbar', () => {
    // Die Datei liegt nur auf dem Gerät, das sie aufgenommen hat — eine URL
    // darauf zu bauen würde ins Leere zeigen.
    expect(resolveRecipeImageUrl('recipe_images/rezept_123.webp')).toBeNull()
  })

  test('eine Serverreferenz wird zur Adresse des BFF-Proxys', () => {
    expect(resolveRecipeImageUrl(`${SYNC_IMAGE_PREFIX}${SERVER_REF}`)).toBe(`/api/images/${SERVER_REF}`)
  })

  test('das Präfix allein ist keine Referenz', () => {
    // 'sync:' ohne Rest würde `/api/images/` ergeben — eine Adresse, die nie
    // ein Bild sein kann. Lieber gar kein Bild als eine sichere 400.
    expect(resolveRecipeImageUrl(SYNC_IMAGE_PREFIX)).toBeNull()
  })

  test('das Präfix zählt nur am Anfang', () => {
    expect(resolveRecipeImageUrl(` ${SYNC_IMAGE_PREFIX}${SERVER_REF}`)).toBeNull()
  })
})

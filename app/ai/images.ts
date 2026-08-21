/**
 * Der Weg eines generierten Rezeptbilds auf den Server.
 *
 * Die AI-Routen liefern das Bild als ROHES Base64 (WebP, ohne data:-Präfix).
 * Lokal gespeichert hülfe es nur diesem einen Browser — erst der Upload nach
 * `/sync/images/upload` macht es zu einer `sync:`-Referenz, die jedes Gerät
 * über `resolveRecipeImageUrl` auflösen kann.
 *
 * Der Upload läuft über die eigene BFF (`server/api/images/upload.post.ts`),
 * die signiert und die Session anhängt — derselbe Grund wie bei `postAi`:
 * das APP_SECRET und das Session-JWT erreichen den Browser nie.
 */
import type { FetchResponse } from 'ofetch'
import { isRecord, readString } from '../sync/engine/json'
import { readAiError } from './contract'
import type { AiResult } from './transport'
import { SYNC_IMAGE_PREFIX } from '../composables/useRecipeImage'

/**
 * Rohes Base64 zu einem Blob fürs FormData. `null` bei kaputtem Base64 —
 * die AI-Antwort ist fremdes Material, ein Wurf wäre hier kein Sonderfall,
 * sondern ein erwartbares Ergebnis.
 */
export function base64ToWebpBlob(base64: string): Blob | null {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    if (bytes.length === 0) return null
    return new Blob([bytes], { type: 'image/webp' })
  }
  catch {
    return null
  }
}

/** Antwort der Upload-Route: `{imageRef: "{userUuid}/{recipeId}/{hash}.webp"}`. */
export function parseImageRef(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const imageRef = readString(payload, 'imageRef')
  return imageRef !== null && imageRef.length > 0 ? imageRef : null
}

/** Baut aus der Server-Referenz den Wert für `recipe.imagePath`. */
export function toSyncImagePath(imageRef: string): string {
  return `${SYNC_IMAGE_PREFIX}${imageRef}`
}

/**
 * Lädt ein Bild zum Rezept hoch und liefert die Server-Referenz.
 *
 * Gleiche Fehlerhaltung wie `postAi`: Ein Fehlschlag ist ein erwartbares
 * Ergebnis, kein Ausnahmezustand — die Ansicht zeigt ihn an statt abzustürzen.
 */
export async function uploadRecipeImage(recipeId: string, blob: Blob): Promise<AiResult<string>> {
  const form = new FormData()
  form.append('recipeId', recipeId)
  form.append('file', blob, 'image.webp')

  let response: FetchResponse<unknown>

  try {
    response = await $fetch.raw<unknown>('/api/images/upload', {
      method: 'POST',
      body: form,
      // Statuscodes werden unten selbst ausgewertet: Auch Fehlerantworten
      // tragen eine JSON-Meldung, die angezeigt werden soll.
      ignoreResponseError: true,
      // Kein automatischer zweiter Versuch — ein doppelter Upload wäre
      // harmlos (Inhalts-Hash), aber unnötiger Datenverkehr.
      retry: false,
    })
  }
  catch {
    return { ok: false, error: 'Das Bild konnte nicht hochgeladen werden. Bitte prüfe dein Netz.', aborted: false }
  }

  const payload: unknown = response._data

  const error = readAiError(payload)
  if (error !== null) return { ok: false, error, aborted: false }

  if (!response.ok) {
    return { ok: false, error: 'Das Bild konnte nicht hochgeladen werden. Bitte versuche es erneut.', aborted: false }
  }

  const imageRef = parseImageRef(payload)
  if (imageRef === null) {
    return { ok: false, error: 'Der Server hat eine unerwartete Antwort geliefert.', aborted: false }
  }

  return { ok: true, value: imageRef }
}

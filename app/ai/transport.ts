import { requestDeadline } from './requestDeadline'
import { aiServiceError } from './serviceError'
/**
 * Der Weg vom Browser zu den AI-Routen — immer über die eigene BFF
 * (`server/api/ai/[...path].post.ts`), die signiert und die Session prüft.
 *
 * Jede Funktion gibt ein `AiResult` zurück statt zu werfen: Ein AI-Fehler ist
 * hier kein Ausnahmezustand, sondern ein erwartbares Ergebnis, das die
 * Ansicht anzeigen können muss. Die Sonderfälle stecken alle in `postAi`:
 *
 * - /ai/suggest meldet Fehler auch mit HTTP 200 im Feld `error`
 * - andere Routen melden Fehler als HTTP-Status mit `{error}`-Body
 * - die Browserfrist endet nach der Ausführungs- und BFF-Frist,
 *   und deshalb nimmt jede Funktion ein AbortSignal fürs Abbrechen entgegen
 *
 * Bewusst generisch gehalten: Das Rezept-Paket kann `postAi` mit seinen
 * eigenen Routen und Parsern genauso benutzen.
 */
import type { EditedList, GeneratedList } from './contract'
import { parseEditedList, parseGeneratedList, parseSuggestions, readAiError } from './contract'
import type { CurrentListPayload } from './diff'
import type { ChatRecipePayload, EditedRecipe, GeneratedRecipe, VoiceChatReply } from './recipeContract'
import {
  parseChatReply,
  parseEditedRecipe,
  parseExplanation,
  parseGeneratedRecipe,
  parseImageData,
  parseVoiceChatReply,
} from './recipeContract'
import type { CurrentRecipePayload } from './recipeDiff'

/** API 60 s, BFF 75 s, Browser 90 s. Die echte Proxy-Kette bleibt Release-Abnahme. */
const AI_TIMEOUT_MS = 90_000
const AI_STATUS_TIMEOUT_MS = 10_000

export type AiFetch = (path: string, options: {
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: AiRequestBody
  signal: AbortSignal
  ignoreResponseError: true
  retry: false
}) => Promise<{ ok: boolean, status: number, _data?: unknown }>

export type AiResult<T>
  = | { ok: true, value: T }
    | { ok: false, error: string, aborted: boolean }

function failure(error: string, aborted = false): AiResult<never> {
  return { ok: false, error, aborted }
}

/** Der Anfrage-Body: JSON als Objekt oder multipart als FormData. */
export type AiRequestBody = Record<string, unknown> | FormData

function messageForStatus(status: number): string {
  switch (status) {
    case 401: return 'Bitte melde dich an, um die AI-Funktionen zu nutzen.'
    case 413: return 'Die Datei ist zu groß.'
    case 429: return 'Zu viele Anfragen — bitte warte einen Moment.'
    default: return 'Die AI-Anfrage ist fehlgeschlagen. Bitte versuche es erneut.'
  }
}

/**
 * War es das Timeout? ofetch verpackt den ursprünglichen Fehler in einen
 * FetchError und hängt das Original in die `cause`-Kette — deshalb wird die
 * Kette durchlaufen statt nur die oberste Schicht zu prüfen.
 */
function isTimeoutError(cause: unknown): boolean {
  let current: unknown = cause
  // Begrenzte Tiefe als Schutz vor einer (theoretisch) zyklischen Kette.
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    if (current.name === 'TimeoutError') return true
    current = current.cause
  }
  return false
}

/**
 * Schickt eine Anfrage an eine AI-Route und liefert die rohe Nutzlast.
 *
 * `path` ist der Routenname hinter `/api/ai/` (z.B. `suggest`). Bei FormData
 * setzt der Browser den multipart-Content-Type samt Boundary selbst — deshalb
 * wird hier nie ein Content-Type von Hand gesetzt.
 */
export async function postAi(path: string, body: AiRequestBody, signal?: AbortSignal, fetcher: AiFetch = (url, options) => $fetch.raw(url, options)): Promise<AiResult<unknown>> {
  const requestId = crypto.randomUUID()
  const deadline = requestDeadline(AI_TIMEOUT_MS, signal)
  let response: Awaited<ReturnType<AiFetch>>

  try {
    response = await fetcher(`/api/ai/${path}`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body,
      signal: deadline.signal,
      // Statuscodes werden unten selbst ausgewertet: Auch Fehlerantworten
      // tragen eine JSON-Meldung, die angezeigt werden soll.
      ignoreResponseError: true,
      // Kein automatischer zweiter Versuch — jeder Aufruf kostet Budget.
      retry: false,
    })
  }
  catch (cause) {
    // Nur der Abbruch DES AUFRUFERS ist gewollt und bleibt deshalb stumm —
    // ein Timeout ist dagegen ein Fehler, den die Ansicht zeigen soll.
    if (signal?.aborted === true) {
      return failure('Abgebrochen.', true)
    }
    return reconcileUncertainRequest(requestId, fetcher, signal, isTimeoutError(cause))
  }

  finally {
    deadline.dispose()
  }

  // Ein Gateway-Abbruch kann nach der Zulassung auftreten: nur lesen, nie erneut POSTen.
  if (response.status === 502 || response.status === 504) {
    return reconcileUncertainRequest(requestId, fetcher, signal, false)
  }
  const payload: unknown = response._data

  // Das Fehlerfeld hat Vorrang vor dem Status: /ai/suggest liefert Fehler
  // mit HTTP 200, andere Routen liefern zum Fehlerstatus eine Meldung dazu.
  const error = aiServiceError(payload) ?? readAiError(payload)
  if (error !== null) return failure(error)

  if (!response.ok) return failure(messageForStatus(response.status))

  return { ok: true, value: payload }
}

/** Ein lesender Abgleich derselben ID; ein fertiger Status ist noch kein geliefertes Ergebnis. */
async function reconcileUncertainRequest(requestId: string, fetcher: AiFetch, signal: AbortSignal | undefined, timedOut: boolean): Promise<AiResult<never>> {
  const deadline = requestDeadline(AI_STATUS_TIMEOUT_MS, signal)
  try {
    const response = await fetcher(`/api/ai/requests/${requestId}`, {
      method: 'GET', signal: deadline.signal, ignoreResponseError: true, retry: false,
    })
    const payload = response._data
    if (response.ok && typeof payload === 'object' && payload !== null
      && 'requestId' in payload && payload.requestId === requestId && 'state' in payload) {
      if (payload.state === 'running') return failure('Dein KI-Auftrag wird noch verarbeitet. Deine Eingaben bleiben erhalten; der Auftrag wird nicht erneut gestartet.')
      if (payload.state === 'finished') return failure('Der KI-Auftrag ist beendet, aber seine Antwort ist nicht angekommen. Ein Ergebnis konnte nicht übernommen werden; der Auftrag wird nicht automatisch wiederholt.')
    }
  }
  catch { /* Der Statusabgleich darf keinen zweiten kostenpflichtigen Auftrag auslösen. */ }
  finally { deadline.dispose() }
  if (signal?.aborted) return failure('Abgebrochen.', true)
  return failure(timedOut
    ? 'Die KI-Anfrage hat zu lange gedauert. Ihr Ausgang ist unklar; sie wird nicht automatisch wiederholt.'
    : 'Die Verbindung zum Server wurde unterbrochen. Der Ausgang der Anfrage ist unklar; deine Eingaben bleiben erhalten.')
}

/**
 * Engt die rohe Nutzlast mit dem übergebenen Parser ein. Eine Antwort, die
 * dem Vertrag nicht entspricht, wird zum Fehler — nie zu einem halben Objekt.
 */
async function postAndParse<T>(
  path: string,
  body: AiRequestBody,
  parse: (payload: unknown) => T | null,
  signal?: AbortSignal,
): Promise<AiResult<T>> {
  const result = await postAi(path, body, signal)
  if (!result.ok) return result

  const parsed = parse(result.value)
  if (parsed === null) return failure('Die AI hat eine unerwartete Antwort geliefert. Bitte versuche es erneut.')

  return { ok: true, value: parsed }
}

/** Eine fertige Aufnahme, so wie `useAudioRecorder` sie liefert. */
export interface AudioUpload {
  blob: Blob
  /**
   * Der Dateiname ist PFLICHT: Seine Endung bestimmt, welches Format das
   * Transkriptionsmodell annimmt. Ohne Namen hieße die Datei "blob" ohne
   * Endung, und die Transkription scheitert.
   */
  fileName: string
}

/* ------------------------------------------------------------------ *
 * Die sechs Listen-Routen
 * ------------------------------------------------------------------ */

/**
 * Die drei Wege, eine Liste per AI anzulegen — sie entsprechen 1:1 den
 * Routen voice-to-list, image-to-list und url-to-list. Hier definiert,
 * damit Sheet und Seiten dieselbe Quelle benutzen.
 */
export type AiCreateMode = 'voice' | 'photo' | 'url'

export interface SuggestPayload {
  listTitle: string
  activeItems: string[]
  pastItems: string[]
}

export function requestSuggestions(payload: SuggestPayload, signal?: AbortSignal): Promise<AiResult<string[]>> {
  return postAndParse('suggest', { ...payload }, parseSuggestions, signal)
}

export interface EditListPayload {
  targetId: string
  prompt: string
  currentList: CurrentListPayload
}

export function requestEditList(payload: EditListPayload, signal?: AbortSignal): Promise<AiResult<EditedList>> {
  return postAndParse('edit-list', { ...payload }, parseEditedList, signal)
}

export function requestVoiceEditList(
  recording: AudioUpload,
  payload: { targetId: string, currentList: CurrentListPayload },
  signal?: AbortSignal,
): Promise<AiResult<EditedList>> {
  const form = new FormData()
  form.append('file', recording.blob, recording.fileName)
  // Die Route erwartet die Metadaten als JSON-STRING im Feld `text`.
  form.append('text', JSON.stringify(payload))
  return postAndParse('voice-edit-list', form, parseEditedList, signal)
}

export function requestVoiceToList(recording: AudioUpload, signal?: AbortSignal): Promise<AiResult<GeneratedList>> {
  const form = new FormData()
  form.append('file', recording.blob, recording.fileName)
  return postAndParse('voice-to-list', form, parseGeneratedList, signal)
}

export function requestUrlToList(url: string, signal?: AbortSignal): Promise<AiResult<GeneratedList>> {
  return postAndParse('url-to-list', { url }, parseGeneratedList, signal)
}

export function requestImageToList(
  file: File,
  description: string | null,
  signal?: AbortSignal,
): Promise<AiResult<GeneratedList>> {
  const form = new FormData()
  form.append('file', file, file.name)
  if (description !== null && description.trim().length > 0) {
    form.append('text', description.trim())
  }
  return postAndParse('image-to-list', form, parseGeneratedList, signal)
}

/* ------------------------------------------------------------------ *
 * Die Rezept-Routen — dieselben Muster wie oben, andere Verträge.
 * ------------------------------------------------------------------ */

export function requestVoiceToRecipe(recording: AudioUpload, signal?: AbortSignal): Promise<AiResult<GeneratedRecipe>> {
  const form = new FormData()
  form.append('file', recording.blob, recording.fileName)
  return postAndParse('voice-to-recipe', form, parseGeneratedRecipe, signal)
}

export function requestUrlToRecipe(url: string, signal?: AbortSignal): Promise<AiResult<GeneratedRecipe>> {
  return postAndParse('url-to-recipe', { url }, parseGeneratedRecipe, signal)
}

export function requestImageToRecipe(
  file: File,
  description: string | null,
  signal?: AbortSignal,
): Promise<AiResult<GeneratedRecipe>> {
  const form = new FormData()
  form.append('file', file, file.name)
  if (description !== null && description.trim().length > 0) {
    form.append('text', description.trim())
  }
  return postAndParse('image-to-recipe', form, parseGeneratedRecipe, signal)
}

export interface EditRecipePayload {
  targetId: string
  prompt: string
  currentRecipe: CurrentRecipePayload
}

export function requestEditRecipe(payload: EditRecipePayload, signal?: AbortSignal): Promise<AiResult<EditedRecipe>> {
  return postAndParse('edit-recipe', { ...payload }, parseEditedRecipe, signal)
}

export function requestVoiceEditRecipe(
  recording: AudioUpload,
  payload: { targetId: string, currentRecipe: CurrentRecipePayload },
  signal?: AbortSignal,
): Promise<AiResult<EditedRecipe>> {
  const form = new FormData()
  form.append('file', recording.blob, recording.fileName)
  // Die Route erwartet die Metadaten als JSON-STRING im Feld `text`.
  form.append('text', JSON.stringify(payload))
  return postAndParse('voice-edit-recipe', form, parseEditedRecipe, signal)
}

/** Eine Chat-Nachricht, wie recipe-chat und voice-recipe-chat sie erwarten. */
export interface ChatMessagePayload {
  role: 'user' | 'assistant'
  content: string
}

export interface RecipeChatRequest {
  recipe: ChatRecipePayload
  /** Höchstens 50 — die API lehnt längere Verläufe mit 422 ab. */
  messages: ChatMessagePayload[]
}

export function requestRecipeChat(payload: RecipeChatRequest, signal?: AbortSignal): Promise<AiResult<string>> {
  return postAndParse('recipe-chat', { ...payload }, parseChatReply, signal)
}

/**
 * Sprach-Nachricht an den Rezept-Chat. `payload.messages` ist der Verlauf
 * OHNE die neue Nachricht — die steckt in der Aufnahme, und die Antwort
 * liefert ihr Transkript als `userMessage` zurück.
 */
export function requestVoiceRecipeChat(
  recording: AudioUpload,
  payload: RecipeChatRequest,
  signal?: AbortSignal,
): Promise<AiResult<VoiceChatReply>> {
  const form = new FormData()
  form.append('file', recording.blob, recording.fileName)
  form.append('text', JSON.stringify(payload))
  return postAndParse('voice-recipe-chat', form, parseVoiceChatReply, signal)
}

export interface ExplainStepPayload {
  recipe: ChatRecipePayload
  /** 0-basiert — die Anzeige zählt ab 1, die API ab 0. */
  stepIndex: number
  stepDescription: string
}

export function requestExplainStep(payload: ExplainStepPayload, signal?: AbortSignal): Promise<AiResult<string>> {
  return postAndParse('explain-step', { ...payload }, parseExplanation, signal)
}

/** Liefert das generierte Bild als rohes Base64 (WebP) — für den Upload. */
export function requestRecipeToImage(
  payload: { recipeId: string, recipeText: string },
  signal?: AbortSignal,
): Promise<AiResult<string>> {
  return postAndParse('recipe-to-image', { ...payload }, parseImageData, signal)
}

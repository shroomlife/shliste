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
 * - der Server rechnet bis zu 300 Sekunden — deshalb das grosse Timeout,
 *   und deshalb nimmt jede Funktion ein AbortSignal fürs Abbrechen entgegen
 *
 * Bewusst generisch gehalten: Das Rezept-Paket kann `postAi` mit seinen
 * eigenen Routen und Parsern genauso benutzen.
 */
import type { FetchResponse } from 'ofetch'
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

/**
 * Grosszügiger als die 300 Sekunden des Servers, damit im Normalfall immer
 * der Server die Frist setzt und der Client nur das Sicherheitsnetz ist.
 */
const AI_TIMEOUT_MS = 310_000

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
    case 413: return 'Die Datei ist zu gross.'
    case 429: return 'Zu viele Anfragen — bitte warte einen Moment.'
    default: return 'Die AI-Anfrage ist fehlgeschlagen. Bitte versuche es erneut.'
  }
}

/**
 * Verknüpft das Abbruchsignal des Aufrufers mit dem Timeout.
 *
 * Nötig, weil ofetch sein `timeout` IGNORIERT, sobald ein eigenes `signal`
 * mitkommt (Guard `!context.options.signal && context.options.timeout` in
 * ofetch) — ohne diese Verknüpfung liefe eine hängende Anfrage ewig. Auf
 * Browsern ohne `AbortSignal.any` bleibt das Nutzersignal allein; die Frist
 * setzt dann der Server (300s).
 */
function withTimeout(signal: AbortSignal | undefined): AbortSignal | undefined {
  if (typeof AbortSignal.any !== 'function' || typeof AbortSignal.timeout !== 'function') {
    return signal
  }

  const timeout = AbortSignal.timeout(AI_TIMEOUT_MS)
  return signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout
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
export async function postAi(path: string, body: AiRequestBody, signal?: AbortSignal): Promise<AiResult<unknown>> {
  let response: FetchResponse<unknown>

  try {
    response = await $fetch.raw<unknown>(`/api/ai/${path}`, {
      method: 'POST',
      body,
      signal: withTimeout(signal),
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
    if (isTimeoutError(cause)) {
      return failure('Die AI-Anfrage hat zu lange gedauert. Bitte versuche es erneut.')
    }
    return failure('Keine Verbindung zum Server. Bitte prüfe dein Netz und versuche es erneut.')
  }

  const payload: unknown = response._data

  // Das Fehlerfeld hat Vorrang vor dem Status: /ai/suggest liefert Fehler
  // mit HTTP 200, andere Routen liefern zum Fehlerstatus eine Meldung dazu.
  const error = readAiError(payload)
  if (error !== null) return failure(error)

  if (!response.ok) return failure(messageForStatus(response.status))

  return { ok: true, value: payload }
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
   * Transkriptionsmodell annimmt. Ohne Namen hiesse die Datei "blob" ohne
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

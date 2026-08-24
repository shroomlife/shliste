/**
 * Der Rezept-Chat — Verlauf, Senden und Fehlerzustand für ein Rezept.
 *
 * Der Verlauf lebt in `recipe_chat_messages` und ist append-only: Nachrichten
 * werden angefügt, nie geändert oder gelöscht (deshalb gibt es auch kein
 * "Verlauf löschen" — ein lokales Hard-Delete käme beim nächsten Pull zurück).
 *
 * Persistiert werden NUR `user`- und `assistant`-Nachrichten — der
 * Domänen-Typ kennt bewusst nur diese zwei Rollen. Ein Fehler ist eine rein
 * clientseitige Bubble mit „Erneut versuchen": Die User-Nachricht steht beim
 * Fehlschlag bereits im Verlauf (sie wird VOR der Anfrage gespeichert), ein
 * erneuter Versuch schickt denselben Verlauf einfach noch einmal — bei einer
 * Sprachnachricht wird die aufbewahrte Aufnahme erneut gesendet.
 *
 * Lokale Refs statt useState: Der Chat gehört genau einem Sheet; ein zweiter
 * geteilter Zustand hätte keinen zweiten Leser.
 */
import type { RecipeChatMessageRow } from '../db/schema'
import { appendChatMessage, getChatMessagesForRecipe } from '../db/repositories'
import { nowIso } from '../db/timestamps'
import type { ChatRecipePayload } from '../ai/recipeContract'
import type { AudioUpload, ChatMessagePayload } from '../ai/transport'
import { requestRecipeChat, requestVoiceRecipeChat } from '../ai/transport'

/** Höchstzahl der Nachrichten je Anfrage — die API lehnt mehr mit 422 ab. */
const MAX_CHAT_MESSAGES = 50

/** Was beim Fehlschlag übrig bleibt, damit „Erneut versuchen" es wiederholen kann. */
type FailedSend
  = | { kind: 'text' }
    | { kind: 'voice', recording: AudioUpload }

export function useRecipeChat() {
  const { profile } = useAuth()
  const { scheduleSync } = useSync()

  const messages = ref<RecipeChatMessageRow[]>([])
  const isSending = ref(false)
  /** Die clientseitige Fehler-Bubble; null heisst: kein Fehler sichtbar. */
  const errorMessage = ref<string | null>(null)

  /** Als Ref, damit die Ansicht den Retry-Knopf nur bei echtem Ziel zeigt. */
  const failed = ref<FailedSend | null>(null)
  let controller: AbortController | null = null

  const canRetry = computed<boolean>(() => failed.value !== null)

  /**
   * Wird der Verlauf gerade geholt? Nur beim ERSTEN Lesen wahr.
   *
   * Der Abgleich liest denselben Verlauf später noch einmal, wenn ein anderes
   * Gerät etwas geschrieben hat. Würde die Ansicht dabei wieder auf Platzhalter
   * springen, flackerte ein fertig dastehender Verlauf ohne Not.
   */
  const isLoading = ref(false)
  let hasLoadedOnce = false

  async function load(recipeId: string): Promise<void> {
    if (!hasLoadedOnce) isLoading.value = true
    try {
      messages.value = await getChatMessagesForRecipe(recipeId)
    }
    finally {
      hasLoadedOnce = true
      isLoading.value = false
    }
  }

  /** Der persistierte Verlauf in der Anfrage-Form, auf das API-Limit gekürzt. */
  function historyPayload(): ChatMessagePayload[] {
    return messages.value
      .map(row => ({ role: row.role, content: row.content }))
      .slice(-MAX_CHAT_MESSAGES)
  }

  async function persist(recipeId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await appendChatMessage({
      id: crypto.randomUUID(),
      recipeId,
      role,
      content,
      createdAt: nowIso(),
      createdBy: profile.value?.userId ?? null,
    })
    await load(recipeId)
    scheduleSync()
  }

  /**
   * Schickt eine getippte Nachricht. Die User-Nachricht wird VOR der Anfrage
   * gespeichert — scheitert die Antwort, bleibt die Frage im Verlauf und
   * „Erneut versuchen" wiederholt nur die Anfrage.
   */
  async function sendText(recipeId: string, recipe: ChatRecipePayload, text: string): Promise<void> {
    const content = text.trim()
    if (content.length === 0 || isSending.value) return

    errorMessage.value = null
    isSending.value = true

    try {
      await persist(recipeId, 'user', content)
      await requestReply(recipeId, recipe)
    }
    catch (cause) {
      // Hier landet nur die lokale Datenbank — Netz- und AI-Fehler kommen als
      // AiResult zurück. Auch das ist ein Ergebnis, das die Ansicht zeigt.
      console.error('[Rezept-Chat] Speichern fehlgeschlagen:', cause)
      errorMessage.value = 'Die Nachricht konnte nicht gespeichert werden. Bitte versuche es erneut.'
    }
    finally {
      isSending.value = false
    }
  }

  /** Wiederholt die Anfrage mit dem bereits persistierten Verlauf. */
  async function requestReply(recipeId: string, recipe: ChatRecipePayload): Promise<void> {
    controller = new AbortController()
    const result = await requestRecipeChat({ recipe, messages: historyPayload() }, controller.signal)
    controller = null

    if (!result.ok) {
      if (!result.aborted) {
        failed.value = { kind: 'text' }
        errorMessage.value = result.error
      }
      return
    }

    failed.value = null
    await persist(recipeId, 'assistant', result.value)
  }

  /**
   * Schickt eine Sprachnachricht. Der Verlauf geht OHNE die neue Nachricht
   * hinaus — sie steckt in der Aufnahme, und die Antwort liefert Transkript
   * (`userMessage`) und Antwort zurück; beide werden persistiert.
   */
  async function sendVoice(recipeId: string, recipe: ChatRecipePayload, recording: AudioUpload): Promise<void> {
    if (isSending.value) return

    errorMessage.value = null
    isSending.value = true

    try {
      controller = new AbortController()
      const result = await requestVoiceRecipeChat(
        recording,
        { recipe, messages: historyPayload() },
        controller.signal,
      )
      controller = null

      if (!result.ok) {
        if (!result.aborted) {
          // Die Aufnahme bleibt erhalten: „Erneut versuchen" sendet sie neu.
          failed.value = { kind: 'voice', recording }
          errorMessage.value = result.error
        }
        return
      }

      failed.value = null
      await persist(recipeId, 'user', result.value.userMessage)
      await persist(recipeId, 'assistant', result.value.reply)
    }
    catch (cause) {
      console.error('[Rezept-Chat] Speichern fehlgeschlagen:', cause)
      errorMessage.value = 'Die Nachricht konnte nicht gespeichert werden. Bitte versuche es erneut.'
    }
    finally {
      isSending.value = false
    }
  }

  /** „Erneut versuchen" der Fehler-Bubble. */
  async function retry(recipeId: string, recipe: ChatRecipePayload): Promise<void> {
    const target = failed.value
    if (target === null || isSending.value) return

    if (target.kind === 'voice') {
      await sendVoice(recipeId, recipe, target.recording)
      return
    }

    errorMessage.value = null
    isSending.value = true
    try {
      await requestReply(recipeId, recipe)
    }
    catch (cause) {
      console.error('[Rezept-Chat] Speichern fehlgeschlagen:', cause)
      errorMessage.value = 'Die Nachricht konnte nicht gespeichert werden. Bitte versuche es erneut.'
    }
    finally {
      isSending.value = false
    }
  }

  /** Bricht eine laufende Anfrage ab (z.B. beim Schliessen des Sheets). */
  function cancel(): void {
    controller?.abort()
    controller = null
  }

  /** Blendet die Fehler-Bubble aus, ohne den Verlauf anzufassen. */
  function dismissError(): void {
    errorMessage.value = null
    failed.value = null
  }

  return {
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    isSending: readonly(isSending),
    errorMessage: readonly(errorMessage),
    canRetry,
    load,
    sendText,
    sendVoice,
    retry,
    cancel,
    dismissError,
  }
}

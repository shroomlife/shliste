<script setup lang="ts">
/**
 * Der Rezept-Chat selbst — Verlauf, Eingabe, Mikrofon, Fehler-Bubble.
 *
 * Diese Komponente ist absichtlich behälterlos: Sie weiß nicht, ob sie in
 * einem Blatt steckt oder als Spalte neben der Zubereitung steht. Beides gibt
 * es (siehe `variant`), und beides soll denselben Chat zeigen und nicht zwei
 * Nachbauten, die sich mit der Zeit auseinanderentwickeln.
 *
 * Nachbau des Android-Sheets (RecipeChatSheet.kt): User-Bubbles rechts im
 * Primary-Container, Assistant-Bubbles links auf der Surface-Variante, Fehler
 * als rein clientseitige Bubble mit "Erneut versuchen".
 *
 * Der Verlauf kommt aus `recipe_chat_messages` (append-only, wird gesynct) und
 * lebt in `useRecipeChat` — hier wird nur gerendert. Antworten der AI laufen
 * durch `AiMarkdownText`: denselben kleinen Markdown-Umfang, den auch Android
 * kennt. Hier stand einmal, ein Parser wäre eine unnötige Abhängigkeit und
 * `pre-wrap` reiche — das war falsch. Das Modell schreibt **fett** und
 * Aufzählungen, und die standen als nackte Sternchen mitten im Satz.
 *
 * Kein "Verlauf löschen": Der Verlauf ist im Sync append-only, ein lokales
 * Hard-Delete käme beim nächsten Pull zurück.
 */
import type { ChatRecipePayload } from '~/ai/recipeContract'
import { randomChatPlaceholder } from '~/ai/phrases'
import { formatRecordingDuration } from '~/composables/useAudioRecorder'

const { recipeId, recipe, active, variant = 'sheet' } = defineProps<{
  recipeId: string
  /** Das Rezept in der Anfrage-Form (Mengen bereits ganzzahlig). */
  recipe: ChatRecipePayload
  /**
   * Ist der Chat gerade sichtbar? Im Blatt heißt das "geöffnet", in der
   * Spalte schlicht "vorhanden". Steuert Laden, Abbrechen und Aufräumen.
   */
  active: boolean
  /**
   * `sheet` deckelt den Verlauf auf halbe Fensterhöhe, weil ein Blatt sonst
   * unbegrenzt wächst. `column` füllt stattdessen die Spalte aus.
   */
  variant?: 'sheet' | 'column'
}>()

/**
 * Die Platzhalter beim Laden des Verlaufs. Feste Formen, kein Zufall: Ein
 * Skelett, das bei jedem Rendern anders aussieht, flackert und liest sich als
 * Fehler. Die ungleichen Breiten sind Absicht — gleich lange Balken sehen aus
 * wie eine Tabelle, nicht wie ein Gespräch.
 */
const SKELETON_BUBBLES = [
  { id: 'a', mine: true, width: 'w-[55%]', lines: ['w-full'] },
  { id: 'b', mine: false, width: 'w-[80%]', lines: ['w-full', 'w-[92%]', 'w-[60%]'] },
  { id: 'c', mine: true, width: 'w-[40%]', lines: ['w-full'] },
] as const

/** Der Platzhalter für die Antwort, auf die gerade gewartet wird. */
const ANSWER_SKELETON_LINES = ['w-full', 'w-[88%]', 'w-[64%]'] as const

const chat = useRecipeChat()
const recorder = useAudioRecorder()
const { dataVersion } = useSync()

const input = ref('')
/** Ein Platzhalter je Öffnen — wie `RecipeChatPlaceholders.random()` in Android. */
const placeholder = ref(randomChatPlaceholder())

const scrollArea = useTemplateRef<HTMLElement>('scrollArea')

function scrollToEnd(): void {
  void nextTick(() => {
    const el = scrollArea.value
    if (el !== null) el.scrollTop = el.scrollHeight
  })
}

watch(() => active, (isActive) => {
  if (isActive) {
    placeholder.value = randomChatPlaceholder()
    void chat.load(recipeId).then(scrollToEnd)
    return
  }
  chat.cancel()
  chat.dismissError()
  recorder.cancel()
  input.value = ''
}, { immediate: true })

// Beim Wechsel der Fensterbreite verschwindet die Spalte und das Blatt
// uebernimmt (oder umgekehrt). Ohne dieses Aufräumen liefe eine laufende
// Anfrage weiter ins Leere. Ums Mikrofon kümmert sich `useAudioRecorder`
// selbst (onScopeDispose), das muss hier nicht doppelt stehen.
onBeforeUnmount(chat.cancel)

// Der Abgleich kann Nachrichten anderer Geräte hereinbringen — bei sichtbarem
// Chat wird der Verlauf dann neu gelesen (dieselbe Richtung wie überall: der
// Sync meldet, die Ansicht liest).
watch(dataVersion, () => {
  if (active) void chat.load(recipeId)
})

watch(() => chat.messages.value.length, scrollToEnd)

async function submit(): Promise<void> {
  const text = input.value.trim()
  if (text.length === 0 || chat.isSending.value) return

  input.value = ''
  await chat.sendText(recipeId, recipe, text)
}

/** Mikrofon-Knopf: erster Druck startet, zweiter beendet und sendet. */
async function toggleRecording(): Promise<void> {
  if (chat.isSending.value) return

  if (!recorder.isRecording.value) {
    await recorder.start()
    return
  }

  const recording = await recorder.stop()
  if (recording === null) return

  await chat.sendVoice(recipeId, recipe, recording)
}

function retry(): void {
  void chat.retry(recipeId, recipe)
}
</script>

<template>
  <div
    class="flex flex-col gap-3"
    :class="variant === 'column' && 'h-full min-h-0'"
  >
    <!-- Verlauf -->
    <div
      ref="scrollArea"
      class="flex flex-col gap-2 overflow-y-auto"
      :class="variant === 'column' ? 'min-h-0 grow px-4 pt-4' : 'max-h-[50vh] min-h-40'"
    >
      <!-- Beim ersten Öffnen wird der Verlauf aus IndexedDB geholt. Statt
           „Stelle eine Frage" zu zeigen und einen Sekundenbruchteil später
           doch einen vollen Verlauf, stehen hier Platzhalter in der Form der
           echten Blasen — abwechselnd links und rechts, weil ein Verlauf
           genau so aussieht. -->
      <template v-if="chat.isLoading.value">
        <div
          v-for="platzhalter in SKELETON_BUBBLES"
          :key="platzhalter.id"
          class="flex"
          :class="platzhalter.mine ? 'justify-end' : 'justify-start'"
        >
          <div
            class="flex flex-col gap-2 rounded-xl px-3.5 py-3"
            :class="platzhalter.width"
            :style="platzhalter.mine
              ? 'background: var(--md-primary-container)'
              : 'background: var(--md-surface-variant)'"
          >
            <USkeleton
              v-for="zeile in platzhalter.lines"
              :key="zeile"
              class="h-3 rounded-full"
              :class="zeile"
            />
          </div>
        </div>
      </template>

      <p
        v-else-if="chat.messages.value.length === 0 && !chat.isSending.value"
        class="py-10 text-center text-[0.9375rem]"
        style="color: var(--md-on-surface-variant)"
      >
        Stelle eine Frage zu diesem Rezept
      </p>

      <div
        v-for="message in chat.messages.value"
        :key="message.id"
        class="flex"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <!-- Eigene Nachrichten sind roher Text: Wer tippt, meint Sternchen als
             Sternchen. Antworten der AI gehen durch den kleinen
             Markdown-Umfang, den auch Android kennt (siehe AiMarkdownText) —
             vorher standen die Sternchen sichtbar mitten im Satz. -->
        <div
          v-if="message.role === 'user'"
          class="max-w-[85%] rounded-xl px-3.5 py-2.5 text-[0.9375rem] whitespace-pre-wrap"
          style="background: var(--md-primary-container); color: var(--md-on-primary-container)"
          v-text="message.content"
        />
        <div
          v-else
          class="max-w-[85%] rounded-xl px-3.5 py-2.5"
          style="background: var(--md-surface-variant); color: var(--md-on-surface)"
        >
          <AiMarkdownText :text="message.content" />
        </div>
      </div>

      <!-- Fehler: rein clientseitig, nie im Verlauf gespeichert -->
      <div
        v-if="chat.errorMessage.value !== null"
        class="flex justify-start"
      >
        <div
          class="flex max-w-[85%] flex-col items-start gap-2 rounded-xl px-3.5 py-2.5"
          style="background: #FDECF5; color: #B4235F"
        >
          <span class="text-[0.9375rem]">{{ chat.errorMessage.value }}</span>
          <UButton
            v-if="chat.canRetry.value"
            icon="i-lucide-rotate-ccw"
            color="error"
            variant="outline"
            size="xs"
            class="font-bold"
            :disabled="chat.isSending.value"
            @click="retry"
          >
            Erneut versuchen
          </UButton>
        </div>
      </div>

      <!-- Warten auf die Antwort. Vorher drehte sich hier ein Kringel in einer
           winzigen Blase — der sagte "es passiert etwas", aber nicht "hier
           entsteht gleich Text". Der Platzhalter hat die Form der Antwort, die
           kommt, und der Sprung beim Eintreffen fällt entsprechend kleiner
           aus. Bei abgeschalteter Bewegung steht er still statt zu pulsen. -->
      <div
        v-if="chat.isSending.value"
        class="flex justify-start"
      >
        <div
          class="flex w-[85%] flex-col gap-2 rounded-xl px-3.5 py-3"
          style="background: var(--md-surface-variant)"
          role="status"
          aria-label="Antwort wird geschrieben"
        >
          <USkeleton
            v-for="(zeile, index) in ANSWER_SKELETON_LINES"
            :key="zeile"
            class="h-3 rounded-full"
            :class="zeile"
            :style="{ animationDelay: `${index * 140}ms` }"
          />
        </div>
      </div>
    </div>

    <p
      v-if="recorder.error.value !== null"
      class="shrink-0 rounded-xl px-4 py-3 text-[0.9375rem]"
      :class="variant === 'column' && 'mx-4'"
      style="background: #FDECF5; color: #B4235F"
    >
      {{ recorder.error.value }}
    </p>

    <div
      v-if="recorder.isRecording.value"
      class="flex shrink-0 items-center gap-2.5 px-1"
      :class="variant === 'column' && 'mx-4'"
    >
      <span class="size-2.5 animate-pulse rounded-full bg-[#F53F96]" />
      <span
        class="text-[0.9375rem] tabular-nums"
        style="color: var(--md-on-surface-variant)"
      >Aufnahme läuft · {{ formatRecordingDuration(recorder.durationSeconds.value) }}</span>
    </div>

    <!-- Eingabe. In der Spalte ist sie ein Panel-Fuß mit Trennlinie, wie die
         Eingabezeile der Zubereitung und der Werkbank daneben — drei Spalten,
         derselbe Bauplan. Die Bedienelemente sind dort eine Nummer kleiner:
         `xl` ist die Größe für den Daumen im Blatt, am Schreibtisch würde sie
         die schmale Spalte auffressen.

         DIE 7.5rem DER SPALTE SIND GELIEHEN, nicht neu erfunden: Genau so hoch
         sind die Füße der Zutaten- und der Zubereitungsspalte (siehe die
         Rechnung in `pages/app/recipes/[id].vue`). Alle drei Trennlinien
         liegen damit auf EINER Waagerechten. Vorher war dieser Fuß 4.5rem
         hoch und seine Linie saß drei Zentimeter tiefer als die daneben.

         Gefüllt wird die Höhe nicht mit Luft, sondern mit einem mehrzeiligen
         Feld: Eine Frage ans Rezept ist selten vier Wörter lang, und ein Fuß
         mit 3rem Leerraum über einer einzelnen Zeile sähe aus wie ein Fehler.
         Im Blatt bleibt es die einzeilige Variante — dort tippt ein Daumen,
         und der Platz gehört dem Verlauf. -->
    <div
      class="flex shrink-0 gap-2"
      :class="variant === 'column' ? 'h-30 items-end border-t px-4 py-4' : 'items-center'"
      :style="variant === 'column' ? 'border-color: var(--md-outline-variant)' : ''"
    >
      <UButton
        :icon="recorder.isRecording.value ? 'i-lucide-square' : 'i-lucide-mic'"
        :color="recorder.isRecording.value ? 'error' : 'neutral'"
        variant="subtle"
        :size="variant === 'column' ? 'lg' : 'xl'"
        class="shrink-0 rounded-xl"
        :disabled="chat.isSending.value"
        :aria-label="recorder.isRecording.value ? 'Aufnahme beenden und senden' : 'Frage einsprechen'"
        @click="toggleRecording"
      />
      <!-- Enter schickt ab, Umschalt+Enter bricht um — dieselbe Abmachung wie
           im Schritt-Feld nebenan. `keydown.enter.exact.prevent` statt
           `keyup.enter`: ohne `exact` löste auch Umschalt+Enter aus, ohne
           `prevent` stünde der Umbruch schon im Feld. -->
      <UTextarea
        v-if="variant === 'column'"
        v-model="input"
        :placeholder="placeholder"
        size="lg"
        :rows="2"
        enterkeyhint="send"
        :disabled="chat.isSending.value || recorder.isRecording.value"
        :ui="{ root: 'h-full w-full grow', base: 'h-full resize-none' }"
        @keydown.enter.exact.prevent="submit"
      />
      <UInput
        v-else
        v-model="input"
        :placeholder="placeholder"
        size="xl"
        :disabled="chat.isSending.value || recorder.isRecording.value"
        :ui="{ root: 'w-full grow' }"
        @keyup.enter="submit"
      />
      <UButton
        icon="i-lucide-send"
        :size="variant === 'column' ? 'lg' : 'xl'"
        class="shrink-0 rounded-xl font-bold"
        :disabled="input.trim().length === 0 || chat.isSending.value || recorder.isRecording.value"
        aria-label="Senden"
        @click="submit"
      />
    </div>
  </div>
</template>

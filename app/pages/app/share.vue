<script setup lang="ts">
import type { GeneratedList } from '~/ai/contract'
import type { GeneratedRecipe } from '~/ai/recipeContract'
import type { SharedPayload } from '~/utils/shareTarget'

/**
 * Der Teilen-Empfang: Was aus einer anderen App hier ankommt.
 *
 * Die installierte App meldet sich beim Betriebssystem als Ziel für „Teilen"
 * an (`share_target` im Manifest, siehe `nuxt.config.ts`). Chrome auf Android
 * und der Teilen-Dialog von Windows öffnen dann diese Adresse mit `title`,
 * `text` und `url` als Abfrageteil. Wie die drei Felder befüllt sind, ist
 * Glückssache — das sortiert `extractSharedLink`.
 *
 * DIE ADRESSE WIRD SOFORT AUFGERÄUMT. Nach dem Lesen ersetzt die Seite sich
 * selbst durch `/app/share` ohne Abfrageteil, und der Inhalt lebt in
 * `useState` weiter. Sonst legte ein Neuladen (oder ein Zurück im Verlauf)
 * denselben Eintrag ein zweites Mal an, und die Adresszeile trüge dauerhaft
 * den geteilten Text mit sich herum.
 *
 * KEIN ANMELDE-GATE, und auch kein Return-URL-Mechanismus: Angemeldet wird in
 * dieser App über einen Dialog im Layout (Google-Knopf, kein Umleiten auf eine
 * fremde Seite). Wer sich also mitten in diesem Vorgang anmeldet, bleibt genau
 * hier stehen, und der geteilte Inhalt überlebt das ohne Zutun. Hinzufügen zu
 * einer Liste geht ohnehin ohne Konto — die App ist offline-first.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Geteilt mit shliste' })

const route = useRoute()
const { entries, reload: reloadLists, createList, addItemsToList } = useLists()
const { createListFromAi, createRecipeFromAi } = useAiCreate()
const { scheduleSync } = useSync()
const { isSignedIn } = useAuth()
const { mark } = useRecentlyChanged()
const toast = useToast()

/**
 * Der geteilte Inhalt.
 *
 * In `useState` und nicht in einem `ref`, damit er das Ersetzen der Adresse
 * überlebt: Das ist eine Navigation, und ein `ref` in dieser Komponente ginge
 * dabei verloren.
 */
const payload = useState<SharedPayload | null>('share-target-payload', () => null)

const isBusy = ref(false)
const isNewListOpen = ref(false)
const newListName = ref('')

/** Das Angebot statt der Absage — siehe AiUpsellSheet. */
const isAiUpsellOpen = ref(false)
const isAiListOpen = ref(false)
const isAiRecipeOpen = ref(false)

const sharedUrl = computed(() => payload.value?.url ?? null)
const sharedHost = computed(() => hostOf(sharedUrl.value))

/** Die Überschrift der Vorschau: der mitgeteilte Titel, sonst die Adresse, sonst der Text. */
const previewHeading = computed(() => {
  const current = payload.value
  if (current === null) return ''
  return current.title || current.url || current.text
})

/**
 * Geheime Listen stehen hier NICHT zur Wahl — die Begründung und die Tests
 * dazu stehen in `utils/listTargets.ts`.
 */
const targetLists = computed(() =>
  entries.value.filter(entry => selectableAsTarget([entry.list]).length > 0),
)

onMounted(() => {
  void initialise()
})

async function initialise(): Promise<void> {
  // Ein leerer Abfrageteil heisst „diese Seite wurde nicht gerade beschickt"
  // — dann bleibt stehen, was schon im Zustand liegt (etwa nach einem Zurück
  // aus einem KI-Blatt).
  if (Object.keys(route.query).length > 0) {
    payload.value = extractSharedLink({
      title: firstQueryValue(route.query['title']),
      text: firstQueryValue(route.query['text']),
      url: firstQueryValue(route.query['url']),
    })

    newListName.value = payload.value?.title || sharedHost.value || ''

    await navigateTo('/app/share', { replace: true })
  }

  // Die Listen werden NACHGELADEN, nicht vorausgesetzt: Der geteilte Zustand
  // füllt sich erst, wenn jemand die Übersicht besucht hat. Wer direkt aus
  // dem Teilen-Dialog hier landet, sähe sonst keine einzige Liste — und
  // hätte keine Ahnung, warum.
  await reloadLists().catch((error: unknown) => {
    console.warn('[Teilen] Listen konnten nicht geladen werden:', error)
  })
}

/**
 * Legt den geteilten Inhalt in einer Liste an und geht dorthin.
 *
 * Mit Adresse entsteht ein Link-Eintrag OHNE Namen: Die Zeile zeigt dann den
 * Seitentitel, den der Server nachträgt. Ohne Adresse wird der geteilte Text
 * zum Namen. Ein mitgeteilter Titel wird nie zum Namen — er beschreibt die
 * Seite und nicht das, was man kaufen will.
 */
async function addToList(listId: string, listName: string): Promise<void> {
  const current = payload.value
  if (current === null || isBusy.value) return

  isBusy.value = true
  try {
    const rows = await addItemsToList(listId, [{
      name: current.url === null ? current.text : '',
      quantity: 1,
      url: current.url,
    }])

    // Der neue Eintrag leuchtet in der Zielliste kurz auf — derselbe
    // Bewegungsmoment wie bei einer Fremdänderung, hier als Antwort auf
    // „wo ist es denn gelandet?".
    mark(rows.map(row => row.id))
    scheduleSync()
    payload.value = null

    await navigateTo(`/app/lists/${listId}`)
    toast.add({ title: `Zu "${listName}" hinzugefügt`, icon: 'i-lucide-check' })
  }
  catch (error) {
    console.error('[Teilen] Hinzufügen fehlgeschlagen:', error)
    toast.add({
      title: 'Hinzufügen fehlgeschlagen',
      description: 'Bitte versuche es erneut.',
      icon: 'i-lucide-triangle-alert',
      color: 'error',
    })
  }
  finally {
    isBusy.value = false
  }
}

async function addToNewList(): Promise<void> {
  const name = newListName.value.trim()
  if (name.length === 0 || isBusy.value) return

  isBusy.value = true
  let created: { id: string, name: string }
  try {
    created = await createList(name)
  }
  catch (error) {
    console.error('[Teilen] Liste konnte nicht angelegt werden:', error)
    toast.add({ title: 'Die Liste konnte nicht angelegt werden', icon: 'i-lucide-triangle-alert', color: 'error' })
    isBusy.value = false
    return
  }

  // Erst freigeben, dann weiterreichen: `addToList` setzt die Sperre selbst.
  isBusy.value = false
  await addToList(created.id, created.name)
}

/**
 * Die KI-Wege stehen nur mit Adresse zur Wahl — aus einem blossen Text lässt
 * sich weder eine Liste noch ein Rezept holen.
 */
function startAiList(): void {
  if (!isSignedIn.value) {
    isAiUpsellOpen.value = true
    return
  }
  isAiListOpen.value = true
}

function startAiRecipe(): void {
  if (!isSignedIn.value) {
    isAiUpsellOpen.value = true
    return
  }
  isAiRecipeOpen.value = true
}

function onAiListCreated(result: GeneratedList): void {
  // Der Inhalt wird erst nach dem Erfolg verworfen: Scheitert das Anlegen,
  // soll die Seite noch dieselbe Auswahl anbieten können.
  void createListFromAi(result)
    .then(() => {
      payload.value = null
    })
    .catch((error: unknown) => {
      console.error('[Teilen] Anlegen der AI-Liste fehlgeschlagen:', error)
      toast.add({
        title: 'Liste konnte nicht angelegt werden',
        description: 'Bitte versuche es erneut.',
        icon: 'i-lucide-triangle-alert',
        color: 'error',
      })
    })
}

function onAiRecipeCreated(result: GeneratedRecipe): void {
  void createRecipeFromAi(result)
    .then(() => {
      payload.value = null
    })
    .catch((error: unknown) => {
      console.error('[Teilen] Anlegen des AI-Rezepts fehlgeschlagen:', error)
      toast.add({
        title: 'Rezept konnte nicht angelegt werden',
        description: 'Bitte versuche es erneut.',
        icon: 'i-lucide-triangle-alert',
        color: 'error',
      })
    })
}

async function cancel(): Promise<void> {
  payload.value = null
  await navigateTo('/app/lists')
}
</script>

<template>
  <div
    class="flex min-h-0 min-w-0 grow flex-col overflow-y-auto"
    style="background: var(--md-surface)"
  >
    <header class="flex shrink-0 flex-col gap-1 px-5 py-5 lg:px-7">
      <h1 class="title-page font-extrabold">
        Geteilt mit shliste
      </h1>
      <p
        v-if="payload"
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >
        Wohin damit?
      </p>
    </header>

    <!-- Leerzustand: Es kam nichts an, mit dem sich etwas anfangen liesse.
         Auch der Fall „Seite neu geladen", denn dann ist der Abfrageteil
         längst weg. -->
    <div
      v-if="!payload"
      class="flex grow flex-col items-center justify-center gap-3 px-8 text-center"
    >
      <UIcon
        name="i-lucide-share-2"
        class="size-10"
        style="color: var(--md-on-surface-variant)"
      />
      <p class="text-[1.25rem] font-bold">
        Nichts zum Teilen erhalten
      </p>
      <p
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant); text-wrap: pretty"
      >
        Teile eine Seite oder einen Text aus einer anderen App, dann landet er hier.
      </p>
      <UButton
        to="/app/lists"
        class="mt-2 font-bold"
      >
        Zu den Listen
      </UButton>
    </div>

    <div
      v-else
      class="flex flex-col gap-6 px-5 pb-8 lg:px-7"
    >
      <!-- Die Vorschau-Karte: Was kam an? -->
      <div
        class="flex items-center gap-3 rounded-xl px-3.5 py-3"
        style="background: var(--md-surface-low)"
      >
        <LinkTile
          v-if="sharedUrl"
          :url="sharedUrl"
        />
        <span
          v-else
          class="flex size-12 shrink-0 items-center justify-center rounded-lg"
          style="background: var(--md-secondary)"
        >
          <UIcon
            name="i-lucide-file-text"
            class="size-6.5"
            style="color: var(--md-on-secondary)"
          />
        </span>

        <span class="flex min-w-0 grow flex-col">
          <span class="truncate text-[1.125rem] font-bold">{{ previewHeading }}</span>
          <span
            v-if="sharedHost"
            class="truncate text-[0.875rem]"
            style="color: var(--md-on-surface-variant)"
          >{{ sharedHost }}</span>
        </span>

        <a
          v-if="sharedUrl"
          :href="sharedUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0 rounded-lg px-2.5 py-1.5 text-[0.9375rem] font-bold"
          style="color: var(--md-primary)"
        >Öffnen</a>
      </div>

      <!-- Die Listenauswahl steht direkt hier und nicht in einem zweiten
           Blatt: Der ganze Vorgang ist ein einziger Griff, und ein Blatt über
           einer Seite, die selbst schon ein Auswahldialog ist, wäre eine
           Ebene zu viel. -->
      <div class="flex flex-col gap-2">
        <span
          class="text-[1rem] font-bold"
          style="color: var(--md-on-surface-variant)"
        >Zu einer Liste hinzufügen</span>

        <ul class="flex flex-col gap-1">
          <li
            v-for="entry in targetLists"
            :key="entry.list.id"
          >
            <button
              type="button"
              class="state-layer flex min-h-13 w-full items-center gap-3 rounded-lg px-2.5 text-left"
              :disabled="isBusy"
              @click="addToList(entry.list.id, entry.list.name)"
            >
              <span
                class="size-3 shrink-0 rounded-full"
                :style="{ background: entry.list.color }"
              />
              <span class="min-w-0 grow truncate text-[1.25rem]">{{ entry.list.name }}</span>
              <span
                class="shrink-0 text-[0.9375rem]"
                style="color: var(--md-on-surface-variant)"
              >{{ entry.openCount + entry.doneCount }}</span>
              <UIcon
                name="i-lucide-chevron-right"
                class="size-5 shrink-0"
                style="color: var(--md-on-surface-variant)"
              />
            </button>
          </li>

          <!-- Die letzte Zeile ist der Ausweg, wenn keine der Listen passt.
               Sie klappt ihr Feld erst auf Zuruf auf, damit die Auswahl nicht
               dauerhaft von einem Eingabefeld unterbrochen wird. -->
          <li>
            <button
              v-if="!isNewListOpen"
              type="button"
              class="state-layer flex min-h-13 w-full items-center gap-3 rounded-lg px-2.5 text-left"
              :disabled="isBusy"
              @click="isNewListOpen = true"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-5 shrink-0"
                style="color: var(--md-primary)"
              />
              <span
                class="min-w-0 grow truncate text-[1.25rem]"
                style="color: var(--md-primary)"
              >Neue Liste…</span>
            </button>

            <div
              v-else
              class="flex items-center gap-2 py-1"
            >
              <UInput
                v-model="newListName"
                autofocus
                size="xl"
                placeholder="Name der Liste"
                aria-label="Name der neuen Liste"
                class="grow"
                :ui="{ root: 'w-full' }"
                @keydown.enter="addToNewList"
              />
              <UButton
                :disabled="newListName.trim().length === 0 || isBusy"
                icon="i-lucide-check"
                size="xl"
                aria-label="Neue Liste anlegen und hinzufügen"
                @click="addToNewList"
              />
            </div>
          </li>
        </ul>
      </div>

      <!-- Die KI-Wege nur mit Adresse: Aus einem blossen Text lässt sich
           weder eine Liste noch ein Rezept holen. -->
      <div
        v-if="sharedUrl"
        class="flex flex-col gap-2"
      >
        <span
          class="text-[1rem] font-bold"
          style="color: var(--md-on-surface-variant)"
        >Oder mit KI auslesen</span>

        <button
          type="button"
          class="flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left"
          style="border-color: var(--md-outline-variant); background: var(--md-surface)"
          @click="startAiList"
        >
          <UIcon
            name="i-lucide-list-checks"
            class="size-5 shrink-0"
            style="color: var(--md-primary)"
          />
          <span class="flex min-w-0 flex-col">
            <span class="text-[1rem] font-bold">Neue Liste per KI</span>
            <span
              class="text-[0.875rem]"
              style="color: var(--md-on-surface-variant)"
            >Die Seite auslesen und als Liste anlegen</span>
          </span>
        </button>

        <button
          type="button"
          class="flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left"
          style="border-color: var(--md-outline-variant); background: var(--md-surface)"
          @click="startAiRecipe"
        >
          <UIcon
            name="i-lucide-chef-hat"
            class="size-5 shrink-0"
            style="color: var(--md-primary)"
          />
          <span class="flex min-w-0 flex-col">
            <span class="text-[1rem] font-bold">Neues Rezept per KI</span>
            <span
              class="text-[0.875rem]"
              style="color: var(--md-on-surface-variant)"
            >Die Seite auslesen und als Rezept anlegen</span>
          </span>
        </button>
      </div>

      <div class="flex justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          class="font-bold"
          @click="cancel"
        >
          Abbrechen
        </UButton>
      </div>
    </div>

    <AiUpsellSheet v-model:open="isAiUpsellOpen" />

    <AiCreateListSheet
      v-model:open="isAiListOpen"
      mode="url"
      :initial-url="sharedUrl"
      @created="onAiListCreated"
    />

    <AiRecipeCreateSheet
      v-model:open="isAiRecipeOpen"
      mode="url"
      :initial-url="sharedUrl"
      @created="onAiRecipeCreated"
    />
  </div>
</template>

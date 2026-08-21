<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'
import { getMembersForList, upsertItem, upsertList } from '~/db/repositories'
import type { ListMemberRow } from '~/db/schema'
import type { AiEditApplyPayload } from '~/ai/diff'
import { joinSuggestionCache } from '~/ai/suggestions'

/**
 * Detailansicht einer Liste — der Bildschirm, auf dem in dieser App die meiste
 * Zeit verbracht wird.
 *
 * Design-Richtung A: Der Kopf trägt die Listenfarbe als 20-Prozent-Lasur,
 * darunter die offenen Einträge, dann getrennt die erledigten. Auf dem Desktop
 * steht diese Ansicht rechts neben dem Index, auf Mobil ist sie eine eigene
 * Seite mit Zurück-Pfeil.
 *
 * Die Daten kommen aus der lokalen Datenbank und damit ohne Konto aus.
 * Abhaken und Hinzufügen funktionieren offline; der Abgleich mit dem Server
 * läuft getrennt davon.
 *
 * Kein definePageMeta: das Layout kommt von der Elternroute /app/lists.
 */
const route = useRoute()
const listId = computed(() => String(route.params.id))

const { reload: reloadOverview } = useLists()
const { dataVersion, scheduleSync } = useSync()
const { profile, isSignedIn } = useAuth()
const { isRecent } = useRecentlyChanged()
const toast = useToast()

/**
 * Die Mitglieder dieser Liste aus der lokalen Datenbank.
 *
 * Nicht vom Server: Der Pull bringt sie ohnehin mit und legt sie in
 * `list_members` ab. Für die Frage "wer hat das gerade geändert" genügt diese
 * Projektion vollkommen — und sie steht auch ohne Netz zur Verfügung.
 */
const members = ref<ListMemberRow[]>([])

/**
 * Der Name hinter einer Änderung, oder `null`.
 *
 * `null` in drei Fällen, und alle drei sind Absicht: bei der eigenen Änderung
 * (man weiss selbst, was man getan hat), bei einer Liste ohne Mitglieder (dann
 * gibt es niemanden zu nennen) und wenn die Person unbekannt ist. Das
 * Aufleuchten der Zeile bleibt in allen Fällen.
 */
function modifierName(modifiedBy: string | null): string | null {
  if (modifiedBy === null || members.value.length < 2) return null
  if (modifiedBy === profile.value?.userId) return null

  return members.value.find(member => member.userId === modifiedBy)?.displayName ?? null
}

const isMembersOpen = ref(false)

/**
 * Sortiermodus — Ziehen gibt es nur hier drin.
 *
 * Wie in der Android-App: Beim Einkaufen bleibt die Liste ruhig und ein Tippen
 * hakt ab. Wer umsortieren will, sagt das ausdrücklich; erst dann erscheinen
 * die Anfasser, und ein Tippen hakt solange nichts mehr ab.
 */
const isSortMode = ref(false)
const openList = useTemplateRef<HTMLElement>('openList')
const doneList = useTemplateRef<HTMLElement>('doneList')

// Beide Blöcke melden ihre Zielposition innerhalb des eigenen Blocks; die
// Umrechnung auf die vollständige Liste macht `moveItemTo`. Die Anzeige bleibt
// damit zweigeteilt, die Sortierschlüssel gelten für die eine Liste — und nur
// so sieht die Android-App, die alles in einem Block rendert, dieselbe
// Reihenfolge (Begründung in `planMoveTo`).
useDragSort(openList, {
  enabled: () => isSortMode.value,
  handle: '.drag-handle',
  onMove: (_from, to) => {
    const item = openItems.value[_from]
    if (item !== undefined) mutate(moveItemTo(item.id, to))
  },
})

useDragSort(doneList, {
  enabled: () => isSortMode.value,
  handle: '.drag-handle',
  onMove: (_from, to) => {
    const item = doneItems.value[_from]
    if (item !== undefined) mutate(moveItemTo(item.id, to))
  },
})
const isRenameOpen = ref(false)
const isDeleteOpen = ref(false)
const renameValue = ref('')

/**
 * Eine geheime Liste wird auf dem Web NICHT geöffnet.
 *
 * Android schützt sie mit Biometrie. Im Browser gäbe es dafür nur WebAuthn,
 * und das ist eine eigene Entscheidung — bis dahin ist "gesperrt" die
 * ehrliche Antwort. Einen schwächeren Schutz zu bauen hiesse, genau das
 * Feature zu verwässern, das es der Privatsphäre wegen gibt.
 */
const isLocked = computed(() => list.value?.secret === true)

/**
 * Der Eintrag im Menü heisst für Mitglieder anders als für Eigentümer, weil er
 * etwas anderes bedeutet: Der Eigentümer löscht die Liste für alle, ein
 * Mitglied verlässt sie nur. Derselbe Vorgang, zwei Wahrheiten — der Server
 * entscheidet anhand der Mitgliedschaft.
 */
const deleteLabel = computed(() => (isOwner.value ? 'Liste löschen' : 'Liste verlassen'))

const menuItems = computed(() => [[
  {
    label: 'Sortieren',
    icon: 'i-lucide-arrow-up-down',
    onSelect: () => {
      isSortMode.value = true
    },
  },
  {
    label: 'Umbenennen',
    icon: 'i-lucide-pencil',
    onSelect: () => {
      renameValue.value = list.value?.name ?? ''
      isRenameOpen.value = true
    },
  },
  {
    label: deleteLabel.value,
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => {
      isDeleteOpen.value = true
    },
  },
]])

function submitRename(): void {
  const name = renameValue.value.trim()
  if (name.length === 0) return

  isRenameOpen.value = false
  mutate(renameList(name))
}

async function confirmDelete(): Promise<void> {
  isDeleteOpen.value = false
  await deleteList()
  await reloadOverview()
  scheduleSync()
  await navigateTo('/app/lists')
}

/**
 * Ist das die eigene Liste?
 *
 * `ownerUserId` ist `null`, solange die Liste nur lokal existiert — dann
 * gehört sie zwangsläufig dem, der sie angelegt hat. Nach dem ersten Abgleich
 * trägt sie die Kennung ihres Eigentümers.
 */
const isOwner = computed(() =>
  list.value?.ownerUserId === null || list.value?.ownerUserId === profile.value?.userId,
)

const {
  list,
  items,
  openItems,
  doneItems,
  load,
  reload: reloadDetail,
  toggleItem: setItemChecked,
  addItem: createItem,
  removeItem,
  restoreItem,
  moveItemTo,
  renameList,
  deleteList,
} = useListDetail()

const newItemName = ref('')

const progress = computed(() => {
  const total = items.value.length
  return total === 0 ? 0 : Math.round((doneItems.value.length / total) * 100)
})

useHead({ title: () => `${list.value?.name ?? 'Liste'} ~ shliste` })

/**
 * Die Ereignisbehandler der Vorlage sind synchron, die Datenbankzugriffe nicht.
 * Alles läuft deshalb hier durch: So endet ein gescheiterter Zugriff (privater
 * Modus, gesperrter Speicher) nicht als unbehandelte Zusage im Nichts, sondern
 * im Protokoll.
 */
function run(work: Promise<unknown>): void {
  void work.catch((error: unknown) => {
    console.error('[Listendetail] Zugriff auf die lokale Datenbank fehlgeschlagen:', error)
  })
}

/**
 * Wie `run`, aber danach wird der Index aufgefrischt.
 *
 * Die Zähler auf den Karten sind abgeleitete Werte. Sie stehen absichtlich
 * nicht in der Zeile selbst, müssen nach einer Änderung also neu gelesen
 * werden — sonst zeigt der Index daneben veraltete Zahlen.
 */
function mutate(work: Promise<unknown>): void {
  run(work.then(async () => {
    await reloadOverview()
    // Gesammelt statt sofort: Beim Abhaken fällt eine Änderung nach der
    // anderen an, und ein Push je Haken wäre eine Runde je Handbewegung.
    scheduleSync()
  }))
}

/**
 * Lädt Liste und Einträge aus der lokalen Datenbank.
 *
 * Bewusst kein useFetch: Die Daten liegen offline-first in IndexedDB und nicht
 * hinter einem Endpunkt. Der Abgleich mit dem Server läuft getrennt davon und
 * schreibt in dieselbe Datenbank zurück, woraufhin diese Ansicht neu lädt.
 */
async function loadList(): Promise<void> {
  await load(listId.value)
  members.value = await getMembersForList(listId.value)
}

// watch mit immediate statt onMounted: so lädt die Ansicht auch neu, wenn auf
// dem Desktop im Index eine andere Liste gewählt wird, ohne dass die
// Komponente neu erzeugt wird.
watch(listId, () => {
  run(loadList())
}, { immediate: true })

// Hat der Abgleich etwas geschrieben, können es Einträge dieser Liste sein.
watch(dataVersion, () => {
  run(loadList())
})

function toggleItem(item: ListItem): void {
  mutate(setItemChecked(item))
}

/**
 * Entfernt einen Eintrag — mit Rückgängig, wie in der Android-App.
 *
 * `removed` ist ein Schalter und kein Löschen: Die Zeile bleibt als Verlauf
 * für die Vorschläge erhalten und kommt beim Zurücknehmen mit ihrer Id, ihrer
 * Position und ihren Feld-Zeitstempeln zurück — auch auf den anderen Geräten,
 * denn das Zurücksetzen ist ein gewöhnliches Feld-Update.
 *
 * Sechs Sekunden: kürzer wäre für einen Griff zum Rückgängig knapp, länger
 * stünde der Hinweis noch da, wenn man längst weiter ist.
 */
function onRemoveItem(item: ListItem): void {
  mutate(removeItem(item))

  toast.add({
    title: `${item.name} entfernt`,
    icon: 'i-lucide-trash-2',
    duration: 6000,
    actions: [{
      label: 'Rückgängig',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        mutate(restoreItem(item))
      },
    }],
  })
}

function addItem(): void {
  const name = newItemName.value.trim()
  if (name.length === 0) return

  // Sofort leeren statt erst nach dem Schreiben: Der nächste Artikel soll ohne
  // Wartezeit tippbar sein, und ein zweites Enter darf nicht denselben Eintrag
  // ein zweites Mal anlegen.
  newItemName.value = ''
  mutate(createItem(name))
}

/* ------------------------------------------------------------------ *
 * AI Features — Bearbeitung und Vorschläge, wie in der Android-App.
 * ------------------------------------------------------------------ */

/** Aufklapp-Zustand der Sektion am Listenende; startet zu wie in Android. */
const isAiSectionOpen = ref(false)
const isAiEditOpen = ref(false)
const isSuggestionsOpen = ref(false)

/**
 * Die Einträge in der Form, die Diff und Anfrage brauchen. Die Reihenfolge
 * ist die Anzeige-Reihenfolge — aus ihr entsteht der `idx`, über den die
 * AI-Antwort den Einträgen wieder zugeordnet wird.
 */
const aiItems = computed(() =>
  items.value.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, checked: item.checked })),
)

const activeItemNames = computed(() => items.value.map(item => item.name))

/**
 * Wendet die angehakten Änderungen der Diff-Vorschau an — ausschliesslich
 * über die bestehenden Schreibwege: Neues über `createItem` (vergibt Id,
 * Position und Sortierschlüssel), alles andere über `upsertItem` mit
 * `toItemDraft`, das nur die setzbaren Felder durchlässt. Ein Eintrag, den
 * der Sync zwischenzeitlich entfernt hat, wird still übersprungen.
 */
async function applyAiEditWork(payload: AiEditApplyPayload): Promise<void> {
  for (const entry of payload.entries) {
    if (entry.kind === 'unchanged') continue

    if (entry.kind === 'added') {
      const row = await createItem(entry.name, entry.quantity)
      // Selten, aber möglich: Die AI legt einen Eintrag gleich abgehakt an.
      if (row !== null && entry.checked) {
        await upsertItem({ ...toItemDraft(row), checked: true })
      }
      continue
    }

    const row = items.value.find(item => item.id === entry.itemId)
    if (row === undefined) continue

    if (entry.kind === 'removed') {
      await removeItem(row)
      continue
    }

    if (entry.kind === 'modified') {
      await upsertItem({ ...toItemDraft(row), quantity: entry.newQuantity, checked: entry.newChecked })
      continue
    }

    // renamed
    await upsertItem({
      ...toItemDraft(row),
      name: entry.newName.trim(),
      quantity: entry.newQuantity,
      checked: entry.newChecked,
    })
  }

  const target = list.value
  const newName = payload.name.trim()
  if (target !== null && newName.length > 0 && newName !== target.name) {
    await renameList(newName)
  }

  await reloadDetail()
}

function onAiEditApply(payload: AiEditApplyPayload): void {
  mutate(applyAiEditWork(payload))
}

/**
 * Schreibt den Vorschlags-Cache (`lastSuggestedItems`) zurück — über
 * `upsertList`, denselben Weg wie jedes andere Listenfeld. Das Feld wird
 * gesynct, damit die Android-App dieselben Vorschläge sieht.
 */
async function writeSuggestionCacheWork(remaining: readonly string[]): Promise<void> {
  const target = list.value
  if (target === null) return

  await upsertList({
    id: target.id,
    name: target.name,
    color: target.color,
    secret: target.secret,
    lastSuggestedItems: joinSuggestionCache(remaining),
    sourceUrl: target.sourceUrl,
    ownerUserId: target.ownerUserId,
    deletedAt: target.deletedAt,
  })
  await reloadDetail()
}

function onSuggestionsRefreshed(freshItems: string[]): void {
  mutate(writeSuggestionCacheWork(freshItems))
}

async function addSuggestionsWork(names: readonly string[], remaining: readonly string[]): Promise<void> {
  for (const name of names) {
    await createItem(name, 1)
  }
  await writeSuggestionCacheWork(remaining)
}

function onSuggestionsAdd(names: string[], remaining: string[]): void {
  mutate(addSuggestionsWork(names, remaining))
}
</script>

<template>
  <div
    class="flex min-h-0 min-w-0 grow flex-col"
    style="background: var(--md-surface)"
  >
    <!-- Kopf in der Listenfarbe. Ändert ein anderes Mitglied Name oder Farbe,
         leuchtet er kurz auf — derselbe Moment wie bei einer Zeile, nur als
         Schicht darüber, damit die Listenfarbe darunter stehen bleibt.

         Als Verlauf statt flacher Tönung: Android legt die 20-Prozent-Lasur
         als vertikalen Farbverlauf über den Kartenkopf, nach unten auslaufend
         (DefaultCard.kt). Derselbe Wiedererkennungsmoment gehört ins Web. -->
    <header
      class="flex shrink-0 flex-col gap-2.5 px-5 py-5 lg:px-7"
      :class="isRecent(listId) && 'delta-flash-overlay'"
      :style="{
        '--list-color': list?.color ?? 'var(--md-primary)',
        'backgroundImage': 'linear-gradient(to bottom, color-mix(in srgb, var(--list-color) 20%, transparent), transparent)',
      }"
    >
      <div class="flex items-start gap-3">
        <NuxtLink
          to="/app/lists"
          class="mt-1 shrink-0 lg:hidden"
          aria-label="Zurück zur Übersicht"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-6"
          />
        </NuxtLink>

        <h1 class="min-w-0 grow text-[2.25rem] leading-9 font-extrabold">
          {{ list?.name ?? 'Liste' }}
        </h1>

        <!-- Teilen setzt ein Konto voraus: Eine Einladung braucht jemanden,
             der sie ausspricht, und einen Server, der sie zustellt. -->
        <UButton
          v-if="isSignedIn"
          icon="i-lucide-users"
          color="neutral"
          variant="ghost"
          class="shrink-0 rounded-full"
          aria-label="Mitglieder verwalten"
          @click="isMembersOpen = true"
        />
        <UDropdownMenu :items="menuItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            class="shrink-0 rounded-full"
            aria-label="Weitere Aktionen"
          />
        </UDropdownMenu>
      </div>

      <div
        v-if="items.length && !isLocked"
        class="flex items-center gap-3.5"
      >
        <span
          class="text-[1rem]"
          style="color: var(--md-on-primary-container)"
        >{{ openItems.length }} offen · {{ doneItems.length }} erledigt</span>
        <UProgress
          :model-value="progress"
          class="max-w-64"
          aria-label="Fortschritt"
        />
      </div>
    </header>

    <!-- Gesperrt: geheime Listen werden im Browser nicht geöffnet -->
    <div
      v-if="isLocked"
      class="flex grow flex-col items-center justify-center gap-3 px-8 text-center"
    >
      <UIcon
        name="i-lucide-lock"
        class="size-10"
        style="color: var(--md-on-surface-variant)"
      />
      <p class="text-[1.25rem] font-bold">
        Diese Liste ist geheim
      </p>
      <p
        class="max-w-md text-[1rem]"
        style="color: var(--md-on-surface-variant); text-wrap: pretty"
      >
        Geheime Listen öffnet bisher nur die Android-App, dort geschützt per
        Fingerabdruck oder Gesichtserkennung. Im Browser bleibt sie zu, solange
        es hier keinen ebenbürtigen Schutz gibt — ein schwächerer wäre
        schlechter als keiner.
      </p>
    </div>

    <!-- Einträge -->
    <div
      v-else
      class="flex min-h-0 grow flex-col gap-0.5 overflow-y-auto px-3 py-2 lg:px-5"
    >
      <template v-if="items.length">
        <!-- Eigene Behälter je Gruppe: Ziehen bleibt darin, denn die
             Zugehörigkeit zu offen oder erledigt entscheidet das Häkchen und
             nicht die Position. -->
        <div
          ref="openList"
          class="flex flex-col gap-0.5"
        >
          <ListItemRow
            v-for="item in openItems"
            :key="item.id"
            :item="item"
            :sortable="isSortMode"
            :just-changed="isRecent(item.id)"
            :changed-by="modifierName(item.modifiedBy)"
            @toggle="toggleItem(item)"
            @remove="onRemoveItem(item)"
          />
        </div>

        <div
          v-if="doneItems.length"
          class="mt-3 mb-1 flex items-center gap-2.5 px-2"
        >
          <span
            class="text-[0.9375rem] font-bold"
            style="color: var(--md-on-surface-variant)"
          >Erledigt</span>
          <span
            class="h-px grow"
            style="background: var(--md-outline-variant)"
          />
        </div>

        <div
          ref="doneList"
          class="flex flex-col gap-0.5"
        >
          <ListItemRow
            v-for="item in doneItems"
            :key="item.id"
            :item="item"
            :sortable="isSortMode"
            :just-changed="isRecent(item.id)"
            :changed-by="modifierName(item.modifiedBy)"
            @toggle="toggleItem(item)"
            @remove="onRemoveItem(item)"
          />
        </div>
      </template>

      <div
        v-else
        class="flex grow flex-col items-center justify-center gap-3 px-8 text-center"
      >
        <UIcon
          name="i-lucide-shopping-basket"
          class="size-10"
          style="color: var(--md-on-surface-variant)"
        />
        <p class="text-[1.25rem] font-bold">
          Noch nichts drauf
        </p>
        <p
          class="text-[1rem]"
          style="color: var(--md-on-surface-variant); text-wrap: pretty"
        >
          Trag unten ein, was du brauchst. Abhaken geht auch ohne Netz.
        </p>
      </div>

      <!-- AI Features am Ende des Inhalts, aufklappbar — wie in Android -->
      <div
        v-if="!isSortMode"
        class="mt-4 flex shrink-0 flex-col gap-2 px-1 pb-2"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl px-4 py-3"
          style="background: var(--md-surface-low)"
          :aria-expanded="isAiSectionOpen"
          @click="isAiSectionOpen = !isAiSectionOpen"
        >
          <span
            class="text-[0.9375rem] font-bold"
            style="color: var(--md-on-surface-variant)"
          >AI Features</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-5 transition-transform duration-300"
            :class="isAiSectionOpen && 'rotate-180'"
            style="color: var(--md-on-surface-variant)"
          />
        </button>

        <template v-if="isAiSectionOpen">
          <template v-if="isSignedIn">
            <button
              type="button"
              class="flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left"
              style="border-color: var(--md-outline-variant); background: var(--md-surface)"
              @click="isAiEditOpen = true"
            >
              <UIcon
                name="i-lucide-wand-sparkles"
                class="size-5 shrink-0"
                style="color: var(--md-primary)"
              />
              <span class="flex min-w-0 flex-col">
                <span class="text-[1rem] font-bold">AI-Bearbeitung</span>
                <span
                  class="text-[0.875rem]"
                  style="color: var(--md-on-surface-variant)"
                >Bearbeite diese Liste mit KI-Unterstützung</span>
              </span>
            </button>

            <button
              v-if="items.length"
              type="button"
              class="flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left"
              style="border-color: var(--md-outline-variant); background: var(--md-surface)"
              @click="isSuggestionsOpen = true"
            >
              <UIcon
                name="i-lucide-sparkles"
                class="size-5 shrink-0"
                style="color: var(--md-primary)"
              />
              <span class="flex min-w-0 flex-col">
                <span class="text-[1rem] font-bold">AI-Vorschläge</span>
                <span
                  class="text-[0.875rem]"
                  style="color: var(--md-on-surface-variant)"
                >Lass dir passende Einträge vorschlagen</span>
              </span>
            </button>
          </template>

          <p
            v-else
            class="rounded-xl border px-4 py-3 text-[0.9375rem]"
            style="border-color: var(--md-outline-variant); color: var(--md-on-surface-variant)"
          >
            Melde dich an, um die AI-Funktionen zu nutzen.
          </p>
        </template>
      </div>
    </div>

    <AppSheet
      v-model:open="isRenameOpen"
      title="Liste umbenennen"
      description="Wie soll sie heissen?"
    >
      <UInput
        v-model="renameValue"
        size="xl"
        autofocus
        :ui="{ root: 'w-full' }"
        @keyup.enter="submitRename"
      />

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            class="font-bold"
            @click="isRenameOpen = false"
          >
            Abbrechen
          </UButton>
          <UButton
            :disabled="renameValue.trim().length === 0"
            class="font-bold"
            @click="submitRename"
          >
            Speichern
          </UButton>
        </div>
      </template>
    </AppSheet>

    <AppSheet
      v-model:open="isDeleteOpen"
      :title="deleteLabel"
      :description="isOwner
        ? 'Die Liste verschwindet auch bei allen, mit denen du sie teilst.'
        : 'Die Liste bleibt für die übrigen Mitglieder bestehen.'"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            class="font-bold"
            @click="isDeleteOpen = false"
          >
            Abbrechen
          </UButton>
          <UButton
            color="error"
            class="font-bold"
            @click="confirmDelete"
          >
            {{ isOwner ? 'Löschen' : 'Verlassen' }}
          </UButton>
        </div>
      </template>
    </AppSheet>

    <ListMembersSheet
      v-model:open="isMembersOpen"
      :list-id="listId"
      :is-owner="isOwner"
    />

    <AiEditListSheet
      v-if="list"
      v-model:open="isAiEditOpen"
      :list-id="list.id"
      :list-name="list.name"
      :items="aiItems"
      @apply="onAiEditApply"
    />

    <AiSuggestionsSheet
      v-if="list"
      v-model:open="isSuggestionsOpen"
      :list-id="list.id"
      :list-name="list.name"
      :cached-suggestions="list.lastSuggestedItems"
      :active-names="activeItemNames"
      @add="onSuggestionsAdd"
      @refreshed="onSuggestionsRefreshed"
    />

    <!-- Sortiermodus: statt der Eingabe der Weg hinaus. Ein Modus ohne
         sichtbares Ende ist eine Falle. -->
    <div
      v-if="isSortMode"
      class="flex shrink-0 items-center justify-between gap-3 border-t px-3 py-3.5 lg:px-5"
      style="border-color: var(--md-outline-variant)"
    >
      <span
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >Zieh die Einträge am Griff in die Reihenfolge, die du im Laden abläufst.</span>
      <UButton
        class="shrink-0 rounded-xl font-bold"
        @click="isSortMode = false"
      >
        Fertig
      </UButton>
    </div>

    <!-- Eingabe -->
    <div
      v-else-if="!isLocked"
      class="flex shrink-0 items-center gap-2.5 border-t px-3 py-3.5 lg:px-5"
      style="border-color: var(--md-outline-variant)"
    >
      <UInput
        v-model="newItemName"
        placeholder="Artikel hinzufügen"
        icon="i-lucide-plus"
        size="xl"
        class="grow"
        :ui="{ root: 'w-full' }"
        @keyup.enter="addItem"
      />
      <!-- Direkter Griff zu den AI-Vorschlägen; braucht Einträge und ein Konto -->
      <UButton
        icon="i-lucide-sparkles"
        color="neutral"
        variant="subtle"
        size="xl"
        class="shrink-0 rounded-xl font-bold"
        aria-label="AI-Vorschläge"
        :disabled="!isSignedIn || items.length === 0"
        @click="isSuggestionsOpen = true"
      />
    </div>
  </div>
</template>

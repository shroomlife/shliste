<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'
import { getMembersForList } from '~/db/repositories'
import type { ListMemberRow } from '~/db/schema'

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

useDragSort(openList, {
  enabled: () => isSortMode.value,
  handle: '.drag-handle',
  onMove: (_from, to) => {
    const item = openItems.value[_from]
    if (item !== undefined) mutate(moveItemTo(openItems.value, item.id, to))
  },
})

useDragSort(doneList, {
  enabled: () => isSortMode.value,
  handle: '.drag-handle',
  onMove: (_from, to) => {
    const item = doneItems.value[_from]
    if (item !== undefined) mutate(moveItemTo(doneItems.value, item.id, to))
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
  toggleItem: setItemChecked,
  addItem: createItem,
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

function addItem(): void {
  const name = newItemName.value.trim()
  if (name.length === 0) return

  // Sofort leeren statt erst nach dem Schreiben: Der nächste Artikel soll ohne
  // Wartezeit tippbar sein, und ein zweites Enter darf nicht denselben Eintrag
  // ein zweites Mal anlegen.
  newItemName.value = ''
  mutate(createItem(name))
}
</script>

<template>
  <div
    class="flex min-w-0 grow flex-col lg:min-h-0"
    style="background: var(--md-surface)"
  >
    <!-- Kopf in der Listenfarbe -->
    <header
      class="list-tint flex shrink-0 flex-col gap-2.5 px-5 py-5 lg:px-7"
      :style="{ '--list-color': list?.color ?? 'var(--md-primary)' }"
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
      class="flex grow flex-col gap-0.5 px-3 py-2 lg:min-h-0 lg:overflow-y-auto lg:px-5"
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
      <UButton
        icon="i-lucide-sparkles"
        color="neutral"
        variant="subtle"
        size="xl"
        class="shrink-0 rounded-xl font-bold"
        aria-label="Vorschläge"
      />
    </div>
  </div>
</template>

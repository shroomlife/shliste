<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'
import { getMembersForList, markListSeen, readItemRow, upsertItem, upsertList } from '~/db/repositories'
import type { HistoryEntryRow, ListMemberRow } from '~/db/schema'
import type { AiEditApplyPayload } from '~/ai/diff'
import { joinSuggestionCache } from '~/ai/suggestions'
import { parseHistorySnapshot } from '~/history/snapshot'
import { SYNC_FIELD_LIMITS } from '~/sync/merge/limits'

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
const haptics = useHaptics()
const toast = useToast()

/** Das Angebot statt der Absage — siehe AiUpsellSheet. */
const isAiUpsellOpen = ref(false)

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
/**
 * Das Blatt „Liste bearbeiten" — Name und Quelle in einem Griff.
 *
 * Die Quelle ist die Seite, aus der die Liste entstanden ist (etwa per
 * „Liste per Link"). Sie stand bisher nur im Datensatz und war nirgends zu
 * sehen oder zu ändern; jetzt steht sie hier und als Pille im Kopf.
 */
const isRenameOpen = ref(false)
const isDeleteOpen = ref(false)
const renameValue = ref('')
const sourceUrlValue = ref('')

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
    label: 'Liste bearbeiten',
    icon: 'i-lucide-pencil',
    onSelect: () => {
      renameValue.value = list.value?.name ?? ''
      sourceUrlValue.value = list.value?.sourceUrl ?? ''
      isRenameOpen.value = true
    },
  },
  // Nicht bei geheimen Listen: Der Verlauf nennt Namen gelöschter Einträge
  // und würde damit genau den Inhalt zeigen, den die Sperre schützt.
  ...(isLocked.value
    ? []
    : [{
        label: 'Verlauf',
        icon: 'i-lucide-history',
        onSelect: () => {
          isHistoryOpen.value = true
        },
      }]),
  {
    label: deleteLabel.value,
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => {
      isDeleteOpen.value = true
    },
  },
]])

/** Die geprüfte Quelle aus dem Feld — mit ergänztem Schema, wie in den AI-Blättern. */
const sourceUrlParsed = computed(() => validHttpUrlOrNull(withHttpsPrefix(sourceUrlValue.value)))

/** Steht etwas im Feld, das keine Adresse ist? Leer ist kein Fehler. */
const sourceUrlError = computed(() =>
  sourceUrlValue.value.trim().length > 0 && sourceUrlParsed.value === null)

const canSubmitRename = computed(() => renameValue.value.trim().length > 0 && !sourceUrlError.value)

async function submitEditListWork(name: string, sourceUrl: string | null): Promise<void> {
  // Zwei getrennte Schreibzüge und keiner zu viel: Jeder stempelt nur sein
  // eigenes Feld neu, damit der Push nicht das jeweils andere überschreibt.
  await renameList(name)
  await setListSourceUrl(sourceUrl)
}

function submitRename(): void {
  const name = renameValue.value.trim()
  if (!canSubmitRename.value) return

  isRenameOpen.value = false
  mutate(submitEditListWork(name, sourceUrlParsed.value))
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
  updateItem,
  removeItem,
  restoreItem,
  moveItemTo,
  renameList,
  setListSourceUrl,
  deleteList,
} = useListDetail()

const newItemName = ref('')

/**
 * Obergrenze der Eingabezeile.
 *
 * Die Adresslänge und nicht die Namenslänge: In dieses eine Feld wird auch
 * ein Link eingefügt. Als benannte Konstante und nicht direkt im Template,
 * weil Importe dem Template-Typecheck (vue-tsc) nur über eine Bindung im
 * Script zur Verfügung stehen.
 */
const ITEM_INPUT_MAXLENGTH = SYNC_FIELD_LIMITS.ITEM_URL

/**
 * Menge für den nächsten Eintrag — die Kachel neben dem Eingabefeld.
 * Nach dem Anlegen fällt sie auf 1 zurück, wie in Androids ListBottomBar.
 */
const newItemQuantity = ref(QUANTITY_MIN)
const isQuantityPickerOpen = ref(false)

// Als computed statt Konstanten-Vergleich im Template: Auto-Importe stehen
// dem Template-Typecheck (vue-tsc) nicht zur Verfügung.
const canDecreaseNewQuantity = computed(() => newItemQuantity.value > QUANTITY_MIN)
const canIncreaseNewQuantity = computed(() => newItemQuantity.value < QUANTITY_MAX)

function setNewItemQuantity(value: number): void {
  newItemQuantity.value = clampQuantity(value)
}

/** Ziffern-Tap: Wert setzen und das Popover schliessen — ein Griff, fertig. */
function pickNewItemQuantity(value: number): void {
  setNewItemQuantity(value)
  isQuantityPickerOpen.value = false
}

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

/**
 * Gesehen-Wasserzeichen. Beim Betreten UND beim Verlassen gesetzt — wie in
 * der Android-App (Detail.kt):
 *
 * Beim Betreten, damit der Hinweis auf der Übersicht sofort verschwindet und
 * nicht erst beim nächsten Abgleich. Beim Verlassen, damit alles, was WÄHREND
 * des Lesens hereingekommen ist, nicht hinterher wieder als ungesehen gilt —
 * man hatte die Liste ja offen vor sich.
 */
async function markSeen(id: string): Promise<void> {
  await markListSeen(id)
  // Die Übersicht zählt gegen das Wasserzeichen. Ohne Neuladen stünde ihr
  // Hinweis noch da, obwohl die Liste längst offen ist.
  await reloadOverview()
}

/**
 * Welche Liste diese Ansicht zuletzt offen hatte. Nicht `listId.value` beim
 * Verlassen lesen: Beim Unmount ist die Route schon gewechselt und der
 * Parameter zeigt ins Leere — markiert würde dann die falsche (oder keine).
 */
let visitedListId: string | null = null

// watch mit immediate statt onMounted: so lädt die Ansicht auch neu, wenn auf
// dem Desktop im Index eine andere Liste gewählt wird, ohne dass die
// Komponente neu erzeugt wird.
watch(listId, (currentId, previousId) => {
  // Der Wechsel im Desktop-Nebeneinander ist ein Verlassen der alten Liste.
  if (previousId !== undefined && previousId !== currentId) {
    run(markSeen(previousId))
  }
  visitedListId = currentId

  run(loadList())
  run(markSeen(currentId))
}, { immediate: true })

onBeforeUnmount(() => {
  if (visitedListId !== null) run(markSeen(visitedListId))
})

// Hat der Abgleich etwas geschrieben, können es Einträge dieser Liste sein.
watch(dataVersion, () => {
  run(loadList())
})

/* ------------------------------------------------------------------ *
 * "N neue Einträge unten" — Fremdergänzungen ohne Auto-Scroll.
 *
 * Vorbild Detail.kt der Android-App: Ergänzt jemand anderes Einträge,
 * während man weiter oben in der Liste steht, springt die Ansicht NICHT.
 * Stattdessen zählt ein tippbarer Hinweis am unteren Rand. Nur der eigene
 * Neuzugang rollt sanft ins Bild — den hat man schliesslich selbst getippt.
 * ------------------------------------------------------------------ */

const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer')
const openEndSentinel = useTemplateRef<HTMLElement>('openEndSentinel')

const pendingRemoteAdditions = ref(0)
/**
 * "Unten" heisst: das ENDE DER OFFENEN GRUPPE ist im Bild — denn genau dort
 * landet ein fremd ergänzter (unabgehakter) Eintrag. Das absolute Seitenende
 * läge hinter Erledigt-Block und AI-Griffen und damit weit am Landeplatz
 * vorbei; wer dort steht, sähe den Neuzugang gerade NICHT.
 */
const isAtBottom = ref(true)

const remoteAdditionsLabel = computed(() =>
  pendingRemoteAdditions.value === 1
    ? '1 neuer Eintrag unten'
    : `${pendingRemoteAdditions.value} neue Einträge unten`,
)

/** Ids des letzten verarbeiteten Stands — `null` heisst "noch kein Stand". */
let knownItemIds: Set<string> | null = null

/** Ein Undo setzt den Eintrag an seine alte Stelle zurück — kein Neuzugang. */
let suppressNextAdditionCheck = false

/**
 * Fremd hinzugefügt oder selbst?
 *
 * `modifiedBy` ist das belastbarere Signal: lokal angelegte Einträge tragen
 * entweder noch gar keinen Wert (optimistisches Anlegen) oder die eigene
 * User-UUID. `isRecent` kommt zusätzlich dazu, deckt aber nur den SSE-Pfad ab
 * und kann einen Wimpernschlag hinter dem Datenstand liegen — dieselbe
 * Kombination wie `isRemoteAddition` in Detail.kt.
 */
function isRemoteAddition(item: ListItem): boolean {
  const ownUserId = profile.value?.userId ?? null
  const byOther = item.modifiedBy !== null && ownUserId !== null && item.modifiedBy !== ownUserId
  return byOther || isRecent.value(item.id)
}

watch(items, (currentItems) => {
  // Der Leer-Zwischenstand beim Listenwechsel ist kein Stand: `load()` leert
  // erst und füllt dann — ohne diese Sperre gälte anschliessend die komplette
  // Liste als Neuzugang.
  if (list.value === null || list.value.id !== listId.value) {
    knownItemIds = null
    pendingRemoteAdditions.value = 0
    return
  }

  const currentIds = new Set(currentItems.map(item => item.id))
  const previousIds = knownItemIds
  knownItemIds = currentIds

  // Erster vollständiger Stand dieser Liste: nur merken.
  if (previousIds === null) return

  if (suppressNextAdditionCheck) {
    suppressNextAdditionCheck = false
    return
  }

  const added = currentItems.filter(item => !previousIds.has(item.id))
  if (added.length === 0) return

  const remoteCount = added.filter(item => isRemoteAddition(item)).length
  if (remoteCount === 0) return

  // Wer unten steht, sieht den Zuwachs ohnehin — kein Hinweis nötig.
  if (!isAtBottom.value) pendingRemoteAdditions.value += remoteCount
})

/**
 * Meldet, ob das Sentinel am Ende der offenen Gruppe sichtbar ist. `root` ist
 * der Scroll-Container selbst: Die Frage lautet "sieht der Nutzer den
 * Landeplatz in DIESEM Container", nicht "ist er irgendwo im Viewport".
 */
let bottomObserver: IntersectionObserver | null = null

watch([scrollContainer, openEndSentinel], ([container, sentinel]) => {
  bottomObserver?.disconnect()
  bottomObserver = null

  if (container === null || sentinel === null) return

  bottomObserver = new IntersectionObserver(([entry]) => {
    const atBottom = entry?.isIntersecting ?? false
    isAtBottom.value = atBottom
    // Unten angekommen heisst: gesehen. Der Hinweis verschwindet von selbst.
    if (atBottom) pendingRemoteAdditions.value = 0
  }, { root: container })

  bottomObserver.observe(sentinel)
})

onBeforeUnmount(() => {
  bottomObserver?.disconnect()
  bottomObserver = null
})

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Der Griff hinter dem Hinweis: zum Landeplatz springen und den Zähler leeren.
 *
 * Ziel ist die LETZTE OFFENE Zeile — nicht `scrollHeight`: Das absolute Ende
 * liegt hinter Erledigt-Block und AI-Griffen, der Sprung dorthin schösse am
 * fremden Neuzugang vorbei.
 */
function jumpToListEnd(): void {
  pendingRemoteAdditions.value = 0

  const lastOpenRow = openList.value?.lastElementChild
  if (lastOpenRow instanceof HTMLElement) {
    lastOpenRow.scrollIntoView({
      block: 'end',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
    return
  }

  const container = scrollContainer.value
  if (container === null) return
  container.scrollTo({
    top: container.scrollHeight,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

/** Rollt die Zeile eines eigenen Neuzugangs ins Bild, sobald sie im DOM ist. */
async function scrollToItem(itemId: string): Promise<void> {
  await nextTick()
  const rowElement = scrollContainer.value?.querySelector(`[data-item-id="${itemId}"]`)
  rowElement?.scrollIntoView({
    block: 'nearest',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

function toggleItem(item: ListItem): void {
  // Haptik SYNCHRON im Click-Handler, vor jedem await — ein Summen, das der
  // Handbewegung hinterherläuft, fühlt sich kaputter an als gar keines.
  if (item.checked) haptics.toggleOff()
  else haptics.confirm()

  mutate(setItemChecked(item))
}

/* ------------------------------------------------------------------ *
 * Eintrag bearbeiten — Stift oder Long-Press auf der Zeile öffnen das
 * Blatt, gespeichert wird über `updateItem` im Composable.
 * ------------------------------------------------------------------ */

const isEditItemOpen = ref(false)

/** Der Eintrag, den das Bearbeiten-Blatt gerade zeigt. */
const editingItem = ref<ListItem | null>(null)

function onEditItem(item: ListItem): void {
  editingItem.value = item
  isEditItemOpen.value = true
}

function onEditItemSave(changes: { name: string, quantity: number, url: string | null }): void {
  const target = editingItem.value
  if (target === null) return
  // Das Blatt liefert seinen ganzen Stand; was davon wirklich anders ist,
  // entscheidet `updateItem` am frisch nachgeschlagenen Eintrag.
  mutate(updateItem(target, changes))
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
    title: `${listItemDisplayName(item)} entfernt`,
    icon: 'i-lucide-trash-2',
    duration: 6000,
    actions: [{
      label: 'Rückgängig',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        // Das Undo setzt den Eintrag an seine alte Stelle zurück — dorthin zu
        // springen oder ihn als Neuzugang zu zählen wäre falsch.
        suppressNextAdditionCheck = true
        mutate(restoreItem(item))
      },
    }],
  })
}

/* ------------------------------------------------------------------ *
 * Verlauf — Gelöschtes ansehen und wiederherstellen, wie Androids
 * HistorySheet in Detail.kt.
 * ------------------------------------------------------------------ */

const isHistoryOpen = ref(false)

function onHistoryRestore(entry: HistoryEntryRow): void {
  // Zu wie in Android: Nach dem Griff zum Wiederherstellen zeigt die Liste
  // selbst das Ergebnis — das Blatt hat seinen Dienst getan.
  isHistoryOpen.value = false
  mutate(restoreFromHistory(entry))
}

/**
 * Stellt einen Eintrag aus dem Verlauf wieder her.
 *
 * ZWEI WEGE, EIN VORRANG: Existiert die Original-Zeile noch (rausgeworfen
 * per `removed` oder mit Grabstein), wird SIE reaktiviert — mit ihrer Id,
 * ihrer Position und ihrer Historie, derselbe Weg wie das Rückgängig im
 * Toast. Erst wenn sie wirklich weg ist, entsteht aus dem Snapshot eine neue
 * Zeile mit NEUER Id am Listenende. Der Snapshot kann dabei von Android
 * stammen (`uuid`/`order`) — deshalb läuft er durch `parseHistorySnapshot`.
 */
async function restoreFromHistory(entry: HistoryEntryRow): Promise<void> {
  if (entry.entityType !== 'list_item') return

  const existing = await readItemRow(entry.entityId)
  if (existing !== undefined && existing.listId === listId.value) {
    // Die Rückkehr an die alte Stelle ist kein Neuzugang — nicht zählen.
    suppressNextAdditionCheck = true
    await upsertItem({ ...toItemDraft(existing), removed: false, deletedAt: null })
    await reloadDetail()
    toast.add({ title: `${listItemDisplayName(existing)} wiederhergestellt`, icon: 'i-lucide-undo-2' })
    return
  }

  const snapshot = parseHistorySnapshot(entry.entityType, entry.snapshotJson)
  if (snapshot === null || snapshot.entityType !== 'list_item') {
    toast.add({
      title: 'Wiederherstellen nicht möglich',
      description: 'Der gespeicherte Eintrag lässt sich nicht mehr lesen.',
      icon: 'i-lucide-triangle-alert',
      color: 'error',
    })
    return
  }

  // Der Link gehört zum Eintrag und kommt mit zurück. Titel und Vorschaubild
  // nicht: Sie stehen nicht im Snapshot, weil der Server sie nach dem
  // nächsten Push von selbst wieder holt.
  const row = await createItem(snapshot.name, snapshot.quantity, snapshot.url)
  if (row !== null) {
    toast.add({ title: `${listItemDisplayName(row)} wiederhergestellt`, icon: 'i-lucide-undo-2' })
  }
}

/**
 * Legt an, was in der Eingabezeile steht.
 *
 * SIEHT DIE EINGABE WIE EINE ADRESSE AUS, wird daraus ein Link-Eintrag ohne
 * Namen: Die Zeile zeigt dann den Seitentitel, den der Server nachträgt, und
 * bis dahin den Host. Ein Eintrag namens „https://www.chefkoch.de/rezepte/…"
 * wäre auf einem Einkaufszettel unbrauchbar. Die Regel dahinter ist bewusst
 * eng und in `link-fixtures.json` für alle drei Plattformen festgenagelt.
 */
function addItem(): void {
  const raw = newItemName.value.trim()
  if (raw.length === 0) return

  const quantity = newItemQuantity.value
  const detected = detectLinkInput(raw)

  // Sofort leeren statt erst nach dem Schreiben: Der nächste Artikel soll ohne
  // Wartezeit tippbar sein, und ein zweites Enter darf nicht denselben Eintrag
  // ein zweites Mal anlegen. Die Menge fällt dabei auf 1 zurück — sie galt
  // für DIESEN Eintrag, nicht für alle folgenden (ListBottomBar.kt).
  newItemName.value = ''
  newItemQuantity.value = QUANTITY_MIN
  mutate(createItem(detected === null ? raw : '', quantity, detected?.url ?? null).then(async (row) => {
    // Nur der EIGENE Neuzugang rollt ins Bild — fremde bekommen den
    // Hinweis-Chip. Wer oben abhakt, während jemand anderes unten ergänzt,
    // soll die Ansicht nicht verlieren (Detail.kt macht es genauso).
    if (row !== null) await scrollToItem(row.id)
    return row
  }))
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
  items.value.map(item => ({
    id: item.id,
    // Der ANZEIGENAME und nicht `name`: Ein Link-Eintrag heisst lokal "", und
    // die AI bekäme sonst eine namenlose Position vorgesetzt. Nebeneffekt und
    // Absicht zugleich: Schlägt sie genau den Anzeigenamen vor, zählt das im
    // Diff als unverändert.
    name: listItemDisplayName(item),
    quantity: item.quantity,
    checked: item.checked,
  })),
)

const activeItemNames = computed(() => items.value.map(item => listItemDisplayName(item)))

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

        <h1 class="title-page min-w-0 grow font-extrabold">
          {{ list?.name ?? 'Liste' }}
        </h1>

        <!-- Teilen setzt ein Konto voraus: Eine Einladung braucht jemanden,
             der sie ausspricht, und einen Server, der sie zustellt.

             Geheime Listen bleiben auf den eigenen Geräten — der Server lehnt
             ihr Teilen ohnehin ab (400 secret_list). Wie in Android wird der
             Einstieg deshalb gar nicht erst angeboten. -->
        <UButton
          v-if="isSignedIn && !isLocked"
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

      <!-- Die Quelle der Liste: eine Pille, die aus der App herausführt.
           Bei einer gesperrten Liste nicht — die Adresse verriete, worum es
           geht, und genau das schützt die Sperre. -->
      <a
        v-if="list?.sourceUrl && !isLocked"
        :href="list.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.9375rem] font-bold"
        style="background: var(--md-secondary); color: var(--md-on-secondary)"
      >
        <UIcon
          name="i-lucide-external-link"
          class="size-4 shrink-0"
        />
        Zur Website
      </a>

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
        es hier keinen ebenbürtigen Schutz gibt. Ein schwächerer wäre
        schlechter als keiner.
      </p>
    </div>

    <!-- Einträge -->
    <div
      v-else
      ref="scrollContainer"
      class="flex min-h-0 grow flex-col gap-0.5 overflow-y-auto px-3 py-2 lg:px-5"
    >
      <template v-if="items.length">
        <!-- Eigene Behälter je Gruppe: Ziehen bleibt darin, denn die
             Zugehörigkeit zu offen oder erledigt entscheidet das Häkchen und
             nicht die Position. -->
        <div
          ref="openList"
          class="flex flex-col gap-2"
        >
          <ListItemRow
            v-for="item in openItems"
            :key="item.id"
            :data-item-id="item.id"
            :item="item"
            :sortable="isSortMode"
            :just-changed="isRecent(item.id)"
            :changed-by="modifierName(item.modifiedBy)"
            @toggle="toggleItem(item)"
            @remove="onRemoveItem(item)"
            @edit="onEditItem(item)"
          />
        </div>

        <!-- Sentinel am Ende der OFFENEN Gruppe: sichtbar heisst "der Nutzer
             sieht den Landeplatz fremder Neuzugänge". Der IntersectionObserver
             darauf steuert Hinweis-Chip und Auto-Reset. -->
        <div
          ref="openEndSentinel"
          class="h-px shrink-0"
          aria-hidden="true"
        />

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
          class="flex flex-col gap-2"
        >
          <ListItemRow
            v-for="item in doneItems"
            :key="item.id"
            :data-item-id="item.id"
            :item="item"
            :sortable="isSortMode"
            :just-changed="isRecent(item.id)"
            :changed-by="modifierName(item.modifiedBy)"
            @toggle="toggleItem(item)"
            @remove="onRemoveItem(item)"
            @edit="onEditItem(item)"
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

          <button
            v-else
            type="button"
            class="state-layer flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left"
            style="border-color: var(--md-outline-variant)"
            @click="isAiUpsellOpen = true"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-5 shrink-0"
              style="color: var(--md-primary)"
            />
            <span class="flex min-w-0 flex-col">
              <span class="text-[1.125rem] font-bold">AI-Funktionen entdecken</span>
              <span
                class="text-[0.9375rem]"
                style="color: var(--md-on-surface-variant)"
              >Was ein Konto freischaltet</span>
            </span>
          </button>
        </template>
      </div>

      <!-- "N neue Einträge unten": klebt am unteren Rand des Scroll-Bereichs,
           also direkt über der Eingabeleiste. Die Live-Region ist der immer
           vorhandene Rahmen — nur so wird der eingefügte Hinweis auch
           angesagt, statt stumm zu erscheinen. -->
      <div
        role="status"
        class="pointer-events-none sticky bottom-0 z-10 flex justify-center"
      >
        <button
          v-if="pendingRemoteAdditions > 0"
          type="button"
          class="pointer-events-auto mb-2 flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.9375rem] font-bold shadow-md"
          style="background: var(--md-primary-container); color: var(--md-on-primary-container)"
          :aria-label="`${remoteAdditionsLabel}. Zum Ende der Liste springen.`"
          @click="jumpToListEnd"
        >
          {{ remoteAdditionsLabel }}
          <UIcon
            name="i-lucide-chevron-down"
            class="size-4"
          />
        </button>
      </div>
    </div>

    <AppSheet
      v-model:open="isRenameOpen"
      title="Liste bearbeiten"
      description="Name und Quelle anpassen"
    >
      <div class="flex flex-col gap-5">
        <UInput
          v-model="renameValue"
          size="xl"
          autofocus
          enterkeyhint="next"
          aria-label="Name der Liste"
          placeholder="Name der Liste"
          :ui="{ root: 'w-full' }"
          @keyup.enter="submitRename"
        />

        <div class="flex flex-col gap-1.5">
          <UInput
            v-model="sourceUrlValue"
            type="url"
            size="xl"
            icon="i-lucide-link"
            inputmode="url"
            enterkeyhint="done"
            placeholder="Quelle (optional)"
            aria-label="Quelle der Liste"
            :aria-invalid="sourceUrlError"
            :aria-describedby="sourceUrlError ? 'list-source-error' : undefined"
            :ui="{ root: 'w-full' }"
            @keyup.enter="submitRename"
          />
          <!-- Am Feld verankert: Ein roter Text daneben ist für einen
               Screenreader sonst nur ein Absatz irgendwo im Blatt. -->
          <span
            v-if="sourceUrlError"
            id="list-source-error"
            class="text-[0.875rem] font-bold"
            style="color: var(--md-delete-content)"
          >Das sieht nicht nach einer gültigen Adresse aus.</span>
        </div>
      </div>

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
            :disabled="!canSubmitRename"
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
      v-if="!isLocked"
      v-model:open="isMembersOpen"
      :list-id="listId"
      :is-owner="isOwner"
    />

    <ListItemEditSheet
      v-model:open="isEditItemOpen"
      :item="editingItem"
      @save="onEditItemSave"
    />

    <!-- Fremde Einträge geteilter Listen zeigen den Mitgliedsnamen — dieselbe
         Auflösung wie "bearbeitet von" an den Zeilen. -->
    <AiUpsellSheet v-model:open="isAiUpsellOpen" />

    <HistorySheet
      v-if="!isLocked"
      v-model:open="isHistoryOpen"
      :parent-id="listId"
      :resolve-creator-name="modifierName"
      @restore="onHistoryRestore"
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
      <!-- Feld, Mengenkachel und AI-Knopf sind gleich hoch, ohne dass hier
           eine Höhe steht: `xl` ist app-weit auf `--size-control-xl` gesetzt
           (app.config.ts), und die Kachel unten greift dasselbe Token ab. -->
      <!-- `maxlength` auf die Adresslänge und nicht auf die Namenslänge: In
           dieses Feld wird auch ein Link eingefügt, und der darf 2000 Zeichen
           haben. Die Namenslänge deckelt ohnehin der Sanitizer vor dem Push. -->
      <UInput
        v-model="newItemName"
        placeholder="Artikel hinzufügen"
        icon="i-lucide-plus"
        size="xl"
        class="grow"
        enterkeyhint="done"
        :maxlength="ITEM_INPUT_MAXLENGTH"
        :ui="{ root: 'w-full' }"
        @keyup.enter="addItem"
      />

      <!-- Mengenkachel für den nächsten Eintrag — dieselbe Optik wie die
           Kachel in der Zeile. Der Tap öffnet die Mengensteuerung als
           kleines Popover über der Leiste; ein Ziffern-Tap wählt und
           schliesst in einem Griff. -->
      <UPopover
        v-model:open="isQuantityPickerOpen"
        :content="{ side: 'top', align: 'end', sideOffset: 8 }"
      >
        <button
          type="button"
          class="optical-center flex size-[var(--md-control-xl)] shrink-0 items-center justify-center rounded-sm px-1 text-[1.25rem] font-bold"
          style="background: var(--md-secondary); color: var(--md-on-secondary)"
          :aria-label="`Menge für den neuen Eintrag: ${newItemQuantity}. Ändern`"
        >
          {{ newItemQuantity }}&times;
        </button>

        <template #content>
          <div class="flex w-fit flex-col gap-2.5 p-3">
            <div class="flex items-center justify-between gap-3">
              <button
                type="button"
                class="flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40"
                style="background: var(--md-surface-high)"
                :disabled="!canDecreaseNewQuantity"
                aria-label="Menge verringern"
                @click="setNewItemQuantity(newItemQuantity - 1)"
              >
                <UIcon
                  name="i-lucide-minus"
                  class="size-5"
                />
              </button>

              <span
                class="min-w-16 text-center text-[1.375rem] font-bold"
                style="color: var(--md-primary)"
                aria-live="polite"
              >{{ newItemQuantity }}&times;</span>

              <button
                type="button"
                class="flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40"
                style="background: var(--md-surface-high)"
                :disabled="!canIncreaseNewQuantity"
                aria-label="Menge erhöhen"
                @click="setNewItemQuantity(newItemQuantity + 1)"
              >
                <UIcon
                  name="i-lucide-plus"
                  class="size-5"
                />
              </button>
            </div>

            <!-- Als Zahlenfeld 3x3 statt einer Reihe aus neun: Quadratische
                 Felder in einer Reihe sind zusammen 24.5rem breit und werden
                 auf einem Handy schlicht abgeschnitten. Ein Ziffernblock ist
                 ausserdem die vertrautere Form. -->
            <div class="grid grid-cols-3 justify-items-center gap-2">
              <button
                v-for="digit in 9"
                :key="digit"
                type="button"
                class="optical-center flex size-10 shrink-0 items-center justify-center rounded-sm text-[1.0625rem] font-bold transition-colors"
                :style="digit === newItemQuantity
                  ? 'background: var(--md-secondary); color: var(--md-on-secondary)'
                  : 'background: var(--md-surface-low); color: var(--md-on-surface-variant)'"
                :aria-label="`Menge ${digit}`"
                :aria-pressed="digit === newItemQuantity"
                @click="pickNewItemQuantity(digit)"
              >
                {{ digit }}
              </button>
            </div>
          </div>
        </template>
      </UPopover>

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

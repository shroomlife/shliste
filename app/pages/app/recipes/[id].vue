<script setup lang="ts">
import type { IsoUtc, RecipeIngredient, RecipeStep } from '#shared/types/domain'
import { toSyncImagePath } from '~/ai/images'
import { attachRecipeImageById } from '~/ai/persist'
import { buildChatRecipePayload, buildRecipeImageText } from '~/ai/recipeContract'
import type { AiRecipeEditApplyPayload } from '~/ai/recipeDiff'
import { readIngredientRow, readStepRow } from '~/db/repositories'
import type { HistoryEntryRow } from '~/db/schema'
import { parseHistorySnapshot } from '~/history/snapshot'

/**
 * Detailansicht eines Rezepts.
 *
 * Aufbau wie die Listendetailansicht: farbiger Kopf in der Rezeptfarbe, dann
 * der Inhalt, unten die Eingabe. Zwei Abschnitte statt einem, weil ein Rezept
 * aus zwei Dingen besteht — was man einkauft und was man tut.
 *
 * Die Schritte sind abhakbar. Das ist kein Zierat: Beim Kochen mit dem Handy
 * neben dem Herd ist "wo war ich?" die häufigste Frage, und das Häkchen
 * synchronisiert sich mit allen Geräten wie jedes andere Feld.
 *
 * Kein definePageMeta: Das Layout kommt von der Elternroute /app/recipes.
 */
const route = useRoute()
const recipeId = computed(() => String(route.params.id))

const {
  recipe,
  ingredients,
  steps,
  progress,
  load,
  addIngredient,
  addStep,
  toggleStep,
  removeIngredient,
  removeStep,
  restoreIngredient,
  restoreStep,
  lastAwardedBadge,
  celebrateTick,
  moveIngredientTo,
  moveStepTo,
  updateIngredient,
  updateStepDescription,
  setStepExplanation,
  renameRecipe,
  deleteRecipe,
} = useRecipeDetail()

const { reload: reloadOverview } = useRecipes()
const { dataVersion, scheduleSync } = useSync()
const { isSignedIn } = useAuth()
const haptics = useHaptics()
const toast = useToast()

/**
 * Serverbild des Rezepts. Nur `sync:`-Referenzen sind für die PWA auflösbar;
 * lokale Android-Pfade ergeben null — dann wird gar keine Bildfläche gerendert
 * und der Kopf behält seine heutige Höhe (kein Layout-Shift).
 */
const recipeImageUrl = computed(() => resolveRecipeImageUrl(recipe.value?.imagePath ?? null))

/** Ladefehler blenden die Fläche aus — ein Broken-Image-Icon hilft niemandem. */
const isImageBroken = ref(false)
watch(recipeImageUrl, () => {
  isImageBroken.value = false
})

const newIngredient = ref('')
const newStep = ref('')

/**
 * Sortiermodus, wie im Listenbereich und wie in der Android-App: Ziehen gibt
 * es nur hier drin, damit beim Kochen ein Tippen abhakt und nichts verrutscht.
 */
const isSortMode = ref(false)
const ingredientList = useTemplateRef<HTMLElement>('ingredientList')
const stepList = useTemplateRef<HTMLElement>('stepList')

useDragSort(ingredientList, {
  enabled: () => isSortMode.value,
  handle: '.drag-handle',
  onMove: (from, to) => {
    const row = ingredients.value[from]
    if (row !== undefined) mutate(moveIngredientTo(to, row.id))
  },
})

useDragSort(stepList, {
  enabled: () => isSortMode.value,
  handle: '.drag-handle',
  onMove: (from, to) => {
    const row = steps.value[from]
    if (row !== undefined) mutate(moveStepTo(to, row.id))
  },
})

const isRenameOpen = ref(false)
const isDeleteOpen = ref(false)
const renameValue = ref('')

// Dieselben Aktionen wie bei einer Liste, an derselben Stelle: Was gleich
// funktioniert, soll auch gleich zu finden sein.
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
      renameValue.value = recipe.value?.name ?? ''
      isRenameOpen.value = true
    },
  },
  {
    label: 'Neues Bild',
    icon: 'i-lucide-image',
    onSelect: () => {
      startImageGeneration()
    },
  },
  {
    label: 'Verlauf',
    icon: 'i-lucide-history',
    onSelect: () => {
      isHistoryOpen.value = true
    },
  },
  {
    label: 'Rezept löschen',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => {
      isDeleteOpen.value = true
    },
  },
]])

useHead({ title: () => `${recipe.value?.name ?? 'Rezept'} ~ shliste` })

/** Siehe Listendetail: die Ereignisbehandler sind synchron, die Zugriffe nicht. */
function run(work: Promise<unknown>): void {
  void work.catch((error: unknown) => {
    console.error('[Rezeptdetail] Zugriff auf die lokale Datenbank fehlgeschlagen:', error)
  })
}

/** Wie `run`, aber danach werden Übersicht und Abgleich benachrichtigt. */
function mutate(work: Promise<unknown>): void {
  run(work.then(async () => {
    await reloadOverview()
    scheduleSync()
  }))
}

watch(recipeId, () => {
  run(load(recipeId.value))
}, { immediate: true })

watch(dataVersion, () => {
  run(load(recipeId.value))
})

function submitIngredient(): void {
  const name = newIngredient.value.trim()
  if (name.length === 0) return

  newIngredient.value = ''
  mutate(addIngredient(name))
}

function submitStep(): void {
  const description = newStep.value.trim()
  if (description.length === 0) return

  newStep.value = ''
  mutate(addStep(description))
}

function onToggleStep(step: RecipeStep): void {
  // Haptik SYNCHRON im Click-Handler, vor jedem await — ein Summen, das der
  // Handbewegung hinterherläuft, fühlt sich kaputter an als gar keines.
  if (!step.isChecked) haptics.confirm()

  mutate(toggleStep(step))
}

/**
 * Löscht eine Zutat — mit Rückgängig, wie bei den Listeneinträgen und wie in
 * der Android-App (recipes/Detail.kt): Der Grabstein ist ein Feld-Update,
 * das Zurücknehmen setzt ihn wieder auf null. Sechs Sekunden — kürzer wäre
 * für den Griff zum Rückgängig knapp, länger stünde der Hinweis noch da,
 * wenn man längst weiter ist.
 */
function onRemoveIngredient(ingredient: RecipeIngredient): void {
  mutate(removeIngredient(ingredient))

  toast.add({
    title: `${ingredient.name} gelöscht`,
    icon: 'i-lucide-trash-2',
    duration: 6000,
    actions: [{
      label: 'Rückgängig',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        mutate(restoreIngredient(ingredient))
      },
    }],
  })
}

/** Löscht einen Schritt — der Löschweg im Sortiermodus, mit Rückgängig. */
function onRemoveStep(step: RecipeStep): void {
  mutate(removeStep(step))

  toast.add({
    title: 'Schritt gelöscht',
    icon: 'i-lucide-trash-2',
    duration: 6000,
    actions: [{
      label: 'Rückgängig',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        mutate(restoreStep(step))
      },
    }],
  })
}

/* ------------------------------------------------------------------ *
 * Verlauf — Gelöschtes ansehen und wiederherstellen, wie Androids
 * HistorySheet in recipes/Detail.kt. Rezepte werden nicht geteilt,
 * deshalb ohne Namenszeile.
 * ------------------------------------------------------------------ */

const isHistoryOpen = ref(false)

function onHistoryRestore(entry: HistoryEntryRow): void {
  isHistoryOpen.value = false
  mutate(restoreFromHistory(entry))
}

function historyRestoreFailed(): void {
  toast.add({
    title: 'Wiederherstellen nicht möglich',
    description: 'Der gespeicherte Eintrag lässt sich nicht mehr lesen.',
    icon: 'i-lucide-triangle-alert',
    color: 'error',
  })
}

/**
 * Stellt eine Zutat oder einen Schritt aus dem Verlauf wieder her.
 *
 * ZWEI WEGE, EIN VORRANG: Existiert die Original-Zeile noch (Grabstein),
 * wird SIE reaktiviert — über `restoreIngredient`/`restoreStep`, denselben
 * Weg wie das Rückgängig im Toast. Erst wenn sie wirklich weg ist, entsteht
 * aus dem Snapshot eine neue Zeile mit NEUER Id am Ende. Der Snapshot kann
 * von Android stammen (`uuid`/`order`) — deshalb `parseHistorySnapshot`.
 */
async function restoreFromHistory(entry: HistoryEntryRow): Promise<void> {
  if (entry.entityType === 'recipe_ingredient') {
    const existing = await readIngredientRow(entry.entityId)
    if (existing !== undefined && existing.recipeId === recipeId.value) {
      await restoreIngredient(existing)
      toast.add({ title: `${existing.name} wiederhergestellt`, icon: 'i-lucide-undo-2' })
      return
    }

    const snapshot = parseHistorySnapshot(entry.entityType, entry.snapshotJson)
    if (snapshot === null || snapshot.entityType !== 'recipe_ingredient') {
      historyRestoreFailed()
      return
    }

    const row = await addIngredient(snapshot.name, snapshot.quantity)
    if (row !== null) {
      toast.add({ title: `${row.name} wiederhergestellt`, icon: 'i-lucide-undo-2' })
    }
    return
  }

  if (entry.entityType === 'recipe_step') {
    const existing = await readStepRow(entry.entityId)
    if (existing !== undefined && existing.recipeId === recipeId.value) {
      await restoreStep(existing)
      toast.add({ title: 'Schritt wiederhergestellt', icon: 'i-lucide-undo-2' })
      return
    }

    const snapshot = parseHistorySnapshot(entry.entityType, entry.snapshotJson)
    if (snapshot === null || snapshot.entityType !== 'recipe_step') {
      historyRestoreFailed()
      return
    }

    const row = await addStep(snapshot.description)
    if (row !== null) {
      toast.add({ title: 'Schritt wiederhergestellt', icon: 'i-lucide-undo-2' })
    }
  }
}

/* ------------------------------------------------------------------ *
 * Badge-Zeremonie — `awardBadgeIfFirstTime` meldet die frische Auszeichnung
 * über `lastAwardedBadge`, diese Seite zeigt dazu das Sheet. Beim Schliessen
 * geht das Signal zurück auf null, sonst stünde die Zeremonie beim nächsten
 * Öffnen des Rezepts wieder da. Die Wiederholungs-Feier (`celebrateTick`)
 * läuft direkt in die Komponente durch.
 * ------------------------------------------------------------------ */

const isBadgeSheetOpen = ref(false)

/**
 * Anzeige-Kopie der Zeremonie: Beim Schliessen wird der geteilte Zustand
 * sofort genullt (sonst stünde das Blatt beim nächsten Öffnen des Rezepts
 * wieder da) — die Kopie hier bleibt stehen, damit der Inhalt während der
 * Schliess-Animation nicht vor den Augen verschwindet.
 */
const badgeForSheet = ref<{ recipeName: string, earnedAt: IsoUtc } | null>(null)

watch(lastAwardedBadge, (badge) => {
  if (badge !== null) {
    badgeForSheet.value = badge
    isBadgeSheetOpen.value = true
  }
})

watch(isBadgeSheetOpen, (openNow) => {
  if (!openNow) lastAwardedBadge.value = null
})

function submitRename(): void {
  const name = renameValue.value.trim()
  if (name.length === 0) return

  isRenameOpen.value = false
  mutate(renameRecipe(name))
}

async function confirmDelete(): Promise<void> {
  isDeleteOpen.value = false
  await deleteRecipe()
  await reloadOverview()
  scheduleSync()
  await navigateTo('/app/recipes')
}

/* ------------------------------------------------------------------ *
 * AI Features — Chat, Bearbeitung, Schritt-Erklärung, Bild.
 * ------------------------------------------------------------------ */

/** Aufklapp-Zustand der Sektion am Rezeptende; startet zu wie in Android. */
const isAiSectionOpen = ref(false)
const isAiChatOpen = ref(false)
const isAiEditOpen = ref(false)
const isImageGenOpen = ref(false)

/**
 * Die Zeilen in der Form, die Diff und Anfrage brauchen. Die Reihenfolge ist
 * die Anzeige-Reihenfolge — aus ihr entsteht der `idx`, über den die
 * AI-Antwort den Zeilen wieder zugeordnet wird.
 */
const aiIngredients = computed(() =>
  ingredients.value.map(row => ({ id: row.id, name: row.name, quantity: row.quantity })),
)

const aiSteps = computed(() =>
  steps.value.map(row => ({ id: row.id, description: row.description })),
)

/** Das Rezept für Chat und Erklärung — Mengen ganzzahlig, sonst 422. */
const chatRecipe = computed(() =>
  buildChatRecipePayload(recipe.value?.name ?? 'Rezept', ingredients.value, steps.value),
)

/** Der Bild-Prompt im Android-Format (AiJobRepository.kt). */
const recipeImageText = computed(() =>
  buildRecipeImageText(recipe.value?.name ?? 'Rezept', ingredients.value, steps.value),
)

/**
 * Der erste offene Schritt — die Cockpit-Ansicht hebt ihn am Desktop leicht
 * hervor, damit beim Kochen sofort klar ist, wo es weitergeht.
 */
const currentStepId = computed(() => steps.value.find(step => !step.isChecked)?.id ?? null)

/**
 * Wendet die angehakten Änderungen der Diff-Vorschau an — ausschliesslich
 * über die bestehenden Schreibwege von useRecipeDetail. Eine Zeile, die der
 * Sync zwischenzeitlich entfernt hat, wird still übersprungen.
 */
async function applyAiEditWork(payload: AiRecipeEditApplyPayload): Promise<void> {
  for (const entry of payload.ingredientEntries) {
    if (entry.kind === 'unchanged') continue

    if (entry.kind === 'added') {
      await addIngredient(entry.name, entry.quantity)
      continue
    }

    const row = ingredients.value.find(item => item.id === entry.itemId)
    if (row === undefined) continue

    if (entry.kind === 'removed') {
      await removeIngredient(row)
    }
    else if (entry.kind === 'modified') {
      await updateIngredient(row, { quantity: entry.newQuantity })
    }
    else {
      // renamed
      await updateIngredient(row, { name: entry.newName, quantity: entry.newQuantity })
    }
  }

  for (const entry of payload.stepEntries) {
    // Schritte kennen weder Menge noch Häkchen im Diff — nur neu,
    // entfernt und umformuliert (`renamed`, mit description als Name).
    if (entry.kind === 'added') {
      await addStep(entry.name)
      continue
    }
    if (entry.kind !== 'removed' && entry.kind !== 'renamed') continue

    const row = steps.value.find(item => item.id === entry.itemId)
    if (row === undefined) continue

    if (entry.kind === 'removed') {
      await removeStep(row)
    }
    else {
      await updateStepDescription(row, entry.newName)
    }
  }

  const target = recipe.value
  const newName = payload.name.trim()
  if (target !== null && newName.length > 0 && newName !== target.name) {
    await renameRecipe(newName)
  }
}

function onAiEditApply(payload: AiRecipeEditApplyPayload): void {
  mutate(applyAiEditWork(payload))
}

/* Schritt erklären: Zeile und Index zum Zeitpunkt des Öffnens. */
const isExplainOpen = ref(false)
const explainTarget = ref<{ step: RecipeStep, index: number } | null>(null)

function openExplain(step: RecipeStep, index: number): void {
  explainTarget.value = { step, index }
  isExplainOpen.value = true
}

/** Speichert die Erklärung am Schritt — das Feld wird gesynct. */
function onExplained(explanation: string): void {
  const target = explainTarget.value
  if (target === null) return
  mutate(setStepExplanation(target.step, explanation))
}

/**
 * Ziel der Bild-Generierung, beim Öffnen eingefroren.
 *
 * Die Generierung kann Minuten dauern; wer währenddessen zu einem anderen
 * Rezept navigiert, verschiebt `recipe.value`. Id und Text werden deshalb
 * beim Start festgehalten, und gespeichert wird über die festgehaltene Id
 * (`attachRecipeImageById`) — nie über den geteilten Ansichts-Zustand.
 */
const imageGenTarget = ref<{ recipeId: string, recipeText: string } | null>(null)

function startImageGeneration(): void {
  // Die BFF signiert AI-Aufrufe nur für Angemeldete — ehrlicher Hinweis
  // statt eines Fehlers nach fünf Sekunden Wartezeit.
  if (!isSignedIn.value) {
    toast.add({
      title: 'Anmeldung erforderlich',
      description: 'Melde dich an, um die AI-Funktionen zu nutzen.',
      icon: 'i-lucide-lock',
    })
    return
  }
  const target = recipe.value
  if (target === null) return

  imageGenTarget.value = { recipeId: target.id, recipeText: recipeImageText.value }
  isImageGenOpen.value = true
}

/** Das generierte Bild ist hochgeladen — nur noch die Referenz speichern. */
function onImageGenerated(imageRef: string): void {
  const target = imageGenTarget.value
  if (target === null) return

  mutate(attachRecipeImageById(target.recipeId, toSyncImagePath(imageRef)))
  toast.add({ title: 'Neues Bild gespeichert', icon: 'i-lucide-sparkles' })
}
</script>

<template>
  <div
    class="flex min-h-0 min-w-0 grow flex-col"
    style="background: var(--md-surface)"
  >
    <!-- Kopf in der Rezeptfarbe -->
    <!-- Richtung Cockpit (Design-Entscheid 22.08.): Auf dem Desktop ist der
         Kopf ruhig — die Rezeptfarbe tritt als schmaler Akzentstrich unter dem
         Titel auf, Bild und Verlauf gehören dort der linken Werkbank. Auf
         Mobil bleibt alles wie gehabt: Bild im Kopf, Farbverlauf darüber. -->
    <header
      class="relative flex shrink-0 flex-col gap-2.5 px-5 py-5 lg:border-b lg:px-7"
      :style="{ '--list-color': recipe?.color ?? 'var(--md-primary)', 'borderColor': 'var(--md-outline-variant)' }"
    >
      <img
        v-if="recipeImageUrl !== null && !isImageBroken"
        :src="recipeImageUrl"
        alt=""
        class="aspect-[2/1] w-full rounded-xl object-cover lg:hidden"
        @error="isImageBroken = true"
      >

      <!--
        Vertikaler Verlauf des Kopfs wie in DefaultCard.kt der Android-App:
        die Rezeptfarbe mit 20 % Deckkraft, nach unten auslaufend. Liegt über
        dem Bild und bleibt auch ohne Bild — dieselbe Mischformel wie die
        list-tint-Utility, nur als Verlauf statt als Fläche.
      -->
      <div
        class="pointer-events-none absolute inset-0 lg:hidden"
        style="background: linear-gradient(to bottom, color-mix(in srgb, var(--list-color, var(--md-primary)) 20%, transparent), transparent)"
        aria-hidden="true"
      />

      <div class="relative flex items-start gap-3">
        <NuxtLink
          to="/app/recipes"
          class="mt-1 shrink-0 lg:hidden"
          aria-label="Zurück zur Übersicht"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-6"
          />
        </NuxtLink>

        <h1 class="min-w-0 grow text-[2.25rem] leading-9 font-extrabold">
          {{ recipe?.name ?? 'Rezept' }}
        </h1>

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

      <!-- Der Akzentstrich ist die Rezeptfarbe des Desktop-Kopfs. -->
      <div
        class="hidden h-1 w-16 rounded-full lg:block"
        style="background: color-mix(in srgb, var(--list-color) 75%, transparent)"
        aria-hidden="true"
      />

      <!-- Auf dem Desktop steht der Fortschritt fest über den Schritten. -->
      <div
        v-if="steps.length"
        class="relative flex items-center gap-3.5 lg:hidden"
      >
        <span
          class="text-[1rem]"
          style="color: var(--md-on-primary-container)"
        >{{ steps.filter(step => step.isChecked).length }} von {{ steps.length }} Schritten</span>
        <UProgress
          :model-value="progress"
          class="max-w-64"
          aria-label="Fortschritt"
        />
      </div>
    </header>

    <AppSheet
      v-model:open="isRenameOpen"
      title="Rezept umbenennen"
      description="Wie soll es heissen?"
    >
      <UInput
        v-model="renameValue"
        size="xl"
        autofocus
        enterkeyhint="done"
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
      title="Rezept löschen"
      description="Zutaten und Zubereitung verschwinden mit."
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
            Löschen
          </UButton>
        </div>
      </template>
    </AppSheet>

    <!-- Ein Scrollbereich, auf dem Desktop als Cockpit-Raster: links die
         stehende Werkbank (Bild, Zutaten, AI-Griffe), rechts die Schritte als
         Arbeitsspalte. `contents` lässt die Wrapper auf Mobil verschwinden —
         dort bleibt der bisherige einspaltige Fluss unverändert. -->
    <div class="flex min-h-0 grow flex-col gap-6 overflow-y-auto px-3 py-4 lg:grid lg:grid-cols-[396px_minmax(0,1fr)] lg:items-stretch lg:gap-0 lg:p-0">
      <div
        class="contents lg:block lg:min-w-0 lg:border-r lg:bg-[var(--md-surface-low)]"
        style="border-color: var(--md-outline-variant)"
      >
        <div class="contents lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-4 lg:p-5">
          <img
            v-if="recipeImageUrl !== null && !isImageBroken"
            :src="recipeImageUrl"
            alt=""
            class="hidden h-[236px] w-full rounded-xl object-cover lg:block"
            @error="isImageBroken = true"
          >

          <!-- Zutaten -->
          <section class="flex flex-col gap-1">
            <div class="flex items-baseline justify-between">
              <h2
                class="px-2 text-[1.25rem] font-bold"
                style="color: var(--md-on-surface-variant)"
              >
                Zutaten
              </h2>
              <span
                v-if="ingredients.length > 0"
                class="hidden px-2 text-[0.9375rem] lg:inline"
                style="color: var(--md-on-surface-variant)"
              >{{ ingredients.length }}</span>
            </div>

            <p
              v-if="ingredients.length === 0"
              class="px-2 text-[1rem]"
              style="color: var(--md-on-surface-variant)"
            >
              Noch keine Zutaten.
            </p>

            <div
              ref="ingredientList"
              class="flex flex-col"
            >
              <div
                v-for="ingredient in ingredients"
                :key="ingredient.id"
                class="state-layer group flex min-h-12 items-center gap-3 rounded-lg px-2"
                :class="isSortMode && 'mb-0.5'"
                :style="isSortMode ? 'background: var(--md-surface-container)' : ''"
              >
                <span
                  v-if="isSortMode"
                  class="drag-handle flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing"
                  style="color: var(--md-on-surface-variant); touch-action: none"
                  aria-hidden="true"
                >
                  <UIcon
                    name="i-lucide-grip-vertical"
                    class="size-5"
                  />
                </span>
                <span class="min-w-0 grow truncate text-[1.25rem]">{{ ingredient.name }}</span>
                <span
                  v-if="ingredient.quantity > 1"
                  class="flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 text-[1.0625rem] font-bold"
                  style="background: var(--md-surface-high)"
                >{{ ingredient.quantity }}&times;</span>
                <UButton
                  v-if="!isSortMode"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="shrink-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  :aria-label="`${ingredient.name} entfernen`"
                  @click="onRemoveIngredient(ingredient)"
                />
              </div>
            </div>

            <UInput
              v-if="!isSortMode"
              v-model="newIngredient"
              placeholder="Zutat hinzufügen"
              icon="i-lucide-plus"
              size="lg"
              class="mt-1"
              enterkeyhint="done"
              :ui="{ root: 'w-full' }"
              @keyup.enter="submitIngredient"
            />
          </section>

          <!-- Die AI-Griffe der Werkbank: dieselben Sheets wie auf Mobil,
               dort öffnet sie die aufklappbare Sektion am Seitenende. -->
          <div
            v-if="isSignedIn && !isSortMode"
            class="hidden lg:flex lg:flex-col lg:gap-2 lg:pt-1"
          >
            <button
              type="button"
              class="state-layer flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left"
              style="background: var(--md-surface-container)"
              @click="isAiChatOpen = true"
            >
              <UIcon
                name="i-lucide-sparkles"
                class="size-5 shrink-0"
                style="color: var(--md-primary)"
              />
              <span class="flex min-w-0 flex-col">
                <span class="text-[1.125rem] font-bold">Rezept-Chat</span>
                <span
                  class="text-[0.9375rem]"
                  style="color: var(--md-on-surface-variant)"
                >Stelle Fragen zu diesem Rezept</span>
              </span>
            </button>
            <button
              type="button"
              class="state-layer flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left"
              style="background: var(--md-surface-container)"
              @click="isAiEditOpen = true"
            >
              <UIcon
                name="i-lucide-wand-sparkles"
                class="size-5 shrink-0"
                style="color: var(--md-primary)"
              />
              <span class="flex min-w-0 flex-col">
                <span class="text-[1.125rem] font-bold">AI-Bearbeitung</span>
                <span
                  class="text-[0.9375rem]"
                  style="color: var(--md-on-surface-variant)"
                >Bearbeite dieses Rezept mit KI-Unterstützung</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="contents lg:flex lg:min-w-0 lg:flex-col">
        <!-- Fortschritt steht auf dem Desktop fest über der Arbeitsspalte. -->
        <div
          v-if="steps.length"
          class="sticky top-0 z-10 hidden items-center gap-3.5 border-b px-7 py-3 lg:flex"
          style="background: var(--md-surface); border-color: var(--md-outline-variant)"
        >
          <span
            class="text-[1rem]"
            style="color: var(--md-on-primary-container)"
          >{{ steps.filter(step => step.isChecked).length }} von {{ steps.length }} Schritten</span>
          <UProgress
            :model-value="progress"
            class="max-w-64"
            aria-label="Fortschritt"
          />
        </div>

        <div class="contents lg:flex lg:max-w-[900px] lg:flex-col lg:gap-6 lg:p-7 lg:pt-5">
          <!-- Schritte -->
          <section class="flex flex-col gap-1">
            <h2
              class="px-2 text-[1.25rem] font-bold"
              style="color: var(--md-on-surface-variant)"
            >
              Zubereitung
            </h2>

            <p
              v-if="steps.length === 0"
              class="px-2 text-[1rem]"
              style="color: var(--md-on-surface-variant)"
            >
              Noch keine Schritte.
            </p>

            <div
              ref="stepList"
              class="flex flex-col"
            >
              <!-- Im Sortiermodus ist die Zeile ein Container mit Griff statt ein
               Knopf: Ein Griff IM Knopf waere ein verschachteltes Bedienelement
               und fuer Tastatur wie Screenreader kaputt. -->
              <div
                v-for="(step, index) in steps"
                v-show="isSortMode"
                :key="`sort-${step.id}`"
                class="mb-0.5 flex min-h-14 w-full items-center gap-1 rounded-lg px-2 py-2"
                style="background: var(--md-surface-container)"
              >
                <span
                  class="drag-handle flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing"
                  style="color: var(--md-on-surface-variant); touch-action: none"
                  aria-hidden="true"
                >
                  <UIcon
                    name="i-lucide-grip-vertical"
                    class="size-5"
                  />
                </span>
                <span
                  class="flex size-7 shrink-0 items-center justify-center rounded-full text-[1rem] font-bold"
                  style="background: var(--md-surface-high); color: var(--md-on-surface-variant)"
                >{{ index + 1 }}</span>
                <span class="min-w-0 grow text-[1.25rem] lg:text-[1.375rem]">{{ step.description }}</span>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="shrink-0 rounded-full"
                  :aria-label="`Schritt ${index + 1} löschen`"
                  @click="onRemoveStep(step)"
                />
              </div>
            </div>

            <!-- Erklärung als Geschwister-Knopf statt im Toggle-Knopf: Ein Knopf
             im Knopf wäre ein verschachteltes Bedienelement und für Tastatur
             wie Screenreader kaputt (dieselbe Begründung wie im Sortiermodus). -->
            <div
              v-for="(step, index) in steps"
              v-show="!isSortMode"
              :key="step.id"
              class="group flex items-start"
            >
              <button
                type="button"
                class="state-layer flex min-h-14 w-full min-w-0 grow items-start gap-3.5 rounded-lg px-2 py-2 text-left transition-colors"
                :class="[step.isChecked && 'opacity-65', step.id === currentStepId && 'lg:bg-[var(--md-surface-container)]']"
                :aria-pressed="step.isChecked"
                @click="onToggleStep(step)"
              >
                <span
                  class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[1rem] font-bold transition-colors"
                  :style="step.isChecked
                    ? 'background: var(--md-check-content); color: white'
                    : 'background: var(--md-surface-high); color: var(--md-on-surface-variant)'"
                >
                  <UIcon
                    v-if="step.isChecked"
                    name="i-lucide-check"
                    class="size-4"
                  />
                  <template v-else>{{ index + 1 }}</template>
                </span>
                <span
                  class="min-w-0 grow text-[1.25rem] lg:text-[1.375rem]"
                  :class="step.isChecked && 'line-through'"
                  style="text-wrap: pretty"
                >{{ step.description }}</span>
              </button>

              <!-- Immer sichtbar, nur gedimmt: Auf Touch-Geräten gibt es kein
               Hover, und eine unerreichbare Funktion wäre keine Funktion. -->
              <UButton
                v-if="isSignedIn"
                icon="i-lucide-sparkles"
                color="neutral"
                variant="ghost"
                size="sm"
                class="mt-2.5 shrink-0 rounded-full transition-opacity"
                :class="step.aiExplanation === null && 'opacity-40 group-hover:opacity-100 focus-visible:opacity-100'"
                :style="step.aiExplanation !== null ? 'color: var(--md-primary)' : ''"
                :aria-label="`Schritt ${index + 1} erklären`"
                @click="openExplain(step, index)"
              />
            </div>

            <UInput
              v-if="!isSortMode"
              v-model="newStep"
              placeholder="Schritt hinzufügen"
              icon="i-lucide-plus"
              size="lg"
              class="mt-1"
              enterkeyhint="done"
              :ui="{ root: 'w-full' }"
              @keyup.enter="submitStep"
            />
          </section>

          <!-- AI Features am Ende des Inhalts, aufklappbar — wie in Android.
           Nur Mobil: Auf dem Desktop sitzen dieselben Einstiege als Griffe
           in der linken Werkbank. -->
          <div
            v-if="!isSortMode"
            class="mt-2 flex shrink-0 flex-col gap-2 px-1 pb-2 lg:hidden"
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
                  @click="isAiChatOpen = true"
                >
                  <UIcon
                    name="i-lucide-message-circle"
                    class="size-5 shrink-0"
                    style="color: var(--md-primary)"
                  />
                  <span class="flex min-w-0 flex-col">
                    <span class="text-[1rem] font-bold">Rezept-Chat</span>
                    <span
                      class="text-[0.875rem]"
                      style="color: var(--md-on-surface-variant)"
                    >Stelle Fragen zu diesem Rezept</span>
                  </span>
                </button>

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
                    >Bearbeite dieses Rezept mit KI-Unterstützung</span>
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
      </div>
    </div>

    <AiRecipeChatSheet
      v-if="recipe"
      v-model:open="isAiChatOpen"
      :recipe-id="recipe.id"
      :recipe="chatRecipe"
    />

    <AiRecipeEditSheet
      v-if="recipe"
      v-model:open="isAiEditOpen"
      :recipe-id="recipe.id"
      :recipe-name="recipe.name"
      :ingredients="aiIngredients"
      :steps="aiSteps"
      @apply="onAiEditApply"
    />

    <AiRecipeExplainSheet
      v-if="explainTarget"
      v-model:open="isExplainOpen"
      :recipe="chatRecipe"
      :step-index="explainTarget.index"
      :step-description="explainTarget.step.description"
      :stored-explanation="explainTarget.step.aiExplanation"
      @explained="onExplained"
    />

    <AiRecipeImageSheet
      v-if="imageGenTarget"
      v-model:open="isImageGenOpen"
      :recipe-id="imageGenTarget.recipeId"
      :recipe-text="imageGenTarget.recipeText"
      @generated="onImageGenerated"
    />

    <!-- Die Badge-Zeremonie: Sheet beim ersten Fertigkochen, kurze
         Konfetti-Feier bei jedem weiteren (celebrateTick). -->
    <BadgeEarnedSheet
      v-model:open="isBadgeSheetOpen"
      :badge="badgeForSheet"
      :celebrate-tick="celebrateTick"
    />

    <!-- Verlauf: Gelöschtes ansehen und wiederherstellen. Rezepte werden
         nicht geteilt, deshalb ohne Namensauflösung (resolveCreatorName). -->
    <HistorySheet
      v-model:open="isHistoryOpen"
      :parent-id="recipeId"
      @restore="onHistoryRestore"
    />

    <!-- Sortiermodus: der sichtbare Weg hinaus. Ein Modus ohne Ende ist eine
         Falle. -->
    <div
      v-if="isSortMode"
      class="flex shrink-0 items-center justify-between gap-3 border-t px-3 py-3.5 lg:px-5"
      style="border-color: var(--md-outline-variant)"
    >
      <span
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >Zieh Zutaten und Schritte am Griff in die richtige Reihenfolge.</span>
      <UButton
        class="shrink-0 rounded-xl font-bold"
        @click="isSortMode = false"
      >
        Fertig
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Rezeptbereich, aufgebaut wie der Listenbereich.
 *
 * Dieselbe Routen-Ebene, dieselbe Master-Detail-Aufteilung, dieselbe Karte:
 * Wer Listen bedienen kann, kann auch Rezepte bedienen, ohne etwas Neues zu
 * lernen. Auf Mobil tritt der Index zurück, sobald ein Rezept offen ist.
 */
import type { GeneratedRecipe } from '~/ai/recipeContract'
import type { AiCreateMode } from '~/ai/transport'

definePageMeta({ layout: 'app' })
useHead({ title: 'Rezepte ~ shliste' })

const route = useRoute()
const { entries, reload, createRecipe } = useRecipes()
// Das Anlegen aus einem AI-Ergebnis liegt in `useAiCreate`: Der
// Teilen-Empfang braucht denselben Ablauf (siehe dort).
const { createRecipeFromAi } = useAiCreate()
const { badges, reload: reloadBadges } = useBadges()
const { dataVersion, scheduleSync } = useSync()
const { isSignedIn } = useAuth()
const toast = useToast()

const isDetailOpen = computed(() => typeof route.params.id === 'string')

/**
 * Rezepte mit Auszeichnung — dieselbe Ableitung wie `badgeRecipeIds` in
 * Androids recipes/Overview.kt: ein Blick in die gespeicherten Badges,
 * keine zweite Wahrheit am Rezept.
 */
const badgeRecipeIds = computed(() => new Set(badges.value.map(badge => badge.recipeId)))

const isDialogOpen = ref(false)
const newRecipeName = ref('')
const isSaving = ref(false)

/* ------------------------------------------------------------------ *
 * Neues Rezept per AI: Sprache, Foto, Link.
 * ------------------------------------------------------------------ */

/** Mobil: Der FAB öffnet erst diese Auswahl (Neu + die drei AI-Wege). */
const isChooserOpen = ref(false)

/** Das Angebot statt der Absage — siehe AiUpsellSheet. */
const isAiUpsellOpen = ref(false)

const aiMode = ref<AiCreateMode>('voice')
const isAiCreateOpen = ref(false)

function openChooser(): void {
  isChooserOpen.value = true
}

function chooseManualCreate(): void {
  isChooserOpen.value = false
  openDialog()
}

function startAiCreate(mode: AiCreateMode): void {
  isChooserOpen.value = false

  // Die BFF signiert AI-Aufrufe nur für Angemeldete — ehrliches Angebot
  // statt eines Fehlers nach fünf Sekunden Wartezeit.
  if (!isSignedIn.value) {
    // Kein Toast: Wer gerade auf eine AI-Funktion getippt hat, hat sein
    // Interesse gezeigt. Das ist der Moment für ein Angebot, nicht für eine
    // Absage, die nach vier Sekunden von selbst verschwindet.
    isAiUpsellOpen.value = true
    return
  }

  aiMode.value = mode
  isAiCreateOpen.value = true
}

function onAiRecipeCreated(result: GeneratedRecipe): void {
  void createRecipeFromAi(result).catch((error: unknown) => {
    console.error('[Rezepte] Anlegen des AI-Rezepts fehlgeschlagen:', error)
    toast.add({
      title: 'Rezept konnte nicht angelegt werden',
      description: 'Bitte versuche es erneut.',
      icon: 'i-lucide-triangle-alert',
      color: 'error',
    })
  })
}

onMounted(() => {
  void reload()
  void reloadBadges()
})

// Wie bei den Listen: Der Abgleich meldet, die Ansicht liest neu.
watch(dataVersion, () => {
  void reload()
  void reloadBadges()
})

function openDialog(): void {
  newRecipeName.value = ''
  isDialogOpen.value = true
}

async function submitDialog(): Promise<void> {
  const name = newRecipeName.value.trim()
  if (name.length === 0 || isSaving.value) return

  isSaving.value = true
  try {
    const created = await createRecipe(name)
    scheduleSync()
    isDialogOpen.value = false
    await navigateTo(`/app/recipes/${created.id}`)
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div
    class="flex min-h-0 min-w-0 grow lg:divide-x"
    style="border-color: var(--md-outline-variant)"
  >
    <!-- Index -->
    <section
      class="w-full shrink-0 flex-col overflow-y-auto lg:flex lg:w-86"
      :class="isDetailOpen ? 'hidden' : 'flex'"
      style="background: var(--md-surface-low)"
    >
      <AppPageHeader
        title="Rezepte"
        action-label="Neu"
        @action="openDialog"
      />

      <!-- Desktop: die drei AI-Wege neben „Neu" — auf Mobil stecken sie im
           Menü hinter dem FAB, ein zweiter Ort wäre dort nur Rauschen. -->
      <div class="hidden items-center gap-2 px-5 pb-3 lg:flex">
        <UButton
          icon="i-lucide-mic"
          color="neutral"
          variant="subtle"
          size="sm"
          class="rounded-full font-bold"
          @click="startAiCreate('voice')"
        >
          Per Sprache
        </UButton>
        <UButton
          icon="i-lucide-camera"
          color="neutral"
          variant="subtle"
          size="sm"
          class="rounded-full font-bold"
          @click="startAiCreate('photo')"
        >
          Per Foto
        </UButton>
        <UButton
          icon="i-lucide-link"
          color="neutral"
          variant="subtle"
          size="sm"
          class="rounded-full font-bold"
          @click="startAiCreate('url')"
        >
          Per Link
        </UButton>
      </div>

      <div
        v-if="entries.length"
        class="flex flex-col gap-4 px-3 pb-4"
      >
        <RecipeCard
          v-for="entry in entries"
          :key="entry.recipe.id"
          :recipe="entry.recipe"
          :ingredient-count="entry.ingredientCount"
          :step-count="entry.stepCount"
          :checked-step-count="entry.checkedStepCount"
          :has-badge="badgeRecipeIds.has(entry.recipe.id)"
          :active="entry.recipe.id === route.params.id"
        />
      </div>

      <div
        v-else
        class="flex grow flex-col items-center justify-center gap-3 px-8 py-16 text-center"
      >
        <UIcon
          name="i-lucide-chef-hat"
          class="size-10"
          style="color: var(--md-on-surface-variant)"
        />
        <p class="text-[1.25rem] font-bold">
          Noch keine Rezepte
        </p>
        <p
          class="text-[1rem]"
          style="color: var(--md-on-surface-variant); text-wrap: pretty"
        >
          Lege ein Rezept an und hol seine Zutaten später mit einem Tippen auf die Einkaufsliste.
        </p>
        <UButton
          icon="i-lucide-plus"
          size="xl"
          class="mt-1 min-h-12 rounded-full font-bold"
          @click="openDialog"
        >
          Erstes Rezept anlegen
        </UButton>
      </div>

      <!-- Mobil: der schwebende Knopf öffnet die Auswahl aus Neu + AI-Wegen -->
      <AppFab
        label="Rezept"
        @click="openChooser"
      />
    </section>

    <NuxtPage />

    <AppSheet
      v-model:open="isDialogOpen"
      title="Neues Rezept"
      description="Wie soll das Rezept heissen?"
    >
      <UInput
        v-model="newRecipeName"
        placeholder="z.B. Linsencurry"
        size="xl"
        autofocus
        :ui="{ root: 'w-full' }"
        @keyup.enter="submitDialog"
      />

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            class="font-bold"
            @click="isDialogOpen = false"
          >
            Abbrechen
          </UButton>
          <UButton
            :loading="isSaving"
            :disabled="newRecipeName.trim().length === 0"
            class="font-bold"
            @click="submitDialog"
          >
            Anlegen
          </UButton>
        </div>
      </template>
    </AppSheet>

    <!-- Mobil: Auswahl hinter dem FAB — Neu plus die drei AI-Wege -->
    <AppSheet
      v-model:open="isChooserOpen"
      title="Neues Rezept"
      description="Wie möchtest du starten?"
    >
      <div class="flex flex-col gap-2">
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="subtle"
          size="xl"
          class="justify-start rounded-xl font-bold"
          @click="chooseManualCreate"
        >
          Selbst eintragen
        </UButton>
        <UButton
          icon="i-lucide-mic"
          color="neutral"
          variant="subtle"
          size="xl"
          class="justify-start rounded-xl font-bold"
          @click="startAiCreate('voice')"
        >
          Per Sprache
        </UButton>
        <UButton
          icon="i-lucide-camera"
          color="neutral"
          variant="subtle"
          size="xl"
          class="justify-start rounded-xl font-bold"
          @click="startAiCreate('photo')"
        >
          Per Foto
        </UButton>
        <UButton
          icon="i-lucide-link"
          color="neutral"
          variant="subtle"
          size="xl"
          class="justify-start rounded-xl font-bold"
          @click="startAiCreate('url')"
        >
          Per Link
        </UButton>
      </div>
    </AppSheet>

    <AiUpsellSheet v-model:open="isAiUpsellOpen" />

    <AiRecipeCreateSheet
      v-model:open="isAiCreateOpen"
      :mode="aiMode"
      @created="onAiRecipeCreated"
    />
  </div>
</template>

<script setup lang="ts">
import type { RecipeIngredient, RecipeStep } from '#shared/types/domain'

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
  renameRecipe,
  deleteRecipe,
} = useRecipeDetail()

const { reload: reloadOverview } = useRecipes()
const { dataVersion, scheduleSync } = useSync()

const newIngredient = ref('')
const newStep = ref('')

const isRenameOpen = ref(false)
const isDeleteOpen = ref(false)
const renameValue = ref('')

// Dieselben Aktionen wie bei einer Liste, an derselben Stelle: Was gleich
// funktioniert, soll auch gleich zu finden sein.
const menuItems = computed(() => [[
  {
    label: 'Umbenennen',
    icon: 'i-lucide-pencil',
    onSelect: () => {
      renameValue.value = recipe.value?.name ?? ''
      isRenameOpen.value = true
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
  mutate(toggleStep(step))
}

function onRemoveIngredient(ingredient: RecipeIngredient): void {
  mutate(removeIngredient(ingredient))
}

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
</script>

<template>
  <div
    class="flex min-w-0 grow flex-col lg:min-h-0"
    style="background: var(--md-surface)"
  >
    <!-- Kopf in der Rezeptfarbe -->
    <header
      class="list-tint flex shrink-0 flex-col gap-2.5 px-5 py-5 lg:px-7"
      :style="{ '--list-color': recipe?.color ?? 'var(--md-primary)' }"
    >
      <div class="flex items-start gap-3">
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

      <div
        v-if="steps.length"
        class="flex items-center gap-3.5"
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

    <div class="flex grow flex-col gap-6 px-3 py-4 lg:min-h-0 lg:overflow-y-auto lg:px-5">
      <!-- Zutaten -->
      <section class="flex flex-col gap-1">
        <h2
          class="px-2 text-[1.25rem] font-bold"
          style="color: var(--md-on-surface-variant)"
        >
          Zutaten
        </h2>

        <p
          v-if="ingredients.length === 0"
          class="px-2 text-[1rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Noch keine Zutaten.
        </p>

        <div
          v-for="ingredient in ingredients"
          :key="ingredient.id"
          class="group flex min-h-12 items-center gap-3 rounded-lg px-2"
        >
          <span class="min-w-0 grow truncate text-[1.25rem]">{{ ingredient.name }}</span>
          <span
            v-if="ingredient.quantity > 1"
            class="flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 text-[1.0625rem] font-bold"
            style="background: var(--md-surface-high)"
          >{{ ingredient.quantity }}&times;</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            class="shrink-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            :aria-label="`${ingredient.name} entfernen`"
            @click="onRemoveIngredient(ingredient)"
          />
        </div>

        <UInput
          v-model="newIngredient"
          placeholder="Zutat hinzufügen"
          icon="i-lucide-plus"
          size="lg"
          class="mt-1"
          :ui="{ root: 'w-full' }"
          @keyup.enter="submitIngredient"
        />
      </section>

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

        <button
          v-for="(step, index) in steps"
          :key="step.id"
          type="button"
          class="flex min-h-14 w-full items-start gap-3.5 rounded-lg px-2 py-2 text-left transition-colors"
          :class="step.isChecked && 'opacity-65'"
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
            class="min-w-0 grow text-[1.25rem]"
            :class="step.isChecked && 'line-through'"
            style="text-wrap: pretty"
          >{{ step.description }}</span>
        </button>

        <UInput
          v-model="newStep"
          placeholder="Schritt hinzufügen"
          icon="i-lucide-plus"
          size="lg"
          class="mt-1"
          :ui="{ root: 'w-full' }"
          @keyup.enter="submitStep"
        />
      </section>
    </div>
  </div>
</template>

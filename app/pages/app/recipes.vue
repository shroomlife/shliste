<script setup lang="ts">
/**
 * Rezeptbereich, aufgebaut wie der Listenbereich.
 *
 * Dieselbe Routen-Ebene, dieselbe Master-Detail-Aufteilung, dieselbe Karte:
 * Wer Listen bedienen kann, kann auch Rezepte bedienen, ohne etwas Neues zu
 * lernen. Auf Mobil tritt der Index zurück, sobald ein Rezept offen ist.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Rezepte ~ shliste' })

const route = useRoute()
const { entries, reload, createRecipe } = useRecipes()
const { dataVersion, scheduleSync } = useSync()

const isDetailOpen = computed(() => typeof route.params.id === 'string')

const isDialogOpen = ref(false)
const newRecipeName = ref('')
const isSaving = ref(false)

onMounted(() => {
  void reload()
})

// Wie bei den Listen: Der Abgleich meldet, die Ansicht liest neu.
watch(dataVersion, () => {
  void reload()
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
    class="flex min-w-0 grow lg:min-h-0 lg:divide-x"
    style="border-color: var(--md-outline-variant)"
  >
    <!-- Index -->
    <section
      class="w-full shrink-0 flex-col lg:flex lg:w-86 lg:overflow-y-auto"
      :class="isDetailOpen ? 'hidden' : 'flex'"
      style="background: var(--md-surface-low)"
    >
      <AppPageHeader
        title="Rezepte"
        action-label="Neu"
        @action="openDialog"
      />

      <div
        v-if="entries.length"
        class="flex flex-col gap-2 px-4 pb-4"
      >
        <RecipeCard
          v-for="entry in entries"
          :key="entry.recipe.id"
          :recipe="entry.recipe"
          :ingredient-count="entry.ingredientCount"
          :step-count="entry.stepCount"
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
      </div>

      <!-- Mobil: dieselbe Aktion als schwebender Knopf, wie bei den Listen -->
      <AppFab
        label="Neues Rezept"
        @click="openDialog"
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
  </div>
</template>

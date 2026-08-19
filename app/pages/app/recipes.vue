<script setup lang="ts">
/**
 * Rezepte-Übersicht. Wie bei den Listen gilt: ohne Konto nutzbar, die Daten
 * liegen lokal. Ein Konto braucht es erst für Abgleich und Teilen.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Rezepte ~ shliste' })

const { recipes, reload, createRecipe } = useRecipes()
const { dataVersion, scheduleSync } = useSync()

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
    await createRecipe(name)
    scheduleSync()
    isDialogOpen.value = false
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div
    class="flex min-w-0 grow flex-col lg:min-h-0 lg:overflow-y-auto"
    style="background: var(--md-surface-low)"
  >
    <AppPageHeader
      title="Rezepte"
      action-label="Neu"
      @action="openDialog"
    />

    <div
      v-if="recipes.length"
      class="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <article
        v-for="recipe in recipes"
        :key="recipe.id"
        class="list-tint rounded-xl p-4"
        :style="{ '--list-color': recipe.color }"
      >
        <h2 class="text-[1.25rem] font-bold">
          {{ recipe.name }}
        </h2>
      </article>
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

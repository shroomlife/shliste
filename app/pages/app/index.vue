<script setup lang="ts">
/**
 * Listenuebersicht, Design-Richtung A.
 *
 * Auf Desktop ist das die mittlere Spalte (Index) neben dem Detailbereich,
 * auf Mobil die erste Ebene des bekannten Stacks.
 *
 * Die Daten kommen aus IndexedDB und damit ohne Konto aus. Angemeldet werden
 * muss man erst fuer Abgleich und Teilen.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Listen ~ shliste' })

const { lists, reload, createList } = useLists()

const isDialogOpen = ref(false)
const newListName = ref('')
const isSaving = ref(false)

onMounted(() => {
  void reload()
})

function openDialog(): void {
  newListName.value = ''
  isDialogOpen.value = true
}

async function submitDialog(): Promise<void> {
  const name = newListName.value.trim()
  if (name.length === 0 || isSaving.value) return

  isSaving.value = true
  try {
    const created = await createList(name)
    isDialogOpen.value = false
    await navigateTo(`/app/lists/${created.id}`)
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div
    class="flex min-w-0 grow lg:divide-x"
    style="border-color: var(--md-outline-variant)"
  >
    <!-- Index -->
    <section
      class="flex w-full shrink-0 flex-col lg:w-86"
      style="background: var(--md-surface-low)"
    >
      <AppPageHeader
        title="Listen"
        action-label="Neu"
        @action="openDialog"
      />

      <div
        v-if="lists.length"
        class="flex flex-col gap-2 px-4 pb-4"
      >
        <ListCard
          v-for="list in lists"
          :key="list.id"
          :list="list"
        />
      </div>

      <div
        v-else
        class="flex grow flex-col items-center justify-center gap-3 px-8 py-16 text-center"
      >
        <UIcon
          name="i-lucide-list-checks"
          class="size-10"
          style="color: var(--md-on-surface-variant)"
        />
        <p class="text-[1.25rem] font-bold">
          Noch keine Listen
        </p>
        <p
          class="text-[1rem]"
          style="color: var(--md-on-surface-variant); text-wrap: pretty"
        >
          Leg einfach los. Ein Konto brauchst du erst, wenn du zwischen Geraeten
          abgleichen oder eine Liste teilen moechtest.
        </p>
      </div>

      <!-- Mobil: dieselbe Aktion als schwebender Knopf, wie in Android -->
      <AppFab
        label="Neue Liste"
        @click="openDialog"
      />
    </section>

    <!-- Detail: auf Desktop dauerhaft sichtbar, auf Mobil eine eigene Route -->
    <section
      class="hidden min-w-0 grow lg:flex lg:flex-col"
      style="background: var(--md-surface)"
    >
      <div class="flex grow flex-col items-center justify-center gap-2 px-8 text-center">
        <UIcon
          name="i-lucide-arrow-left"
          class="size-6"
          style="color: var(--md-on-surface-variant)"
        />
        <p
          class="text-[1.25rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Waehle links eine Liste aus.
        </p>
      </div>
    </section>

    <AppSheet
      v-model:open="isDialogOpen"
      title="Neue Liste"
      description="Wie soll die Liste heissen?"
    >
      <UInput
        v-model="newListName"
        placeholder="z.B. Wocheneinkauf"
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
            :disabled="newListName.trim().length === 0"
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

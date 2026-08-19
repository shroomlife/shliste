<script setup lang="ts">
/**
 * Listenbereich, Design-Richtung A.
 *
 * Der Index liegt als eigene Routen-Ebene über der Detailansicht. Damit
 * bleiben auf dem Desktop beide gleichzeitig sichtbar (Master-Detail), während
 * sich derselbe Baum auf Mobil wie der Stack der Android-App verhält: der
 * Index tritt zurück, sobald eine Liste offen ist.
 *
 * Dass der Index hier hängt und nicht in den Kindseiten, ist der eigentliche
 * Gewinn: beim Wechsel zwischen Listen wird er nicht neu erzeugt, liest die
 * lokale Datenbank nicht erneut und flackert nicht.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Listen ~ shliste' })

const route = useRoute()
const { entries, reload, createList } = useLists()
const { dataVersion, scheduleSync, snapshot, requestSync } = useSync()

/** Auf Mobil zeigt der Bereich entweder den Index oder das Detail, nie beides. */
const isDetailOpen = computed(() => typeof route.params.id === 'string')

const isDialogOpen = ref(false)
const newListName = ref('')
const isSaving = ref(false)

onMounted(() => {
  void reload()
})

// Der Abgleich schreibt in dieselbe lokale Datenbank. Statt dass er in die
// Ansicht hineinschiebt, beobachtet die Ansicht seinen Zähler und liest neu —
// dieselbe Richtung wie beim übrigen Lesen.
watch(dataVersion, () => {
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
    scheduleSync()
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
        title="Listen"
        action-label="Neu"
        @action="openDialog"
      />

      <!-- Offene Einladungen stehen über den eigenen Listen: Es sind Listen,
           die gleich dazugehören könnten. -->
      <PendingInvites
        :invites="snapshot.pendingInvites"
        @answered="requestSync"
      />

      <div
        v-if="entries.length"
        class="flex flex-col gap-2 px-4 pb-4"
      >
        <ListCard
          v-for="entry in entries"
          :key="entry.list.id"
          :list="entry.list"
          :open-count="entry.openCount"
          :done-count="entry.doneCount"
          :active="entry.list.id === route.params.id"
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
          Leg einfach los. Ein Konto brauchst du erst, wenn du zwischen Geräten
          abgleichen oder eine Liste teilen möchtest.
        </p>
      </div>

      <!-- Mobil: dieselbe Aktion als schwebender Knopf, wie in Android -->
      <AppFab
        label="Neue Liste"
        @click="openDialog"
      />
    </section>

    <!-- Detail: auf Desktop dauerhaft daneben, auf Mobil eine eigene Ebene -->
    <NuxtPage />

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

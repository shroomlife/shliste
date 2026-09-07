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
import type { GeneratedList } from '~/ai/contract'
import type { AiCreateMode } from '~/ai/transport'

definePageMeta({ layout: 'app' })
useHead({ title: 'Listen ~ shliste' })

const route = useRoute()
const { entries, reload, createList } = useLists()
// Das Anlegen aus einem AI-Ergebnis liegt in `useAiCreate`: Der
// Teilen-Empfang braucht denselben Ablauf (siehe dort).
const { createListFromAi } = useAiCreate()
const { dataVersion, scheduleSync, snapshot, requestSync } = useSync()
const { isSignedIn } = useAuth()
const toast = useToast()

/** Auf Mobil zeigt der Bereich entweder den Index oder das Detail, nie beides. */
const isDetailOpen = computed(() => typeof route.params.id === 'string')

const isDialogOpen = ref(false)
const newListName = ref('')
const isSaving = ref(false)

/* ------------------------------------------------------------------ *
 * Neue Liste per AI: Sprache, Foto, Link.
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

function onAiListCreated(result: GeneratedList): void {
  void createListFromAi(result).catch((error: unknown) => {
    console.error('[Listen] Anlegen der AI-Liste fehlgeschlagen:', error)
    toast.add({
      title: 'Liste konnte nicht angelegt werden',
      description: 'Bitte versuche es erneut.',
      icon: 'i-lucide-triangle-alert',
      color: 'error',
    })
  })
}

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
        title="Listen"
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

      <!-- Offene Einladungen stehen über den eigenen Listen: Es sind Listen,
           die gleich dazugehören könnten. -->
      <PendingInvites
        :invites="snapshot.pendingInvites"
        @answered="requestSync"
      />

      <div
        v-if="entries.length"
        class="flex flex-col gap-4 px-3 pb-4"
      >
        <ListCard
          v-for="entry in entries"
          :key="entry.list.id"
          :list="entry.list"
          :open-count="entry.openCount"
          :done-count="entry.doneCount"
          :is-shared="entry.isShared"
          :unseen-count="entry.unseenCount"
          :just-changed="entry.isRecentlyChanged"
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
        <UButton
          icon="i-lucide-plus"
          size="xl"
          class="mt-1 min-h-12 rounded-full font-bold"
          @click="openDialog"
        >
          Erste Liste anlegen
        </UButton>
      </div>

      <!-- Mobil: der schwebende Knopf öffnet die Auswahl aus Neu + AI-Wegen -->
      <AppFab
        label="Liste"
        @click="openChooser"
      />
    </section>

    <!-- Detail: auf Desktop dauerhaft daneben, auf Mobil eine eigene Ebene -->
    <NuxtPage />

    <AppSheet
      v-model:open="isDialogOpen"
      title="Neue Liste"
      description="Wie soll die Liste heißen?"
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

    <!-- Mobil: Auswahl hinter dem FAB — Neu plus die drei AI-Wege -->
    <AppSheet
      v-model:open="isChooserOpen"
      title="Neue Liste"
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

    <AiCreateListSheet
      v-model:open="isAiCreateOpen"
      :mode="aiMode"
      @created="onAiListCreated"
    />
  </div>
</template>

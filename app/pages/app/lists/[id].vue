<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

/**
 * Detailansicht einer Liste — der Bildschirm, auf dem in dieser App die meiste
 * Zeit verbracht wird.
 *
 * Design-Richtung A: Der Kopf traegt die Listenfarbe als 20-Prozent-Lasur,
 * darunter die offenen Eintraege, dann getrennt die erledigten. Auf dem Desktop
 * steht diese Ansicht rechts neben dem Index, auf Mobil ist sie eine eigene
 * Seite mit Zurueck-Pfeil.
 *
 * Die Daten kommen aus der lokalen Datenbank und damit ohne Konto aus.
 * Abhaken und Hinzufuegen funktionieren offline; der Abgleich mit dem Server
 * laeuft getrennt davon.
 */
definePageMeta({ layout: 'app' })

const route = useRoute()
const listId = computed(() => String(route.params.id))

const {
  list,
  items,
  openItems,
  doneItems,
  load,
  toggleItem: setItemChecked,
  addItem: createItem,
} = useListDetail()

const newItemName = ref('')

const progress = computed(() => {
  const total = items.value.length
  return total === 0 ? 0 : Math.round((doneItems.value.length / total) * 100)
})

useHead({ title: () => `${list.value?.name ?? 'Liste'} ~ shliste` })

/**
 * Die Ereignisbehandler der Vorlage sind synchron, die Datenbankzugriffe nicht.
 * Alles laeuft deshalb hier durch: So endet ein gescheiterter Zugriff (privater
 * Modus, gesperrter Speicher) nicht als unbehandelte Zusage im Nichts, sondern
 * im Protokoll.
 */
function run(work: Promise<unknown>): void {
  void work.catch((error: unknown) => {
    console.error('[Listendetail] Zugriff auf die lokale Datenbank fehlgeschlagen:', error)
  })
}

/**
 * Laedt Liste und Eintraege aus der lokalen Datenbank.
 *
 * Bewusst kein useFetch: Die Daten liegen offline-first in IndexedDB und nicht
 * hinter einem Endpunkt. Der Abgleich mit dem Server laeuft getrennt davon und
 * schreibt in dieselbe Datenbank zurueck, woraufhin diese Ansicht neu laedt.
 */
async function loadList(): Promise<void> {
  await load(listId.value)
}

// watch mit immediate statt onMounted: so laedt die Ansicht auch neu, wenn auf
// dem Desktop im Index eine andere Liste gewaehlt wird, ohne dass die
// Komponente neu erzeugt wird.
watch(listId, () => {
  run(loadList())
}, { immediate: true })

function toggleItem(item: ListItem): void {
  run(setItemChecked(item))
}

function addItem(): void {
  const name = newItemName.value.trim()
  if (name.length === 0) return

  // Sofort leeren statt erst nach dem Schreiben: Der naechste Artikel soll ohne
  // Wartezeit tippbar sein, und ein zweites Enter darf nicht denselben Eintrag
  // ein zweites Mal anlegen.
  newItemName.value = ''
  run(createItem(name))
}
</script>

<template>
  <div
    class="flex min-w-0 grow flex-col"
    style="background: var(--md-surface)"
  >
    <!-- Kopf in der Listenfarbe -->
    <header
      class="list-tint flex flex-col gap-2.5 px-5 py-5 lg:px-7"
      :style="{ '--list-color': list?.color ?? 'var(--md-primary)' }"
    >
      <div class="flex items-start gap-3">
        <NuxtLink
          to="/app"
          class="mt-1 shrink-0 lg:hidden"
          aria-label="Zurueck zur Uebersicht"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-6"
          />
        </NuxtLink>

        <h1 class="min-w-0 grow text-[2.25rem] leading-9 font-extrabold">
          {{ list?.name ?? 'Liste' }}
        </h1>

        <UButton
          icon="i-lucide-users"
          color="neutral"
          variant="ghost"
          class="shrink-0 rounded-full"
          aria-label="Mitglieder verwalten"
        />
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          class="shrink-0 rounded-full"
          aria-label="Weitere Aktionen"
        />
      </div>

      <div
        v-if="items.length"
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

    <!-- Eintraege -->
    <div class="flex grow flex-col gap-0.5 px-3 py-2 lg:px-5">
      <template v-if="items.length">
        <ListItemRow
          v-for="item in openItems"
          :key="item.id"
          :item="item"
          @toggle="toggleItem(item)"
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

        <ListItemRow
          v-for="item in doneItems"
          :key="item.id"
          :item="item"
          @toggle="toggleItem(item)"
        />
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

    <!-- Eingabe -->
    <div
      class="flex items-center gap-2.5 border-t px-3 py-3.5 lg:px-5"
      style="border-color: var(--md-outline-variant)"
    >
      <UInput
        v-model="newItemName"
        placeholder="Artikel hinzufuegen"
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
        aria-label="Vorschlaege"
      />
    </div>
  </div>
</template>

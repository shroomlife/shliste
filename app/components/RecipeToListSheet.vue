<script setup lang="ts">
import type { RecipeIngredient } from '#shared/types/domain'

/**
 * Zutaten eines Rezepts in eine Einkaufsliste übernehmen.
 *
 * Der Weg vom Rezept in den Einkauf war in der PWA schlicht nicht vorhanden,
 * obwohl die Android-App ihn seit jeher hat (AddToListSheet.kt). Ablauf und
 * Wortlaut folgen ihr bewusst: erst auswählen, dann Ziel bestimmen. Zwei
 * getrennte Schritte, weil beide Entscheidungen unabhängig sind — wer alle
 * Zutaten will, soll nicht durch eine Auswahl müssen, und wer nur drei will,
 * soll das Ziel nicht vorher festlegen.
 *
 * Alle Zutaten sind vorausgewählt: Der häufige Fall ist "alles einkaufen".
 */
const { ingredients } = defineProps<{
  ingredients: readonly RecipeIngredient[]
}>()

const open = defineModel<boolean>('open', { default: false })

const { entries, reload: reloadLists, createList, addItemsToList } = useLists()
const toast = useToast()

/** 1 = Zutaten wählen, 2 = Ziel wählen. */
const schritt = ref<1 | 2>(1)
const ausgewaehlt = ref<Set<string>>(new Set())
const neueListe = ref('')
const laeuft = ref(false)

/**
 * Geheime Listen stehen hier NICHT zur Wahl — die Begründung und die Tests
 * dazu stehen in `utils/listTargets.ts`.
 */
const zielListen = computed(() =>
  entries.value.filter(eintrag => selectableAsTarget([eintrag.list]).length > 0),
)

const alleGewaehlt = computed(() => ausgewaehlt.value.size === ingredients.length)
const auswahl = computed(() => ingredients.filter(zutat => ausgewaehlt.value.has(zutat.id)))

/**
 * Bei jedem Öffnen von vorn — mit allem angehakt.
 *
 * Ohne das Zurücksetzen stünde beim zweiten Öffnen noch der zweite Schritt und
 * eine Auswahl von vorhin da; beides wäre eine Behauptung über eine Absicht,
 * die gerade erst gefasst wird.
 */
watch(open, (istOffen) => {
  if (!istOffen) return
  schritt.value = 1
  ausgewaehlt.value = new Set(ingredients.map(zutat => zutat.id))
  neueListe.value = ''

  // Die Listen werden hier NACHGELADEN, nicht vorausgesetzt: Der geteilte
  // Zustand füllt sich erst, wenn jemand die Übersicht besucht hat. Wer aus
  // einem Deep Link direkt in einem Rezept landet, sähe sonst in Schritt 2
  // keine einzige Liste — und hätte keine Ahnung, warum.
  void reloadLists().catch((error: unknown) => {
    console.warn('[Rezept] Listen konnten nicht geladen werden:', error)
  })
})

function umschalten(id: string): void {
  // Neues Set statt Mutation: Ein Set ist nicht tief reaktiv, ein `add` allein
  // löste kein Neuzeichnen aus.
  const naechste = new Set(ausgewaehlt.value)
  if (naechste.has(id)) naechste.delete(id)
  else naechste.add(id)
  ausgewaehlt.value = naechste
}

function alleOderKeine(): void {
  ausgewaehlt.value = alleGewaehlt.value
    ? new Set()
    : new Set(ingredients.map(zutat => zutat.id))
}

async function uebernehmen(listId: string, listName: string): Promise<void> {
  if (laeuft.value) return
  laeuft.value = true

  try {
    const anzahl = await addItemsToList(
      listId,
      auswahl.value.map(zutat => ({ name: zutat.name, quantity: zutat.quantity })),
    )
    open.value = false

    // Null angelegte Einträge mit einem grünen Haken zu melden wäre eine
    // falsche Auskunft — auch wenn der Fall nur bei Zutaten ohne Namen eintritt.
    if (anzahl === 0) {
      toast.add({ title: 'Nichts hinzugefügt', icon: 'i-lucide-info' })
      return
    }

    toast.add({
      title: anzahl === 1 ? `1 Zutat zu ${listName}` : `${anzahl} Zutaten zu ${listName}`,
      icon: 'i-lucide-check',
    })
  }
  catch (error) {
    console.error('[Rezept] Zutaten konnten nicht übernommen werden:', error)
    toast.add({ title: 'Das hat nicht geklappt', icon: 'i-lucide-triangle-alert', color: 'error' })
  }
  finally {
    laeuft.value = false
  }
}

async function inNeueListe(): Promise<void> {
  const name = neueListe.value.trim()
  if (name.length === 0 || laeuft.value) return

  laeuft.value = true
  try {
    const liste = await createList(name)
    laeuft.value = false
    await uebernehmen(liste.id, liste.name)
  }
  catch (error) {
    laeuft.value = false
    console.error('[Rezept] Liste konnte nicht angelegt werden:', error)
    toast.add({ title: 'Die Liste konnte nicht angelegt werden', icon: 'i-lucide-triangle-alert', color: 'error' })
  }
}
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Zutaten zur Liste"
    :description="schritt === 1 ? 'Was soll mit?' : 'In welche Liste?'"
  >
    <!-- Schritt 1: auswählen -->
    <div
      v-if="schritt === 1"
      class="flex flex-col gap-3"
    >
      <div class="flex items-center justify-between gap-3">
        <span
          class="text-[1rem]"
          style="color: var(--md-on-surface-variant)"
        >{{ ausgewaehlt.size }} von {{ ingredients.length }} ausgewählt</span>
        <button
          type="button"
          class="state-layer rounded-sm px-3 py-1.5 text-[1rem] font-bold"
          style="color: var(--md-primary)"
          @click="alleOderKeine"
        >
          {{ alleGewaehlt ? 'Keine' : 'Alle' }}
        </button>
      </div>

      <ul class="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
        <li
          v-for="zutat in ingredients"
          :key="zutat.id"
        >
          <button
            type="button"
            class="state-layer flex min-h-12 w-full items-center gap-3 rounded-sm px-2 text-left"
            :aria-pressed="ausgewaehlt.has(zutat.id)"
            @click="umschalten(zutat.id)"
          >
            <UIcon
              :name="ausgewaehlt.has(zutat.id) ? 'i-lucide-square-check-big' : 'i-lucide-square'"
              class="size-5 shrink-0"
              :style="{ color: ausgewaehlt.has(zutat.id) ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }"
            />
            <span class="min-w-0 grow truncate text-[1.25rem]">{{ zutat.name }}</span>
            <span
              v-if="zutat.quantity > 1"
              class="shrink-0 text-[1rem] font-bold"
              style="color: var(--md-on-surface-variant)"
            >{{ zutat.quantity }}&times;</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Schritt 2: Ziel wählen -->
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <span
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >{{ auswahl.length === 1 ? '1 Zutat' : `${auswahl.length} Zutaten` }} ausgewählt</span>

      <ul
        v-if="zielListen.length"
        class="flex max-h-[40vh] flex-col gap-1 overflow-y-auto"
      >
        <li
          v-for="eintrag in zielListen"
          :key="eintrag.list.id"
        >
          <button
            type="button"
            class="state-layer flex min-h-12 w-full items-center gap-3 rounded-sm px-2 text-left"
            :disabled="laeuft"
            @click="uebernehmen(eintrag.list.id, eintrag.list.name)"
          >
            <span
              class="size-3 shrink-0 rounded-full"
              :style="{ background: eintrag.list.color }"
            />
            <span class="min-w-0 grow truncate text-[1.25rem]">{{ eintrag.list.name }}</span>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-5 shrink-0"
              style="color: var(--md-on-surface-variant)"
            />
          </button>
        </li>
      </ul>

      <div class="flex flex-col gap-2">
        <span
          class="text-[1rem] font-bold"
          style="color: var(--md-on-surface-variant)"
        >Oder eine neue Liste</span>
        <div class="flex items-center gap-2">
          <UInput
            v-model="neueListe"
            placeholder="Name der Liste"
            class="grow"
            @keydown.enter="inNeueListe"
          />
          <UButton
            :disabled="neueListe.trim().length === 0 || laeuft"
            icon="i-lucide-plus"
            aria-label="Neue Liste anlegen und Zutaten übernehmen"
            @click="inNeueListe"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <UButton
          v-if="schritt === 2"
          variant="ghost"
          icon="i-lucide-arrow-left"
          label="Zurück"
          @click="schritt = 1"
        />
        <span v-else />

        <UButton
          v-if="schritt === 1"
          :disabled="ausgewaehlt.size === 0"
          trailing-icon="i-lucide-arrow-right"
          label="Weiter"
          @click="schritt = 2"
        />
      </div>
    </template>
  </AppSheet>
</template>

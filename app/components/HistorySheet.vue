<script setup lang="ts">
import { getHistoryForParent } from '~/db/repositories'
import type { HistoryEntryRow } from '~/db/schema'
import { formatRelativeTime } from '~/utils/relativeTime'

/**
 * Der Verlauf einer Liste oder eines Rezepts — das Gegenstück zu Androids
 * HistorySheet: Gelöschtes landet hier und lässt sich wiederherstellen.
 *
 * Die Einträge kommen aus der lokalen Datenbank (`getHistoryForParent`), die
 * bereits filtert (nur Löschungen), sortiert (neueste zuerst) und auf 50
 * kappt. In geteilten Listen stehen darunter auch Einträge ANDERER
 * Mitglieder — dann nennt die Zeitzeile den Namen, aufgelöst über dieselbe
 * Funktion wie "bearbeitet von" an den Items.
 *
 * Das Wiederherstellen selbst gehört der Seite (`@restore`): Nur sie kennt
 * die Schreibwege ihres Bereichs — Listeneintrag reaktivieren ist etwas
 * anderes als eine Zutat oder einen Schritt zurückzuholen.
 */
const { parentId, resolveCreatorName } = defineProps<{
  parentId: string
  /**
   * Löst `createdBy` in einen Anzeigenamen auf — dieselbe Signatur wie
   * `modifierName` in der Listendetailansicht. `null` heisst "nichts
   * anzeigen": eigener Eintrag, keine geteilte Liste oder Mitglied nicht
   * (mehr) bekannt. Rezepte haben keine Mitglieder und lassen die Prop weg.
   */
  resolveCreatorName?: (createdBy: string | null) => string | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ restore: [entry: HistoryEntryRow] }>()

const entries = ref<HistoryEntryRow[]>([])

// Erst beim Öffnen laden — und bei jedem Öffnen frisch: Zwischen zwei
// Blicken in den Verlauf kann der Abgleich fremde Einträge gebracht haben.
watch(isOpen, (open) => {
  if (!open) return
  void getHistoryForParent(parentId)
    .then((rows) => {
      entries.value = rows
    })
    .catch((error: unknown) => {
      console.error('[Verlauf] Laden aus der lokalen Datenbank fehlgeschlagen:', error)
    })
})

/**
 * Zeitzeile eines Eintrags: relative Zeit, bei fremden Einträgen geteilter
 * Listen ergänzt um "von {Name}" — dasselbe Muster wie Androids
 * HistoryEntryRow (`joinToString(" · ")`).
 */
function metaLine(entry: HistoryEntryRow): string {
  const time = formatRelativeTime(entry.createdAt)
  const name = resolveCreatorName?.(entry.createdBy) ?? null
  return name === null ? time : `${time} · von ${name}`
}
</script>

<template>
  <AppSheet
    v-model:open="isOpen"
    title="Verlauf"
  >
    <ul
      v-if="entries.length"
      class="flex flex-col"
    >
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="flex items-center gap-3 border-b py-3 last:border-b-0"
        style="border-color: var(--md-outline-variant)"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="size-4.5 shrink-0"
          style="color: var(--md-delete-content)"
        />

        <div class="min-w-0 grow">
          <p class="truncate text-[1.25rem]">
            {{ entry.description }}
          </p>
          <p
            class="text-[0.875rem]"
            style="color: var(--md-on-surface-variant)"
          >
            {{ metaLine(entry) }}
          </p>
        </div>

        <UButton
          icon="i-lucide-undo-2"
          color="neutral"
          variant="outline"
          size="sm"
          class="shrink-0 font-bold"
          @click="emit('restore', entry)"
        >
          Wiederherstellen
        </UButton>
      </li>
    </ul>

    <p
      v-else
      class="py-2 text-[1rem]"
      style="color: var(--md-on-surface-variant); text-wrap: pretty"
    >
      Noch kein Verlauf. Gelöschtes landet hier und lässt sich wiederherstellen.
    </p>
  </AppSheet>
</template>

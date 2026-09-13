<script setup lang="ts">
import type { GeneratedList } from '~/ai/contract'
import { appendImportedItems, createImportedList } from '~/db/repositories'

const { initialUrl = null, initialListId = null } = defineProps<{
  initialUrl?: string | null
  initialListId?: string | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()
const { entries, reload } = useLists()
const { scheduleSync } = useSync()
const toast = useToast()
const result = ref<GeneratedList | null>(null)
const selected = ref<boolean[]>([])
const target = ref('new')
const saving = ref(false)
const error = ref<string | null>(null)
const targets = computed(() => [
  { label: 'Neue Liste erstellen', value: 'new' },
  ...entries.value.filter(entry => !entry.list.secret).map(entry => ({ label: entry.list.name, value: entry.list.id })),
])
const chosenItems = computed(() => result.value?.items.filter((_item, index) => selected.value[index]) ?? [])
const extracting = computed({
  get: () => open.value && result.value === null,
  // Das Extraktionsblatt schließt nach `created`; die Vorschau bleibt offen.
  set: (value: boolean) => { if (!value && result.value === null) open.value = false },
})
const reviewing = computed({
  get: () => open.value && result.value !== null,
  set: (value: boolean) => { if (!saving.value) open.value = value },
})
watch(open, (value) => {
  if (!value) return
  result.value = null
  error.value = null
  target.value = initialListId ?? 'new'
  void reload()
})
function review(generated: GeneratedList): void {
  result.value = generated
  selected.value = generated.items.map(() => true)
}
async function save(): Promise<void> {
  if (saving.value || result.value === null || chosenItems.value.length === 0) return
  saving.value = true
  error.value = null
  let createdId: string | null = null
  const count = chosenItems.value.length
  try {
    if (target.value === 'new') {
      const created = await createImportedList({ ...result.value, items: chosenItems.value })
      createdId = created.id
    }
    else {
      await appendImportedItems(target.value, chosenItems.value)
    }
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Die Einträge konnten nicht gespeichert werden.'
    return
  }
  finally { saving.value = false }

  // Ab hier sind alle Daten committed. Nachgelagerte UI-Fehler dürfen die
  // Auswahl nicht wieder als ungespeichert oder erneut importierbar anbieten.
  open.value = false
  emit('saved')
  try {
    scheduleSync()
    toast.add({ title: createdId === null ? `${count} Einträge hinzugefügt` : 'Liste erstellt', icon: 'i-lucide-list-plus' })
    await reload()
    if (createdId !== null) await navigateTo(`/app/lists/${createdId}`)
  }
  catch (cause) {
    console.warn('[Link-Import] Gespeichert, Ansicht konnte nicht aktualisiert werden', cause)
    toast.add({ title: 'Gespeichert', description: 'Öffne die Listenübersicht erneut, um die Einträge zu sehen.', icon: 'i-lucide-check' })
  }
}
</script>

<template>
  <AiCreateListSheet
    v-model:open="extracting"
    mode="url"
    :initial-url="initialUrl"
    review-before-save
    @created="review"
  />
  <AppSheet
    v-model:open="reviewing"
    title="Einträge übernehmen"
    description="Prüfe die Auswahl und wähle, wohin die Einträge gehören."
  >
    <div
      v-if="result"
      class="flex flex-col gap-4"
    >
      <UFormField label="Ziel">
        <USelect
          v-model="target"
          :items="targets"
          :disabled="saving"
          size="xl"
          class="w-full"
        />
      </UFormField>
      <p
        class="text-sm"
        style="color: var(--md-on-surface-variant)"
      >
        {{ target === 'new' ? `Neue Liste: ${result.name}` : 'Die Auswahl wird ergänzt. Vorhandene Einträge bleiben erhalten.' }}
      </p>
      <div
        class="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-xl border p-4"
        style="border-color: var(--md-outline-variant)"
      >
        <UCheckbox
          v-for="(item, index) in result.items"
          :key="index"
          v-model="selected[index]"
          :label="`${item.quantity}× ${item.name}`"
          :disabled="saving"
        />
        <p v-if="result.items.length === 0">
          Keine Einträge gefunden. Versuche einen anderen Link.
        </p>
      </div>
      <p
        v-if="error"
        role="alert"
        class="text-sm text-error"
      >
        {{ error }}
      </p>
      <UButton
        :loading="saving"
        :disabled="saving || chosenItems.length === 0"
        size="xl"
        class="justify-center rounded-xl"
        @click="save"
      >
        {{ chosenItems.length }} Einträge {{ target === 'new' ? 'in neuer Liste speichern' : 'hinzufügen' }}
      </UButton>
    </div>
  </AppSheet>
</template>

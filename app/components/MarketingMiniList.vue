<script setup lang="ts">
import type { MarketingStory } from '~/data/marketingStories'

const props = defineProps<{ list: NonNullable<MarketingStory['miniList']> }>()
const selected = ref<string[]>([...props.list.items])
const draft = ref(props.list.items.join('\n'))
const edited = ref(false)
const message = ref('')
const fieldId = useId()
watch(selected, (value) => {
  if (!edited.value) draft.value = value.join('\n')
  message.value = ''
})
function edit() {
  edited.value = true
  message.value = ''
}
function rebuild() {
  draft.value = selected.value.join('\n')
  edited.value = false
  message.value = 'Der Text wurde aus deiner Auswahl neu erstellt.'
}
async function copy() {
  try {
    await navigator.clipboard.writeText(draft.value)
    message.value = 'Kopiert. Du kannst den Text jetzt einfügen oder weitergeben.'
  }
  catch {
    message.value = 'Kopieren ist hier nicht verfügbar. Markiere den Text oder lade ihn als Datei herunter.'
  }
}
function download() {
  const url = URL.createObjectURL(new Blob([`${props.list.title}\n\n${draft.value}\n`], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'meine-einkaufsliste.txt'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  message.value = 'Die Textdatei ist zum Speichern bereit.'
}
</script>

<template>
  <section
    id="ausprobieren"
    class="mini-list"
    aria-label="Einkaufsliste zum Anpassen"
  >
    <div class="mini-list-heading">
      <span><UIcon name="i-lucide-list-checks" /></span><p class="mkt-label">
        Direkt hier ausprobieren
      </p>
    </div>
    <h2>{{ list.title }}</h2><p class="mini-list-intro">
      {{ list.intro }}
    </p>
    <fieldset>
      <legend>Das fehlt noch</legend><label
        v-for="item in list.items"
        :key="item"
      ><input
        v-model="selected"
        type="checkbox"
        :value="item"
      ><span>{{ item }}</span></label>
    </fieldset>
    <label
      :for="fieldId"
      class="draft-label"
    >Deine Liste als Text</label><textarea
      :id="fieldId"
      v-model="draft"
      rows="8"
      spellcheck="false"
      @input="edit"
    />
    <div
      v-if="edited"
      class="draft-hint"
    >
      <p>Dein Text bleibt beim Ändern der Auswahl erhalten.</p><button
        type="button"
        @click="rebuild"
      >
        Text durch aktuelle Auswahl ersetzen
      </button>
    </div>
    <div class="mini-list-buttons">
      <button
        type="button"
        :disabled="!draft.trim()"
        @click="copy"
      >
        <UIcon name="i-lucide-copy" /> Text kopieren
      </button><button
        type="button"
        :disabled="!draft.trim()"
        @click="download"
      >
        <UIcon name="i-lucide-download" /> Als Text speichern
      </button>
    </div>
    <p
      class="mini-list-message"
      role="status"
    >
      {{ message }}
    </p><p class="mini-list-note">
      {{ list.note }}
    </p><p class="mini-list-local">
      Diese Auswahl bleibt nur auf dieser Seite und wird beim Neuladen zurückgesetzt. Kopiere oder speichere sie vorher. Es wird keine App-Liste angelegt.
    </p>
  </section>
</template>

<style scoped>
.mini-list{scroll-margin-top:120px;margin:38px 0;padding:30px;border-radius:25px;border:1px solid color-mix(in srgb,var(--demo-accent) 20%,transparent);background:color-mix(in srgb,var(--demo-soft) 45%,var(--md-surface))}.mini-list-heading{display:flex;gap:10px;align-items:center;margin-bottom:18px}.mini-list-heading>span{display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:var(--md-surface);color:var(--demo-accent)}.mini-list-heading .iconify{width:22px;height:22px}.mini-list-heading p{margin:0}.mini-list h2{font-size:1.812rem;line-height:1.15;font-weight:800;letter-spacing:-.025em}.mini-list-intro{font-size:1.062rem;line-height:1.7;margin:16px 0 22px}.mini-list fieldset{border:0;margin:0 0 24px;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}.mini-list legend{font-weight:750;font-size:0.9375rem;margin-bottom:12px}.mini-list fieldset label{display:grid;grid-template-columns:1.375rem minmax(0,1fr);gap:12px;align-items:center;min-height:48px;font-size:1.125rem;line-height:1.35;cursor:pointer;padding:10px 0}.mini-list input{appearance:auto;width:1.375rem;height:1.375rem;margin:0;align-self:center;accent-color:var(--demo-accent)}.mini-list fieldset label>span{display:block;transform:translateY(1px)}.draft-label{display:block;font-weight:750;font-size:0.9375rem;margin-bottom:10px}.mini-list textarea{display:block;width:100%;resize:vertical;min-height:180px;border:1px solid color-mix(in srgb,var(--demo-accent) 25%,transparent);border-radius:15px;padding:16px;background:var(--md-surface);font:inherit;font-size:1rem;line-height:1.65;color:var(--md-on-surface)}.draft-hint{font-size:0.8125rem;line-height:1.6;margin-top:10px}.draft-hint button{text-decoration:underline;cursor:pointer;color:var(--demo-accent);padding-block:8px;min-height:44px;text-align:left}.mini-list-buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.mini-list-buttons button{display:flex;gap:9px;align-items:center;justify-content:center;min-height:46px;border-radius:25px;padding:11px 18px;background:var(--demo-accent);color:white;font-size:0.875rem;font-weight:700;cursor:pointer}.mini-list-buttons button:last-child{background:var(--md-surface);color:var(--demo-accent);border:1px solid color-mix(in srgb,var(--demo-accent) 25%,transparent)}.mini-list-buttons .iconify{width:18px;height:18px;flex-shrink:0}.mini-list-buttons button:disabled{opacity:.45;cursor:default}.mini-list-message{min-height:44px;margin:12px 0 0;font-size:0.8125rem;line-height:1.6;color:var(--demo-accent)}.mini-list-note{font-size:0.875rem;line-height:1.7}.mini-list-local{font-size:0.75rem;line-height:1.6;margin-top:12px;color:var(--md-on-surface-variant)}.mini-list :is(input,button,textarea):focus-visible{outline:2px solid var(--demo-accent);outline-offset:4px}
@media(max-width:580px){.mini-list{padding:23px 18px}.mini-list h2{font-size:1.562rem}.mini-list fieldset{grid-template-columns:1fr;gap:0}.mini-list-buttons{flex-direction:column}.mini-list-buttons button{width:100%}}
</style>

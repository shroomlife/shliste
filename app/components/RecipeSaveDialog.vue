<script setup lang="ts">
import type { CatalogRecipe } from '~~/lib/editorial'
import { importCatalogRecipe } from '~/db/catalog-import'
import { getIngredientsForRecipe } from '~/db/repositories'
import { parseEditorialMetadata } from '~~/lib/editorial'
import { androidRecipeLinks } from '~~/lib/android-recipe-link'

const props = defineProps<{ recipe: CatalogRecipe, webOnly?: boolean, initialCopy?: boolean }>()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const headingId = useId()
const busy = ref(false)
const status = ref('')
const error = ref('')
const asCopy = ref(props.initialCopy ?? false)
const requestOrigin = useRequestURL().origin
const isAndroid = ref(false)
onMounted(() => {
  isAndroid.value = /Android/i.test(navigator.userAgent)
})
const nativeLinks = computed(() => androidRecipeLinks(props.recipe.catalogId, props.recipe.version, asCopy.value, requestOrigin))
const { scheduleSync } = useSync()
const { entries, reload } = useRecipes()
const arrival = useRecipeCollectionArrival()
const committed = ref<Awaited<ReturnType<typeof importCatalogRecipe>> | null>(null)

function openPicker() {
  committed.value = null
  asCopy.value = false
  error.value = ''
  dialog.value?.showModal()
}

async function save() {
  if (busy.value) return
  busy.value = true
  status.value = 'Rezept wird gespeichert …'
  error.value = ''
  try {
    committed.value ??= await importCatalogRecipe(props.recipe, asCopy.value)
    const result = committed.value
    scheduleSync()
    const [items] = await Promise.all([getIngredientsForRecipe(result.recipeId), reload()])
    const saved = entries.value.find(entry => entry.recipe.id === result.recipeId)?.recipe
    if (!saved) throw new Error('Rezept nicht verfügbar')
    dialog.value?.close()
    arrival.value = {
      recipeId: saved.id,
      title: saved.name,
      image: resolveRecipeImageUrl(saved.imagePath) ?? parseEditorialMetadata(saved.editorialMetadata)?.hero.src ?? props.recipe.hero.src,
      ingredients: items.slice(0, 3).map(item => item.name),
      ingredientCount: items.length,
      created: result.created,
      ready: false,
    }
    const failure = await navigateTo(`/app/recipes/${saved.id}`)
    if (failure) throw failure
  }
  catch {
    arrival.value = null
    if (dialog.value?.isConnected && !dialog.value.open) dialog.value.showModal()
    error.value = committed.value ? 'Das Rezept ist gespeichert. Versuche, es erneut zu öffnen.' : 'Das Speichern hat nicht geklappt. Prüfe, ob dein Browser lokalen Speicher erlaubt und noch Platz frei ist.'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="recipe-save-button"
    :disabled="busy"
    @click="webOnly ? save() : openPicker()"
  >
    <RecipeActionLabel icon="i-lucide-bookmark-plus">
      {{ busy ? status : webOnly ? 'In der Web-App speichern' : 'In meiner Rezeptsammlung speichern' }}
    </RecipeActionLabel>
  </button>
  <dialog
    ref="dialog"
    :aria-labelledby="headingId"
    class="recipe-save-dialog"
    @cancel="busy && $event.preventDefault()"
  >
    <button
      type="button"
      class="recipe-dialog-close"
      aria-label="Auswahl schließen"
      :disabled="busy"
      @click="dialog?.close()"
    >
      <UIcon
        mode="svg"
        name="i-lucide-x"
      />
    </button>
    <div class="recipe-dialog-intro">
      <img
        :src="recipe.hero.src"
        alt=""
        width="84"
        height="64"
      >
      <div>
        <span class="recipe-dialog-eyebrow">Deine Rezeptsammlung</span>
        <h2 :id="headingId">
          {{ recipe.title }}
        </h2>
      </div>
    </div>
    <label class="recipe-copy">
      <input
        v-model="asCopy"
        type="checkbox"
        :disabled="busy || !!committed"
      >
      <span><strong>Als zusätzliche Kopie speichern</strong><small>Zum Abwandeln. Deine bisherige Fassung bleibt erhalten.</small></span>
    </label>
    <button
      type="button"
      class="recipe-platform"
      :aria-label="busy ? status : committed ? 'Gespeichertes Rezept öffnen' : 'In der Web-App speichern'"
      :disabled="busy"
      @click="save"
    >
      <UIcon
        mode="svg"
        :name="busy ? 'i-lucide-loader-circle' : 'i-lucide-globe'"
        :class="{ 'loading-wheel': busy }"
      /><span><strong role="status">{{ busy ? status : committed ? 'Gespeichertes Rezept öffnen' : 'In der Web-App speichern' }}</strong><small>Direkt hier · auch auf Android und iPhone · ohne Anmeldung</small></span><UIcon
        mode="svg"
        name="i-lucide-arrow-right"
      />
    </button>
    <a
      :href="isAndroid ? nativeLinks.intent : nativeLinks.path"
      class="recipe-platform"
      :aria-disabled="busy"
      @click="busy ? $event.preventDefault() : dialog?.close()"
    >
      <UIcon
        mode="svg"
        name="i-lucide-smartphone"
      /><span><strong>In der Android-App öffnen</strong><small>Mit Zutaten, Schritten und Bildern · aktuelle App-Version erforderlich</small></span><UIcon
        mode="svg"
        name="i-lucide-arrow-up-right"
      />
    </a>
    <div class="recipe-platform recipe-platform--later">
      <UIcon
        mode="svg"
        name="i-lucide-smartphone"
      /><span><strong>iOS-App</strong><small>Auf dem iPhone ist die Web-App verfügbar.</small></span><span class="recipe-later-label">Bald</span>
    </div>
    <p
      v-if="error"
      role="alert"
      class="recipe-save-error"
    >
      {{ error }}
    </p>
  </dialog>
</template>

<style scoped>
.recipe-save-button{display:inline-flex;gap:10px;align-items:center;justify-content:center;min-height:54px;padding:14px 22px;border-radius:999px;background:var(--md-primary);color:var(--md-on-primary);font-size:clamp(1rem,4.1vw,1.25rem);font-weight:700;line-height:1.2;text-align:center;box-shadow:0 5px 18px #50345918}.recipe-save-button:hover{filter:brightness(1.08)}.recipe-save-button:focus-visible{outline:3px solid var(--md-primary);outline-offset:4px}.recipe-save-button>.iconify{flex-shrink:0;width:22px;height:22px}
.recipe-save-dialog {
  width: min(31rem, calc(100% - 1.5rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: auto;
  padding: clamp(1rem, 4vw, 1.75rem);
  border: 1px solid var(--md-outline-variant);
  border-radius: 1.5rem;
  color: var(--md-on-surface);
  background: var(--md-surface);
  box-shadow: 0 16px 64px #29132926;
}
.recipe-save-dialog::backdrop { background: rgb(38 26 42 / 58%); }
.recipe-dialog-close { float: right; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--md-surface-container); }
.recipe-dialog-intro { display: flex; align-items: center; gap: .85rem; margin: 0 3rem 1.2rem 0; }
.recipe-dialog-intro img { width: clamp(3rem, 12vw, 5rem); aspect-ratio: 1.2; border-radius: .85rem; object-fit: cover; }
.recipe-dialog-eyebrow { font-size: .84rem; color: var(--md-primary); font-weight: 700; }
.recipe-save-dialog h2 { margin-top: .25rem; font-size: clamp(1.3rem, 4vw, 1.75rem); line-height: 1.15; font-weight: 800; overflow-wrap: anywhere; }
.recipe-copy, .recipe-platform { display: grid; align-items: start; gap: .7rem; padding: .9rem; border-radius: 1rem; text-align: left; }
.recipe-copy { grid-template-columns: 1.25rem 1fr; background: var(--md-surface-container); cursor: pointer; }
.recipe-copy input { appearance: auto; width: 1.2rem; height: 1.2rem; margin: .15rem 0 0; accent-color: var(--md-primary); }
.recipe-platform { grid-template-columns: 1.4rem minmax(0,1fr) auto; width: 100%; margin-top: .6rem; border: 1px solid var(--md-outline-variant); }
.recipe-platform:is(button) { background: var(--md-primary); color: var(--md-on-primary); border-color: transparent; }
.recipe-platform:is(button):hover { background: color-mix(in srgb, var(--md-primary) 93%, black); }
.recipe-platform:is(button):disabled { cursor: progress; }
.recipe-platform strong, .recipe-copy strong { display: block; font-weight: 700; font-size: 1.05rem; line-height: 1.5rem; }
.recipe-platform small, .recipe-copy small { display: block; margin-top: .18rem; font-size: .91rem; line-height: 1.35; }
.recipe-platform > svg, .recipe-platform > .iconify { width: 1.25rem; height: 1.25rem; align-self: start; margin-top: .125rem; }
.recipe-later-label { padding: 0 .55rem; font-size: .8rem; line-height: 1.5rem; border-radius: 1rem; background: var(--md-surface-container); }
.recipe-platform--later { color: var(--md-on-surface-variant); }
.recipe-save-error { margin-top: 1rem; color: var(--md-error); }
@media (prefers-reduced-motion: no-preference) {
  .recipe-save-dialog[open] { animation: picker-enter 160ms ease-out; }
  .loading-wheel { animation: recipe-spin .85s linear infinite; }
}
@keyframes picker-enter { from { opacity: 0; transform: translateY(5px); } }
@keyframes recipe-spin { to { transform: rotate(1turn); } }
@media print{.recipe-save-button,.recipe-save-dialog{display:none}}
</style>

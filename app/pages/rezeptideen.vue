<script setup lang="ts">
import { useDocumentVisibility, useElementVisibility, useMediaQuery } from '@vueuse/core'
import { durationLabel } from '~~/lib/editorial'
import { filterRecipeIdeas } from '~~/lib/recipe-filters'

const { data: catalog } = await useFetch('/api/recipe-catalog/v1')
const route = useRoute()
const router = useRouter()
const readQuery = (key: string) => typeof route.query[key] === 'string' ? route.query[key] as string : ''
const search = computed({ get: () => readQuery('q'), set: value => setFilter('q', value) })
function setFilter(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value || undefined } })
}
const ideas = computed(() => catalog.value?.ideas ?? [])
const previewMotifs: Record<string, string> = {
  'crispy-rice-salad': 'Knuspriger Reissalat mit Gurke, Kräutern und Limette.',
  'hafer-bananen-pancakes': 'Goldene Hafer-Pancakes mit Bananenscheiben und Ahornsirup.',
  'knusprige-ofenkartoffeln': 'Geröstete Kartoffeln mit Rosmarin und pflanzlichem Kräuterdip.',
  'seidentofu-schokomousse': 'Dunkle Schokoladenmousse in Dessertgläsern mit Schokoladenspänen.',
}
const slides = computed(() => {
  const ready = catalog.value?.recipes ?? []
  const recipes = ready.map(recipe => ({
    id: recipe.catalogId, title: recipe.title, image: recipe.hero,
    label: 'Zum Nachkochen', detail: 'ca. ' + durationLabel(recipe),
    to: '/rezepte/' + recipe.slug,
  }))
  const previews = Object.entries(previewMotifs).flatMap(([id, alt]) => {
    const idea = ideas.value.find(item => item.id === id)
    if (!idea || ready.some(recipe => recipe.catalogId === id)) return []
    return [{ id, title: idea.title, image: { src: '/images/editorial/' + id + '/v1/hero.webp', alt },
      label: 'Rezeptidee entdecken', detail: idea.meal,
      to: '/rezeptideen?q=' + encodeURIComponent(idea.title) + '#rezeptideen' }]
  })
  return [...recipes, ...previews].slice(0, 5)
})
const carousel = useTemplateRef<HTMLElement>('carousel')
const inView = useElementVisibility(carousel)
const visibility = useDocumentVisibility()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const current = ref(0)
const paused = ref(false)
const hovered = ref(false)
watchEffect((onCleanup) => {
  const count = slides.value.length
  const next = (current.value + 1) % Math.max(count, 1)
  if (!import.meta.client || count < 2 || paused.value || hovered.value || reducedMotion.value || !inView.value || visibility.value !== 'visible') return
  const timer = setTimeout(() => {
    current.value = next
  }, 6000)
  onCleanup(() => clearTimeout(timer))
})
function selectSlide(index: number) {
  current.value = index
  paused.value = true
}
const filterFields = [
  { key: 'mahlzeit', label: 'Mahlzeit', icon: 'i-lucide-utensils', options: [['all', 'Alle Mahlzeiten'], ...['Hauptgericht', 'Salat', 'Snack', 'Dessert', 'Frühstück'].map(meal => [meal, meal])] },
  { key: 'zeit', label: 'Zeit', icon: 'i-lucide-clock', options: [['all', 'Jede Dauer'], ['30', 'Bis 30 Minuten'], ['60', 'Bis 60 Minuten'], ['90', 'Bis 90 Minuten']] },
  { key: 'niveau', label: 'Schwierigkeit', icon: 'i-lucide-chef-hat', options: [['all', 'Jedes Niveau'], ['einfach', 'Einfach'], ['mittel', 'Mittel']] },
  { key: 'sortierung', label: 'Sortierung', icon: 'i-lucide-arrow-down-up', options: [['all', 'Unsere Empfehlungen'], ['alphabet', 'Alphabetisch'], ['duration', 'Zubereitungszeit']] },
].map(field => ({ ...field, items: field.options.map(([value, label]) => ({ value: value!, label: label! })) }))
const { favorites, notice, toggleFavorite } = useWebsiteRecipeFavorites()
const favoritesOnly = computed(() => readQuery('favoriten') === '1')
const results = computed(() => {
  const recipes = catalog.value?.recipes ?? []
  const ready = new Map(recipes.map(recipe => [recipe.catalogId, recipe]))
  return filterRecipeIdeas(ideas.value, { q: search.value, kind: readQuery('art'), meal: readQuery('mahlzeit'), maxMinutes: Number(readQuery('zeit')) || undefined, difficulty: readQuery('niveau'), sort: readQuery('sortierung') }, recipes).filter(idea => !favoritesOnly.value || favorites.value.includes(idea.id)).map(idea => ({ ...idea, recipe: ready.get(idea.id) }))
})
const filtersActive = computed(() => ['favoriten', 'q', 'art', 'mahlzeit', 'zeit', 'niveau', 'sortierung'].some(key => readQuery(key)))
useSeoMeta({ title: 'Rezepte aus unserer Küche · shliste', description: 'Kochideen zum Verlieben: ausführliche Schritte, liebevolle Illustrationen und deine eigene Rezeptsammlung. Alle Rezepte sind pflanzlich.', robots: catalog.value?.preview ? 'noindex, nofollow' : 'index, follow' })
useHead({ link: [{ rel: 'canonical', href: 'https://shliste.app/rezeptideen' }] })
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="cookbook mkt-shell"
    >
      <section class="cookbook-intro">
        <div class="cookbook-intro-copy">
          <p class="cookbook-eyebrow">
            Das shliste Rezeptbuch
          </p><h1>Heute etwas<br><em>richtig Gutes.</em></h1><p class="cookbook-lead">
            Für gemütliche Abende, süße Pausen und das kleine Glück, selbst zu kochen.
          </p><p class="cookbook-subline">
            Alles pflanzlich. Schritt für Schritt. Aus unserer Küche.
          </p><a
            href="#rezeptideen"
            class="cookbook-jump"
          >Dein nächstes Lieblingsrezept finden <UIcon name="i-lucide-arrow-down" /></a>
        </div>
        <section
          v-if="slides.length"
          ref="carousel"
          class="cookbook-carousel"
          aria-label="Ausgewählte Rezeptideen"
          aria-roledescription="Karussell"
          @pointerenter="hovered = $event.pointerType === 'mouse'"
          @pointerleave="hovered = false"
          @keydown.left.prevent="selectSlide((current - 1 + slides.length) % slides.length)"
          @keydown.right.prevent="selectSlide((current + 1) % slides.length)"
        >
          <div class="slide-stack">
            <NuxtLink
              v-for="(slide, index) in slides"
              :key="slide.id"
              :to="slide.to"
              class="cookbook-featured"
              :class="{ 'slide-current': current === index }"
              :inert="current !== index"
              :aria-hidden="current !== index"
              :aria-label="slide.title + ' · ' + slide.label"
              @focus="paused = true"
            >
              <EditorialImage
                :image="slide.image"
                :eager="index === 0"
                :zoom="false"
              />
              <div class="cookbook-featured-caption">
                <div><p>{{ slide.label }}</p><h2><RecipeActionLabel
                  icon="i-lucide-arrow-right"
                  trailing
                >{{ slide.title }}</RecipeActionLabel></h2></div>
                <span>{{ slide.detail }}</span>
              </div>
            </NuxtLink>
          </div>
          <div
            v-if="slides.length > 1"
            class="slide-controls"
          >
            <button
              v-for="(slide, index) in slides"
              :key="slide.id"
              type="button"
              :aria-label="'Motiv ' + (index + 1) + ': ' + slide.title"
              :aria-pressed="current === index"
              @focus="paused = true"
              @click="selectSlide(index)"
            >
              <span />
            </button>
            <button
              v-if="!reducedMotion"
              type="button"
              class="slide-play"
              :aria-label="paused ? 'Bildwechsel starten' : 'Bildwechsel pausieren'"
              @click="paused = !paused"
            >
              <UIcon
                :name="paused ? 'i-lucide-play' : 'i-lucide-pause'"
                mode="svg"
              />
            </button>
          </div>
        </section>
      </section>
      <section
        id="rezeptideen"
        class="cookbook-collection"
      >
        <div class="cookbook-section-heading">
          <div>
            <p class="cookbook-eyebrow">
              Lass dich inspirieren
            </p><h2>Worauf hast du Lust?</h2>
            <p
              v-if="catalog?.preview"
              class="collection-count"
            >
              {{ catalog.recipes.length }} zum Nachkochen<span v-if="ideas.length > catalog.recipes.length"> · {{ ideas.length - catalog.recipes.length }} weitere {{ ideas.length - catalog.recipes.length === 1 ? 'Idee' : 'Ideen' }}</span>
            </p>
          </div>
          <div class="cookbook-local-favorites">
            <button
              type="button"
              :aria-pressed="favoritesOnly"
              @click="setFilter('favoriten', favoritesOnly ? '' : '1')"
            >
              <UIcon
                name="i-lucide-heart"
                mode="svg"
                aria-hidden="true"
              /><span>Meine Favoriten ({{ favorites.length }})</span>
            </button>
            <small>Nur in diesem Browser gespeichert.</small>
          </div>
        </div>
        <div class="cookbook-filters">
          <label class="cookbook-search"><UIcon name="i-lucide-search" /><input
            v-model="search"
            type="search"
            aria-label="Rezepte und Zutaten suchen"
            placeholder="Rezept oder Zutat suchen …"
          ></label>
          <div
            class="cookbook-kind"
            role="group"
            aria-label="Rezeptart"
          >
            <button
              v-for="kind in [{ value: '', label: 'Alles entdecken', icon: '' }, { value: 'herzhaft', label: 'Herzhaft', icon: 'i-lucide-cooking-pot' }, { value: 'suess', label: 'Süß', icon: 'i-lucide-cake-slice' }]"
              :key="kind.value"
              type="button"
              :aria-pressed="readQuery('art') === kind.value"
              @click="setFilter('art', kind.value)"
            >
              <UIcon
                v-if="kind.icon"
                :name="kind.icon"
                mode="svg"
                aria-hidden="true"
              /><span>{{ kind.label }}</span>
            </button>
          </div>
          <p
            v-if="notice"
            role="status"
          >
            {{ notice }}
          </p>
          <div class="cookbook-selects">
            <div
              v-for="field in filterFields"
              :key="field.key"
              class="cookbook-filter"
            >
              <label :for="`filter-${field.key}`">{{ field.label }}</label>
              <USelect
                :id="`filter-${field.key}`"
                :model-value="readQuery(field.key) || 'all'"
                :items="field.items"
                :icon="field.icon"
                size="xl"
                class="w-full rounded-xl"
                @update:model-value="value => setFilter(field.key, value === 'all' ? '' : String(value))"
              />
            </div>
          </div>
        </div>
        <div class="cookbook-resultline">
          <p aria-live="polite">
            {{ results.length }} {{ results.length === 1 ? 'Idee' : 'Ideen' }} <span v-if="readQuery('zeit') || readQuery('niveau')">· Rechercheideen ohne geprüfte Angaben werden ausgeblendet.</span>
          </p><button
            v-if="filtersActive"
            type="button"
            @click="router.replace({ query: {} })"
          >
            Filter zurücksetzen
          </button>
        </div>
        <div
          v-if="results.length"
          class="cookbook-grid"
        >
          <article
            v-for="idea in results"
            :key="idea.id"
            class="cookbook-card"
            :class="{ 'cookbook-card--ready': idea.recipe }"
          >
            <NuxtLink
              v-if="idea.recipe"
              :to="`/rezepte/${idea.recipe.slug}`"
              class="cookbook-card-image"
            ><EditorialImage
              :image="idea.recipe.hero"
              :zoom="false"
            /><span class="cookbook-card-badge">Rezept ansehen</span></NuxtLink>
            <div
              v-else
              class="cookbook-idea-art"
              :class="{ 'cookbook-idea-art--sweet': idea.kind === 'suess' }"
            >
              <span aria-hidden="true">{{ idea.emoji }}</span><span class="cookbook-idea-label">Eine Idee für bald</span>
            </div>
            <div class="cookbook-card-copy">
              <div class="card-byline">
                <span class="cookbook-card-meal">{{ idea.meal }}<template v-if="idea.recipe"> · {{ durationLabel(idea.recipe) }} · {{ idea.recipe.difficulty }}</template></span><WebsiteRecipeHeart
                  :active="favorites.includes(idea.id)"
                  :title="idea.title"
                  compact
                  @toggle="toggleFavorite(idea.id)"
                />
              </div><h3>
                <NuxtLink
                  v-if="idea.recipe"
                  :to="`/rezepte/${idea.recipe.slug}`"
                >{{ idea.title }}</NuxtLink><template v-else>
                  {{ idea.title }}
                </template>
              </h3><p>{{ idea.description }}</p>
            </div>
          </article>
        </div>
        <div
          v-else
          class="cookbook-empty"
        >
          <span aria-hidden="true">🥣</span><h3>{{ favoritesOnly && !favorites.length ? 'Deine Lieblingsideen haben hier Platz.' : 'Hier köchelt noch eine Idee.' }}</h3><p>{{ favoritesOnly && !favorites.length ? 'Tippe auf das Herz bei einer Rezeptidee, um sie auf diesem Gerät wiederzufinden.' : 'Zu dieser Auswahl gibt es noch kein passendes Rezept. Probiere einen anderen Filter.' }}</p><button
            type="button"
            @click="router.replace({ query: {} })"
          >
            Alle Ideen entdecken
          </button>
        </div>
      </section>
      <MarketingThemeTeaser />
      <MarketingWaitlistSection />

      <RecipeCollectionBridge />
    </main>
  </MarketingChrome>
</template>

<style scoped>
.cookbook-local-favorites,.card-byline{display:flex;align-items:center;justify-content:space-between;gap:10px}.cookbook-local-favorites{justify-content:flex-start;flex-wrap:wrap}.cookbook-local-favorites small{color:var(--md-on-surface-variant)}.cookbook-local-favorites button{display:inline-flex;align-items:center;gap:8px;min-height:44px;border:1px solid var(--md-outline-variant);border-radius:99px;padding:4px 14px;font-weight:650}.cookbook-local-favorites button[aria-pressed=true]{background:var(--md-primary-container);color:var(--md-on-primary-container)}

.cookbook{padding-block:0 80px}.cookbook-intro{display:grid;grid-template-columns:.95fr 1.05fr;gap:65px;align-items:center;padding:64px 0 78px}.cookbook-eyebrow{text-transform:uppercase;letter-spacing:.15em;font-size:15px;font-weight:700;color:var(--md-primary);margin-bottom:20px}.cookbook h1{font-size:clamp(60px,6.2vw,84px);font-weight:800;line-height:.98;letter-spacing:-.035em;margin:0 0 26px}.cookbook h1 em{font-style:normal;color:var(--md-primary)}.cookbook-lead{font-size:26px;line-height:1.35;max-width:400px}.cookbook-subline{font-size:18px;margin-top:20px;color:var(--md-on-surface-variant)}.cookbook-jump{display:inline-flex;align-items:center;gap:12px;font-size:19px;font-weight:700;margin-top:28px;color:var(--md-primary);text-underline-offset:5px}.cookbook-jump:hover{text-decoration:underline}.cookbook-featured{position:relative;display:block}.cookbook-featured :deep(.editorial-image){border-radius:28px 28px 0 0}.cookbook-featured-caption{background:var(--md-surface-container,#f1e8ef);border-radius:0 0 28px 28px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;gap:10px}.cookbook-featured-caption p{font-size:15px;color:var(--md-on-surface-variant)}.cookbook-featured-caption h2{font-size:29px;line-height:1.2;font-weight:800}.cookbook-featured-caption>span{font-size:18px;white-space:nowrap}.cookbook-section-heading{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:28px}.cookbook-section-heading h2{font-size:44px;line-height:1.1;font-weight:800}.cookbook-section-heading .cookbook-eyebrow{margin-bottom:10px}.cookbook-section-heading>p{font-size:18px;line-height:1.4;color:var(--md-on-surface-variant)}.cookbook-filters{border:1px solid var(--md-outline-variant);border-radius:24px;padding:24px;background:var(--md-surface)}.cookbook-search{display:flex;gap:12px;align-items:center;border:1px solid var(--md-outline-variant);border-radius:12px;padding:10px 16px;background:var(--md-background)}.cookbook-search input{width:100%;min-width:0;outline:none;font-size:21px;min-height:32px}.cookbook-search:focus-within{outline:2px solid var(--md-primary)}.cookbook-kind{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.cookbook-kind button{padding:10px 18px;border-radius:100px;font-size:18px;border:1px solid var(--md-outline-variant);min-height:44px}.cookbook-kind button[aria-pressed=true]{background:var(--md-primary);color:var(--md-on-primary);border-color:var(--md-primary)}.cookbook-selects{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:22px}.cookbook-selects label{display:flex;flex-direction:column;gap:5px;font-size:16px;color:var(--md-on-surface-variant)}.cookbook-selects select{min-width:0;width:100%;border:0;border-bottom:1px solid var(--md-outline-variant);border-radius:0;background:transparent;color:var(--md-on-surface);font-size:18px;min-height:44px;padding:8px 20px 8px 0}.cookbook-resultline{display:flex;gap:12px;justify-content:space-between;padding:20px 2px;font-size:17px;color:var(--md-on-surface-variant)}.cookbook-resultline button{color:var(--md-primary);text-decoration:underline;min-height:44px}.cookbook-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.cookbook-card{border:1px solid var(--md-outline-variant);border-radius:22px;overflow:hidden;background:var(--md-surface);display:flex;flex-direction:column}.cookbook-card--ready{box-shadow:0 8px 24px #47314d0b}.cookbook-card-image{position:relative;display:block}.cookbook-card-image :deep(.editorial-image){border-radius:0}.cookbook-card-badge{position:absolute;top:14px;left:14px;font-size:16px;font-weight:700;background:var(--md-primary);color:var(--md-on-primary);padding:5px 12px;border-radius:99px}.cookbook-idea-art{position:relative;aspect-ratio:2/1;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;background:#edf0e5;background-image:radial-gradient(ellipse at center,#f9f9ef 0%,transparent 70%)}.cookbook-idea-art--sweet{background-color:#f4e9ec;background-image:radial-gradient(ellipse at center,#fcf5ed 0%,transparent 70%)}.cookbook-idea-art>span:first-child{font-size:clamp(48px,5vw,68px);line-height:1;filter:drop-shadow(0 8px 10px #60544612)}.cookbook-idea-label{font-size:15px;line-height:1.2;letter-spacing:.04em;color:#655e61}.cookbook-card-copy{padding:22px;display:flex;flex-direction:column;flex:1}.cookbook-card-meal{font-size:15px;color:var(--md-on-surface-variant)}.cookbook-card h3{font-size:27px;font-weight:800;line-height:1.12;margin:8px 0 12px}.cookbook-card-copy>p{font-size:20px;line-height:1.4}.cookbook-empty{text-align:center;padding:55px 20px;background:var(--md-surface);border-radius:22px}.cookbook-empty>span{font-size:44px}.cookbook-empty h3{font-size:30px;font-weight:700}.cookbook-empty p{font-size:21px}.cookbook-empty button{margin-top:18px;padding:10px 20px;background:var(--md-primary);color:var(--md-on-primary);border-radius:99px}.cookbook-editorial-note{margin-top:65px;display:flex;gap:24px;padding:36px;border-radius:24px;background:var(--md-surface-container)}.cookbook-editorial-note>span{font-size:42px}.cookbook-editorial-note h2{font-size:30px;font-weight:800}.cookbook-editorial-note p{font-size:21px;line-height:1.45;max-width:800px}.cookbook-editorial-note a{display:inline-flex;gap:10px;align-items:center;margin-top:14px;color:var(--md-primary);font-weight:700;font-size:19px}
@media(max-width:950px){.cookbook-intro{gap:30px}.cookbook h1{font-size:62px}.cookbook-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cookbook-selects{grid-template-columns:repeat(2,minmax(0,1fr))}.cookbook-featured-caption{padding:18px}.cookbook-featured-caption h2{font-size:25px}.cookbook-featured-caption>span{display:none}}
@media(max-width:640px){.cookbook{padding-block:0 44px}.cookbook-intro{grid-template-columns:1fr;gap:42px;padding:36px 0 48px}.cookbook h1{font-size:64px;max-width:360px}.cookbook-eyebrow{font-size:13px}.cookbook-lead{font-size:24px}.cookbook-section-heading{display:block}.cookbook-section-heading h2{font-size:36px}.cookbook-section-heading>p{margin-top:15px}.cookbook-filters{padding:16px}.cookbook-kind{gap:6px}.cookbook-kind button{padding:9px 13px;font-size:16px}.cookbook-selects{gap:12px}.cookbook-selects select{font-size:16px}.cookbook-grid{gap:18px;grid-template-columns:1fr}.cookbook-idea-art{aspect-ratio:2/1}.cookbook-editorial-note{padding:24px;gap:14px}.cookbook-editorial-note>span{font-size:26px}.cookbook-editorial-note h2{font-size:26px}.cookbook-editorial-note p{font-size:19px}.cookbook-resultline{font-size:15px}.cookbook-search input{font-size:18px}}

.cookbook-filter { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; min-width: 0; }
.cookbook-filter label { color: var(--md-on-surface-variant); font-size: 16px; font-weight: 700; }
.cookbook-filter button { min-height: 46px; background: var(--md-surface-container-low); }

.cookbook-carousel { min-width: 0; }
.cookbook-card :deep(.editorial-ai), .cookbook-featured :deep(.editorial-ai), .cookbook-card-badge { z-index: 1; }
.cookbook-idea-art { overflow: hidden; }

@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  :is(.cookbook-card, .cookbook-featured) :deep(.editorial-image > img) {
    transition: scale 420ms cubic-bezier(.2,.75,.25,1);
  }
  :is(.cookbook-card, .slide-current):hover :deep(.editorial-image > img) { scale: 1.025; }
  :is(.cookbook-card, .cookbook-featured) :deep(.editorial-image)::after,
  .cookbook-idea-art::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(118deg, transparent 29%, #ffd0e93d 42%, #fff3ce66 48%, #bceee83d 53%, #d7c0fd38 58%, transparent 71%);
  }
  :is(.cookbook-card, .slide-current):hover :deep(.editorial-image)::after,
  .cookbook-card:hover .cookbook-idea-art::after {
    animation: cookbook-prism 720ms cubic-bezier(.2,.6,.35,1) both;
  }
  @keyframes cookbook-prism {
    0% { opacity: 0; transform: translateX(-86%); }
    28% { opacity: .8; }
    72% { opacity: .65; }
    100% { opacity: 0; transform: translateX(86%); }
  }
}
.slide-stack { display: grid; isolation: isolate; }
.slide-stack .cookbook-featured { grid-area: 1 / 1; display: flex; flex-direction: column; opacity: 0; pointer-events: none; transition: opacity 850ms ease-in-out; }
.slide-stack .slide-current { opacity: 1; pointer-events: auto; z-index: 1; }
.slide-stack .cookbook-featured-caption { flex: 1; }
.slide-stack :deep(.editorial-image > img) { aspect-ratio: 2 / 1; object-fit: cover; }
.slide-controls { display: flex; justify-content: center; align-items: center; gap: 2px; padding-top: 4px; }
.slide-controls button { min-width: 32px; min-height: 44px; display: grid; place-items: center; border-radius: 12px; color: var(--md-primary); }
.slide-controls button > span { width: 8px; height: 8px; border-radius: 20px; background: var(--md-outline); }
.slide-controls button[aria-pressed=true] > span { width: 24px; background: var(--md-primary); }
.slide-controls .slide-play { margin-inline-start: 8px; }
@media (prefers-reduced-motion: reduce) { .slide-stack .cookbook-featured { transition: none; } }

.cookbook-collection { scroll-margin-top: 8rem; }
.cookbook-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px 32px;
  flex-wrap: wrap;
  margin-bottom: clamp(22px, 3vw, 36px);
}
.collection-count { margin-top: 8px; color: var(--md-on-surface-variant); }
.cookbook-local-favorites { display: grid; justify-items: start; gap: 8px; }
.cookbook-kind { gap: 10px; margin-block-start: 20px; }
.cookbook-kind button, .cookbook-local-favorites button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 16px;
  line-height: 1;
}
.cookbook-kind svg, .cookbook-local-favorites svg { flex: none; width: 18px; height: 18px; }
.cookbook-kind button span, .cookbook-local-favorites button span { transform: translateY(.1em); }
@supports (text-box: trim-both cap alphabetic) {
  .cookbook-kind button span, .cookbook-local-favorites button span {
    text-box: trim-both cap alphabetic;
    transform: none;
  }
}

@media (min-width: 561px) and (max-width: 1199px) {
  .cookbook-selects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .cookbook-selects { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .cookbook-filter button { min-width: 0; max-width: 100%; }
  .cookbook-kind { gap: 8px; }
  .cookbook-kind button { gap: 5px; padding-inline: 10px; }
}
</style>

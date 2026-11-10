<script setup lang="ts">
import { durationLabel, ingredientLabel, totalMinutes } from '~~/lib/editorial'

const route = useRoute()
const { data, error } = await useFetch(`/api/recipe-catalog/v1/${encodeURIComponent(String(route.params.slug))}`)
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Dieses Rezept ist noch nicht verfügbar.' })
const recipe = computed(() => data.value!.recipe)
const recipeUrl = computed(() => `https://shliste.app/rezepte/${recipe.value.slug}`)
const stepAnchor = (id: string) => `schritt-${id}`
const illustratedSteps = computed(() => recipe.value.steps.map((step, index) => ({
  number: index + 1,
  title: step.title,
  instruction: step.instruction,
  image: step.illustration,
})))
const page = useTemplateRef<HTMLElement>('page')
const reader = useTemplateRef<HTMLElement>('reader')
const { favorites, notice, toggleFavorite } = useWebsiteRecipeFavorites()
const heading = useTemplateRef<HTMLElement>('heading')
const readerVisible = ref(false)
let stopScroll: (() => void) | undefined
let observer: ResizeObserver | undefined
onMounted(() => {
  const header = page.value?.closest('.chrome')?.querySelector('header.chrome-header')
  if (!page.value || !header || !reader.value) return
  const checkPosition = () => {
    const edge = header.getBoundingClientRect().bottom
    readerVisible.value = !!heading.value && heading.value.getBoundingClientRect().bottom <= edge && (page.value?.getBoundingClientRect().bottom ?? 0) > edge + 100
  }
  let frame = 0
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0
      checkPosition()
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  stopScroll = () => {
    window.removeEventListener('scroll', onScroll)
    cancelAnimationFrame(frame)
  }
  const update = () => {
    checkPosition()
    page.value?.style.setProperty('--site-header-height', `${header.getBoundingClientRect().height}px`)
    page.value?.style.setProperty('--reader-height', `${reader.value?.offsetHeight ?? 0}px`)
  }
  update()
  observer = new ResizeObserver(update)
  observer.observe(header)
  observer.observe(reader.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  stopScroll?.()
})
const ingredientsPinned = ref(true)
function printRecipe() {
  window.print()
}
useSeoMeta({ title: () => `${recipe.value.title} – Schritt für Schritt · Shliste`, description: () => recipe.value.intro, robots: () => recipe.value.status === 'preview' ? 'noindex, nofollow' : 'index, follow', ogImage: () => `https://shliste.app${recipe.value.hero.src}` })
useHead(() => ({
  link: [{ rel: 'canonical', href: recipeUrl.value }],
  script: [{ key: 'editorial-recipe', type: 'application/ld+json', innerHTML: JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Recipe',
    '@id': `${recipeUrl.value}#recipe`,
    'name': recipe.value.title, 'description': recipe.value.intro,
    'image': `https://shliste.app${recipe.value.hero.src}`,
    'author': { '@type': 'Organization', 'name': 'shliste', 'url': 'https://shliste.app' },
    'isBasedOn': recipe.value.inspiration?.url,
    'recipeCategory': recipe.value.meal, 'recipeYield': `${recipe.value.servings} Portionen`,
    'keywords': recipe.value.tags.length ? recipe.value.tags.join(', ') : undefined,
    'suitableForDiet': 'https://schema.org/VeganDiet',
    'prepTime': `PT${recipe.value.prepMinutes}M`, 'cookTime': `PT${recipe.value.cookMinutes}M`,
    'totalTime': `PT${totalMinutes(recipe.value)}M`,
    'recipeIngredient': recipe.value.ingredients.map(ingredientLabel),
    'recipeInstructions': recipe.value.steps.map(step => ({
      '@type': 'HowToStep',
      'name': step.title,
      'text': step.instruction,
      'image': `https://shliste.app${step.illustration.src}`,
      'url': `${recipeUrl.value}#${encodeURIComponent(stepAnchor(step.id))}`,
    })),
  }).replaceAll('<', '\\u003c') }],
}))
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      ref="page"
      class="recipe-page"
    >
      <div class="mkt-shell">
        <NuxtLink
          to="/rezeptideen"
          class="recipe-back"
        ><RecipeActionLabel icon="i-lucide-arrow-left">Alle Rezeptideen</RecipeActionLabel></NuxtLink>
        <header class="recipe-hero">
          <div class="recipe-intro">
            <span class="recipe-eyebrow">{{ recipe.emoji }} {{ recipe.story?.eyebrow ?? recipe.meal }}</span>
            <h1 ref="heading">
              {{ recipe.title }}
            </h1>
            <p class="recipe-lead">
              {{ recipe.intro }}
            </p>
            <ul
              class="recipe-facts"
              aria-label="Auf einen Blick"
            >
              <li><strong>{{ durationLabel(recipe) }}</strong><span>{{ recipe.restMinutes ? 'Inklusive Ruhezeit' : 'Gesamtzeit, ungefähr' }}</span></li><li><strong>{{ recipe.servings }} {{ recipe.servings === 1 ? 'Portion' : 'Portionen' }}</strong><span>Für deinen Tisch</span></li><li><strong>{{ recipe.difficulty }}</strong><span>Mit etwas Geduld</span></li>
            </ul>
            <div class="recipe-actions">
              <RecipeSaveDialog :recipe="recipe" /><a
                href="#zubereitung"
                class="recipe-secondary"
              ><RecipeActionLabel icon="i-lucide-cooking-pot">Loskochen</RecipeActionLabel></a>
            </div>
            <p
              v-if="notice"
              role="status"
              class="sr-only"
            >
              {{ notice }}
            </p>
            <p class="recipe-fine">
              100 % pflanzlich. Speichern fügt das Rezept deiner Sammlung hinzu.
            </p>
          </div>
          <div class="recipe-hero-photo">
            <EditorialImage
              :image="recipe.hero"
              eager
              :zoom="false"
            />
            <div class="hero-heart-slot">
              <WebsiteRecipeHeart
                compact
                class="hero-heart"
                :active="favorites.includes(recipe.catalogId)"
                :title="recipe.title"
                @toggle="toggleFavorite(recipe.catalogId)"
              />
            </div>
          </div>
        </header>
        <div class="recipe-tags">
          <span
            v-for="tag in recipe.tags"
            :key="tag"
          >{{ tag }}</span><button
            type="button"
            @click="printRecipe"
          >
            <RecipeActionLabel icon="i-lucide-printer">
              Rezept drucken
            </RecipeActionLabel>
          </button>
        </div>
        <nav
          ref="reader"
          class="recipe-reader mkt-content"
          :class="{ 'reader-visible': readerVisible }"
          :inert="!readerVisible"
          :aria-hidden="!readerVisible"
          aria-label="Im Rezept"
        >
          <a
            href="#inhalt"
            class="reader-title"
          ><img
            :src="recipe.hero.src.replace('.webp', '-small.webp')"
            alt=""
            width="56"
            height="36"
          ><strong>{{ recipe.title }}</strong></a>
          <a href="#zutaten">Zutaten</a><a href="#zubereitung">Schritte</a>
          <WebsiteRecipeHeart
            compact
            class="reader-heart"
            :active="favorites.includes(recipe.catalogId)"
            :title="recipe.title"
            @toggle="toggleFavorite(recipe.catalogId)"
          />
        </nav>
        <div class="recipe-body">
          <aside
            id="zutaten"
            class="ingredients-panel"
            :class="{ unpinned: !ingredientsPinned }"
            tabindex="0"
            aria-label="Zutaten"
          >
            <span class="recipe-eyebrow">ALLES BEREITLEGEN</span><button
              class="pin-ingredients"
              :aria-pressed="ingredientsPinned"
              aria-label="Zutatenliste beim Scrollen anheften"
              @click="ingredientsPinned = !ingredientsPinned"
            >
              <UIcon :name="ingredientsPinned ? 'i-lucide-pin-off' : 'i-lucide-pin'" />{{ ingredientsPinned ? 'Lösen' : 'Anheften' }}
            </button><h2>Das kommt rein.</h2><p>Für {{ recipe.servings }} {{ recipe.servings === 1 ? 'Portion' : 'Portionen' }}</p>
            <ul>
              <li
                v-for="ingredient in recipe.ingredients"
                :key="ingredient.id"
              >
                <span>{{ ingredientLabel({ ...ingredient, note: undefined }) }}</span><small v-if="ingredient.note">{{ ingredient.note }}</small>
              </li>
            </ul>
            <div
              v-if="recipe.story?.ingredientNote"
              class="ingredient-note"
            >
              {{ recipe.emoji }} {{ recipe.story.ingredientNote }}
            </div>
          </aside>
          <section
            id="zubereitung"
            class="recipe-method"
            aria-labelledby="method-title"
          >
            <div class="method-heading">
              <div>
                <span class="recipe-eyebrow">NIMM DIR EINEN GEMÜTLICHEN MOMENT</span><h2 id="method-title">
                  So wird’s richtig gut.
                </h2>
              </div>
            </div>
            <article
              v-for="(step, index) in recipe.steps"
              :id="stepAnchor(step.id)"
              :key="step.id"
              class="method-step"
            >
              <EditorialImage
                :image="step.illustration"
                :step="illustratedSteps[index]"
                :gallery="illustratedSteps"
                class="step-photo"
              />
              <div class="step-caption">
                <div class="step-heading">
                  <span class="step-number"><span>{{ index + 1 }}</span></span>
                  <div>
                    <h3>{{ step.title }}</h3>
                    <span
                      v-if="step.minutes"
                      class="step-minutes"
                    ><UIcon
                      name="i-lucide-clock"
                      mode="svg"
                      aria-hidden="true"
                    /> ca. {{ step.minutes }} {{ step.minutes === 1 ? 'Minute' : 'Minuten' }}</span>
                  </div>
                </div>
                <p>{{ step.instruction }}</p>
              </div>
            </article>
          </section>
        </div>
        <section class="recipe-tips">
          <span class="recipe-eyebrow">DIE KLEINEN DINGE, DIE HELFEN</span><h2>Damit es dir gelingt.</h2><div class="tips-grid">
            <article
              v-for="tip in recipe.tips"
              :key="tip.title"
            >
              <h3>{{ tip.title }}</h3><p>{{ tip.text }}</p>
            </article><article><h3>Für morgen aufheben</h3><p>{{ recipe.storage }}</p></article>
          </div>
        </section>
        <section class="recipe-save-bottom">
          <span aria-hidden="true">{{ recipe.emoji }}</span><h2>Das darf bleiben.</h2><p>Hol dir das Rezept in deine Sammlung. Zum Wiederfinden, Anpassen und gemeinsamen Kochen.</p><RecipeSaveDialog :recipe="recipe" />
        </section>
      </div>
      <MarketingWaitlistSection />
      <div class="mkt-shell">
        <section
          v-if="data?.recommendations.length"
          class="related-recipes"
          aria-labelledby="related-heading"
        >
          <span class="recipe-eyebrow">WEITER AM TISCH</span><h2 id="related-heading">
            Was passt dazu?
          </h2>
          <div class="related-grid">
            <NuxtLink
              v-for="idea in data.recommendations"
              :key="idea.id"
              :to="idea.to"
            >
              <span class="related-kicker"><span aria-hidden="true">{{ idea.emoji }}</span>{{ idea.relation === 'ähnlich' ? 'Wenn dir das schmeckt' : 'Wie wäre es ' + idea.relation + '?' }}</span>
              <h3>{{ idea.title }}</h3><p>{{ idea.reason }}</p>
              <RecipeActionLabel
                icon="i-lucide-arrow-right"
                trailing
              >{{ idea.ready ? 'Zum Rezept' : 'Rezeptidee ansehen' }}</RecipeActionLabel>
            </NuxtLink>
          </div>
        </section>
        <footer
          v-if="recipe.inspiration"
          id="quellen"
          class="recipe-origin"
        >
          <a
            :href="recipe.inspiration.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span
              class="origin-emblem"
              aria-hidden="true"
            ><UIcon
              name="i-lucide-book-heart"
              mode="svg"
            /></span>
            <span class="origin-copy"><small>Die Inspiration zu diesem Rezept</small><span>{{ recipe.inspiration.title }}</span></span>
            <UIcon
              class="origin-arrow"
              name="i-lucide-arrow-up-right"
              mode="svg"
              aria-hidden="true"
            />
            <span class="sr-only"> · Originalrezept, öffnet in einem neuen Tab</span>
          </a>
        </footer>
      </div>
    </main>
    <RecipePrintSheet :recipe="recipe" />
  </MarketingChrome>
</template>

<style scoped>
.recipe-page{padding-block:32px 80px;color:var(--md-on-surface)}.recipe-back{display:inline-flex;min-height:44px;align-items:center;color:var(--md-primary);font-weight:650}.preview-note{font-size:14px;background:var(--md-secondary-container);border-radius:10px;padding:10px 16px;margin:12px 0 28px}.recipe-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;margin:20px 0 28px}.recipe-eyebrow{font-size:12px;font-weight:750;letter-spacing:.12em;color:var(--md-primary)}h1{font-size:clamp(42px,5vw,68px);line-height:1.03;letter-spacing:-.045em;margin:16px 0 24px;font-weight:760}h2{font-size:clamp(28px,3vw,38px);line-height:1.13;letter-spacing:-.035em;font-weight:720;margin:12px 0 20px}h3{font-size:23px;line-height:1.25;font-weight:700}.recipe-lead{font-size:19px;line-height:1.65;color:var(--md-on-surface-variant)}.recipe-facts{display:flex;gap:24px;list-style:none;padding:0;margin:28px 0}.recipe-facts li{display:grid;gap:4px}.recipe-facts strong{font-size:18px}.recipe-facts span,.recipe-fine{font-size:13px;line-height:1.6;color:var(--md-on-surface-variant)}.recipe-actions{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.recipe-secondary{padding:14px 18px;border:1px solid var(--md-outline-variant);border-radius:99px;font-weight:650}.recipe-hero-photo{box-shadow:0 18px 50px #3e301b15}.recipe-tags{display:flex;flex-wrap:wrap;gap:8px;margin:32px 0}.recipe-tags > span{border-radius:99px;background:var(--md-surface-container);padding:8px 14px;font-size:14px}.recipe-tags button{margin-left:auto;display:inline-flex;align-items:center;min-height:44px;padding-inline:10px;font-size:16px;font-weight:650;color:var(--md-primary)}.cook-test-note{padding:18px 22px;border-left:3px solid #c39743;background:#f7ebd322;border-radius:0 12px 12px 0;font-size:14px;line-height:1.6;margin-bottom:48px}.recipe-body{display:grid;grid-template-columns:320px 1fr;gap:64px;align-items:start}.ingredients-panel{padding-block:12px;padding-inline:0;background:transparent;position:sticky;top:24px}.ingredients-panel>p{color:var(--md-on-surface-variant)}.ingredients-panel ul{list-style:none;padding:0;margin:24px 0}.ingredients-panel li{padding:14px 0;border-bottom:1px solid var(--md-outline-variant);font-size:17px;line-height:1.45}.ingredients-panel small{display:block;font-size:13px;color:var(--md-on-surface-variant);margin-top:6px}.ingredient-note{padding:16px;border-radius:14px;background:var(--md-secondary-container);font-size:15px;line-height:1.5;margin:24px 0}.recipe-method{scroll-margin-top:110px}.method-heading{display:flex;align-items:center;gap:20px;justify-content:space-between}.method-heading{margin-bottom:32px}.recipe-tips{background:var(--md-secondary-container);border-radius:28px;padding:38px;margin:24px 0 64px}.tips-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px 40px}.tips-grid p{line-height:1.65;margin-top:10px;font-size:16px}.recipe-save-bottom{text-align:center;max-width:600px;margin:0 auto 56px}.recipe-save-bottom>span{font-size:48px}.recipe-save-bottom p{font-size:18px;line-height:1.6;margin-bottom:24px}.recipe-sources{border-top:1px solid var(--md-outline-variant);padding-top:24px;font-size:14px;line-height:1.7}.recipe-sources summary{cursor:pointer;font-weight:650;min-height:44px}.recipe-sources ul{padding-left:20px}.recipe-sources a{color:var(--md-primary);text-decoration:underline}.recipe-sources li{margin:12px 0}
@media(max-width:900px){.recipe-hero{gap:28px}.recipe-body{grid-template-columns:270px 1fr;gap:28px}.recipe-facts{gap:16px;flex-wrap:wrap}.recipe-page{padding-block-start:24px}.recipe-hero-photo{transform:none}}
@media(max-width:680px){.recipe-page{padding-block:20px 56px}.recipe-hero{grid-template-columns:1fr;gap:24px}.recipe-hero-photo{grid-row:1}.recipe-hero h1{font-size:44px}.recipe-body{grid-template-columns:1fr;gap:40px}.ingredients-panel{position:static}.tips-grid{grid-template-columns:1fr}.recipe-tips{padding:24px}.recipe-facts{justify-content:space-between;gap:10px}.recipe-facts strong{font-size:16px}.recipe-facts span{font-size:11px}.recipe-tags button{margin-left:0}.recipe-lead{font-size:18px}.preview-note{margin-bottom:20px}.method-heading .recipe-eyebrow{font-size:10px}}
@media print{.recipe-page{max-width:none;padding:0}.recipe-back,.preview-note,.recipe-actions,.recipe-tags button,.recipe-save-bottom{display:none!important}.recipe-hero{display:block}.recipe-hero-photo{max-width:320px;margin:20px 0}.recipe-body{display:block}.ingredients-panel{position:static;break-inside:avoid}.method-step{break-inside:avoid;margin:24px 0}.method-step :deep(figure){max-width:340px}.recipe-tips{padding:20px}.recipe-sources{display:none}}

.recipe-page { --site-header-height: 84px; --reader-height: 58px; --reader-top: calc(var(--site-header-height) + clamp(12px, 1.2vw, 20px)); --recipe-offset: calc(var(--reader-top) + var(--reader-height) + 20px); }
.recipe-lead { max-width: 68ch; }
.recipe-eyebrow { text-transform: uppercase; }
.recipe-reader { position: fixed; inset-inline: 0; top: var(--reader-top); z-index: 5; visibility:hidden; opacity:0; transform:translateY(-10px); transition:opacity .2s, transform .2s, visibility .2s; display: flex; align-items: center; gap: clamp(10px,2vw,26px); min-width: 0; padding: 8px 12px; margin: 0 auto; border: 1px solid var(--md-outline-variant); border-radius: 16px; background: var(--md-surface); box-shadow: 0 4px 14px #382b3710; }
.recipe-reader.reader-visible{visibility:visible;opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.recipe-reader{transition:none;transform:none}}
.recipe-hero-photo { position: relative; border-radius: 22px; }
.recipe-hero-photo :deep(.editorial-image > img) { aspect-ratio: 2 / 1; width: 100%; height: auto; object-fit: cover; }
.hero-heart-slot { position: absolute; inset: 0; display: grid; place-items: end; padding: 14px; pointer-events: none; }
.hero-heart-slot > .hero-heart { --heart-size: 26px; pointer-events: auto; width: 54px; height: 54px; background: var(--md-surface); box-shadow: 0 2px 10px #38233433; }
.reader-heart { flex: none; }
.recipe-origin { scroll-margin-top:var(--recipe-offset); margin:64px 0 0; padding-top:28px; border-top:1px solid var(--md-outline-variant); text-align:center; }
.recipe-origin a { display:inline-grid; grid-template-columns:40px minmax(0,1fr) 20px; align-items:center; gap:14px; max-width:100%; padding:12px; border-radius:16px; color:var(--md-primary); text-align:left; transition:background-color 160ms ease; }
.recipe-origin a:hover { background:var(--md-surface-container); }
.recipe-origin a:focus-visible { outline:2px solid var(--md-primary); outline-offset:4px; }
.origin-emblem { display:grid; place-items:center; width:40px; height:40px; border-radius:50%; background:var(--md-secondary-container); }
.origin-emblem svg { width:21px; height:21px; }
.origin-copy { min-width:0; display:grid; gap:4px; }
.origin-copy small { font-size:13px; line-height:1.4; color:var(--md-on-surface-variant); }
.origin-copy > span { font-size:16px; line-height:1.45; font-weight:650; text-decoration:underline; text-decoration-color:color-mix(in srgb,var(--md-primary) 35%,transparent); text-underline-offset:4px; overflow-wrap:anywhere; }
.origin-arrow { width:20px; height:20px; }
.related-recipes{padding-top:28px;border-top:1px solid var(--md-outline-variant)}
.related-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:16px}
.related-grid>a{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:24px;border-radius:20px;background:var(--md-surface-container-low);border:1px solid var(--md-outline-variant)}
.related-grid>a:hover{border-color:var(--md-primary)}.related-grid p{flex:1;line-height:1.5}.related-kicker{display:flex;align-items:center;gap:8px;color:var(--md-primary);font-size:15px;font-weight:700}

.recipe-reader a { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; color: var(--md-primary); font-size: 16px; font-weight: 650; }
.recipe-reader .reader-title { min-width: 0; margin-right: auto; color: var(--md-on-surface); }
.reader-title img { flex: none; border-radius: 8px; object-fit: cover; }
.reader-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recipe-body { grid-template-columns: minmax(250px,26%) minmax(0,1fr); gap: clamp(24px,4vw,72px); }
.ingredients-panel { top: var(--recipe-offset); max-height: calc(100dvh - var(--recipe-offset) - 20px); overflow-y: auto; scrollbar-width: thin; }
.pin-ingredients{float:right;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:4px 12px;border-radius:999px;background:var(--md-surface-container);color:var(--md-primary);font-weight:650}.ingredients-panel.unpinned{position:static;max-height:none;overflow:visible}@media(max-width:680px),print{.pin-ingredients{display:none}}
#zutaten, #zubereitung, .method-step { scroll-margin-top: var(--recipe-offset); }
.recipe-secondary, .recipe-tags > span { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
.recipe-secondary { min-height: 54px; font-size:20px; }
.recipe-back:hover, .recipe-tags button:hover { text-decoration: underline; text-underline-offset:.2em; }

.recipe-tags { align-items: center; }
.recipe-tags > span { min-height: 36px; padding: 5px 15px 2px; }
.method-step { margin-bottom: clamp(54px,5vw,96px); }
.recipe-sources{scroll-margin-top:var(--recipe-offset)}
.recipe-sources h2 { font-size: 26px; }

/* The photograph and its paper caption form one page in the recipe. */
.method-step {
  --badge-size: 2.65rem;
  --title-line: 2rem;
  border: 1px solid var(--md-outline-variant);
  border-radius: 24px;
  background: var(--md-surface-container-low);
}
.method-step .step-photo { border-radius: 23px 23px 0 0; }
.step-caption { padding: clamp(22px, 3.5vw, 42px); }
.step-heading {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  padding-block-start: max(0px, calc((var(--badge-size) - var(--title-line)) / 2));
}
.step-heading h3 {
  margin: 0;
  font-size: clamp(1.45rem, 2.4vw, 1.85rem);
  line-height: var(--title-line);
  overflow-wrap: anywhere;
}
.step-number {
  display: grid;
  place-items: center;
  min-inline-size: max(var(--badge-size), calc(2ch + 1rem));
  block-size: var(--badge-size);
  margin-block-start: calc((var(--title-line) - var(--badge-size)) / 2);
  border-radius: 999px;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-size: 1.35rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.step-number > span { transform: translateY(.12em); }
.step-minutes { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; color: var(--md-on-surface-variant); font-size: .94rem; }
.step-caption p { margin: 20px 0 0; font-size: clamp(17px, 1.45vw, 20px); line-height: 1.58; max-width: 66ch; }
@media (min-width: 681px) { .recipe-reader a:not(.reader-title) { display: none; } }
@media print {
  .step-caption { padding: 12px; }
  .method-step { break-inside: avoid; background: transparent; }
}
@media (max-width: 680px) {
  .recipe-body { grid-template-columns: minmax(0,1fr); }
  .ingredients-panel { position: static; max-height: none; overflow: visible; }
  .recipe-reader { padding: 4px 8px; gap: 9px; }
  .reader-title img { width: 38px; height: 30px; }
  .recipe-reader a { font-size: 14px; gap: 4px; }
}
@media print { .recipe-reader { display: none; } .ingredients-panel { max-height: none; overflow: visible; } }
</style>

<style>
@page recipe-sheet {
  size: A4;
  margin: 13mm 15mm;
}
@media print {
  body:has(.print-sheet) { page: recipe-sheet; }
  body:has(.print-sheet), body:has(.print-sheet) .chrome {
    color-scheme: light;
    background: white !important;
    overflow: visible;
    min-height: 0;
  }
  body:has(.print-sheet) :is(.chrome-header, .recipe-page, footer, .chrome > a, dialog, nuxt-devtools-frame) { display: none !important; }
}
</style>

<script setup lang="ts">
import { androidRecipeLinks } from '~~/lib/android-recipe-link'

const route = useRoute()
const id = String(route.params.id)
const version = Number(route.query.version ?? 1)
if (!/^[a-z0-9-]{1,80}$/.test(id) || !Number.isSafeInteger(version) || version < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Rezeptlink' })
const { data, error } = await useFetch(`/api/recipe-catalog/v1/${id}`, { query: { version } })
if (error.value || !data.value) throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'Rezept nicht verfügbar' })
const recipe = computed(() => data.value!.recipe)
const requestOrigin = useRequestURL().origin
const links = computed(() => androidRecipeLinks(recipe.value.catalogId, recipe.value.version, route.query.copy === '1', requestOrigin))
const attempted = ref(false)
const isAndroid = ref(false)
onMounted(() => {
  isAndroid.value = /Android/i.test(navigator.userAgent)
})
useSeoMeta({ title: () => `${recipe.value.title} in der App öffnen · shliste` })
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="recipe-handoff mkt-content"
    >
      <NuxtLink
        :to="`/rezepte/${recipe.slug}`"
        class="handoff-back"
      ><UIcon name="i-lucide-arrow-left" /> Zum Rezept</NuxtLink>
      <section class="handoff-card">
        <figure>
          <img
            :src="recipe.hero.src"
            :alt="recipe.hero.alt"
            width="1200"
            height="600"
          ><MarketingAiLabel />
        </figure>
        <div class="handoff-copy">
          <p class="handoff-eyebrow">
            Vom Entdecken zum Selbermachen
          </p>
          <h1>{{ recipe.title }}</h1>
          <p>Alle Zutaten, die bebilderten Schritte und die Tipps kommen zusammen in deine Android-Rezeptsammlung. {{ route.query.copy === '1' ? 'Du legst eine zusätzliche eigene Kopie an.' : 'Schon gespeichert? Dann öffnet sich deine vorhandene Fassung.' }}</p>
          <a
            :href="isAndroid ? links.intent : links.app"
            class="handoff-open"
            @click="attempted = true"
          ><UIcon name="i-lucide-smartphone" /><span>In der Android-App öffnen</span><UIcon name="i-lucide-arrow-up-right" /></a>
          <p
            v-if="attempted"
            role="status"
            class="handoff-note"
          >
            Falls sich nichts öffnet: Aktualisiere shliste auf deinem Android-Handy. Du kannst das Rezept auch direkt in der Web-App speichern.
          </p>
          <p
            v-else
            class="handoff-note"
          >
            Öffne diesen Link auf deinem Android-Handy mit der aktuellen shliste-Version.
          </p>
          <div class="handoff-alternatives">
            <RecipeSaveDialog
              :recipe="recipe"
              web-only
              :initial-copy="route.query.copy === '1'"
            /><a
              href="https://play.google.com/store/apps/details?id=com.shroomlife.shliste"
              target="_blank"
              rel="noopener"
            >shliste bei Google Play <UIcon name="i-lucide-arrow-up-right" /></a>
          </div>
        </div>
      </section>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.handoff-card figure :deep(.ai-label){position:absolute;left:.75rem;bottom:.75rem;font-size:.8rem}.handoff-copy h1{font-weight:800}
.recipe-handoff{padding-block:3rem 6rem}.handoff-back{display:inline-flex;align-items:center;gap:.5rem;color:var(--md-primary);margin-bottom:1.5rem}.handoff-card{max-width:72rem;margin:auto;display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--md-outline-variant);border-radius:2rem;overflow:hidden;background:var(--md-surface)}.handoff-card figure{position:relative;align-self:center;margin:1.5rem}.handoff-card figure>img{width:100%;aspect-ratio:2/1;object-fit:cover;border-radius:1.25rem}.handoff-copy{padding:clamp(1.5rem,4vw,3rem);min-width:0}.handoff-eyebrow{color:var(--md-primary);font-size:.8rem;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.handoff-copy h1{font-size:clamp(1.9rem,3vw,3rem);line-height:1.1;margin:1rem 0;overflow-wrap:anywhere}.handoff-copy p{line-height:1.6}.handoff-open{display:flex;align-items:center;justify-content:center;gap:.75rem;border-radius:999px;padding:1rem 1.25rem;margin-top:1.75rem;background:var(--md-primary);color:var(--md-on-primary);font-weight:700;text-align:center;transition:filter .18s}.handoff-open:hover{filter:brightness(1.08)}.handoff-open .iconify{flex-shrink:0;width:1.4rem;height:1.4rem}.handoff-note{font-size:.875rem;color:var(--md-on-surface-variant);margin-top:1rem}.handoff-alternatives{display:flex;flex-direction:column;align-items:flex-start;gap:1rem;margin-top:1.5rem}.handoff-alternatives>a{display:inline-flex;gap:.4rem;align-items:center;color:var(--md-primary)}.handoff-alternatives :deep(.recipe-save-button){font-size:1rem;min-height:44px;padding:.75rem 1rem;background:var(--md-secondary-container);color:var(--md-on-secondary-container);box-shadow:none}@media(max-width:760px){.handoff-card{grid-template-columns:1fr}.handoff-card figure{margin:1rem 1rem 0}.recipe-handoff{padding-top:1.5rem}}
</style>

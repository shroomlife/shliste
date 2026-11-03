<script setup lang="ts">
import { marketingStories } from '~/data/marketingStories'

useSeoMeta({ title: 'shliste im Alltag: Geschichten, Anleitungen und Hilfe', description: 'Gemeinsam einkaufen, ein Rezept vom Foto retten oder ohne Empfang weiter abhaken. Alltagsgeschichten, Anleitungen und Hilfe mit eigenen Animationen.' })
const categories = [
  { id: 'alltagsbeispiele', key: 'everyday' as const, kind: 'Alltagsbeispiel', label: 'Alltagsbeispiele', number: '01', icon: 'i-lucide-users', title: 'Was fehlt euch für einen guten Anfang?', intro: 'Das erste Frühstück im Urlaub. Der Kaffee nach dem Umzug. Oder die Zutaten für einen langen Racletteabend.', detail: 'Kleine Geschichten mit konkreten Besorgungen. Bei den neuen Beispielen kannst du deine Einkaufsliste direkt hier zusammenstellen und als Text mitnehmen.', cta: 'Die Geschichte lesen' },
  { id: 'anleitungen', key: 'guides' as const, kind: 'Anleitung', label: 'Anleitungen', number: '02', icon: 'i-lucide-book-open', title: 'Einmal sehen. Dann selbst ausprobieren.', intro: 'Omas Kuchen vom Zettel ins Rezeptbuch. Fehlende Zutaten auf die Liste. Eine Einladung an jemanden, mit dem du einkaufst.', detail: 'Jede Anleitung nimmt sich einen Ablauf vor. Du siehst, was du auswählst, was daraus entsteht und wo du selbst noch einmal hinschauen solltest.', cta: 'Schritt für Schritt ansehen' },
  { id: 'hilfe', key: 'help' as const, kind: 'Hilfe', label: 'Hilfe', number: '03', icon: 'i-lucide-life-buoy', title: 'Und wenn es gerade anders läuft?', intro: 'Du stehst im Laden und der Empfang ist weg. Was bleibt auf deinem Handy? Wann sehen die anderen deine Änderungen?', detail: 'Wir zeigen dir den Ablauf auf beiden Seiten. Damit du weißt, was du schon erledigen kannst und was noch auf Verbindung wartet.', cta: 'Den Ablauf verstehen' },
]
const storiesIn = (kind: string) => marketingStories.filter(story => story.kind === kind)
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="everyday-hub"
    >
      <header class="hub-intro hub-width">
        <p class="mkt-label">
          shliste im Alltag
        </p><h1>Ein erster Abend.<br>Ein voller Tisch.<br><em>Zusammen daran denken.</em></h1><p>Vom Frühstück in der Ferienwohnung bis zum Raclette mit Freunden. Hier findest du kleine Lösungen, eigene Animationen und Einkaufslisten zum Anpassen.</p><nav
          class="category-jumps"
          aria-label="Bereiche der Alltagsübersicht"
        >
          <a
            v-for="category in categories"
            :key="category.id"
            :href="`#${category.id}`"
          ><UIcon :name="category.icon" /><span>{{ category.label }}</span><small>{{ storiesIn(category.kind).length }}</small><UIcon name="i-lucide-arrow-down" /></a>
        </nav>
      </header>
      <template
        v-for="category in categories"
        :key="category.id"
      >
        <section
          :id="category.id"
          class="hub-category hub-width"
          :class="`hub-category--${category.key}`"
          :aria-labelledby="`${category.id}-title`"
        >
          <div
            :id="category.key === 'everyday' ? 'erleben' : undefined"
            class="category-intro"
          >
            <div class="category-copy">
              <p class="mkt-label">
                <span>{{ category.number }}</span> {{ category.label }}
              </p><h2 :id="`${category.id}-title`">
                {{ category.title }}
              </h2><p class="category-lead">
                {{ category.intro }}
              </p><p>{{ category.detail }}</p><a
                :href="`#${category.id}-artikel`"
                class="category-link"
              >{{ storiesIn(category.kind).length }} {{ category.kind === 'Alltagsbeispiel' ? 'Geschichten' : category.kind === 'Anleitung' ? 'Anleitungen' : 'Hilfethema' }} entdecken <UIcon name="i-lucide-arrow-down" /></a>
            </div><MarketingCategoryArt :category="category.key" />
          </div>
          <div
            :id="`${category.id}-artikel`"
            class="category-articles"
            :class="{ 'single-article': category.kind === 'Hilfe' }"
          >
            <NuxtLink
              v-for="story in storiesIn(category.kind)"
              :key="story.path"
              :to="story.path"
              class="hub-story-card"
            ><MarketingStoryCover :story="story" /><div class="hub-story-copy"><span class="story-format"><UIcon name="i-lucide-play" /> Mit eigener animierter Geschichte</span><h3>{{ story.title }}</h3><p>{{ story.intro }}</p><strong>{{ category.cta }} <UIcon name="i-lucide-arrow-up-right" /></strong></div></NuxtLink>
          </div>
        </section><MarketingFoodInterlude
          v-if="category.key === 'everyday'"
          id="vom-essen-zum-rezept"
          motif="cake"
        />
      </template>
      <section
        class="hub-extras hub-width"
        aria-labelledby="extras-title"
      >
        <div>
          <p class="mkt-label">
            Noch zwei kleine Entdeckungen
          </p><h2 id="extras-title">
            Für deine Kochmomente.<br>Und deine Geheimnisse.
          </h2>
        </div><div class="extra-stories">
          <NuxtLink to="/funktionen/rezept-badges"><UIcon name="i-lucide-award" /><span><strong>Der erste Marmorkuchen-Badge.</strong><small>Vom letzten Kochschritt in deine Sammlung.</small></span><UIcon name="i-lucide-arrow-up-right" /></NuxtLink><NuxtLink to="/funktionen/geheime-listen"><UIcon name="i-lucide-fingerprint" /><span><strong>Die Konzertkarten bleiben geheim.</strong><small>Mina öffnet ihre Liste erst nach der Bestätigung.</small></span><UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
        </div>
      </section>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.hub-width{max-width:var(--marketing-content);width:calc(100% - 2 * var(--marketing-gutter));margin-inline:auto}.hub-intro{padding:65px 0 75px}.hub-intro h1{font-size:clamp(2.7rem,5.4vw,4.9rem);line-height:1.03;font-weight:900;letter-spacing:-.045em;margin:0}.hub-intro h1 em{font-style:normal;color:var(--demo-accent)}.hub-intro>p:last-of-type{font-size:1.438rem;line-height:1.55;max-width:680px;margin:26px 0 30px;color:var(--md-on-surface-variant)}.category-jumps{display:flex;gap:12px;flex-wrap:wrap}.category-jumps>a{display:flex;align-items:center;gap:10px;padding:13px 17px;border:1px solid color-mix(in srgb,var(--demo-accent) 18%,transparent);border-radius:16px;background:var(--md-surface);font-size:1.125rem;font-weight:700}.category-jumps .iconify{width:19px;height:19px;flex-shrink:0;color:var(--demo-accent)}.category-jumps small{font-size:0.8125rem;font-weight:400;color:var(--md-on-surface-variant);padding-left:6px}.category-jumps .iconify:last-child{width:15px;height:15px;margin-left:8px}
.hub-category{padding:56px 0 80px;scroll-margin-top:85px;border-top:1px solid color-mix(in srgb,var(--demo-accent) 16%,transparent)}.category-intro{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);align-items:center;gap:72px;margin-bottom:38px}.category-copy .mkt-label{display:flex;align-items:center;gap:10px}.category-copy .mkt-label>span{font-size:0.875rem;border-right:1px solid currentColor;padding-right:10px}.category-copy h2,.hub-extras h2{font-size:clamp(2rem,3.7vw,3.25rem);line-height:1.06;letter-spacing:-.035em;font-weight:800;margin:0 0 23px}.category-copy .category-lead{font-size:1.375rem;line-height:1.5;color:var(--md-on-surface);margin-bottom:17px}.category-copy>p:not(.category-lead):not(.mkt-label){font-size:1.125rem;line-height:1.65;color:var(--md-on-surface-variant);margin-bottom:20px}.category-link{display:inline-flex;align-items:center;gap:9px;min-height:44px;font-size:1.062rem;font-weight:700;color:var(--demo-accent)}.category-link>.iconify{width:18px;height:18px}.hub-category--guides .category-copy{grid-column:2;grid-row:1}.hub-category--guides .category-art{grid-column:1;grid-row:1}.category-articles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;scroll-margin-top:110px}.hub-story-card{display:flex;flex-direction:column;min-width:0;border:1px solid color-mix(in srgb,var(--demo-accent) 14%,transparent);border-radius:24px;overflow:hidden;background:var(--md-surface);transition:transform .25s,box-shadow .25s}.hub-story-card:hover{transform:translateY(-4px);box-shadow:0 18px 35px -25px color-mix(in srgb,var(--demo-accent) 40%,transparent)}.hub-story-card :deep(.story-cover){border-radius:0;aspect-ratio:3/2}.hub-story-copy{padding:26px;display:flex;flex-direction:column;flex:1}.story-format{display:flex;align-items:center;gap:6px;font-size:0.8125rem;color:var(--demo-accent)}.story-format>.iconify{width:14px;height:14px}.hub-story-copy h3{font-size:1.812rem;line-height:1.12;font-weight:800;letter-spacing:-.02em;margin:17px 0 15px}.hub-story-copy>p{font-size:1.125rem;line-height:1.6;color:var(--md-on-surface-variant);margin:0 0 23px}.hub-story-copy>strong{display:flex;align-items:center;gap:8px;font-size:1.062rem;color:var(--demo-accent);margin-top:auto;min-height:32px}.hub-story-copy>strong>.iconify{width:18px;height:18px;flex-shrink:0}.single-article{grid-template-columns:1fr}.single-article .hub-story-card{display:grid;grid-template-columns:1fr 1fr}.single-article .hub-story-card :deep(.story-cover){aspect-ratio:auto;height:100%;min-height:290px}.single-article .hub-story-copy{padding:36px}.hub-extras{padding:15px 0 80px}.hub-extras h2{font-size:2.375rem}.extra-stories{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:30px}.extra-stories>a{display:flex;gap:15px;align-items:center;padding:25px;border-radius:22px;background:var(--demo-canvas);min-width:0}.extra-stories>a>.iconify{width:30px;height:30px;flex-shrink:0;color:var(--demo-accent)}.extra-stories>a>.iconify:last-child{width:18px;height:18px;margin-left:auto}.extra-stories strong{display:block;font-size:1.375rem;line-height:1.2}.extra-stories small{display:block;font-size:0.9375rem;line-height:1.4;color:var(--md-on-surface-variant);margin-top:7px}.everyday-hub a:focus-visible{outline:2px solid var(--demo-accent);outline-offset:4px}
@media(max-width:950px){.category-intro{gap:35px}.category-copy h2{font-size:2.375rem}.category-copy .category-lead{font-size:1.25rem}}
@media(max-width:820px){.hub-intro{padding:37px 0 45px}.hub-intro h1{font-size:clamp(2.5rem,7.5vw,3.8rem)}.hub-intro>p:last-of-type{font-size:1.25rem}.category-jumps{gap:8px}.category-jumps>a{padding:10px 12px;font-size:1rem}.category-intro{grid-template-columns:1fr;gap:26px;margin-bottom:25px}.hub-category--guides .category-copy,.hub-category--guides .category-art{grid-column:auto;grid-row:auto}.category-copy{max-width:620px}.category-art{width:100%;max-width:600px;justify-self:center}.hub-category{padding:35px 0 50px}.category-copy h2{font-size:2.25rem}.category-articles{gap:18px}.hub-story-copy{padding:21px}.hub-story-copy h3{font-size:1.625rem}.single-article .hub-story-card{display:flex}.single-article .hub-story-card :deep(.story-cover){aspect-ratio:3/2;min-height:0}.single-article .hub-story-copy{padding:24px}.extra-stories{grid-template-columns:1fr}.hub-extras h2{font-size:2.125rem}}
@media(max-width:560px){.category-articles{grid-template-columns:1fr}.category-jumps>a{gap:7px}.category-jumps .iconify:last-child{display:none}.category-jumps small{padding-left:0}.category-jumps .iconify{width:17px;height:17px}.hub-story-copy>p{font-size:1.125rem}.hub-extras{padding-bottom:50px}}
@media(prefers-reduced-motion:reduce){.hub-story-card{transition:none}.hub-story-card:hover{transform:none}}
@media(min-width:1100px){.category-articles:not(.single-article){grid-template-columns:repeat(3,minmax(0,1fr))}.hub-story-copy{padding:24px}.hub-story-copy h3{font-size:1.625rem}.hub-story-copy>p{font-size:1.062rem}.story-format{font-size:0.75rem}.category-art{max-width:540px;justify-self:center;width:100%}}
@media(min-width:1920px){.hub-story-card{flex-direction:row;align-items:stretch}.category-articles:not(.single-article){grid-template-columns:repeat(2,minmax(0,1fr))}.hub-story-card :deep(.story-cover){width:36%;flex:0 0 36%;aspect-ratio:3/2;min-height:0;align-self:center;margin:20px 0 20px 20px;border-radius:16px}.hub-story-card :deep(.story-cover img){object-fit:cover}.hub-story-copy{padding:28px;min-width:0}.category-copy{max-width:44rem}.category-art{max-width:620px}.hub-intro>p:last-of-type{max-width:46rem}.single-article .hub-story-card{display:flex}.single-article .hub-story-copy{max-width:48rem}}
</style>

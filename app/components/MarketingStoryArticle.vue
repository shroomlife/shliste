<script setup lang="ts">
import { marketingStories, type MarketingStory } from '~/data/marketingStories'
import { articleScenes } from '~/data/marketingArticleScenes'
import type { EverydaySceneKey } from '~/data/marketingEverydayStories'
import { storyMomentByPath } from '~/data/marketingMoments'

const { story } = defineProps<{ story: MarketingStory }>()
useSeoMeta({ title: () => story.seoTitle || story.title, description: () => story.intro, ogImage: () => `https://shliste.app${story.cover?.src ?? `/images/illustrations/${story.path.split('/').pop()}.webp`}`, ogImageWidth: () => story.cover?.width ?? 1536, ogImageHeight: () => story.cover?.height ?? 1024, ogImageAlt: () => story.coverAlt })
const related = computed(() => marketingStories.filter(item => story.related.includes(item.path)))
const scene = computed(() => articleScenes[story.animation])
const everydayKey = computed(() => story.scene === 'everyday' ? story.animation as EverydaySceneKey : undefined)
const storyMoment = computed(() => storyMomentByPath[story.path])
const { readingRoot, activeSection } = useMarketingReading()
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="story-article"
    >
      <div class="mkt-shell">
        <NuxtLink
          to="/im-alltag"
          class="story-back"
        ><UIcon name="i-lucide-book-open" /> Alle Geschichten, Anleitungen &amp; Hilfe</NuxtLink>
        <div class="article-layout">
          <header class="story-intro">
            <p class="mkt-label">
              {{ story.kind }} · shliste im echten Leben
            </p><h1>{{ story.title }}</h1><p class="story-lead">
              {{ story.intro }}
            </p><a
              href="#geschichte"
              class="story-watch"
            ><span><UIcon name="i-lucide-play" /></span> Die Geschichte ansehen</a><div class="story-meta">
              Beispiel mit fiktiven Personen · Browser &amp; Android · Stand November 2026
            </div>
          </header>
          <aside
            class="story-companion"
            aria-label="Bild und Wegweiser zum Artikel"
          >
            <div class="companion-picture">
              <MarketingStoryCover
                :story="story"
                eager
                article
              /><div class="companion-caption">
                <span class="companion-icon"><UIcon :name="scene.icon" /></span><div><span class="mkt-label">{{ story.kind }}</span><p>{{ scene.label }}</p></div>
              </div>
            </div>
            <nav
              class="reading-map"
              aria-label="In diesem Artikel"
            >
              <div class="reading-map-heading">
                <UIcon name="i-lucide-list-checks" /><span>Dein Weg</span><small>{{ activeSection + 1 }} / {{ story.steps.length }}</small>
              </div><a
                v-for="(step, index) in story.steps"
                :key="step.title"
                :href="`#schritt-${index + 1}`"
                :aria-current="activeSection === index ? 'location' : undefined"
                :class="{ 'is-current': activeSection === index, 'is-past': activeSection > index }"
              ><span
                class="reading-marker"
                aria-hidden="true"
              ><UIcon
                v-if="activeSection > index"
                name="i-lucide-check"
              /><span v-else>{{ index + 1 }}</span></span><span>{{ step.title }}</span></a>
            </nav>
          </aside>
          <div
            ref="readingRoot"
            class="story-reading"
          >
            <section
              v-for="(step, index) in story.steps"
              :id="`schritt-${index + 1}`"
              :key="step.title"
              data-reading-step
              class="story-step"
            >
              <span
                class="step-marker"
                aria-hidden="true"
              >{{ String(index + 1).padStart(2, '0') }}</span><div><h2>{{ step.title }}</h2><p>{{ step.text }}</p></div><template v-if="everydayKey">
                <MarketingEverydayScene
                  v-if="index === 0"
                  id="geschichte"
                  :story-key="everydayKey"
                  moment="prepare"
                /><MarketingEverydayScene
                  v-if="index === 2"
                  :story-key="everydayKey"
                  moment="together"
                />
              </template><MarketingArticleScene
                v-else-if="index === story.animationStep"
                id="geschichte"
                :story-key="story.animation"
              />
            </section>
            <MarketingStoryMoment
              v-if="storyMoment"
              :moment="storyMoment"
              article
              :next-list="!!story.miniList"
            />
            <MarketingMiniList
              v-if="story.miniList"
              :list="story.miniList"
            />
            <aside
              v-if="story.path === '/im-alltag/raclette-einkauf'"
              class="story-tip"
            >
              <div class="story-tip-heading">
                <span><UIcon name="i-lucide-cooking-pot" /></span><strong>Eure Runde steht. Jetzt den Einkauf planen.</strong>
              </div>
              <p>Für euren eigenen Abend findet ihr in der Raclette-Themenwelt einen Mengenplaner für 2 bis 12 Personen, Pfännchenideen und eine Einkaufsliste zum Übernehmen.</p>
              <UButton
                to="/themenwelten/raclette"
                icon="i-lucide-list-plus"
                class="mt-4 rounded-full"
              >
                Raclette-Zutaten und Mengen planen
              </UButton>
            </aside>
            <aside
              id="gut-zu-wissen"
              class="story-tip"
            >
              <div class="story-tip-heading">
                <span><UIcon name="i-lucide-lightbulb" /></span><strong>Gut zu wissen</strong>
              </div><p>{{ story.tip }}</p>
            </aside>
            <section class="story-faq">
              <h2>Vielleicht fragst du dich …</h2><details
                v-for="item in story.faq"
                :key="item.question"
              >
                <summary>{{ item.question }}<UIcon name="i-lucide-plus" /></summary><p>{{ item.answer }}</p>
              </details>
            </section>
            <div class="story-cta">
              <span class="cta-basket"><UIcon name="i-lucide-shopping-basket" /></span><h2>Was steht auf deiner Liste?</h2><p>Starte lokal ohne Konto. Für KI und gemeinsame Listen brauchst du Anmeldung und Internet.</p><UButton
                to="/app/lists"
                data-analytics-event="open_app"
                data-analytics-location="story"
                icon="i-lucide-list-plus"
                size="xl"
                class="rounded-full"
              >
                Eigene Liste starten
              </UButton>
            </div>
          </div>
        </div>
      </div>
      <MarketingWaitlistSection />

      <section
        class="story-related-band"
        aria-labelledby="related-title"
      >
        <div class="mkt-shell story-related">
          <div class="related-heading">
            <p class="mkt-label">
              Zum Weiterlesen
            </p><h2 id="related-title">
              Das passt dazu.
            </h2>
          </div><NuxtLink
            v-for="item in related"
            :key="item.path"
            :to="item.path"
            class="related-card"
          ><MarketingStoryCover :story="item" /><div class="related-copy"><span class="related-kind"><UIcon :name="articleScenes[item.animation].icon" />{{ item.kind }}</span><h3>{{ item.title }}</h3><p>{{ item.intro }}</p><span class="related-open"><UIcon name="i-lucide-book-open" />Geschichte öffnen</span></div></NuxtLink>
        </div>
      </section>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.story-article{padding-block:30px 80px}.story-back{display:inline-flex;align-items:center;gap:9px;min-height:44px;color:var(--demo-accent);font-size:0.875rem}.story-back>.iconify{width:19px;height:19px;flex-shrink:0}.article-layout{display:grid;grid-template-columns:300px minmax(0,1fr);column-gap:64px;row-gap:50px;margin-top:30px;align-items:start}.story-intro{grid-column:2;grid-row:1;min-width:0}.story-intro h1{font-size:clamp(2.7rem,4.2vw,4.3rem);line-height:1.04;font-weight:900;letter-spacing:-.045em;text-wrap:balance}.story-lead{font-size:1.25rem;line-height:1.7;margin-top:24px;max-width:760px}.story-meta{font-size:0.75rem;line-height:1.6;margin-top:20px;color:var(--md-on-surface-variant)}.story-watch{display:inline-flex;align-items:center;gap:10px;min-height:48px;margin-top:22px;color:var(--demo-accent);font-weight:700}.story-watch>span{display:grid;place-items:center;border-radius:50%;width:42px;height:42px;background:var(--demo-soft);transition:transform .25s}.story-watch .iconify{width:18px;height:18px}.story-watch:hover>span{transform:scale(1.08)}
.story-companion{grid-column:1;grid-row:1/3;position:sticky;top:108px;min-width:0;align-self:start}.companion-picture{padding:8px;background:color-mix(in srgb,var(--demo-soft) 55%,var(--md-surface));border:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent);border-radius:25px;box-shadow:0 14px 40px -28px color-mix(in srgb,var(--demo-accent) 40%,transparent)}.companion-picture :deep(.story-cover){border-radius:18px}.companion-caption{display:flex;align-items:center;gap:12px;padding:18px 8px 13px}.companion-caption .mkt-label{font-size:0.625rem;letter-spacing:.08em;margin:0}.companion-caption p{font-size:1.25rem;font-weight:750;line-height:1.2;margin:5px 0 0}.companion-icon{width:44px;height:44px;display:grid;place-items:center;flex-shrink:0;border-radius:15px;background:var(--md-surface);color:var(--demo-accent)}.companion-icon>.iconify{width:23px;height:23px}.reading-map{margin-top:24px}.reading-map-heading{display:flex;align-items:center;gap:8px;padding:0 8px 12px;color:var(--md-on-surface-variant);font-size:0.8125rem}.reading-map-heading>.iconify{width:17px;height:17px}.reading-map-heading small{margin-left:auto;font-variant-numeric:tabular-nums}.reading-map>a{display:flex;align-items:center;gap:12px;min-height:53px;padding:9px 10px;border-radius:14px;font-size:0.875rem;line-height:1.4;margin:3px 0;transition:background .25s,color .25s}.reading-map>a:hover{background:var(--demo-soft)}.reading-map>a.is-current{background:var(--demo-soft);color:var(--demo-accent);font-weight:700}.reading-marker{width:32px;height:32px;flex:0 0 32px;border:1px solid color-mix(in srgb,var(--demo-accent) 22%,transparent);border-radius:50%;display:grid;place-items:center;font-size:0.8125rem;font-variant-numeric:tabular-nums;line-height:1;transition:background .25s,color .25s}.reading-marker>.iconify{width:16px;height:16px}.is-current .reading-marker{background:var(--demo-accent);border-color:transparent;color:white}.is-past .reading-marker{background:var(--md-surface-container);color:var(--demo-accent)}
.story-reading{grid-column:2;grid-row:2;min-width:0}.story-step{--step-title-size:1.8rem;--step-title-line:calc(var(--step-title-size) * 1.25);--step-marker-size:2.5rem;display:grid;grid-template-columns:var(--step-marker-size) minmax(0,1fr);gap:1rem;margin-bottom:48px;scroll-margin-top:120px}.step-marker{width:var(--step-marker-size);height:var(--step-marker-size);align-self:start;margin-top:max(0px,calc((var(--step-title-line) - var(--step-marker-size)) / 2));display:grid;place-items:center;font-size:0.875rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;color:var(--demo-accent);background:var(--demo-soft);border-radius:0.8125rem}.story-step>div{min-width:0}.story-step h2,.story-faq h2,.story-cta h2{font-size:1.8rem;line-height:1.25;font-weight:800;letter-spacing:-.025em}.story-step h2{font-size:var(--step-title-size);line-height:var(--step-title-line);padding-top:max(0px,calc((var(--step-marker-size) - var(--step-title-line)) / 2))}.story-step p,.story-tip p,.story-faq p,.story-cta p{line-height:1.8;margin-top:14px;font-size:1.08rem}.story-step>.article-scene{grid-column:1/-1;min-width:0;scroll-margin-top:115px;margin-top:14px}.story-tip{scroll-margin-top:120px;background:color-mix(in srgb,var(--md-secondary-container) 45%,var(--md-surface));border-radius:22px;padding:28px}.story-tip-heading{display:flex;align-items:center;gap:14px}.story-tip-heading>span{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:var(--md-surface);color:var(--demo-accent)}.story-tip-heading .iconify{width:27px;height:27px}.story-tip-heading strong{font-size:1.312rem;line-height:1.25;transform:translateY(1px)}.story-tip p{margin-top:8px}.story-faq{margin:50px 0}.story-faq details{border-bottom:1px solid #9994;padding:20px 0}.story-faq summary{display:flex;align-items:center;justify-content:space-between;gap:18px;cursor:pointer;font-weight:700;font-size:1.1rem;list-style:none}.story-faq summary::-webkit-details-marker{display:none}.story-faq summary>.iconify{width:20px;height:20px;flex-shrink:0;color:var(--demo-accent);transition:transform .2s}.story-faq details[open] summary>.iconify{transform:rotate(45deg)}.story-cta{position:relative;background:var(--demo-soft);border-radius:26px;padding:32px}.cta-basket{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:var(--md-surface);color:var(--demo-accent);margin-bottom:18px}.cta-basket>.iconify{width:25px;height:25px}.story-cta a{margin-top:24px}
.story-related{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-top:40px}.related-heading{grid-column:1/-1}.related-heading h2{font-size:2.25rem;font-weight:850;letter-spacing:-.03em}.related-card{display:grid;grid-template-columns:38% minmax(0,1fr);border:1px solid #9993;border-radius:24px;background:var(--md-surface);overflow:hidden;transition:box-shadow .25s,border-color .25s}.related-card>:deep(.story-cover){border-radius:16px;aspect-ratio:3/2;height:auto;min-height:0;align-self:center;margin:16px 0 16px 16px}.related-card :deep(.story-cover img){transition:transform .45s;object-position:center}.related-card :deep(figcaption){right:8px;bottom:8px;font-size:0.625rem;padding:5px 7px}.related-copy{padding:25px 22px}.related-kind{display:flex;align-items:center;gap:8px;font-size:0.75rem;color:var(--demo-accent)}.related-kind>.iconify{width:21px;height:21px}.related-copy h3{font-weight:800;font-size:1.35rem;line-height:1.2;margin:15px 0 12px}.related-copy p{font-size:0.875rem;line-height:1.6;color:var(--md-on-surface-variant)}.related-open{display:flex;align-items:center;gap:8px;font-size:0.875rem;font-weight:700;color:var(--demo-accent);margin-top:22px}.related-open>.iconify{width:18px;height:18px}.related-card:hover{border-color:var(--demo-accent);box-shadow:0 12px 35px -24px var(--demo-accent)}.related-card:hover :deep(.story-cover img){transform:scale(1.035)}.story-article :is(a,summary):focus-visible{outline:2px solid var(--demo-accent);outline-offset:5px}
@media(min-width:901px) and (max-height:760px){.story-companion{top:95px}.companion-caption{padding-block:10px}.reading-map{margin-top:14px}.reading-map>a{min-height:45px;padding-block:6px}}
@media(min-width:901px) and (max-height:650px){.story-companion{position:static}}
.related-card :deep(.story-cover img){object-fit:cover}
@media(max-width:1100px){.article-layout{grid-template-columns:250px minmax(0,1fr);column-gap:35px}.related-card{grid-template-columns:1fr}.related-card>:deep(.story-cover){aspect-ratio:3/2;min-height:0;max-height:none;margin:0;border-radius:0}}
@media(max-width:900px){.article-layout{display:flex;flex-direction:column;gap:30px;margin-top:24px}.story-intro{width:100%}.story-intro h1{font-size:clamp(2.35rem,7vw,3.8rem)}.story-companion{position:static;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:center}.reading-map{margin:0}.story-reading{width:100%}.story-lead{font-size:1.15rem}.story-article .story-related-band{margin-top:55px}.story-step{--step-title-size:1.6rem}}
@media(max-width:580px){.story-article{padding-block:20px 50px}.story-back{font-size:0.75rem}.story-companion{grid-template-columns:1fr;gap:20px}.companion-picture{max-width:420px;width:100%;margin:auto}.reading-map{padding:0 4px}.reading-map>a{min-height:48px}.story-step{--step-title-size:1.5rem;--step-marker-size:2.25rem;gap:0.75rem;margin-bottom:36px}.step-marker{font-size:0.8125rem;border-radius:0.75rem}.story-step p{font-size:1.02rem;line-height:1.75}.story-tip{padding:22px 18px;gap:10px}.story-cta{padding:24px}.story-related{grid-template-columns:1fr}.related-card{grid-template-columns:1fr}.related-card>:deep(.story-cover){max-height:none}.related-heading h2{font-size:1.875rem}}
@media(prefers-reduced-motion:reduce){.story-article *,.story-article :deep(img){transition:none!important}.related-card:hover :deep(.story-cover img),.story-watch:hover>span{transform:none}}
.story-step p,.story-faq p,.story-tip p{max-width:70ch}
.story-related-band{margin-top:80px;border-top:1px solid #9993}
</style>

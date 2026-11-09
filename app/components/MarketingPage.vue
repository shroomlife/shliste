<script setup lang="ts">
/**
 * Kapitel-Rahmen für Marketing-Unterseiten.
 * Hero + Jump-Links + vollbreite Story-Sektionen + Querverweise.
 */
defineProps<{
  eyebrow: string
  title: string
  intro: string
  image: string
  imageAlt: string
  imageCaption: string
  landscape?: boolean
  primaryTo?: string
  primaryLabel?: string
  /** z. B. „Kapitel · Rezepte“ */
  chapter?: string
  /** Anker für Jump-Nav unter dem Intro */
  jumps?: readonly { href: string, label: string }[]
}>()

const route = useRoute()

const chapters = [
  { to: '/?view=website', label: 'Startseite', short: 'Startseite' },
  { to: '/rezepte', label: 'Rezepte', short: 'Kochen' },
  { to: '/gemeinsam-einkaufen', label: 'Gemeinsam einkaufen', short: 'Haushalt' },
  { to: '/so-funktionierts', label: 'So funktioniert’s', short: 'Tour' },
] as const

const explore = [
  { to: '/im-alltag', label: 'Im Alltag', icon: 'i-lucide-sparkles', blurb: 'Beispiele für euren Einkauf und eure Rezepte.' },
  { to: '/rezepte', label: 'Rezepte', icon: 'i-lucide-chef-hat', blurb: 'Rezepte speichern und fehlende Zutaten aufschreiben.' },
  { to: '/gemeinsam-einkaufen', label: 'Gemeinsam einkaufen', icon: 'i-lucide-users', blurb: 'Eine Liste fürs Haus. Abhaken im Laden.' },
  { to: '/so-funktionierts', label: 'So funktioniert’s', icon: 'i-lucide-list-checks', blurb: 'So legst du los und teilst deine Liste.' },
] as const
</script>

<template>
  <MarketingChrome>
    <main id="inhalt">
      <section
        class="mkt-hero mkt-shell grid items-center gap-10 pt-8 pb-12 sm:pt-12 sm:pb-16"
        :class="landscape ? 'lg:grid-cols-[0.85fr_1.15fr]' : 'lg:grid-cols-[1.15fr_0.85fr]'"
        aria-labelledby="page-title"
      >
        <div>
          <nav
            aria-label="Kapitel in shliste"
            class="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold"
          >
            <template
              v-for="(ch, i) in chapters"
              :key="ch.to"
            >
              <span
                v-if="i > 0"
                class="mkt-muted opacity-40"
                aria-hidden="true"
              >·</span>
              <NuxtLink
                :to="ch.to"
                class="mkt-chapter-link"
                :class="{ 'mkt-chapter-link--active': route.path === ch.to }"
                :aria-current="route.path === ch.to ? 'page' : undefined"
              >{{ ch.short }}</NuxtLink>
            </template>
          </nav>

          <span
            v-if="chapter"
            class="mkt-chapter"
          ><span>{{ chapter }}</span></span>
          <p class="mkt-label mt-4">
            {{ eyebrow }}
          </p>
          <h1
            id="page-title"
            class="mt-4 max-w-3xl text-[clamp(2.6rem,5.5vw,4.5rem)] leading-[1.03] font-black tracking-[-0.045em]"
            style="text-wrap: balance"
          >
            {{ title }}
          </h1>
          <p class="mkt-muted mt-5 max-w-xl text-lg leading-relaxed sm:text-xl">
            {{ intro }}
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <UButton
              :to="primaryTo ?? '/app/lists'"
              data-analytics-event="open_app"
              data-analytics-location="page_hero"
              size="xl"
              class="rounded-full px-6 font-bold"
            >
              {{ primaryLabel ?? 'Im Browser starten' }} <UIcon
                name="i-lucide-arrow-right"
                class="size-5"
              />
            </UButton>
            <UButton
              to="https://play.google.com/store/apps/details?id=com.shroomlife.shliste"
              target="_blank"
              rel="noopener"
              variant="outline"
              size="xl"
              class="rounded-full px-6 font-bold"
            >
              Für Android
            </UButton>
            <slot name="hero-actions" />
          </div>
          <nav
            v-if="jumps?.length"
            class="mkt-jump"
            aria-label="Auf dieser Seite"
          >
            <a
              v-for="jump in jumps"
              :key="jump.href"
              :href="jump.href"
            >{{ jump.label }}</a>
          </nav>
        </div>
        <slot name="hero">
          <figure
            class="mkt-hero-figure mx-auto flex w-full flex-col items-center rounded-[2rem]"
            :class="landscape ? 'overflow-hidden' : 'max-w-sm px-6 pt-6'"
          >
            <div
              class="marketing-hero-image"
              :class="{ 'w-full': landscape }"
            >
              <img
                :src="image"
                :alt="imageAlt"
                :width="landscape ? 1200 : 390"
                :height="landscape ? 600 : 844"
                fetchpriority="high"
                class="mkt-hero-img block h-auto max-w-full object-contain"
                :class="landscape ? 'w-full' : 'max-h-[500px] w-auto rounded-xl'"
              >
              <MarketingAiLabel v-if="image.startsWith('/images/recipes/') || image.startsWith('/images/illustrations/')" />
            </div>
            <figcaption class="mkt-muted px-4 py-4 text-center text-xs leading-relaxed">
              {{ imageCaption }}
            </figcaption>
          </figure>
        </slot>
      </section>

      <div class="mkt-story">
        <slot />
      </div>

      <MarketingWaitlistSection />

      <section
        class="mkt-section mkt-section--soft"
        aria-labelledby="explore-title"
      >
        <div class="mkt-section-inner mkt-shell">
          <p class="mkt-label">
            Weiter erkunden
          </p>
          <h2 id="explore-title">
            Noch ein Blick in shliste
          </h2>
          <p class="mt-3 max-w-xl">
            Dieselbe App, andere Kapitel. Fang an, wo es für dich gerade passt.
          </p>
          <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="entry in explore.filter(item => item.to !== route.path)"
              :key="entry.to"
              :to="entry.to"
              class="mkt-card mkt-explore flex flex-col gap-2 no-underline transition-transform hover:-translate-y-1"
            >
              <UIcon
                :name="entry.icon"
                class="size-7"
                style="color: var(--demo-accent)"
              />
              <span class="text-lg font-bold text-[var(--md-on-background)]">{{ entry.label }}</span>
              <span class="mkt-muted text-sm leading-relaxed">{{ entry.blurb }}</span>
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.mkt-chapter-link {
  text-decoration: none;
  color: var(--md-on-surface-variant);
  padding: 0.2rem 0.15rem;
}
.mkt-chapter-link--active {
  color: var(--demo-accent);
  font-weight: 800;
}
:global(.dark) .mkt-chapter-link--active { color: var(--md-primary); }
.mkt-hero-figure { background: var(--md-primary-container); }
.mkt-hero-img { box-shadow: 0 8px 24px rgb(0 0 0 / 8%); }
.marketing-hero-image{position:relative;max-width:100%;container:ai-image / inline-size}
.marketing-hero-image>.ai-label{position:absolute;right:12px;bottom:12px;font-size:11px}
.mkt-explore { color: inherit; }
</style>

<script setup lang="ts">
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
}>()
const route = useRoute()
const navigation = [
  { to: '/rezepte', label: 'Rezepte', icon: 'i-lucide-chef-hat' },
  { to: '/gemeinsam-einkaufen', label: 'Gemeinsam einkaufen', icon: 'i-lucide-users' },
  { to: '/so-funktionierts', label: 'So funktioniert’s', icon: 'i-lucide-list-checks' },
]
</script>

<template>
  <div class="marketing-page min-h-dvh">
    <a
      href="#inhalt"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-black"
    >Zum Inhalt</a>
    <header class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-5 px-5 py-6 sm:px-8">
      <NuxtLink
        to="/"
        aria-label="shliste Startseite"
      >
        <img
          src="/images/brand/wordmark.svg"
          alt="shliste"
          width="152"
          height="40"
          class="h-8 w-auto sm:h-9"
        >
      </NuxtLink>
      <nav
        aria-label="Hauptnavigation"
        class="order-3 flex w-full flex-wrap gap-x-5 gap-y-3 text-sm font-semibold lg:order-none lg:w-auto"
      >
        <NuxtLink
          v-for="entry in navigation"
          :key="entry.to"
          :to="entry.to"
          :aria-current="route.path === entry.to ? 'page' : undefined"
          class="py-1 hover:underline"
          :class="{ 'marketing-active': route.path === entry.to }"
        >{{ entry.label }}</NuxtLink>
      </nav>
      <UButton
        to="/app/lists"
        size="lg"
        class="shrink-0 rounded-full font-bold"
      >
        App öffnen <UIcon
          name="i-lucide-arrow-up-right"
          class="size-4"
        />
      </UButton>
    </header>

    <main
      id="inhalt"
      class="mx-auto max-w-7xl px-5 sm:px-8"
    >
      <section
        class="grid items-center gap-10 pt-8 pb-14 sm:pt-12 sm:pb-20"
        :class="landscape ? 'lg:grid-cols-[0.85fr_1.15fr]' : 'lg:grid-cols-[1.2fr_0.8fr]'"
        aria-labelledby="page-title"
      >
        <div>
          <p class="marketing-accent text-xs font-bold tracking-[0.15em] uppercase">
            {{ eyebrow }}
          </p>
          <h1
            id="page-title"
            class="mt-5 max-w-3xl text-[clamp(2.7rem,5.8vw,4.8rem)] leading-[1.03] font-black tracking-[-0.045em]"
            style="text-wrap: balance"
          >
            {{ title }}
          </h1>
          <p class="marketing-muted mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">
            {{ intro }}
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <UButton
              :to="primaryTo ?? '/app/lists'"
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
          </div>
        </div>
        <figure
          class="marketing-figure mx-auto flex w-full flex-col items-center rounded-[2rem]"
          :class="landscape ? 'overflow-hidden' : 'max-w-sm px-7 pt-7'"
        >
          <img
            :src="image"
            :alt="imageAlt"
            :width="landscape ? 1200 : 390"
            :height="landscape ? 600 : 844"
            fetchpriority="high"
            class="marketing-shot block h-auto max-w-full object-contain"
            :class="landscape ? 'w-full' : 'max-h-[530px] w-auto rounded-xl'"
          >
          <figcaption class="marketing-muted px-4 py-4 text-center text-xs leading-relaxed">
            {{ imageCaption }}
          </figcaption>
        </figure>
      </section>

      <div class="marketing-content">
        <slot />
      </div>

      <section
        class="py-14 sm:py-20"
        aria-labelledby="explore-title"
      >
        <h2
          id="explore-title"
          class="text-2xl font-extrabold tracking-tight"
        >
          Noch ein Blick in shliste
        </h2>
        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="entry in navigation.filter(item => item.to !== route.path)"
            :key="entry.to"
            :to="entry.to"
            class="marketing-card flex items-center gap-3 rounded-2xl p-5 font-semibold hover:underline"
          >
            <UIcon
              :name="entry.icon"
              class="marketing-accent size-6 shrink-0"
            /><span class="grow">{{ entry.label }}</span><UIcon
              name="i-lucide-arrow-up-right"
              class="size-5 shrink-0"
            />
          </NuxtLink>
        </div>
      </section>
    </main>

    <footer class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 pb-10 text-sm sm:px-8">
      <NuxtLink
        to="/"
        class="marketing-muted hover:underline"
      >shliste · Weniger merken. Mehr zusammen machen.</NuxtLink>
      <nav
        aria-label="Rechtliches"
        class="flex gap-5"
      >
        <NuxtLink
          to="/imprint"
          class="hover:underline"
        >Impressum</NuxtLink><NuxtLink
          to="/privacy"
          class="hover:underline"
        >Datenschutz</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<style scoped>
.marketing-page { background: var(--md-background); color: var(--md-on-background); --marketing-text-accent: #A6387D; }
:global(.dark) .marketing-page { --marketing-text-accent: var(--md-primary); }
.marketing-accent, .marketing-active { color: var(--marketing-text-accent); }
.marketing-muted { color: var(--md-on-surface-variant); }
.marketing-figure { background: var(--md-primary-container); }
.marketing-card { background: var(--md-surface-container); }
.marketing-shot { box-shadow: 0 8px 24px rgb(0 0 0 / 8%); }
.marketing-content :deep(h2) { font-size: clamp(1.65rem, 3vw, 2.2rem); line-height: 1.15; font-weight: 800; letter-spacing: -0.025em; }
.marketing-content :deep(h3) { font-size: 1.125rem; line-height: 1.4; font-weight: 700; }
.marketing-content :deep(p) { line-height: 1.8; color: var(--md-on-surface-variant); }
.marketing-content :deep(.feature-card) { background: var(--md-surface-container); border-radius: 1.5rem; padding: clamp(1.4rem, 3vw, 2rem); }
.marketing-content :deep(.feature-card p) { margin-top: 0.75rem; }
.marketing-content :deep(.editorial-section) { padding-block: 2.5rem; border-top: 1px solid var(--md-outline-variant); }
.marketing-content :deep(.editorial-section p) { margin-top: 1rem; }
.marketing-content :deep(.section-label) { color: var(--marketing-text-accent); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.9rem; }
</style>

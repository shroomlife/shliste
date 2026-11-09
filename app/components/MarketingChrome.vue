<script setup lang="ts">
/**
 * Einheitliche Marketing-Chrome: Header, Nav und Footer für Startseite
 * und Unterseiten — gleiche Struktur, gleiche Optik, aktiver Nav-Stand.
 */
const props = withDefaults(defineProps<{
  /** Aurora-Hintergrund hinter dem Header (Startseite). */
  aurora?: boolean
}>(), {
  aurora: false,
})

const route = useRoute()
const handleJump = useMarketingJump()
const { style: previewStyle } = useMarketingPalette()

const navigation = [
  { to: '/im-alltag', label: 'Im Alltag' },
  { to: '/rezepte', label: 'Rezepte' },
  { to: '/rezeptideen', label: 'Rezeptideen' },
  { to: '/gemeinsam-einkaufen', label: 'Gemeinsam einkaufen' },
  { to: '/so-funktionierts', label: 'So funktioniert’s' },
] as const

const isNavActive = (to: string) => route.path === to || (to === '/rezeptideen' && route.path.startsWith('/rezepte/')) || (to === '/im-alltag' && /^\/(im-alltag|anleitungen|hilfe|funktionen)(\/|$)/.test(route.path))
</script>

<template>
  <div
    class="chrome"
    :style="previewStyle"
    :class="{ 'chrome--aurora': props.aurora }"
    @click="handleJump"
  >
    <div
      v-if="props.aurora"
      class="chrome-aurora"
      aria-hidden="true"
    >
      <span class="blob blob-a" /><span class="blob blob-b" /><span class="blob blob-c" />
    </div>

    <a
      href="#inhalt"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-black"
    >Zum Inhalt</a>

    <header class="chrome-header relative z-20">
      <div class="chrome-header-inner mkt-shell flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-5">
        <NuxtLink
          to="/?view=website"
          aria-label="shliste Startseite"
          class="shrink-0"
        >
          <span
            class="chrome-wordmark"
            role="img"
            aria-label="shliste"
          />
        </NuxtLink>

        <nav
          aria-label="Hauptnavigation"
          class="desktop-nav items-center gap-x-5 text-sm font-semibold"
        >
          <NuxtLink
            v-for="entry in navigation"
            :key="entry.to"
            :to="entry.to"
            :aria-current="isNavActive(entry.to) ? 'page' : undefined"
            class="chrome-nav-link inline-flex min-h-10 items-center"
            :class="{ 'chrome-nav-link--active': isNavActive(entry.to) }"
          >{{ entry.label }}</NuxtLink>
        </nav>

        <MarketingAppCta />
        <MarketingMobileMenu />
      </div>
    </header>

    <div class="relative z-10">
      <slot />
    </div>

    <MarketingFooter />
  </div>
</template>

<style scoped>
.desktop-nav { display: flex; }
@media (max-width: 1023px) {
  .desktop-nav { display: none; }
  .chrome-header-inner { flex-wrap: nowrap; gap: 12px; padding-block: 14px; }
  .chrome-header-inner > a:first-child { margin-right: auto; }
}

.chrome {
  --marketing-text-accent: var(--demo-accent);
  min-height: 100dvh;
  position: relative;
  overflow-x: clip;
  background: var(--md-background);
  color: var(--md-on-background);
}
:global(.dark) .chrome { --marketing-text-accent: var(--md-primary); }
.chrome-muted { color: var(--md-on-surface-variant); }

.chrome-header {
  position: sticky;
  top: 0;
  backdrop-filter: blur(14px);
  background: color-mix(in srgb, var(--md-background) 78%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--md-primary) 8%, transparent);
}

.chrome-nav-link {
  color: inherit;
  text-decoration: none;
  background-image: linear-gradient(var(--marketing-text-accent), var(--marketing-text-accent));
  background-position: 0 100%;
  background-repeat: no-repeat;
  background-size: 0 2px;
  transition: background-size 200ms cubic-bezier(0.4, 0, 0.2, 1), color 160ms ease;
}
.chrome-nav-link:hover {
  color: var(--marketing-text-accent);
  background-size: 100% 2px;
}
.chrome-nav-link--active {
  color: var(--marketing-text-accent);
  background-size: 100% 2px;
}

.chrome-aurora {
  pointer-events: none;
  position: absolute;
  inset: 0 0 auto;
  height: min(72vh, 720px);
  overflow: hidden;
  z-index: 0;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.5;
  animation: drift 28s ease-in-out infinite alternate;
}
.blob-a {
  width: 42vw; height: 42vw; max-width: 420px; max-height: 420px;
  left: -8%; top: -10%;
  background: color-mix(in srgb, var(--md-primary) 35%, #FFD8EC);
}
.blob-b {
  width: 36vw; height: 36vw; max-width: 360px; max-height: 360px;
  right: -6%; top: 8%;
  background: color-mix(in srgb, var(--md-secondary-container) 70%, #FDECF5);
  animation-delay: -8s;
}
.blob-c {
  width: 28vw; height: 28vw; max-width: 280px; max-height: 280px;
  left: 38%; top: 28%;
  background: color-mix(in srgb, var(--md-primary-container) 50%, transparent);
  animation-delay: -14s;
}
@keyframes drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(18px, 24px, 0) scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
  .blob { animation: none; }
}
@media(max-width:380px){.chrome-header-inner{gap:8px}.chrome-header-inner img{width:94px}}

.chrome-wordmark{display:block;width:137px;height:36px;background:var(--md-primary);mask:url('/images/brand/wordmark.svg') left center/contain no-repeat;transition:background 1.1s}.chrome{background:var(--md-background);transition:background 1.1s,color 1.1s}@media(max-width:639px){.chrome-wordmark{width:122px;height:32px}}@media(max-width:380px){.chrome-wordmark{width:94px;height:28px}}
</style>

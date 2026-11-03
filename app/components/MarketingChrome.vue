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
const { style: previewStyle } = useMarketingPalette()
const { isSignedIn } = useAuth()
const navigation = [
  { to: '/im-alltag', label: 'Im Alltag' },
  { to: '/rezepte', label: 'Rezepte' },
  { to: '/gemeinsam-einkaufen', label: 'Gemeinsam einkaufen' },
  { to: '/so-funktionierts', label: 'So funktioniert’s' },
] as const
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement>()
watch(() => route.path, () => {
  menuOpen.value = false
})
function closeMenu() {
  menuOpen.value = false
  menuButton.value?.focus()
}
const isNavActive = (to: string) => route.path === to || (to === '/im-alltag' && /^\/(im-alltag|anleitungen|hilfe|funktionen)(\/|$)/.test(route.path))
const logoTo = computed(() => (isSignedIn.value ? '/app/lists' : '/'))
</script>

<template>
  <div
    class="chrome"
    :style="previewStyle"
    :class="{ 'chrome--aurora': props.aurora }"
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
      <div class="chrome-header-inner mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-5 sm:px-8">
        <NuxtLink
          :to="logoTo"
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

        <NuxtLink
          to="/app/lists"
          class="app-open"
        >
          <span
            class="app-open-icon"
            aria-hidden="true"
          ><UIcon name="i-lucide-list-checks" /></span>
          <span class="app-open-label">App öffnen</span><UIcon
            name="i-lucide-arrow-up-right"
            class="app-open-arrow"
            aria-hidden="true"
          />
        </NuxtLink>
        <button
          ref="menuButton"
          type="button"
          class="menu-toggle"
          :aria-expanded="menuOpen"
          aria-controls="marketing-mobile-menu"
          :aria-label="menuOpen ? 'Menü schließen' : 'Menü öffnen'"
          @click="menuOpen = !menuOpen"
          @keydown.esc="closeMenu"
        >
          <UIcon
            :name="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
            class="size-6"
          />
        </button>
      </div>
      <nav
        v-if="menuOpen"
        id="marketing-mobile-menu"
        class="mobile-menu"
        aria-label="Mobile Hauptnavigation"
        @keydown.esc="closeMenu"
      >
        <p>Was möchtest du entdecken?</p>
        <NuxtLink
          v-for="(entry, index) in navigation"
          :key="entry.to"
          :to="entry.to"
          :aria-current="isNavActive(entry.to) ? 'page' : undefined"
          @click="menuOpen = false"
        ><UIcon
          :name="['i-lucide-sparkles', 'i-lucide-chef-hat', 'i-lucide-users', 'i-lucide-circle-help'][index]"
          class="size-5"
        /><span>{{ entry.label }}</span><UIcon
          name="i-lucide-arrow-right"
          class="size-4"
        /></NuxtLink>
      </nav>
    </header>

    <div class="relative z-10">
      <slot />
    </div>

    <MarketingFooter />
  </div>
</template>

<style scoped>
.desktop-nav{display:flex}.menu-toggle{display:none}.mobile-menu{display:none}
.app-open{display:inline-flex;align-items:center;justify-content:center;gap:10px;flex-shrink:0;min-height:48px;padding:6px 17px 6px 6px;border:1px solid color-mix(in srgb,var(--demo-accent) 85%,white);border-radius:17px;background:var(--demo-accent);color:#fff;font-size:17px;font-weight:700;line-height:20px;white-space:nowrap;text-decoration:none;box-shadow:0 3px 8px -5px color-mix(in srgb,var(--demo-accent) 45%,transparent),inset 0 1px 0 #ffffff18;transition:background .3s,border-color .3s,box-shadow .2s,transform .2s}
.app-open-icon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border-radius:11px;background:#ffffff1f;box-shadow:inset 0 0 0 1px #ffffff14;transition:background .2s,transform .2s}.app-open-icon>.iconify{display:block;width:21px;height:21px}.app-open-label{display:block;transform:translateY(1px)}
.app-open:focus-visible{outline:3px solid var(--demo-accent);outline-offset:4px}.app-open:active{transform:translateY(1px);box-shadow:none}
@media(hover:hover){.app-open:hover{transform:translateY(-1px);box-shadow:0 7px 16px -8px color-mix(in srgb,var(--demo-accent) 55%,transparent),inset 0 1px 0 #ffffff25}.app-open:hover .app-open-icon{background:#ffffff2e;transform:rotate(-4deg)}}
@media(prefers-reduced-motion:reduce){.app-open,.app-open-icon{transition:none}.app-open:hover,.app-open:active,.app-open:hover .app-open-icon{transform:none}}
@media(max-width:1023px){.desktop-nav{display:none}.menu-toggle{display:flex;flex-shrink:0;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:var(--md-primary-container);color:var(--md-on-primary-container);cursor:pointer}.chrome-header-inner{flex-wrap:nowrap;gap:12px;padding-block:14px}.chrome-header-inner>a:first-child{margin-right:auto}.chrome-header-inner img{width:112px;height:auto}.app-open{font-size:16px;gap:8px;padding-right:13px}.mobile-menu{display:block;padding:8px 20px 24px;border-top:1px solid color-mix(in srgb,var(--demo-accent) 9%,transparent);max-height:70dvh;overflow:auto;background:var(--md-background)}.mobile-menu>p{font-size:13px;color:var(--marketing-text-accent);padding:12px}.mobile-menu>a{display:flex;align-items:center;gap:16px;padding:17px 15px;border-radius:16px;font-size:19px;font-weight:700}.mobile-menu>a>span:nth-child(2){flex:1}.mobile-menu>a[aria-current=page]{background:var(--md-primary-container);color:var(--md-on-primary-container)}.mobile-menu>a:hover{background:var(--md-surface-container)}.menu-toggle:focus-visible{outline:3px solid var(--demo-accent);outline-offset:3px}}
@media(min-width:1024px){.mobile-menu{display:none}}

.chrome {
  --marketing-shell: 80rem;
  --marketing-gutter: 1.25rem;
  --marketing-content: calc(var(--marketing-shell) - 2 * var(--marketing-gutter));
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
@media(max-width:380px){.chrome-header-inner{gap:8px;padding-inline:14px}.chrome-header-inner img{width:94px}.app-open{min-height:44px;font-size:14px;gap:7px;padding:5px 10px 5px 5px;border-radius:15px}.app-open-icon{flex-basis:28px;width:28px;height:28px;border-radius:9px}.app-open-icon>.iconify{width:19px;height:19px}}

.chrome-wordmark{display:block;width:137px;height:36px;background:var(--md-primary);mask:url('/images/brand/wordmark.svg') left center/contain no-repeat;transition:background .6s}.chrome{background:var(--md-background);transition:background .6s,color .6s}@media(max-width:639px){.chrome-wordmark{width:122px;height:32px}}@media(max-width:380px){.chrome-wordmark{width:94px;height:28px}}

@media(min-width:640px){.chrome{--marketing-gutter:2rem}}
.chrome-header-inner{max-width:var(--marketing-shell);padding-inline:var(--marketing-gutter)}
@media(max-width:380px){.chrome-header-inner{padding-inline:14px}}

.app-open{min-height:3rem;font-size:1.0625rem;gap:12px;padding:7px 15px 7px 7px;background:linear-gradient(135deg,color-mix(in srgb,var(--demo-accent) 82%,white),var(--demo-accent) 60%,color-mix(in srgb,var(--demo-accent) 88%,black));border-color:color-mix(in srgb,var(--demo-accent) 75%,white);box-shadow:0 5px 0 -2px color-mix(in srgb,var(--demo-accent) 70%,black),0 10px 22px -12px color-mix(in srgb,var(--demo-accent) 65%,transparent),inset 0 1px 0 #ffffff40}
.app-open-icon{width:2.125rem;height:2.125rem;flex-basis:2.125rem;background:#fff;color:var(--demo-accent);transform:rotate(-7deg);box-shadow:0 2px 6px #0002}.app-open-icon>.iconify{width:1.3125rem;height:1.3125rem}.app-open-arrow{width:1.125rem;height:1.125rem;flex-shrink:0;transition:transform .2s}
@media(hover:hover){.app-open:hover .app-open-icon{background:#fff;transform:rotate(0deg)}.app-open:hover .app-open-arrow{transform:translate(2px,-2px)}}
@media(max-width:1023px){.app-open-arrow{display:none}.app-open{gap:8px;padding-right:13px}}
@media(max-width:380px){.app-open{min-height:44px;font-size:14px;gap:7px;padding:5px 10px 5px 5px}.app-open-icon{width:28px;height:28px;flex-basis:28px}.app-open-icon>.iconify{width:19px;height:19px}}
@media(prefers-reduced-motion:reduce){.app-open-arrow{transition:none}.app-open:hover .app-open-arrow{transform:none}}
</style>

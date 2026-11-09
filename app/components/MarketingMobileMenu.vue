<script setup lang="ts">
const route = useRoute()
const { style: paletteStyle } = useMarketingPalette()
const open = ref(false)
const expanded = ref('')
const groups = [
  { value: 'alltag', label: 'Im Alltag', icon: 'i-lucide-shopping-basket', hint: 'Für das, was bei euch ansteht', links: [
    { to: '/im-alltag', label: 'Alle Alltagsbeispiele' },
    { to: '/im-alltag/ferienwohnung-einkauf', label: 'Ankommen in der Ferienwohnung' },
    { to: '/im-alltag/gaeste-zum-essen', label: 'Freunde kommen zum Essen' },
    { to: '/im-alltag/wg-einkauf', label: 'Gemeinsam in der WG' },
    { to: '/im-alltag/raclette-einkauf', label: 'Ein Abend mit Raclette' },
    { to: '/im-alltag/umzug-erster-abend', label: 'Der erste Abend nach dem Umzug' },
  ] },
  { value: 'rezepte', label: 'Rezepte', icon: 'i-lucide-chef-hat', hint: 'Von der Idee bis zum Abendessen', links: [
    { to: '/rezeptideen', label: 'Rezeptideen durchsuchen' },
    { to: '/rezepte', label: 'Dein Rezeptbuch entdecken' },
    { to: '/anleitungen/rezept-aus-foto', label: 'Ein Foto wird zum Rezept' },
    { to: '/anleitungen/rezept-aus-link', label: 'Ein Rezept aus einem Link' },
    { to: '/anleitungen/zutaten-auf-einkaufsliste', label: 'Zutaten auf die Einkaufsliste' },
  ] },
  { value: 'gemeinsam', label: 'Gemeinsam einkaufen', icon: 'i-lucide-users', hint: 'Alle wissen, was noch fehlt', links: [
    { to: '/gemeinsam-einkaufen', label: 'So kauft ihr zusammen ein' },
    { to: '/anleitungen/einkaufsliste-teilen', label: 'Eine Liste miteinander teilen' },
    { to: '/anleitungen/einkaufsliste-diktieren', label: 'Besorgungen einfach diktieren' },
  ] },
  { value: 'hilfe', label: 'So funktioniert’s', icon: 'i-lucide-compass', hint: 'Entdecken, ausprobieren, verstehen', links: [
    { to: '/so-funktionierts', label: 'Die App kennenlernen' },
    { to: '/hilfe/offline-einkaufen', label: 'Einkaufen ohne Netz' },
    { to: '/funktionen/geheime-listen', label: 'Geheime Listen' },
    { to: '/funktionen/rezept-badges', label: 'Deine Rezept-Badges' },
  ] },
]

watch(() => route.fullPath, () => {
  open.value = false
})
watch(open, (value) => {
  if (value) expanded.value = groups.find(group => group.links.some(link => link.to === route.path))?.value ?? ''
})

// A resize to desktop must also release the modal's scroll and focus locks.
let desktop: MediaQueryList | undefined
function closeOnDesktop() {
  if (desktop?.matches) open.value = false
}
onMounted(() => {
  desktop = window.matchMedia('(min-width: 1024px)')
  desktop.addEventListener('change', closeOnDesktop)
})
onBeforeUnmount(() => desktop?.removeEventListener('change', closeOnDesktop))
</script>

<template>
  <USlideover
    v-model:open="open"
    title="shliste entdecken"
    description="Alltagsbeispiele, Rezepte, Anleitungen und Hilfe"
    :ui="{ content: 'website-drawer', overlay: 'website-drawer-overlay' }"
  >
    <button
      type="button"
      class="website-menu-trigger"
      aria-label="Menü öffnen"
    >
      <UIcon
        name="i-lucide-menu"
        aria-hidden="true"
      />
    </button>

    <template #content>
      <div
        class="website-menu"
        :style="paletteStyle"
      >
        <div class="website-menu-top">
          <NuxtLink
            to="/?view=website"
            aria-label="shliste Startseite"
            @click="open = false"
          >
            <span
              class="website-menu-logo"
              aria-hidden="true"
            />
          </NuxtLink>
          <button
            type="button"
            class="website-menu-close"
            aria-label="Menü schließen"
            @click="open = false"
          >
            <UIcon
              name="i-lucide-x"
              aria-hidden="true"
            />
          </button>
        </div>

        <div class="website-menu-scroll">
          <div class="website-menu-intro">
            <p>Was steht bei dir an?</p>
            <span>Ein guter Anfang ist oft eine kleine Liste.</span>
          </div>
          <nav aria-label="Website entdecken">
            <NuxtLink
              class="website-menu-home"
              to="/?view=website"
              :aria-current="route.path === '/' ? 'page' : undefined"
              @click="open = false"
            >
              <UIcon
                name="i-lucide-house"
                aria-hidden="true"
              /><span>Startseite</span>
            </NuxtLink>
            <UAccordion
              v-model="expanded"
              :items="groups"
              class="website-menu-groups"
              :ui="{ trigger: 'website-menu-group', leadingIcon: 'website-menu-group-icon', trailingIcon: 'website-menu-chevron', label: 'website-menu-group-label', item: 'website-menu-group-item', content: 'website-menu-group-content' }"
            >
              <template #default="{ item }">
                <strong>{{ item.label }}</strong><small>{{ item.hint }}</small>
              </template>
              <template #content="{ item }">
                <ul class="website-menu-links">
                  <li
                    v-for="link in item.links"
                    :key="link.to"
                  >
                    <NuxtLink
                      :to="link.to"
                      :aria-current="route.path === link.to ? 'page' : undefined"
                      @click="open = false"
                    >
                      <span>{{ link.label }}</span><UIcon
                        v-if="route.path === link.to"
                        name="i-lucide-check"
                        aria-hidden="true"
                      />
                    </NuxtLink>
                  </li>
                </ul>
              </template>
            </UAccordion>
          </nav>
          <div class="website-menu-welcome">
            <MarketingPrideFlag /><span>Für dich. Für euch. Für alle.</span>
          </div>
          <nav
            class="website-menu-legal"
            aria-label="Rechtliches im Menü"
          >
            <NuxtLink
              to="/imprint"
              @click="open = false"
            >Impressum</NuxtLink>
            <NuxtLink
              to="/privacy"
              @click="open = false"
            >Datenschutz</NuxtLink>
          </nav>
        </div>

        <div class="website-menu-bottom">
          <NuxtLink
            class="website-menu-start"
            to="/app/lists"
            data-analytics-event="open_app"
            data-analytics-location="mobile_menu"
            @click="open = false"
          >
            <span class="website-menu-start-icon"><UIcon
              name="i-lucide-list-plus"
              aria-hidden="true"
            /></span>
            <span><strong>Was fehlt noch?</strong><small>App öffnen und losschreiben</small></span>
            <UIcon
              name="i-lucide-arrow-up-right"
              aria-hidden="true"
            />
          </NuxtLink>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<style>
.website-menu-trigger { display: none; }
@media (max-width: 1023px) {
  .website-menu-trigger { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 50%; background: var(--md-primary-container); color: var(--md-on-primary-container); cursor: pointer; }
  .website-menu-trigger > .iconify { width: 24px; height: 24px; }
  .website-menu-trigger:focus-visible { outline: 3px solid var(--demo-accent); outline-offset: 3px; }
}
.website-drawer[data-slot=content] { z-index: 60; width: min(28rem, calc(100% - .75rem)); max-width: none; overflow: hidden; border-radius: 26px 0 0 26px; border: 0; box-shadow: -12px 0 60px #24151f26; }
.website-drawer-overlay[data-slot=overlay] { z-index: 59; background: #21142155; backdrop-filter: blur(5px); }
.website-drawer[data-state=open] { animation-duration: 360ms; animation-timing-function: cubic-bezier(.22, 1, .36, 1); }
.website-drawer[data-state=closed] { animation-duration: 240ms; animation-timing-function: cubic-bezier(.4, 0, 1, 1); }
.website-menu { display: flex; flex-direction: column; min-height: 0; height: 100%; background: var(--md-background); color: var(--md-on-background); }
.website-menu-top { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-shrink: 0; padding: max(20px, env(safe-area-inset-top)) 24px 12px; }
.website-menu-logo { display: block; width: 126px; height: 36px; background: var(--md-primary); mask: url('/images/brand/wordmark.svg') left center / contain no-repeat; }
.website-menu-close { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 15px; color: var(--md-on-primary-container); background: var(--md-primary-container); cursor: pointer; }
.website-menu-close > .iconify { width: 22px; height: 22px; }
.website-menu-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 8px 24px 16px; scrollbar-width: thin; scrollbar-color: var(--md-primary-container) transparent; }
.website-menu-intro { padding: 6px 0 22px; }
.website-menu-intro > p { margin: 0 0 6px; font-size: 26px; line-height: 1.18; font-weight: 800; letter-spacing: -.025em; }
.website-menu-intro > span { display: block; font-size: 14px; line-height: 1.5; color: var(--md-on-surface-variant); }
.website-menu-home { display: flex; align-items: center; gap: 12px; min-height: 46px; padding: 8px 12px; border-radius: 14px; font-size: 16px; font-weight: 600; }
.website-menu-home > .iconify { width: 20px; height: 20px; }
.website-menu-groups { margin-top: 12px; }
.website-menu-group-item[data-slot=item] { border-color: color-mix(in srgb, var(--md-primary) 14%, transparent); }
.website-menu-group[data-slot=trigger] { gap: 12px; width: 100%; min-height: 78px; padding: 14px 8px; color: inherit; text-align: left; text-decoration: none; border-radius: 14px; cursor: pointer; }
.website-menu-group:hover { text-decoration: none; }
.website-menu-group-icon[data-slot=leadingIcon] { width: 24px; height: 24px; flex-shrink: 0; color: var(--demo-accent); }
.website-menu-group-label { min-width: 0; }
.website-menu-group-label > strong { display: block; font-size: 17px; line-height: 1.3; font-weight: 700; }
.website-menu-group-label > small { display: block; margin-top: 3px; font-size: 12px; line-height: 1.4; color: var(--md-on-surface-variant); font-weight: 400; }
.website-menu-chevron[data-slot=trailingIcon] { width: 18px; height: 18px; color: var(--demo-accent); transition: transform 240ms ease; }
.website-menu-links { margin: 0 0 14px 19px; padding: 0 0 0 16px; list-style: none; border-left: 1px solid color-mix(in srgb, var(--md-primary) 24%, transparent); }
.website-menu-links a { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; text-decoration: none; }
.website-menu-links a > .iconify { width: 18px; height: 18px; flex-shrink: 0; }
.website-menu-home[aria-current=page], .website-menu-links [aria-current=page] { background: var(--md-primary-container); color: var(--md-on-primary-container); font-weight: 650; }
.website-menu-welcome { display: flex; align-items: center; gap: 10px; margin-top: 24px; font-size: 12px; line-height: 1.4; color: var(--md-on-surface-variant); }
.website-menu-welcome > svg { width: 32px; height: 22px; flex-shrink: 0; border-radius: 4px; }
.website-menu-legal { display: flex; flex-wrap: wrap; gap: 4px 20px; font-size: 12px; color: var(--md-on-surface-variant); }
.website-menu-legal > a { display: inline-flex; align-items: center; min-height: 44px; }
.website-menu-bottom { flex-shrink: 0; padding: 14px 24px max(20px, env(safe-area-inset-bottom)); border-top: 1px solid color-mix(in srgb, var(--md-primary) 12%, transparent); background: var(--md-background); }
.website-menu-start { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 19px; background: var(--demo-accent); color: white; text-decoration: none; }
.website-menu-start-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 36px; border-radius: 11px; background: #ffffff20; }
.website-menu-start-icon > .iconify { width: 22px; height: 22px; }
.website-menu-start > span:nth-child(2) { flex: 1; min-width: 0; }
.website-menu-start strong { display: block; font-size: 16px; line-height: 1.3; }
.website-menu-start small { display: block; margin-top: 3px; font-size: 12px; line-height: 1.4; }
.website-menu-start > .iconify { width: 20px; height: 20px; flex-shrink: 0; }
.website-menu a:focus-visible, .website-menu button:focus-visible { outline: 2px solid var(--demo-accent); outline-offset: 2px; }
@media (hover: hover) {
  .website-menu-links a:hover, .website-menu-home:hover, .website-menu-group:hover { background: var(--md-surface-container); }
}
@media (min-width: 640px) {
  .website-drawer[data-slot=content] { top: 16px; right: 16px; bottom: 16px; border-radius: 28px; }
}
@media (max-width: 380px) {
  .website-menu-top { padding-inline: 18px; }
  .website-menu-scroll { padding-inline: 18px; }
  .website-menu-intro > p { font-size: 24px; }
  .website-menu-bottom { padding-inline: 16px; }
  .website-menu-start { gap: 10px; padding: 12px; }
  .website-menu-start-icon { width: 30px; height: 34px; flex-basis: 30px; }
  .website-menu-group-label > strong { font-size: 16px; }
}
@media (max-height: 540px) {
  .website-menu-top { padding-block: 8px; }
  .website-menu-bottom { padding-block: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .website-drawer[data-state], .website-drawer-overlay[data-state], .website-menu-group-content[data-state] { animation-duration: 1ms; }
  .website-menu-chevron[data-slot=trailingIcon] { transition: none; }
}
</style>

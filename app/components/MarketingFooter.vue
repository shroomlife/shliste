<script setup lang="ts">
const groups = [
  { title: 'shliste entdecken', icon: 'i-lucide-compass', links: [
    { to: '/themenwelten', text: 'Einkaufslisten Themenwelten' },
    { to: '/im-alltag', text: 'Alle Alltagsbeispiele' },
    { to: '/rezeptideen', text: 'Rezeptideen durchsuchen' },
    { to: '/rezepte', text: 'Rezepte sammeln und kochen' },
    { to: '/gemeinsam-einkaufen', text: 'Gemeinsam einkaufen' },
    { to: '/so-funktionierts', text: 'So funktioniert shliste' },
    { to: '/warteliste', text: 'Zur KI-Warteliste' },
    { to: '/funktionen/rezept-badges', text: 'Deine Rezept-Badges' },
  ] },
  { title: 'Für euren Alltag', icon: 'i-lucide-shopping-basket', links: [
    { to: '/im-alltag/ferienwohnung-einkauf', text: 'Einkauf für die Ferienwohnung' },
    { to: '/themenwelten/raclette', text: 'Einen Racletteabend planen' },
    { to: '/im-alltag/umzug-erster-abend', text: 'Der erste Abend nach dem Umzug' },
    { to: '/im-alltag/gaeste-zum-essen', text: 'Wenn Freunde zum Essen kommen' },
    { to: '/im-alltag/wg-einkauf', text: 'Eine Einkaufsliste für die WG' },
  ] },
  { title: 'Wie geht das?', icon: 'i-lucide-circle-help', links: [
    { to: '/anleitungen/einkaufsliste-teilen', text: 'Wie teile ich eine Einkaufsliste?' },
    { to: '/anleitungen/rezept-aus-foto', text: 'Wie wird ein Foto zum Rezept?' },
    { to: '/anleitungen/zutaten-auf-einkaufsliste', text: 'Wie kommen Zutaten auf die Liste?' },
    { to: '/anleitungen/einkaufsliste-diktieren', text: 'Kann ich meine Liste diktieren?' },
    { to: '/hilfe/offline-einkaufen', text: 'Was geht ohne Internet?' },
    { to: '/funktionen/geheime-listen', text: 'Wie bleiben Listen geheim?' },
  ] },
]
const { openSettings } = useAnalyticsConsent()
</script>

<template>
  <footer
    id="seitenende"
    class="site-footer"
  >
    <div class="footer-inner mkt-shell">
      <div class="footer-intro">
        <div>
          <NuxtLink
            to="/?view=website"
            class="footer-brand"
            aria-label="shliste Startseite"
          ><span aria-hidden="true" /></NuxtLink><p>Weniger im Kopf.<br>Mehr Platz für euren Alltag.</p>
        </div><NuxtLink
          to="/app/lists"
          class="footer-start"
          data-analytics-event="open_app"
          data-analytics-location="footer"
        ><span class="footer-start-icon"><UIcon name="i-lucide-list-plus" /></span><span><strong>Was fehlt euch noch?</strong><small>Deine erste Liste anlegen</small></span><UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
      </div>
      <div class="footer-directory">
        <nav
          v-for="group in groups"
          :key="group.title"
          :aria-label="group.title"
        >
          <h2><span><UIcon :name="group.icon" /></span>{{ group.title }}</h2><ul>
            <li
              v-for="link in group.links"
              :key="link.to"
            >
              <NuxtLink :to="link.to">{{ link.text }}</NuxtLink>
            </li>
          </ul>
        </nav>
      </div>
      <div class="footer-bottom">
        <div class="footer-welcome">
          <MarketingPrideFlag /><span>Für dich. Für euch. Für alle.</span>
        </div><nav aria-label="Rechtliches">
          <NuxtLink to="/imprint">Impressum</NuxtLink><NuxtLink to="/privacy">Datenschutz</NuxtLink><button
            type="button"
            class="footer-consent"
            @click="openSettings"
          >
            🍪 Cookies
          </button>
        </nav>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer{position:relative;z-index:10;border-top:1px solid color-mix(in srgb,var(--demo-accent) 16%,transparent);background:color-mix(in srgb,var(--demo-soft) 35%,var(--md-background));margin-top:24px}.footer-inner{padding-block:52px 24px}.footer-intro{display:flex;align-items:center;justify-content:space-between;gap:32px;padding-bottom:40px}.footer-brand{display:flex;align-items:center;width:150px;min-height:44px}.footer-brand>span{display:block;width:146px;height:38px;background:var(--md-primary);mask:url('/images/brand/wordmark.svg') left center/contain no-repeat}.footer-intro p{font-size:1.375rem;line-height:1.35;margin:12px 0 0;color:var(--md-on-surface-variant)}.footer-start{display:flex;align-items:center;gap:16px;width:clamp(27rem,32vw,36rem);max-width:100%;flex:0 0 auto;padding:20px 24px;border:1px solid color-mix(in srgb,var(--demo-accent) 18%,transparent);border-radius:22px;background:var(--md-surface);color:var(--demo-accent)}.footer-start-icon{display:grid;place-items:center;width:48px;height:48px;flex:0 0 48px;border-radius:16px;background:var(--demo-soft)}.footer-start-icon>.iconify{width:25px;height:25px}.footer-start strong{display:block;font-size:1.438rem;line-height:1.25}.footer-start small{display:block;font-size:1rem;line-height:1.4;margin-top:4px}.footer-start>.iconify{width:20px;height:20px;flex-shrink:0;margin-left:12px}.footer-directory{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px;padding-block:32px 40px;border-top:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent)}.footer-directory nav{min-width:0}.footer-directory h2{display:flex;align-items:center;gap:12px;font-size:1.375rem;line-height:1.2;font-weight:800;margin:0 0 16px}.footer-directory h2>span{display:grid;place-items:center;width:38px;height:38px;flex:0 0 38px;border-radius:12px;background:var(--demo-soft);color:var(--demo-accent)}.footer-directory h2 .iconify{width:22px;height:22px}.footer-directory ul{list-style:none;padding:0;margin:0}.footer-directory a{display:flex;align-items:center;min-height:44px;padding:8px 0;font-size:1.062rem;line-height:1.35;color:var(--md-on-surface-variant);text-decoration:none}.footer-directory a:hover,.footer-bottom a:hover,.footer-consent:hover{color:var(--demo-accent);text-decoration:underline;text-underline-offset:4px}.footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:24px;border-top:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent);padding-top:24px}.footer-welcome{display:flex;align-items:center;gap:14px}.footer-welcome>span{display:block;margin:0;font-size:1.062rem;line-height:24px}.footer-welcome :deep(svg){display:block;width:38px;height:24px;flex:0 0 38px;align-self:center}.footer-bottom nav{display:flex;flex-wrap:wrap;gap:24px}.footer-bottom a,.footer-consent{display:inline-flex;align-items:center;min-height:44px;font-size:1rem}.footer-consent{padding:0;border:0;background:none;color:inherit;font-family:inherit;font-weight:inherit;cursor:pointer}.site-footer a:focus-visible,.footer-consent:focus-visible{outline:2px solid var(--demo-accent);outline-offset:5px;border-radius:6px}
@media(max-width:900px){.footer-directory{gap:24px}.footer-directory h2{font-size:1.25rem;gap:9px}.footer-directory a{font-size:1rem}}
@media(max-width:700px){.footer-inner{padding-top:36px}.footer-intro{align-items:flex-start;flex-direction:column;gap:24px;padding-bottom:30px}.footer-start{width:100%;max-width:36rem}.footer-directory{grid-template-columns:1fr 1fr;gap:30px 24px}.footer-directory nav:last-child{grid-column:1/-1}.footer-bottom{flex-direction:column;align-items:flex-start;gap:12px}.footer-directory h2{font-size:1.25rem}}
@media(max-width:440px){.footer-directory{grid-template-columns:1fr;gap:28px}.footer-directory nav:last-child{grid-column:auto}.footer-directory h2{margin-bottom:8px;font-size:1.375rem}.footer-directory a{font-size:1.125rem}.footer-start{padding:17px;gap:12px}.footer-start strong{font-size:1.312rem}.footer-start>.iconify{margin-left:auto}.footer-welcome{gap:10px}.footer-welcome>span{font-size:1rem}}

.footer-start{transition:transform .28s cubic-bezier(.2,.7,.2,1),box-shadow .28s,border-color .28s,background-color .28s}
.footer-start-icon,.footer-start>.iconify{transition:transform .28s cubic-bezier(.2,.7,.2,1),background-color .28s,color .28s}
.footer-start:focus-visible{background:var(--demo-canvas);border-color:var(--demo-accent);box-shadow:0 12px 28px -18px var(--demo-accent)}
.footer-start>span:nth-child(2){min-width:0;flex:1}.footer-start strong,.footer-start small{overflow-wrap:break-word}.footer-welcome>span{transform:translateY(.08em)}
@supports(text-box-trim:trim-both){.footer-welcome>span{text-box-trim:trim-both;text-box-edge:cap alphabetic;transform:none}}
.footer-directory a,.footer-bottom a{transition:color .2s,text-decoration-color .2s;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:5px;text-decoration-thickness:1px}
.footer-directory a:focus-visible,.footer-bottom a:focus-visible{color:var(--demo-accent);text-decoration-color:currentColor}
@media(hover:hover) and (pointer:fine){.footer-start:hover{transform:translateY(-3px);background:var(--demo-canvas);border-color:color-mix(in srgb,var(--demo-accent) 45%,transparent);box-shadow:0 16px 30px -20px var(--demo-accent)}.footer-start:hover .footer-start-icon{transform:rotate(-5deg);background:var(--demo-accent);color:var(--md-on-primary)}.footer-start:hover>.iconify{transform:translate(2px,-2px)}}
.footer-start:active{transform:translateY(0);box-shadow:none}
@media(prefers-reduced-motion:reduce){.footer-start,.footer-start-icon,.footer-start>.iconify,.footer-directory a,.footer-bottom a{transition:none}.footer-start:hover,.footer-start:hover .footer-start-icon,.footer-start:hover>.iconify{transform:none}}
</style>

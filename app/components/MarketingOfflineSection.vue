<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

const groceries = ['Tomaten', 'Lasagneplatten', 'Haferdrink']
function item(name: string, checked: boolean): ListItem {
  return { id: name, listId: 'offline-preview', name, checked, quantity: 1, removed: false, orderIndex: 0, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: '2026-11-03T12:00:00.000Z', updatedAt: '2026-11-03T12:00:00.000Z', deletedAt: null, fieldTimestamps: null }
}
</script>

<template>
  <section
    id="auch-ohne-netz"
    class="offline-section"
    aria-labelledby="offline-title"
  >
    <div class="mkt-content offline-layout">
      <div class="offline-copy">
        <p class="offline-eyebrow">
          <UIcon name="i-lucide-wifi-off" /> Zwischen zwei Supermarktregalen
        </p>
        <h2 id="offline-title">
          Kein Empfang.<br><em>Kein Einkaufsdrama.</em>
        </h2>
        <p>Du stehst vor den Nudeln. Ausgerechnet hier hat dein Handy keinen Empfang. Deine gespeicherte Liste ist trotzdem dabei.</p>
        <p>Nachsehen, was fehlt. Abhaken, was im Korb liegt. Sobald wieder eine Verbindung besteht und shliste abgleicht, sehen auch die anderen deinen Stand.</p>
        <NuxtLink
          to="/hilfe/offline-einkaufen"
          class="offline-main-link"
        >Was ohne Netz funktioniert <UIcon name="i-lucide-arrow-right" /></NuxtLink>
      </div>
      <figure class="offline-example">
        <div
          class="offline-preview"
          aria-hidden="true"
          inert
        >
          <MarketingAppToolbar />
          <div class="offline-status">
            <UIcon name="i-lucide-wifi-off" /><span>Offline · Änderungen bleiben auf diesem Gerät</span>
          </div>
          <div class="offline-list-title">
            <span>Freitag mit Freunden</span><small>Schon vorher auf diesem Gerät gespeichert</small>
          </div>
          <div class="offline-items">
            <ListItemRow
              v-for="(name, i) in groceries"
              :key="name"
              :item="item(name, i === 0)"
            />
          </div>
          <div class="offline-saved">
            <UIcon name="i-lucide-hard-drive-download" /><span><strong>Der Haken bleibt.</strong><small>Der Abgleich wartet auf die Verbindung.</small></span>
          </div>
        </div>
        <figcaption>Beispieldaten</figcaption>
      </figure>
      <div
        class="offline-links"
        aria-label="Mehr zum Einkaufen mit shliste"
      >
        <NuxtLink to="/anleitungen/einkaufsliste-teilen"><UIcon name="i-lucide-users" /><span><strong>Vorher gemeinsam planen</strong><small>So teilt ihr eure Einkaufsliste.</small></span><UIcon name="i-lucide-arrow-right" /></NuxtLink>
        <NuxtLink to="/anleitungen/zutaten-auf-einkaufsliste"><UIcon name="i-lucide-chef-hat" /><span><strong>Nur kaufen, was fehlt</strong><small>Zutaten vom Rezept auf die Liste holen.</small></span><UIcon name="i-lucide-arrow-right" /></NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.offline-section{margin-block:1rem 2rem;padding-block:clamp(3.5rem,7vw,7rem);background:color-mix(in srgb,var(--demo-soft) 52%,var(--md-background));border-block:1px solid color-mix(in srgb,var(--demo-accent) 15%,transparent);color:var(--md-on-surface)}
.offline-layout{display:grid;grid-template-columns:1.05fr 1fr;gap:3rem 5rem;align-items:center}
.offline-eyebrow{display:flex;align-items:center;gap:.65rem;font-size:.8125rem;line-height:1.4;font-weight:700;letter-spacing:.055em;text-transform:uppercase;color:var(--demo-accent);margin:0 0 1.5rem}.offline-eyebrow>.iconify{width:1.4rem;height:1.4rem;flex-shrink:0}
.offline-copy h2{font-size:clamp(2.3rem,4vw,3.65rem);line-height:1.06;letter-spacing:-.04em;font-weight:850;margin:0 0 1.5rem;text-wrap:balance}.offline-copy em{font-style:normal;color:var(--demo-accent)}
.offline-copy>p:not(.offline-eyebrow){font-size:1.188rem;line-height:1.65;color:var(--md-on-surface-variant);margin:0 0 1rem;max-width:32rem}
.offline-main-link{display:inline-flex;align-items:center;gap:.7rem;min-height:48px;margin-top:.75rem;font-size:1.0625rem;font-weight:750;color:var(--demo-accent)}.offline-main-link>.iconify{width:1.2rem;height:1.2rem;flex-shrink:0}
.offline-example{width:100%;max-width:33rem;margin:0;justify-self:end}.offline-preview{overflow:hidden;border:1px solid color-mix(in srgb,var(--demo-accent) 18%,transparent);border-radius:1.25rem;background:var(--md-surface);box-shadow:0 1.5rem 4rem -2rem color-mix(in srgb,var(--demo-accent) 30%,transparent)}
.offline-status{display:flex;align-items:center;gap:9px;padding:13px 16px;background:var(--md-secondary-container);font-size:13px;line-height:1.4}.offline-status>.iconify{width:18px;height:18px;flex-shrink:0;color:var(--demo-accent)}
.offline-list-title{padding:24px 20px 16px}.offline-list-title>span{font-size:24px;line-height:1.2;font-weight:750}.offline-list-title small{display:block;font-size:13px;line-height:1.4;color:var(--md-on-surface-variant);margin-top:7px}
.offline-items{display:grid;gap:8px;padding:0 16px 24px}.offline-saved{display:flex;align-items:center;gap:12px;border-top:1px solid var(--md-outline-variant);padding:18px 20px}.offline-saved>.iconify{width:26px;height:26px;flex-shrink:0;color:var(--demo-accent)}.offline-saved strong{display:block;font-size:16px;line-height:1.4}.offline-saved small{display:block;font-size:13px;line-height:1.4;color:var(--md-on-surface-variant)}
.offline-example figcaption{font-size:.8125rem;line-height:1.5;margin:1rem .25rem 0;color:var(--md-on-surface-variant);max-width:31rem}
.offline-links{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;padding-top:2rem;border-top:1px solid color-mix(in srgb,var(--demo-accent) 17%,transparent)}.offline-links>a{display:flex;align-items:center;gap:1rem;padding:1.35rem 1.5rem;border-radius:1.15rem;background:var(--md-surface);border:1px solid color-mix(in srgb,var(--demo-accent) 14%,transparent)}.offline-links>a>.iconify{width:1.7rem;height:1.7rem;flex-shrink:0;color:var(--demo-accent)}.offline-links>a>.iconify:last-child{width:1.2rem;height:1.2rem;margin-left:auto}.offline-links strong{display:block;font-size:1.125rem;line-height:1.3}.offline-links small{display:block;font-size:.938rem;line-height:1.45;color:var(--md-on-surface-variant);margin-top:.35rem}
.offline-section a:hover strong,.offline-main-link:hover{text-decoration:underline;text-underline-offset:5px}.offline-section a:focus-visible{outline:2px solid var(--demo-accent);outline-offset:5px}
@media(min-width:2500px){.offline-preview{zoom:1.25}}
@media(max-width:1000px){.offline-layout{gap:2.5rem;grid-template-columns:1fr 1fr}.offline-copy h2{font-size:2.7rem}.offline-copy>p:not(.offline-eyebrow){font-size:1.0625rem}.offline-links{gap:1rem}}
@media(max-width:820px){.offline-layout{grid-template-columns:1fr}.offline-copy{max-width:36rem}.offline-example{max-width:34rem;justify-self:center}.offline-links{grid-template-columns:1fr;padding-top:1.5rem}.offline-copy h2{font-size:clamp(2.1rem,6vw,3.2rem)}}
@media(max-width:380px){.offline-links>a{padding:1rem;gap:.7rem}.offline-list-title{padding-inline:16px}.offline-list-title>span{font-size:22px}.offline-items{padding-inline:10px}}
.offline-section{scroll-margin-top:6rem}
.offline-links{position:relative;border-top:0}
.offline-links::before{content:'';position:absolute;top:0;left:50%;translate:-50% 0;width:100vw;height:1px;background:color-mix(in srgb,var(--demo-accent) 17%,transparent);pointer-events:none}
</style>

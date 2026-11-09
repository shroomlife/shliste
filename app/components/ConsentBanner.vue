<script setup lang="ts">
/**
 * Fragt vor jeder Messung, als schwebende Leiste über der Website.
 * „Ablehnen“ ist genauso groß wie „Akzeptieren“ und gleich gut erreichbar:
 * Eine Zustimmung zählt nur, wenn Nein genauso leicht ist wie Ja. Kein
 * Schließen-Kreuz, denn Wegklicken wäre keine Wahl.
 *
 * Gemountet in MarketingChrome, erbt also Palette und Breite der Website.
 */
const { bannerVisible, accept, reject } = useAnalyticsConsent()
</script>

<template>
  <section
    v-if="bannerVisible"
    class="consent"
    role="dialog"
    aria-labelledby="consent-title"
    aria-describedby="consent-text"
  >
    <span
      class="consent-icon"
      aria-hidden="true"
    ><UIcon name="i-lucide-chart-line" /></span>
    <div class="consent-copy">
      <h2
        id="consent-title"
        class="consent-title"
      >
        Hilf uns, shliste besser zu machen
      </h2>
      <p
        id="consent-text"
        class="consent-text"
      >
        Mit deiner Zustimmung zählt Google Analytics, welche Seiten helfen. Werbung bleibt aus, deine Listen bleiben privat. <span class="consent-hint">Jederzeit im Footer änderbar.</span> <NuxtLink
          to="/privacy#statistik"
          class="consent-link"
        >Mehr erfahren</NuxtLink>
      </p>
    </div>
    <div class="consent-actions">
      <button
        type="button"
        class="consent-button consent-button--outline optical-center"
        @click="reject"
      >
        Ablehnen
      </button>
      <button
        type="button"
        class="consent-button consent-button--solid optical-center"
        @click="accept"
      >
        Akzeptieren
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Handy zuerst: kompakte Karte, Text oben, zwei gleich große Knöpfe darunter. */
.consent {
  position: fixed;
  z-index: 60;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 18px 16px 16px;
  border-radius: 26px;
  background: color-mix(in srgb, var(--md-surface) 94%, transparent);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 48px -14px color-mix(in srgb, var(--md-on-background) 34%, transparent), 0 0 0 1px color-mix(in srgb, var(--demo-accent) 14%, transparent);
  color: var(--md-on-surface);
}
.consent-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--demo-soft);
  color: var(--demo-accent);
}
.consent-icon > .iconify { width: 20px; height: 20px; }
.consent-copy { display: contents; }
.consent-title {
  margin: 0;
  font-size: 1.312rem;
  line-height: 1.15;
  font-weight: 900;
}
.consent-text {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 1.062rem;
  line-height: 1.4;
  color: var(--md-on-surface-variant);
}
.consent-hint { display: none; }
.consent-link {
  color: var(--demo-accent);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.consent-actions {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
/* Feste Höhe, weil optical-center (main.css) die zu hoch sitzende Zain nur so mittig rückt. */
.consent-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 52px;
  padding-inline: 28px;
  border-radius: 18px;
  border: 2px solid var(--demo-accent);
  font-family: inherit;
  font-size: 1.188rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.consent-button:hover { transform: translateY(-1px); }
.consent-button:active { transform: translateY(0) scale(0.98); }
.consent-button--outline { background: transparent; color: var(--demo-accent); }
.consent-button--outline:hover { background: color-mix(in srgb, var(--demo-soft) 70%, transparent); }
.consent-button--solid { background: var(--demo-accent); color: #FFFFFF; }
.consent-button--solid:hover {
  background: color-mix(in srgb, var(--demo-accent) 88%, #000000);
  border-color: color-mix(in srgb, var(--demo-accent) 88%, #000000);
  box-shadow: 0 10px 22px -12px var(--demo-accent);
}
.consent-link { transition: color 160ms ease, text-decoration-color 160ms ease; }
.consent-link:hover { text-decoration-color: transparent; }
@media (prefers-reduced-motion: reduce) {
  .consent-button,
  .consent-button:hover,
  .consent-button:active { transition: none; transform: none; }
}
.consent-button:focus-visible,
.consent-link:focus-visible {
  outline: 2px solid var(--demo-accent);
  outline-offset: 3px;
}

/* Tablet: in der Breite der Website, Symbol neben dem Text. */
@media (min-width: 640px) {
  .consent {
    left: var(--marketing-gutter);
    right: var(--marketing-gutter);
    bottom: calc(24px + env(safe-area-inset-bottom));
    align-items: start;
    gap: 16px;
    padding: 20px;
    border-radius: 28px;
  }
  .consent-icon { width: 48px; height: 48px; border-radius: 16px; }
  .consent-icon > .iconify { width: 24px; height: 24px; }
  .consent-copy { display: flex; flex-direction: column; gap: 2px; }
  .consent-title { font-size: 1.438rem; line-height: 1.2; }
  .consent-text { font-size: 1.125rem; }
  .consent-hint { display: inline; }
  .consent-button { height: 54px; font-size: 1.25rem; }
}

/* Desktop: eine Zeile, so breit wie der Inhalt der Seite. */
@media (min-width: 1024px) {
  .consent {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 24px;
    width: min(var(--marketing-content), calc(100% - 2 * var(--marketing-gutter)));
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    box-sizing: border-box;
    padding: 22px 24px 22px 28px;
    bottom: calc(28px + env(safe-area-inset-bottom));
  }
  .consent-icon { width: 52px; height: 52px; }
  .consent-icon > .iconify { width: 26px; height: 26px; }
  .consent-actions { grid-column: auto; display: flex; gap: 12px; }
  .consent-button { min-width: 168px; padding-inline: 32px; }
}
</style>

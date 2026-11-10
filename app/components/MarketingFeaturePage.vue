<script setup lang="ts">
const { feature } = defineProps<{ feature: 'badge' | 'secret' }>()
const content = computed(() => feature === 'badge'
  ? {
      eyebrow: 'Deine selbst gekochten Rezepte', title: 'Der Marmorkuchen war gut. Der Badge bleibt.', intro: 'Du hast das Rezept gekocht und den letzten Schritt abgehakt. shliste feiert den Moment mit einer Auszeichnung. So wird aus deiner Rezeptsammlung auch eine Erinnerung an das, was du schon ausprobiert hast.',
      sections: [
        { title: 'Vom letzten Haken zum ersten Badge', text: 'Öffne ein Rezept mit Kochschritten. Hake während des Kochens die erledigten Schritte ab. Sobald alle Schritte erledigt sind, erhältst du beim ersten Mal den Badge für dieses Rezept. Du musst dafür keine zusätzliche Aufgabe lösen.' },
        { title: 'Mit deinem Rezeptbild und Datum', text: 'Dein Rezeptbild und ein goldenes Siegel schmücken die Auszeichnung in der App. Das vorhandene Rezeptbild steht im Mittelpunkt. Hat dein Rezept noch kein Bild, zeigt der Badge stattdessen den Anfangsbuchstaben auf seiner Rezeptfarbe. Dazu kommt das Datum, an dem du ihn verdient hast.' },
        { title: 'Noch einmal kochen? Sehr gern.', text: 'Wenn du dasselbe Rezept erneut fertig kochst, feiert shliste mit Konfetti. Es entsteht dabei kein zweiter Badge für dasselbe Rezept. Deine bisherigen Auszeichnungen findest du im Profil in der Badge-Sammlung.' },
      ], other: '/funktionen/geheime-listen', otherLabel: 'Und die Geburtstagsideen? Die dürfen geheim bleiben.',
    }
  : {
      eyebrow: 'Eine Liste nur für deine Augen', title: 'Damit die Konzertkarten bis Samstag geheim bleiben.', intro: 'Manche Besorgungen sind eine Überraschung. Markiere die Liste als geheim. Zum Öffnen ihrer Einträge brauchst du dann eine zusätzliche Bestätigung auf deinem Gerät.',
      sections: [
        { title: 'Eine Liste mit Schloss', text: 'Beim Anlegen oder Bearbeiten kannst du die Liste als geheim markieren, wenn dein Gerät die Entsperrung unterstützt. In der Übersicht erkennst du sie am Schloss. Der Listenname bleibt sichtbar. Wähle also einen neutralen Namen, wenn bereits der Titel die Überraschung verraten würde.' },
        { title: 'Dein Gerät bestätigt, dass du es bist', text: 'Auf Android öffnet sich die Systemabfrage. Je nach Gerät entsperrst du mit einer unterstützten biometrischen Methode oder mit deiner Displaysperre, etwa der PIN. Wenn du abbrichst oder die Bestätigung fehlschlägt, bleiben die Einträge gesperrt.' },
        { title: 'Im Browser entscheidet dein Gerät', text: 'Die Web-App nutzt die Entsperrfunktion deines Geräts. Beim ersten Mal wird dafür eine Bestätigungsmethode auf deinem Gerät eingerichtet. Auf unterstützten Apple-Geräten kann die Bestätigung über Face ID oder Touch ID laufen. Die verfügbaren Methoden und der Dialog hängen vom Browser und der Einrichtung deines Geräts ab.' },
        { title: 'Was „geheim“ hier bedeutet', text: 'Die Funktion schützt das Öffnen der Liste innerhalb der App auf deinem Gerät. Sie ist kein zusätzlicher verschlüsselter Tresor. Die Liste wird durch das Aktivieren der Sperre auch nicht automatisch mit anderen geteilt. Für eine Überraschung behältst du sie am besten als persönliche Liste.' },
      ], other: '/funktionen/rezept-badges', otherLabel: 'Das nächste Essen feiern: Rezept-Badges entdecken.',
    })
const { readingRoot, activeSection } = useMarketingReading()
useSeoMeta({ title: () => content.value.title, description: () => content.value.intro })
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="feature-page"
    >
      <div class="mkt-shell">
        <NuxtLink
          to="/im-alltag"
          class="back-link"
        ><UIcon name="i-lucide-book-open" /> Alle Beispiele und Anleitungen</NuxtLink>
        <section
          class="feature-intro"
          aria-labelledby="feature-title"
        >
          <div class="feature-copy">
            <p class="mkt-label">
              {{ content.eyebrow }}
            </p>
            <h1 id="feature-title">
              {{ content.title }}
            </h1>
            <p class="feature-lead">
              {{ content.intro }}
            </p>
            <a
              href="#anleitung"
              class="feature-link"
            ><span><UIcon name="i-lucide-list-checks" /></span> Schritt für Schritt entdecken</a>
            <div class="feature-context">
              <UIcon :name="feature === 'badge' ? 'i-lucide-chef-hat' : 'i-lucide-lock-keyhole'" />
              <p>{{ feature === 'badge' ? 'Dein Rezept. Selbst gekocht. Zum Wiederfreuen.' : 'Deine Ideen bleiben hinter der Gerätebestätigung.' }}</p>
            </div>
          </div>
          <div class="feature-visual">
            <MarketingArticleScene :story-key="feature === 'badge' ? 'rezept-badges' : 'geheime-listen'" />
          </div>
        </section>
        <div
          id="anleitung"
          class="feature-guide"
        >
          <aside
            class="feature-guide-map"
            aria-label="Wegweiser durch die Anleitung"
          >
            <p class="mkt-label">
              So funktioniert’s
            </p>
            <h2>{{ feature === 'badge' ? 'Vom Kochen zum kleinen Glücksmoment.' : 'Eine Überraschung bleibt eine Überraschung.' }}</h2>
            <nav aria-label="In dieser Anleitung">
              <a
                v-for="(section, i) in content.sections"
                :key="section.title"
                :href="`#schritt-${i + 1}`"
                :aria-current="activeSection === i ? 'location' : undefined"
              ><span aria-hidden="true">{{ i + 1 }}</span><span>{{ section.title }}</span></a>
            </nav>
          </aside>
          <div
            ref="readingRoot"
            class="feature-reading"
          >
            <section
              v-for="(section, i) in content.sections"
              :id="`schritt-${i + 1}`"
              :key="section.title"
              class="feature-step"
              data-reading-step
            >
              <span
                class="feature-marker"
                aria-hidden="true"
              >{{ String(i + 1).padStart(2, '0') }}</span>
              <div><h2>{{ section.title }}</h2><p>{{ section.text }}</p></div>
            </section>
            <p
              v-if="feature === 'secret'"
              class="source-note"
            >
              Mehr zur Gerätebestätigung: <a
                href="https://webkit.org/blog/11312/meet-face-id-and-touch-id-for-the-web/"
                target="_blank"
                rel="noopener"
              >Face ID und Touch ID im Web bei WebKit</a>.
            </p>
          </div>
        </div>
      </div>
      <MarketingWaitlistSection />
      <div class="mkt-shell">
        <NuxtLink
          :to="content.other"
          class="feature-next"
        >
          <span class="feature-next-icon"><UIcon :name="feature === 'badge' ? 'i-lucide-lock-keyhole' : 'i-lucide-chef-hat'" /></span>
          <span class="feature-next-copy"><small>Das passt dazu</small><strong>{{ content.otherLabel }}</strong></span>
          <span class="feature-next-open"><UIcon name="i-lucide-book-open" /> Geschichte öffnen</span>
        </NuxtLink>
      </div>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.feature-page { padding-block: 2rem 5rem; }
.back-link { display:inline-flex; align-items:center; gap:.5rem; min-height:44px; font-size:.9375rem; color:var(--demo-accent); }
.back-link .iconify { width:1.25rem; height:1.25rem; flex-shrink:0; }
.feature-intro { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.3fr); gap:clamp(2rem,4vw,4rem); align-items:start; margin-block:2.5rem 5rem; }
.feature-copy,.feature-visual { min-width:0; }
.feature-copy { padding-top:1.5rem; position:sticky; top:7rem; }
.feature-copy h1 { font-size:clamp(2.625rem,4vw,4.25rem); line-height:1.06; letter-spacing:-.04em; font-weight:900; margin:0; text-wrap:balance; }
.feature-lead { font-size:1.25rem; line-height:1.65; color:var(--md-on-surface-variant); margin-top:1.5rem; max-width:42ch; }
.feature-link { display:inline-flex; align-items:center; gap:.75rem; color:var(--demo-accent); font-size:1.125rem; font-weight:700; margin-top:1.5rem; min-height:44px; }
.feature-link>span { display:grid; place-items:center; width:2.75rem; height:2.75rem; flex-shrink:0; background:var(--demo-soft); border-radius:1rem; }
.feature-link .iconify { width:1.375rem; height:1.375rem; }
.feature-context { display:flex; align-items:center; gap:.75rem; margin-top:2rem; padding-top:1.25rem; border-top:1px solid color-mix(in srgb,var(--demo-accent) 18%,transparent); }
.feature-context>.iconify { width:1.625rem; height:1.625rem; flex-shrink:0; color:var(--demo-accent); }
.feature-context p { font-size:1rem; line-height:1.45; max-width:32ch; color:var(--md-on-surface-variant); }
.feature-visual>.article-scene { width:100%; margin:0; }
.feature-guide { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.7fr); gap:clamp(2rem,5vw,5rem); border-top:1px solid color-mix(in srgb,var(--demo-accent) 18%,transparent); padding-top:3rem; scroll-margin-top:7rem; }
.feature-guide-map { position:sticky; top:7rem; align-self:start; min-width:0; }
.feature-guide-map h2 { font-size:1.875rem; line-height:1.2; font-weight:800; text-wrap:balance; max-width:20ch; }
.feature-guide-map nav { display:grid; gap:.5rem; margin-top:1.5rem; }
.feature-guide-map a { display:flex; align-items:center; gap:.75rem; min-height:3rem; padding:.625rem; border-radius:1rem; font-size:1rem; line-height:1.4; }
.feature-guide-map a>span:first-child { display:grid; place-items:center; width:2.125rem; height:2.125rem; flex-shrink:0; border:1px solid color-mix(in srgb,var(--demo-accent) 28%,transparent); border-radius:50%; color:var(--demo-accent); font-size:.875rem; line-height:1; }
.feature-guide-map a[aria-current] { background:var(--demo-soft); color:var(--demo-accent); }
.feature-guide-map a[aria-current]>span:first-child { color:var(--md-on-primary); background:var(--demo-accent); border-color:transparent; }
.feature-reading { min-width:0; }
.feature-step { --title-line:2.25rem; --marker-size:2.5rem; display:grid; grid-template-columns:var(--marker-size) minmax(0,1fr); align-items:start; gap:1.125rem; margin-bottom:3rem; scroll-margin-top:7rem; }
.feature-marker { display:grid; place-items:center; width:var(--marker-size); height:var(--marker-size); margin-top:max(0px,calc((var(--title-line) - var(--marker-size)) / 2)); border-radius:.8125rem; font-size:.875rem; line-height:1; font-weight:800; font-variant-numeric:tabular-nums; background:var(--demo-soft); color:var(--demo-accent); }
.feature-step h2 { font-size:1.8rem; line-height:var(--title-line); font-weight:800; letter-spacing:-.025em; padding-top:max(0px,calc((var(--marker-size) - var(--title-line)) / 2)); }
.feature-step p { font-size:1.125rem; line-height:1.8; margin-top:.875rem; max-width:65ch; color:var(--md-on-surface-variant); }
.source-note { font-size:.875rem; line-height:1.6; color:var(--md-on-surface-variant); }
.source-note a { text-decoration:underline; text-underline-offset:3px; }
.feature-next { display:flex; align-items:center; gap:1.5rem; padding:2rem; margin-top:3rem; border:1px solid color-mix(in srgb,var(--demo-accent) 20%,transparent); background:var(--demo-soft); border-radius:1.5rem; }
.feature-next-icon { width:3.5rem; height:3.5rem; flex-shrink:0; display:grid; place-items:center; border-radius:1.125rem; background:var(--md-surface); color:var(--demo-accent); }
.feature-next-icon>.iconify { width:1.75rem; height:1.75rem; }
.feature-next-copy { min-width:0; flex:1; }
.feature-next small { font-size:.8125rem; color:var(--demo-accent); }
.feature-next strong { display:block; font-size:1.5rem; line-height:1.3; margin-top:.375rem; text-wrap:balance; }
.feature-next-open { display:flex; align-items:center; gap:.5rem; color:var(--demo-accent); font-size:.9375rem; font-weight:700; }
.feature-next-open>.iconify { width:1.25rem; height:1.25rem; flex-shrink:0; }

@media(max-width:1199px) {
  .feature-intro { grid-template-columns:minmax(0,1fr); gap:2rem; }
  .feature-copy { position:static; padding-top:0; display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); column-gap:2.5rem; align-items:start; }
  .feature-copy>.mkt-label { grid-column:1/-1; }
  .feature-copy h1 { grid-column:1; grid-row:2/5; font-size:clamp(2.625rem,4.8vw,3.75rem); }
  .feature-lead { margin-top:0; }
  .feature-context { margin-top:1.25rem; }
  .feature-guide { grid-template-columns:minmax(0,.8fr) minmax(0,1.7fr); gap:2rem; }
}
@media(max-width:900px) {
  .feature-guide { grid-template-columns:minmax(0,1fr); gap:2rem; }
  .feature-guide-map { position:static; }
  .feature-guide-map h2 { max-width:none; }
  .feature-guide-map nav { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .feature-next { flex-wrap:wrap; }
  .feature-next-open { flex-basis:100%; padding-left:5rem; }
}
@media(max-width:600px) {
  .feature-page { padding-block:1.25rem 3rem; }
  .back-link { font-size:.8125rem; }
  .feature-intro { margin-block:1.5rem 3rem; gap:1.5rem; }
  .feature-copy { display:block; }
  .feature-copy h1 { font-size:clamp(2.25rem,8.5vw,3rem); }
  .feature-lead { font-size:1.125rem; margin-top:1.25rem; }
  .feature-context { display:none; }
  .feature-visual :deep(.story-prop) { display:none; }
  .feature-visual :deep(.article-stage) { grid-template-rows:auto; min-height:0; }
  .feature-guide { padding-top:2rem; }
  .feature-guide-map h2 { font-size:1.625rem; }
  .feature-guide-map nav { grid-template-columns:minmax(0,1fr); gap:.25rem; margin-top:1rem; }
  .feature-step { --title-line:1.875rem; --marker-size:2.25rem; gap:.75rem; margin-bottom:2rem; }
  .feature-step h2 { font-size:1.5rem; }
  .feature-step p { font-size:1.0625rem; line-height:1.75; }
  .feature-next { gap:1rem; padding:1.25rem; }
  .feature-next-icon { width:2.75rem; height:2.75rem; border-radius:.875rem; }
  .feature-next strong { font-size:1.25rem; }
  .feature-next-open { padding-left:3.75rem; }
}
@media(max-height:760px) { .feature-guide-map { position:static; } }
</style>

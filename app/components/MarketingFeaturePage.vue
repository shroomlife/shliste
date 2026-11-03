<script setup lang="ts">
const { feature } = defineProps<{
  feature: 'badge' | 'secret'
}>()
const content = computed(() => feature === 'badge'
  ? {
      eyebrow: 'Deine selbst gekochten Rezepte', title: 'Der Marmorkuchen war gut. Der Badge bleibt.', intro: 'Du hast das Rezept gekocht und den letzten Schritt abgehakt. shliste feiert den Moment mit einer Auszeichnung. So wird aus deiner Rezeptsammlung auch eine Erinnerung an das, was du schon ausprobiert hast.',
      sections: [
        { title: 'Vom letzten Haken zum ersten Badge', text: 'Öffne ein Rezept mit Kochschritten. Hake während des Kochens die erledigten Schritte ab. Sobald alle Schritte erledigt sind, erhältst du beim ersten Mal den Badge für dieses Rezept. Du musst dafür keine zusätzliche Aufgabe lösen.' },
        { title: 'Mit deinem Rezeptbild und Datum', text: 'In der Android-App erscheint die Auszeichnung in einem goldenen Rahmen. Das vorhandene Rezeptbild steht im Mittelpunkt. Hat dein Rezept noch kein Bild, zeigt der Badge stattdessen den Anfangsbuchstaben auf seiner Rezeptfarbe. Dazu kommt das Datum, an dem du ihn verdient hast.' },
        { title: 'Noch einmal kochen? Sehr gern.', text: 'Wenn du dasselbe Rezept erneut fertig kochst, feiert shliste mit Konfetti. Es entsteht dabei kein zweiter Badge für dasselbe Rezept. Deine bisherigen Auszeichnungen findest du im Profil in der Badge-Sammlung.' },
      ], other: '/funktionen/geheime-listen', otherLabel: 'Und die Geburtstagsideen? Die dürfen geheim bleiben.',
    }
  : {
      eyebrow: 'Eine Liste nur für deine Augen', title: 'Damit die Konzertkarten bis Samstag geheim bleiben.', intro: 'Manche Besorgungen sind eine Überraschung. Markiere die Liste als geheim. Zum Öffnen ihrer Einträge brauchst du dann eine zusätzliche Bestätigung auf deinem Gerät.',
      sections: [
        { title: 'Eine Liste mit Schloss', text: 'Beim Anlegen oder Bearbeiten kannst du die Liste als geheim markieren, wenn dein Gerät die Entsperrung unterstützt. In der Übersicht erkennst du sie am Schloss. Der Listenname bleibt sichtbar. Wähle also einen neutralen Namen, wenn bereits der Titel die Überraschung verraten würde.' },
        { title: 'Dein Gerät bestätigt, dass du es bist', text: 'Auf Android öffnet sich die Systemabfrage. Je nach Gerät entsperrst du mit einer unterstützten biometrischen Methode oder mit deiner Displaysperre, etwa der PIN. Wenn du abbrichst oder die Bestätigung fehlschlägt, bleiben die Einträge gesperrt.' },
        { title: 'Im Browser bleiben geheime Listen gesperrt', text: 'Geheime Listen öffnest du derzeit in der Android-App. Im Browser bleiben ihre Einträge gesperrt. Die Entsperrung über die Gerätebestätigung im Browser ist noch in Entwicklung.' },
        { title: 'Was „geheim“ hier bedeutet', text: 'Die Funktion schützt das Öffnen der Liste innerhalb der App auf deinem Gerät. Sie ist kein zusätzlicher verschlüsselter Tresor. Die Liste wird durch das Aktivieren der Sperre auch nicht automatisch mit anderen geteilt. Für eine Überraschung behältst du sie am besten als persönliche Liste.' },
      ], other: '/funktionen/rezept-badges', otherLabel: 'Das nächste Essen feiern: Rezept-Badges entdecken.',
    })
useSeoMeta({ title: () => content.value.title, description: () => content.value.intro })
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="feature-page"
    >
      <NuxtLink
        to="/im-alltag"
        class="back-link"
      ><UIcon name="i-lucide-arrow-left" /> Alle Beispiele und Anleitungen</NuxtLink>
      <div class="feature-intro">
        <div>
          <p class="mkt-label">
            {{ content.eyebrow }}
          </p><h1>{{ content.title }}</h1><p>{{ content.intro }}</p><a
            href="#anleitung"
            class="feature-link"
          ><UIcon name="i-lucide-notebook-pen" /> So funktioniert’s</a>
        </div><MarketingArticleScene :story-key="feature === 'badge' ? 'rezept-badges' : 'geheime-listen'" />
      </div>
      <div
        id="anleitung"
        class="feature-reading"
      >
        <section
          v-for="(section, i) in content.sections"
          :key="section.title"
        >
          <span>{{ String(i + 1).padStart(2, '0') }}</span><div><h2>{{ section.title }}</h2><p>{{ section.text }}</p></div>
        </section><p
          v-if="feature === 'secret'"
          class="source-note"
        >
          Mehr zur Gerätebestätigung: <a
            href="https://webkit.org/blog/11312/meet-face-id-and-touch-id-for-the-web/"
            target="_blank"
            rel="noopener"
          >Face ID und Touch ID im Web bei WebKit</a>.
        </p><NuxtLink
          :to="content.other"
          class="feature-next"
        ><span class="feature-next-icon"><UIcon :name="feature === 'badge' ? 'i-lucide-lock-keyhole' : 'i-lucide-chef-hat'" /></span><span><small>Das passt dazu</small><strong>{{ content.otherLabel }}</strong><span class="feature-next-open"><UIcon name="i-lucide-book-open" /> Geschichte öffnen</span></span></NuxtLink>
      </div>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.feature-page{max-width:var(--marketing-shell);margin:auto;padding:40px var(--marketing-gutter) 80px}.back-link{display:inline-flex;align-items:center;gap:8px;color:var(--demo-accent);font-size:0.9375rem;min-height:44px}.feature-intro{display:grid;grid-template-columns:1fr 1.05fr;gap:70px;align-items:center;margin:35px 0 70px}.feature-intro h1{font-size:clamp(2.5rem,4.5vw,4.5rem);line-height:1.04;letter-spacing:-.04em;font-weight:900;margin:0 0 26px}.feature-intro>div>p:not(.mkt-label){font-size:1.312rem;line-height:1.6;color:var(--md-on-surface-variant)}.feature-link{display:inline-flex;align-items:center;gap:10px;color:var(--demo-accent);font-size:1.125rem;font-weight:700;margin-top:22px;min-height:44px}.feature-link .iconify,.back-link .iconify{width:20px;height:20px;flex-shrink:0}.feature-reading{max-width:760px;margin:auto;scroll-margin-top:115px}.feature-reading>section{display:flex;gap:24px;margin-bottom:48px}.feature-reading>section>span{font-size:1.25rem;font-weight:800;color:var(--demo-accent)}.feature-reading h2{font-size:1.812rem;font-weight:800;line-height:1.2;margin-bottom:15px}.feature-reading section p{font-size:1.188rem;line-height:1.75;color:var(--md-on-surface-variant)}.source-note{font-size:0.875rem;line-height:1.5}.source-note a{text-decoration:underline}.feature-page a:focus-visible{outline:2px solid var(--demo-accent);outline-offset:4px}@media(max-width:820px){.feature-page{padding:24px var(--marketing-gutter) 50px}.feature-intro{grid-template-columns:1fr;gap:30px;margin-top:25px}.feature-intro h1{font-size:2.75rem}.feature-intro>div>p:not(.mkt-label){font-size:1.188rem}.feature-intro>.feature-demo{max-width:570px;margin:auto}.feature-reading>section{gap:14px}.feature-reading h2{font-size:1.625rem}.feature-reading section p{font-size:1.125rem}}
.feature-intro{grid-template-columns:1fr;gap:28px;max-width:960px;margin-inline:auto}.feature-intro>div{max-width:760px}.feature-intro>.article-scene{width:100%;margin:0}.feature-page .feature-reading{max-width:860px}
.feature-next{display:flex;align-items:center;gap:24px;padding:28px;margin-top:45px;border:1px solid color-mix(in srgb,var(--demo-accent) 20%,transparent);background:var(--demo-soft);border-radius:24px;transition:box-shadow .25s}.feature-next-icon{width:70px;height:70px;flex-shrink:0;display:grid;place-items:center;border-radius:23px;background:var(--md-surface);color:var(--demo-accent)}.feature-next-icon>.iconify{width:32px;height:32px}.feature-next small{font-size:0.8125rem;color:var(--demo-accent)}.feature-next strong{display:block;font-size:1.438rem;line-height:1.3;margin:8px 0 16px}.feature-next-open{display:flex;align-items:center;gap:8px;color:var(--demo-accent);font-size:0.875rem;font-weight:700}.feature-next-open>.iconify{width:18px;height:18px}.feature-next:hover{box-shadow:0 12px 30px -24px var(--demo-accent)}@media(max-width:580px){.feature-next{padding:22px;gap:16px;align-items:start}.feature-next-icon{width:44px;height:44px;border-radius:14px}.feature-next-icon>.iconify{width:24px;height:24px}.feature-next strong{font-size:1.188rem}}@media(prefers-reduced-motion:reduce){.feature-next{transition:none}}
</style>

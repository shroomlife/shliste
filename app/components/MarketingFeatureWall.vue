<script setup lang="ts">
const features = [
  { icon: 'i-lucide-list-checks', title: 'Alles im Kopf? Ab auf die Liste.', text: 'Schreib auf, was fehlt. Beim Einkaufen hakst du es ab und behältst den Überblick.', to: '/so-funktionierts', link: 'So funktioniert’s', tone: 'pink' },
  { icon: 'i-lucide-users', title: 'Zusammen planen. Nichts doppelt kaufen.', text: 'Teilt eure Einkaufsliste mit Konto und Internet. So sieht jede Person, was noch gebraucht wird.', to: '/gemeinsam-einkaufen', link: 'Gemeinsam einkaufen', tone: 'sage' },
  { icon: 'i-lucide-book-open', title: 'Lieblingsrezepte bleiben bei dir.', text: 'Zutaten und Zubereitung an einem Ort. Beim Kochen Schritt für Schritt abhaken und wiederfinden, was gut war.', to: '/rezepte', link: 'Dein Rezeptbuch', tone: 'cream' },
  { icon: 'i-lucide-wifi-off', title: 'Auch zwischen den Funklöchern.', text: 'Deine gespeicherten Listen bleiben ohne Netz nutzbar. Gemeinsame Änderungen gleicht shliste wieder mit Internet ab.', to: '/hilfe/offline-einkaufen', link: 'Offline unterwegs', tone: 'blue' },
  { icon: 'i-lucide-chef-hat', title: 'Heute mal etwas Neues kochen.', text: 'Entdecke pflanzliche Rezeptideen mit ausführlichen Schritten und passenden Bildern. Speichere deine Favoriten auf diesem Gerät.', to: '/rezeptideen', link: 'Rezeptideen entdecken', tone: 'cream' },
  { icon: 'i-lucide-award', title: 'Dein letzter Schritt. Dein Glücksmoment.', text: 'Alle Kochschritte erledigt? Ein Rezept-Badge erinnert dich in deiner Sammlung daran, was du schon geschafft hast.', to: '/funktionen/rezept-badges', link: 'Die Rezept-Badges', tone: 'pink' },
  { icon: 'i-lucide-mic', title: 'Sag es, bevor du es vergisst.', text: 'Mit den kommenden KI-Funktionen wird aus deiner gesprochenen Einkaufsidee ein Vorschlag für deine Liste.', soon: true, tone: 'sage' },
  { icon: 'i-lucide-camera', title: 'Vom Fundstück zum Lieblingsessen.', text: 'Ein Rezept auf einem Foto oder hinter einem Link? Die KI soll daraus Zutaten und Schritte für deine Sammlung vorschlagen.', soon: true, tone: 'blue' },
  { icon: 'i-lucide-image', title: 'Ein Look für dein Lieblingsgericht.', text: 'Lass dir mit Premium eine Illustration zum Rezept vorschlagen. So bekommt deine Sammlung noch mehr Persönlichkeit.', soon: true, tone: 'pink' },
] as const
</script>

<template>
  <section
    class="feature-wall"
    aria-labelledby="feature-wall-title"
  >
    <header class="wall-heading">
      <p class="mkt-label">
        Für deinen Alltag gemacht
      </p>
      <h2 id="feature-wall-title">
        Vieles ist schon da.<br>Und es wächst mit deinen Ideen.
      </h2>
      <p>Das macht shliste heute schon für dich — und darauf kannst du dich mit Premium freuen.</p>
    </header>
    <div class="wall-grid">
      <article
        v-for="feature in features"
        :key="feature.title"
        class="wall-card"
        :class="'wall-card--' + feature.tone"
      >
        <div class="wall-card-top">
          <span
            class="wall-icon"
            aria-hidden="true"
          ><UIcon :name="feature.icon" /></span><PremiumComingSoonBadge
            v-if="'soon' in feature"
            variant="compact"
          />
        </div>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.text }}</p>
        <NuxtLink
          v-if="'to' in feature"
          :to="feature.to"
          class="wall-link"
        >{{ feature.link }}<UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
        <a
          v-else
          href="#warteliste-anmeldung"
          class="wall-link"
        >Zum Start dabei sein<UIcon name="i-lucide-arrow-up" /></a>
      </article>
    </div>
  </section>
</template>

<style scoped>
.feature-wall{position:relative;z-index:1;grid-column:1/-1;min-width:0;padding-top:clamp(2rem,4vw,4rem);border-top:1px solid color-mix(in srgb,var(--demo-accent) 14%,transparent);margin-top:clamp(1rem,3vw,3rem)}
.wall-heading{max-width:45rem;margin-bottom:2rem}.wall-heading .mkt-label{margin:0 0 .75rem}.wall-heading h2{font-size:clamp(2rem,3.5vw,3rem);line-height:1.12;font-weight:850;letter-spacing:-.035em;margin:0 0 1rem;text-wrap:balance}.wall-heading>p:last-child{font-size:1.0625rem;line-height:1.6;color:var(--md-on-surface-variant);margin:0;max-width:38rem}
.wall-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.25rem;grid-auto-rows:1fr}
.wall-card{--card-tint:#f8e5f0;display:flex;flex-direction:column;min-width:0;padding:1.5rem;border-radius:1.5rem;border:1px solid color-mix(in srgb,var(--demo-accent) 14%,transparent);background:color-mix(in srgb,var(--card-tint) 35%,var(--md-surface));transition:border-color .18s,box-shadow .18s}
.wall-card--sage{--card-tint:#dfede3}.wall-card--cream{--card-tint:#f5ead4}.wall-card--blue{--card-tint:#e0eafa}
.wall-card:hover{border-color:color-mix(in srgb,var(--demo-accent) 35%,transparent);box-shadow:0 10px 28px -22px #60334f50}
.wall-card-top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:1.125rem;min-height:2.75rem}.wall-icon{display:grid;place-items:center;width:2.75rem;height:2.75rem;flex:none;border-radius:.9rem;background:color-mix(in srgb,var(--card-tint) 70%,var(--md-surface));color:var(--demo-accent)}.wall-icon>.iconify{width:1.5rem;height:1.5rem}
.wall-card h3{font-size:1.25rem;line-height:1.3;font-weight:800;letter-spacing:-.02em;margin:0 0 .75rem;text-wrap:balance}.wall-card>p{font-size:.9375rem;line-height:1.6;color:var(--md-on-surface-variant);margin:0 0 1.5rem}.wall-link{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:auto;min-height:2.75rem;padding-top:.75rem;border-top:1px solid color-mix(in srgb,var(--demo-accent) 12%,transparent);color:var(--demo-accent);font-size:.875rem;font-weight:700;line-height:1.4;text-decoration:none}.wall-link>.iconify{flex:none;width:1.125rem;height:1.125rem}.wall-link:hover{text-decoration:underline;text-underline-offset:4px}.wall-link:focus-visible{outline:3px solid var(--demo-accent);outline-offset:4px;border-radius:.25rem}
@media(max-width:1023px){.wall-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:639px){.wall-grid{grid-template-columns:minmax(0,1fr);grid-auto-rows:auto;gap:1rem}.wall-card{padding:1.25rem}.wall-card-top{margin-bottom:1rem}.wall-heading h2{font-size:2rem}}
@supports(animation-timeline:view()){ @media(prefers-reduced-motion:no-preference){.wall-card{animation:wall-emerge linear both;animation-timeline:view();animation-range:entry 0% entry 65%}@keyframes wall-emerge{from{opacity:.65;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}}}
@media(prefers-reduced-motion:reduce){.wall-card{transition:none}}
</style>

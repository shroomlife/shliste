<script setup lang="ts">
useThemeWorldSchema('index')
useSeoMeta({ title: 'Einkaufslisten Themenwelten: gemeinsam entspannt planen', description: 'Von der Weihnachtsbäckerei bis zum Racletteabend: Ideen, Einkaufslisten und anschauliche Hilfe mit shliste für eure gemeinsamen Pläne.' })
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
    >
      <div class="mkt-content worlds">
        <p class="mkt-label">
          Die shliste Themenwelten
        </p><h1>Ihr habt etwas vor.<br><em>Wir denken mit.</em></h1><p class="lead">
          Ein Backnachmittag im Advent. Ein langer Abend am Tisch. Gute Ideen werden noch besser, wenn alle wissen, was fehlt.
        </p>
        <NuxtLink
          to="/themenwelten/plaetzchen-backen"
          class="featured baking-feature"
        >
          <span class="featured-image"><img
            src="/images/illustrations/plaetzchen-backen.webp"
            alt="Gemeinsam Plätzchen backen in einer gemütlichen Küche. KI-generiert."
            width="1536"
            height="1024"
          ></span>
          <div><p class="mkt-label">Für euren Backnachmittag im Advent</p><h2>Mehl an den Händen.<br>Weniger im Kopf.</h2><p>Drei Plätzchensorten, eine gemeinsame Einkaufsliste. Wählt eure Lieblinge, prüft die Vorräte und nehmt den Einkauf mit in shliste.</p><strong><span>Weihnachtsbäckerei planen</span><UIcon name="i-lucide-cookie" /></strong></div>
        </NuxtLink>
        <NuxtLink
          to="/themenwelten/raclette"
          class="featured"
        ><span class="featured-image"><img
          src="/images/illustrations/plant-based-raclette.webp"
          alt="Ein Raclettepfännchen mit buntem Gemüse neben einer Schale Kartoffeln. KI-generiert."
          width="1536"
          height="1024"
        ></span><div><p class="mkt-label">Für Weihnachten, Silvester & einfach so</p><h2>Alle an einem Tisch.<br>Alles auf einer Liste.</h2><p>Eure Raclette-Einkaufsliste: Mengen planen, Lieblingspfännchen entdecken und gemeinsam mit shliste einkaufen.</p><strong><span>Racletteabend planen</span><UIcon name="i-lucide-cooking-pot" /></strong></div></NuxtLink>
        <section class="more">
          <p class="mkt-label">
            Weitere Anlässe entdecken
          </p><h2>Kleine Pläne für große Alltagsmomente.</h2><p>Diese Alltagsgeschichten bringen schon heute passende Listenideen mit.</p><div><NuxtLink to="/im-alltag/ferienwohnung-einkauf"><UIcon name="i-lucide-luggage" /><h3>Ankommen. Frühstücken. Urlaub.</h3><p>Was für die ersten Tage in der Ferienwohnung fehlt.</p><strong><span>Zur Alltagsgeschichte</span><UIcon name="i-lucide-book-open" /></strong></NuxtLink><NuxtLink to="/im-alltag/umzug-erster-abend"><UIcon name="i-lucide-house" /><h3>Neue Wohnung. Erster Abend.</h3><p>Eine kleine Liste zwischen all den Umzugskartons.</p><strong><span>Zur Alltagsgeschichte</span><UIcon name="i-lucide-book-open" /></strong></NuxtLink></div>
        </section>
      </div>
      <MarketingWaitlistSection />
    </main>
  </MarketingChrome>
</template>

<style scoped>
.worlds{padding-block:55px 70px}.worlds h1{font-size:clamp(3rem,6vw,5.5rem);font-weight:900;line-height:1.04;letter-spacing:-.05em}.worlds em{font-style:normal;color:var(--demo-accent)}.lead{font-size:1.35rem;line-height:1.6;max-width:740px;margin:24px 0 45px}.featured{display:grid;grid-template-columns:1.1fr 1fr;border-radius:30px;overflow:hidden;background:var(--demo-soft)}.featured img{width:100%;height:100%;object-fit:cover}.featured>div{padding:clamp(25px,4vw,55px)}.worlds h2{font-size:clamp(1.8rem,3vw,2.8rem);line-height:1.12;font-weight:850;letter-spacing:-.03em}.featured p:not(.mkt-label){line-height:1.7;margin:22px 0}.featured strong,.more strong{color:var(--demo-accent)}.more{padding-top:65px}.more>p{margin-block:15px}.more>div{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:25px}.more a{border:1px solid var(--md-outline-variant);border-radius:22px;padding:30px}.more .iconify{width:30px;height:30px;color:var(--demo-accent)}.more h3{font-size:1.4rem;font-weight:800;margin-block:15px 10px}.more a p{margin-bottom:20px;line-height:1.6}@media(max-width:700px){.featured,.more>div{grid-template-columns:1fr}.featured img{max-height:330px}}
.worlds h1,.worlds h2{text-wrap:balance}.featured{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}.featured>div{min-width:0}.featured strong{display:inline-flex;align-items:center;gap:10px;min-height:44px;line-height:1.3}.featured strong>span{display:block;transform:translateY(.08em)}.featured strong>.iconify{width:20px;height:20px;flex:0 0 20px}.more a{display:flex;flex-direction:column;align-items:flex-start;min-width:0}.more a>strong{margin-top:auto;min-height:44px;display:flex;align-items:center}.worlds a:focus-visible{outline:3px solid var(--demo-accent);outline-offset:5px}.more a,.featured{transition:box-shadow .2s}.more a p{line-height:1.6}.featured img{min-width:0}@supports(text-box-trim:trim-both){.featured strong>span{text-box-trim:trim-both;text-box-edge:cap alphabetic;transform:none}}@media(hover:hover){.more a:hover,.featured:hover{box-shadow:0 12px 32px -22px var(--demo-accent)}}@media(max-width:700px){.featured{grid-template-columns:minmax(0,1fr)}}@media(max-width:420px){.worlds{padding-top:36px}.worlds h1{font-size:2.75rem}.lead{font-size:1.2rem}.more a{padding:24px}}@media(prefers-reduced-motion:reduce){.more a,.featured{transition:none}}
.baking-feature{margin-bottom:28px}.more a>strong{gap:10px}.more a>strong>.iconify{width:20px;height:20px;flex:0 0 20px}
.featured-image{display:block;overflow:hidden;min-width:0}.featured-image img{transition:transform 420ms cubic-bezier(.2,.75,.25,1)}.featured:focus-visible .featured-image img{transform:scale(1.025)}@media(hover:hover){.featured:hover .featured-image img{transform:scale(1.025)}}@media(prefers-reduced-motion:reduce){.featured-image img{transition:none!important;transform:none!important}}
.featured-image { position: relative; isolation: isolate; }
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .featured-image::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(118deg, transparent 29%, #ffd0e93d 42%, #fff3ce66 48%, #bceee83d 53%, #d7c0fd38 58%, transparent 71%);
  }
  .featured:is(:hover, :focus-visible) .featured-image::after {
    animation: world-prism 720ms cubic-bezier(.2,.6,.35,1) both;
  }
  @keyframes world-prism {
    0% { opacity: 0; transform: translateX(-86%); }
    28% { opacity: .8; }
    72% { opacity: .65; }
    100% { opacity: 0; transform: translateX(86%); }
  }
}
</style>

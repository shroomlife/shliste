<script setup lang="ts">
useSeoMeta({ title: 'Einkaufslisten Themenwelten: gemeinsam entspannt planen', description: 'Vom Racletteabend bis zum ersten Urlaubsfrühstück: Ideen, Einkaufslisten und anschauliche Hilfe mit shliste für eure gemeinsamen Pläne.' })
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="mkt-content worlds"
    >
      <p class="mkt-label">
        Die shliste Themenwelten
      </p><h1>Ihr habt etwas vor.<br><em>Wir denken mit.</em></h1><p class="lead">
        Ein langer Abend am Tisch. Ein erstes Frühstück im Urlaub. Gute Ideen werden noch besser, wenn alle wissen, was fehlt.
      </p>
      <NuxtLink
        to="/themenwelten/raclette"
        class="featured"
      ><img
        src="/images/illustrations/plant-based-raclette.webp"
        alt="Ein Raclettepfännchen mit buntem Gemüse neben einer Schale Kartoffeln. KI-generiert."
        width="1536"
        height="1024"
      ><div><p class="mkt-label">Für Weihnachten, Silvester & einfach so</p><h2>Alle an einem Tisch.<br>Alles auf einer Liste.</h2><p>Eure Raclette-Einkaufsliste: Mengen planen, Lieblingspfännchen entdecken und gemeinsam mit shliste einkaufen.</p><strong><span>Racletteabend planen</span><UIcon name="i-lucide-arrow-up-right" /></strong></div></NuxtLink>
      <section class="more">
        <p class="mkt-label">
          Weitere Anlässe entdecken
        </p><h2>Kleine Pläne für große Alltagsmomente.</h2><p>Diese Alltagsgeschichten bringen schon heute passende Listenideen mit.</p><div><NuxtLink to="/im-alltag/ferienwohnung-einkauf"><UIcon name="i-lucide-luggage" /><h3>Ankommen. Frühstücken. Urlaub.</h3><p>Was für die ersten Tage in der Ferienwohnung fehlt.</p><strong>Zur Alltagsgeschichte →</strong></NuxtLink><NuxtLink to="/im-alltag/umzug-erster-abend"><UIcon name="i-lucide-house" /><h3>Neue Wohnung. Erster Abend.</h3><p>Eine kleine Liste zwischen all den Umzugskartons.</p><strong>Zur Alltagsgeschichte →</strong></NuxtLink></div>
      </section>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.worlds{padding-block:55px 70px}.worlds h1{font-size:clamp(3rem,6vw,5.5rem);font-weight:900;line-height:1.04;letter-spacing:-.05em}.worlds em{font-style:normal;color:var(--demo-accent)}.lead{font-size:1.35rem;line-height:1.6;max-width:740px;margin:24px 0 45px}.featured{display:grid;grid-template-columns:1.1fr 1fr;border-radius:30px;overflow:hidden;background:var(--demo-soft)}.featured img{width:100%;height:100%;object-fit:cover}.featured>div{padding:clamp(25px,4vw,55px)}.worlds h2{font-size:clamp(1.8rem,3vw,2.8rem);line-height:1.12;font-weight:850;letter-spacing:-.03em}.featured p:not(.mkt-label){line-height:1.7;margin:22px 0}.featured strong,.more strong{color:var(--demo-accent)}.more{padding-top:65px}.more>p{margin-block:15px}.more>div{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:25px}.more a{border:1px solid var(--md-outline-variant);border-radius:22px;padding:30px}.more .iconify{width:30px;height:30px;color:var(--demo-accent)}.more h3{font-size:1.4rem;font-weight:800;margin-block:15px 10px}.more a p{margin-bottom:20px;line-height:1.6}@media(max-width:700px){.featured,.more>div{grid-template-columns:1fr}.featured img{max-height:330px}}
.worlds h1,.worlds h2{text-wrap:balance}.featured{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}.featured>div{min-width:0}.featured strong{display:inline-flex;align-items:center;gap:10px;min-height:44px;line-height:1.3}.featured strong>span{display:block;transform:translateY(.08em)}.featured strong>.iconify{width:20px;height:20px;flex:0 0 20px}.more a{display:flex;flex-direction:column;align-items:flex-start;min-width:0}.more a>strong{margin-top:auto;min-height:44px;display:flex;align-items:center}.worlds a:focus-visible{outline:3px solid var(--demo-accent);outline-offset:5px}.more a,.featured{transition:box-shadow .2s}.more a p{line-height:1.6}.featured img{min-width:0}@supports(text-box-trim:trim-both){.featured strong>span{text-box-trim:trim-both;text-box-edge:cap alphabetic;transform:none}}@media(hover:hover){.more a:hover,.featured:hover{box-shadow:0 12px 32px -22px var(--demo-accent)}}@media(max-width:700px){.featured{grid-template-columns:minmax(0,1fr)}}@media(max-width:420px){.worlds{padding-top:36px}.worlds h1{font-size:2.75rem}.lead{font-size:1.2rem}.more a{padding:24px}}@media(prefers-reduced-motion:reduce){.more a,.featured{transition:none}}
</style>

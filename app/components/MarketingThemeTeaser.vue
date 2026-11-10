<template>
  <aside class="theme-teaser mkt-content">
    <div>
      <p class="mkt-label">
        Einkaufslisten für eure Pläne
      </p><h2>Ein Anlass. Viele Wünsche. Eine Liste.</h2><p>Entdecke unsere Themenwelten – mit Ideen für den Tisch und shliste für alles, was noch fehlt.</p>
    </div>
    <NuxtLink to="/themenwelten"><span>Themenwelten entdecken</span><UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
  </aside>
</template>

<style scoped>
.theme-teaser{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:30px;border-radius:24px;background:var(--demo-soft);margin-block:40px}.theme-teaser h2{font-size:1.6rem;font-weight:800;line-height:1.2}.theme-teaser p:not(.mkt-label){margin-top:10px;max-width:650px;line-height:1.6}.theme-teaser a{display:flex;align-items:center;gap:10px;font-weight:750;min-height:48px;flex-shrink:0;color:var(--demo-accent)}@media(max-width:760px){.theme-teaser{align-items:flex-start;flex-direction:column;padding:24px}}
.theme-teaser>div{min-width:0}.theme-teaser a{justify-content:center;line-height:1.3;max-width:100%;padding:12px 16px;border:1px solid color-mix(in srgb,var(--demo-accent) 22%,transparent);border-radius:24px;background:var(--md-surface);text-align:center}.theme-teaser a>span{display:block;min-width:0;transform:translateY(.08em)}.theme-teaser a>.iconify{width:19px;height:19px;flex:0 0 19px}.theme-teaser a:focus-visible{outline:3px solid var(--demo-accent);outline-offset:4px}.theme-teaser h2{text-wrap:balance}@supports(text-box-trim:trim-both){.theme-teaser a>span{text-box-trim:trim-both;text-box-edge:cap alphabetic;transform:none}}@media(max-width:420px){.theme-teaser{padding:22px 18px}.theme-teaser a{width:100%}}
</style>

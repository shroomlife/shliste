<script setup lang="ts">
useSeoMeta({ title: 'Impressum' })
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="mkt-shell legal-page"
      style="color: var(--md-on-background)"
    >
      <NuxtLink
        to="/?view=website"
        class="text-[1rem] hover:underline"
        style="color: var(--md-primary)"
      >Zurück</NuxtLink>
      <h1 class="mt-4 text-[2rem] font-black tracking-tight">
        Impressum
      </h1>

      <h2 class="mt-8 text-[1.25rem] font-bold">
        Angaben gemäss Paragraf 5 DDG
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Robin Lehmann<br>
        shroomlife<br>
        Bahnhofstr. 98<br>
        71679 Asperg<br>
        Deutschland
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Kontakt
      </h2>
      <p class="mt-2 text-[1.125rem]">
        E-Mail: <a
          href="mailto:robin@shroomlife.de"
          style="color: var(--md-primary)"
        >robin@shroomlife.de</a>
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Verantwortlich nach Paragraf 18 Absatz 2 MStV
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Robin Lehmann, Anschrift wie oben.
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Umsatzsteuer-Identifikationsnummer
      </h2>
      <p class="mt-2 text-[1.125rem]">
        DE286428470
      </p>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.legal-page { padding-block:2.5rem 4rem; }
.legal-page p { line-height:1.75; }
.legal-page h1 { font-size:clamp(2.5rem,5vw,4rem); line-height:1.1; margin-block:1.5rem 2rem; }
.legal-page h2 { font-size:1.5rem; line-height:1.3; }
.legal-page>a { display:inline-flex; align-items:center; min-height:44px; }
@media(max-width:600px) { .legal-page { padding-block:1.5rem 3rem; } }
</style>

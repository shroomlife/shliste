<script setup lang="ts">
import { durationLabel, ingredientLabel, type CatalogRecipe } from '~~/lib/editorial'

defineProps<{ recipe: CatalogRecipe }>()
</script>

<template>
  <article class="print-sheet">
    <header class="masthead">
      <img
        src="/images/brand/wordmark.svg"
        alt="shliste"
        width="94"
        height="25"
      >
      <span>Aus unserem Rezeptbuch</span>
    </header>
    <div class="print-intro">
      <div>
        <h1>{{ recipe.title }}</h1>
        <p class="facts">
          {{ recipe.servings }} {{ recipe.servings === 1 ? 'Portion' : 'Portionen' }} · ca. {{ durationLabel(recipe) }}{{ recipe.restMinutes ? ' inkl. Ruhezeit' : '' }} · {{ recipe.difficulty }} · pflanzlich
        </p>
      </div>
      <figure>
        <img
          :src="recipe.hero.src"
          :alt="recipe.hero.alt"
        ><figcaption>KI-Illustration</figcaption>
      </figure>
    </div>
    <h2>Zutaten</h2>
    <ul class="shopping">
      <li
        v-for="ingredient in recipe.ingredients"
        :key="ingredient.id"
      >
        <span>{{ ingredientLabel({ ...ingredient, note: undefined }) }}<small v-if="ingredient.note"> · {{ ingredient.note }}</small></span>
      </li>
    </ul>
    <p
      v-if="recipe.story?.ingredientNote"
      class="aside-note"
    >
      {{ recipe.story.ingredientNote }}
    </p>
    <h2>Tipps aus der Küche</h2>
    <div class="tips">
      <section
        v-for="tip in recipe.tips"
        :key="tip.title"
      >
        <h3>{{ tip.title }}</h3><p>{{ tip.text }}</p>
      </section>
      <section><h3>Aufbewahren</h3><p>{{ recipe.storage }}</p></section>
    </div>
    <p
      v-if="recipe.inspiration"
      class="credit"
    >
      Inspiriert vom Originalrezept bei <a :href="recipe.inspiration.url">{{ recipe.inspiration.title }}</a>.
    </p>
    <section class="method">
      <header class="masthead">
        <img
          src="/images/brand/wordmark.svg"
          alt="shliste"
          width="94"
          height="25"
        >
        <span>{{ recipe.title }}</span>
      </header>
      <h2>Zubereitung</h2>
      <ol>
        <li
          v-for="(step, index) in recipe.steps"
          :key="step.id"
        >
          <span
            class="number"
            aria-hidden="true"
          >{{ index + 1 }}</span>
          <h3>{{ step.title }} <small v-if="step.minutes">· ca. {{ step.minutes }} Min.</small></h3>
          <p>{{ step.instruction }}</p>
        </li>
      </ol>
    </section>
  </article>
</template>

<style scoped>
.print-sheet { display: none; }
@media print {
  .print-sheet {
    display: block;
    font: 10.5pt/1.38 Arial, sans-serif;
    color: #29252a;
    background: white;
    orphans: 2;
    widows: 2;
  }
  .masthead { display: flex; align-items: center; justify-content: space-between; gap: 6mm; padding-bottom: 3mm; border-bottom: 1.4pt solid #73405c; }
  .masthead img { width: 24mm; height: auto; }
  .masthead span, .credit, figcaption, small { color: #51474e; font-size: 9pt; }
  .print-intro { display: flex; align-items: center; gap: 7mm; margin: 6mm 0; }
  .print-intro > div { flex: 1; }
  figure { flex: 0 0 43mm; margin: 0; }
  figure img { width: 100%; height: auto; border-radius: 2mm; }
  figcaption { text-align: right; font-size: 7.5pt; margin-top: 1mm; }
  h1, h2, h3 { font-family: "Zain", Arial, sans-serif; line-height: 1.12; font-weight: 700; break-after: avoid; }
  h1 { font-size: 30pt; }
  h2 { font-size: 21pt; margin: 4mm 0 2mm; color: #67364f; }
  h3 { font-size: 14pt; }
  .facts { font-weight: bold; margin: 1mm 0 3mm; }
  .shopping, ol { padding: 0; margin: 0; list-style: none; }
  .shopping, .tips { columns: 2; column-gap: 8mm; }
  .shopping li { display: flex; gap: 2.3mm; align-items: baseline; padding-block: 1.5mm; border-bottom: .4pt solid #cabdc5; break-inside: avoid; }
  .shopping li::before { content: ''; width: 2.6mm; height: 2.6mm; flex: none; border: .7pt solid #725e69; border-radius: .4mm; }
  .aside-note { padding-inline-start: 3mm; margin-block: 4mm; border-left: 1.3pt solid #73405c; }
  .tips section { break-inside: avoid; margin-bottom: 2.5mm; }
  .credit { margin-top: 4mm; }
  .credit a { text-decoration: underline; }
  .method { break-before: page; }
  .method h2 { margin-block: 4mm 3mm; }
  .method li { position: relative; padding-inline-start: 10mm; margin-block-end: 3mm; break-inside: avoid; }
  .method h3 { margin-bottom: .8mm; }
  .method small { font: normal 9pt Arial, sans-serif; white-space: nowrap; }
  .number { position: absolute; top: 0; left: 0; display: grid; place-items: center; width: 6.7mm; height: 6.7mm; border: .8pt solid #86596e; border-radius: 50%; color: #67364f; font: bold 10pt/1 Arial, sans-serif; }
}
</style>

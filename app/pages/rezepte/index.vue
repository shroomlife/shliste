<script setup lang="ts">
useSeoMeta({
  title: 'Rezepte speichern und den Einkauf planen mit shliste',
  description: 'Dein digitales Rezeptbuch: Rezepte mit Zutaten und Kochschritten speichern, beim Kochen abhaken und den Einkauf planen. KI-Import aktuell in geschlossener Testphase.',
  ogImage: 'https://shliste.app/og-image.png',
})

const gallery = [
  {
    image: '/images/recipes/lasagne.webp',
    title: 'Lasagne',
    text: 'Auch eine längere Zutatenliste bleibt übersichtlich beim Gericht. Was noch fehlt, kommt auf den Einkauf.',
  },
  {
    image: '/images/recipes/pizzabroetchen.webp',
    title: 'Pizzabrötchen',
    text: 'Pizzabrötchen für den Spieleabend: Speichere Zutaten und Zubereitung, damit du sie beim nächsten Mal wiederfindest.',
  },
  {
    image: '/images/recipes/marmorkuchen.webp',
    title: 'Marmorkuchen',
    text: 'Eine Backidee für später behalten. Beim nächsten Mal findest du sie in deiner Rezeptsammlung wieder.',
  },
] as const

const { data: ideaSlides } = await useFetch('/api/recipe-catalog/v1', {
  key: 'marketing-recipe-illustrations',
  transform: catalog => catalog.recipes.map(recipe => ({
    src: recipe.hero.src, alt: recipe.hero.alt, title: recipe.title, to: '/rezepte/' + recipe.slug,
  })),
})
const slides = computed(() => [
  ...gallery.map(item => ({ src: item.image, title: item.title, alt: item.title + ' aus der shliste-Rezeptsammlung' })),
  ...(ideaSlides.value ?? []),
])

const jumps = [
  { href: '#bild', label: 'Eigenes Bild' },
  { href: '#sammlung', label: 'Sammlung' },
  { href: '#kochen', label: 'Aussuchen → Kochen' },
  { href: '#ki', label: 'Rezepte mit KI' },
] as const
</script>

<template>
  <MarketingPage
    chapter="Kapitel · Rezepte"
    eyebrow="Rezeptbuch inklusive"
    title="Kochideen, die nicht wieder verschwinden."
    intro="Rezept speichern, Schritte abhaken, Zutaten auf die Liste. In shliste findest du dein Rezept und die passende Einkaufsliste. Entdecke dazu unsere bebilderten Rezeptideen zum Nachkochen."
    image="/images/recipes/lasagne.webp"
    image-alt="Mit KI erstellte Rezeptillustration: Lasagne mit Tomaten, Möhren und Basilikum."
    image-caption="Rezeptillustration aus shliste · Vegane Lasagne mit Béchamelsoße"
    landscape
    primary-to="/app/recipes"
    primary-label="Meine Rezeptsammlung öffnen"
    :jumps="jumps"
  >
    <template #hero>
      <MarketingRecipeSlides :slides="slides" />
    </template>
    <template #hero-actions>
      <UButton
        to="/rezeptideen"
        icon="i-lucide-search"
        size="xl"
        variant="soft"
        class="rounded-full px-6 font-bold"
      >
        Rezeptideen entdecken
      </UButton>
    </template>
    <MarketingSection
      id="bild"
      label="Das besondere Extra"
      title="Dein Rezept kann ein Bild bekommen."
      tone="accent"
    >
      <p>
        Das Erstellen eigener KI-Illustrationen testen wir noch mit einem kleinen Kreis. Auf der KI-Warteliste kannst du dich für den Start vormerken lassen. Dein Rezept bleibt auch ohne Bild nutzbar.
      </p>
      <MarketingInlineDemo mode="photo" />
    </MarketingSection>

    <MarketingSection
      id="sammlung"
      label="Eine Sammlung mit Wiedererkennungswert"
      title="Was kochen wir heute?"
      tone="soft"
    >
      <p>
        Diese Bilder gehören zu vorhandenen Rezepten in shliste. Sie zeigen, wie eine persönliche Sammlung aussehen kann: Lieblingsgerichte wiederfinden, Zutaten nachsehen und den nächsten Einkauf planen.
      </p>
      <div class="mt-8 grid gap-5 md:grid-cols-3">
        <figure
          v-for="(item, i) in gallery"
          :key="item.title"
          class="mosaic-card mkt-card overflow-hidden !p-0"
          :style="{ '--i': i }"
        >
          <div class="recipe-gallery-image">
            <img
              :src="item.image"
              :alt="`Vorhandene Rezeptillustration: ${item.title}.`"
              width="1200"
              height="600"
              loading="lazy"
              class="block h-auto w-full"
            >
            <MarketingAiLabel />
          </div>
          <figcaption class="p-5">
            <h3>{{ item.title }}</h3>
            <p class="!mt-2">
              {{ item.text }}
            </p>
          </figcaption>
        </figure>
      </div>
    </MarketingSection>

    <div class="mkt-content">
      <RecipeCollectionBridge discover />
    </div>
    <MarketingStoryMoment
      id="kuchenpause"
      moment="family"
    />

    <MarketingSection
      id="nutzen"
      label="Eine Sammlung, die du benutzt"
      title="Deine Rezepte brauchen keinen eigenen Zettelstapel."
    >
      <div class="mt-6 grid gap-8 lg:grid-cols-2">
        <p class="!mt-0">
          Ob ein vertrautes Lieblingsessen oder etwas Neues fürs Wochenende: Halte ein Rezept mit seinem Namen, den Zutaten und den einzelnen Schritten fest. In der Übersicht findest du deine Sammlung wieder. Die Detailansicht bringt die Informationen zusammen, die beim Kochen gebraucht werden. Ein vorhandenes Rezeptbild hilft dir, die passende Idee auf einen Blick zu erkennen.
        </p>
        <p class="!mt-0">
          Eine Quellenadresse kannst du am Rezept behalten. Das ist praktisch, wenn du später noch einmal auf der ursprünglichen Seite nachlesen möchtest. Deine Sammlung bleibt damit mehr als eine Reihe offener Browser-Tabs: Du findest die Zubereitung und den Ursprung an derselben Stelle.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection
      id="kochen"
      label="Vom Rezept zum Essen"
      title="Aussuchen. Besorgen. Zubereiten."
      tone="soft"
    >
      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <article class="mkt-card">
          <p class="mkt-label">
            01 · Aussuchen
          </p>
          <h3>Was passt heute?</h3>
          <p>
            Öffne ein Rezept und schau dir Zutaten und Schritte an. So lässt sich vor dem Einkauf überlegen, was noch im Vorrat steht und was du besorgen möchtest. Du musst dafür nicht zwischen einem Link, einer Notiz und einem Einkaufszettel wechseln.
          </p>
        </article>
        <article class="mkt-card">
          <p class="mkt-label">
            02 · Besorgen
          </p>
          <h3>Zutaten auf die Liste</h3>
          <p>
            Übernimm die Zutaten auf eine Einkaufsliste. Das verbindet deine Rezeptplanung mit den anderen Besorgungen des Tages. Schau die Liste vor dem Losgehen noch einmal durch: Was bereits zu Hause ist oder mehrfach gebraucht wird, entscheidest du selbst.
          </p>
        </article>
        <article class="mkt-card">
          <p class="mkt-label">
            03 · Zubereiten
          </p>
          <h3>Schritt für Schritt dabei</h3>
          <p>
            Beim Kochen steht die Zubereitung direkt beim Rezept. Die Einkaufsliste bleibt für die Besorgungen zuständig, das Rezept für die Reihenfolge am Herd. So haben beide ihren Platz, ohne dass du den gesamten Ablauf in einen Listeneintrag schreiben musst.
          </p>
        </article>
      </div>
    </MarketingSection>

    <MarketingSection
      id="app-blick"
      label="Vom Rezept in den Einkauf"
      title="Was fehlt, kommt auf die Liste."
    >
      <div class="mt-8 grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p class="!mt-0">
            In der Übersicht erkennst du Gerichte am Bild. In der Detailansicht hast du Zutaten, Schritte und den Weg auf die Einkaufsliste an einem Ort.
          </p>
          <UButton
            to="/gemeinsam-einkaufen"
            size="lg"
            variant="outline"
            class="mt-6 rounded-full font-bold"
          >
            Weiter: Gemeinsam einkaufen
          </UButton>
        </div>
        <MarketingInlineDemo
          mode="recipe"
          embedded
        />
      </div>
    </MarketingSection>

    <MarketingSection
      id="ki"
      label="Mit Unterstützung, mit deiner Entscheidung"
      title="Eine gute Fundstelle ist ein Anfang."
      tone="soft"
    >
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p class="!mt-0">
            Für die Rezept-Erstellung bietet shliste auch AI-Unterstützung per Link, Foto oder Sprache. Dafür brauchst du eine Anmeldung und eine Internetverbindung. Das kann die Übernahme einer Kochidee erleichtern; es ersetzt deinen Blick auf Mengen, Zutaten und Zubereitung nicht.
          </p>
          <p>
            Prüfe übernommene Angaben insbesondere dann, wenn du Zutaten austauschst oder bestimmte Lebensmittel vermeiden möchtest. Die App gibt einer Rezeptidee Struktur. Ob sie für deinen Haushalt und deine Küche passt, entscheidest weiterhin du. Eine passende Illustration kannst du mit KI ergänzen.
          </p>
        </div>
        <div class="mkt-card">
          <h3>Rezept oder Einkaufsliste?</h3>
          <p>
            Ein Rezept beschreibt ein Gericht. Auf einer Liste kannst du Zutaten für mehrere Gerichte und andere Besorgungen sammeln. Du musst deshalb nicht für jedes Essen eine neue Einkaufsliste führen. Ergänze den geplanten Einkauf dort, wo du ohnehin abhaken wirst.
          </p>
          <p>
            Wenn ihr gemeinsam einkauft, könnt ihr eure Besorgungen über eine geteilte Liste abstimmen. Dafür benötigen die Beteiligten Anmeldung und Verbindung für den Abgleich. Mehr dazu findest du unter „Gemeinsam einkaufen“.
          </p>
        </div>
      </div>
    </MarketingSection>

    <MarketingSection
      id="finden"
      label="Zum Schluss"
      title="Zu Hause planen, in der Küche wiederfinden."
    >
      <p>
        Im Browser kannst du direkt mit deiner Rezeptübersicht beginnen; für Android gibt es die App. Ohne Anmeldung bleiben deine lokal gespeicherten Inhalte auf diesem Gerät. Mit Anmeldung und Verbindung kannst du sie zwischen deinen Geräten abgleichen. Speichere zum Ausprobieren ein Rezept, das du gerne wieder kochen möchtest.
      </p>
    </MarketingSection>
  </MarketingPage>
</template>

<style scoped>
.mosaic-card {
  transition: transform 280ms cubic-bezier(0.34, 1.1, 0.64, 1), box-shadow 280ms ease;
  animation: mosaic-in 700ms cubic-bezier(0.34, 1.1, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 90ms);
}
.mosaic-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--md-primary) 14%, transparent);
}
@keyframes mosaic-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .mosaic-card { animation: none; }
  .mosaic-card:hover { transform: none; }
}
</style>

<style scoped>
.recipe-gallery-image{position:relative;container:ai-image / inline-size}
.recipe-gallery-image>.ai-label{position:absolute;right:10px;bottom:10px;font-size:11px}
</style>

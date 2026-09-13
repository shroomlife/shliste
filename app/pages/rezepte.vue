<script setup lang="ts">
useSeoMeta({
  title: 'Rezepte sammeln und den Einkauf planen ~ shliste',
  description: 'Rezepte mit Zutaten und Schritten griffbereit halten, Links übernehmen und Zutaten zur Einkaufsliste hinzufügen. Entdecke die Rezeptfunktionen von shliste.',
})
</script>

<template>
  <MarketingPage
    eyebrow="Ideen fürs nächste Essen"
    title="Aus „Das kochen wir mal“ wird ein Plan."
    intro="Ein Rezept entdeckt, abgespeichert und später wieder vergessen? In shliste bekommen deine Kochideen einen eigenen Platz – mit Zutaten, Zubereitung und einem kurzen Weg zur Einkaufsliste."
    image="/images/recipes/lasagne.webp"
    image-alt="Illustration einer Lasagne mit Tomaten, Möhren und Basilikum aus einem vorhandenen shliste-Rezept."
    image-caption="Rezeptillustration aus shliste · Vegane Lasagne mit Béchamelsoße"
    landscape
    primary-to="/app/recipes"
    primary-label="Zu den Rezepten"
  >
    <section
      class="editorial-section"
      aria-labelledby="recipe-gallery-title"
    >
      <p class="section-label">
        Eine Sammlung mit Wiedererkennungswert
      </p>
      <h2 id="recipe-gallery-title">
        Appetit auf den nächsten Blick.
      </h2>
      <p class="max-w-3xl">
        Diese Bilder gehören zu vorhandenen Rezepten in shliste. Sie zeigen, wie eine persönliche Sammlung aussehen kann: Lieblingsgerichte wiederfinden, Zutaten nachsehen und den nächsten Einkauf planen.
      </p>
      <div class="mt-7 grid gap-5 md:grid-cols-3">
        <figure
          class="overflow-hidden rounded-2xl"
          style="background: var(--md-surface-container)"
        >
          <img
            src="/images/recipes/lasagne.webp"
            alt="Vorhandene Rezeptillustration: Lasagne mit Tomaten und Basilikum."
            width="1200"
            height="600"
            loading="lazy"
            class="block h-auto w-full"
          >
          <figcaption class="p-5">
            <h3>Lasagne</h3><p>Auch eine längere Zutatenliste bleibt übersichtlich beim Gericht. Was noch fehlt, kommt auf den Einkauf.</p>
          </figcaption>
        </figure>
        <figure
          class="overflow-hidden rounded-2xl"
          style="background: var(--md-surface-container)"
        >
          <img
            src="/images/recipes/pizzabroetchen.webp"
            alt="Vorhandene Rezeptillustration: Pizzabrötchen."
            width="1200"
            height="600"
            loading="lazy"
            class="block h-auto w-full"
          >
          <figcaption class="p-5">
            <h3>Pizzabrötchen</h3><p>Die Idee für einen gemeinsamen Abend hat ihren festen Platz – mit Zutaten und den zugehörigen Schritten.</p>
          </figcaption>
        </figure>
        <figure
          class="overflow-hidden rounded-2xl"
          style="background: var(--md-surface-container)"
        >
          <img
            src="/images/recipes/marmorkuchen.webp"
            alt="Vorhandene Rezeptillustration: Marmorkuchen."
            width="1200"
            height="600"
            loading="lazy"
            class="block h-auto w-full"
          >
          <figcaption class="p-5">
            <h3>Marmorkuchen</h3><p>Eine Backidee für später behalten. Beim nächsten Mal findest du sie in deiner Rezeptsammlung wieder.</p>
          </figcaption>
        </figure>
      </div>
    </section>
    <section class="editorial-section grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p class="section-label">
          Eine Sammlung, die du benutzt
        </p><h2>Deine Rezepte brauchen keinen eigenen Zettelstapel.</h2>
      </div>
      <div>
        <p>Ob ein vertrautes Lieblingsessen oder etwas Neues fürs Wochenende: Halte ein Rezept mit seinem Namen, den Zutaten und den einzelnen Schritten fest. In der Übersicht findest du deine Sammlung wieder. Die Detailansicht bringt die Informationen zusammen, die beim Kochen gebraucht werden. Ein vorhandenes Rezeptbild hilft dir, die passende Idee auf einen Blick zu erkennen.</p>
        <p>Eine Quellenadresse kannst du am Rezept behalten. Das ist praktisch, wenn du später noch einmal auf der ursprünglichen Seite nachlesen möchtest. Deine Sammlung bleibt damit mehr als eine Reihe offener Browser-Tabs: Du findest die Zubereitung und den Ursprung an derselben Stelle.</p>
      </div>
    </section>

    <section
      class="grid gap-4 py-4 md:grid-cols-3"
      aria-label="Vom Rezept zum Essen"
    >
      <article class="feature-card">
        <p class="section-label">
          01 · Aussuchen
        </p><h3>Was passt heute?</h3><p>Öffne ein Rezept und schau dir Zutaten und Schritte an. So lässt sich vor dem Einkauf überlegen, was noch im Vorrat steht und was du besorgen möchtest. Du musst dafür nicht zwischen einem Link, einer Notiz und einem Einkaufszettel wechseln.</p>
      </article>
      <article class="feature-card">
        <p class="section-label">
          02 · Besorgen
        </p><h3>Zutaten auf die Liste</h3><p>Übernimm die Zutaten auf eine Einkaufsliste. Das verbindet deine Rezeptplanung mit den anderen Besorgungen des Tages. Schau die Liste vor dem Losgehen noch einmal durch: Was bereits zu Hause ist oder mehrfach gebraucht wird, entscheidest du selbst.</p>
      </article>
      <article class="feature-card">
        <p class="section-label">
          03 · Zubereiten
        </p><h3>Schritt für Schritt dabei</h3><p>Beim Kochen steht die Zubereitung direkt beim Rezept. Die Einkaufsliste bleibt für die Besorgungen zuständig, das Rezept für die Reihenfolge am Herd. So haben beide ihren Platz, ohne dass du den gesamten Ablauf in einen Listeneintrag schreiben musst.</p>
      </article>
    </section>

    <section class="editorial-section mt-8 grid gap-8 lg:grid-cols-2">
      <div>
        <p class="section-label">
          Mit Unterstützung, mit deiner Entscheidung
        </p><h2>Eine gute Fundstelle ist ein Anfang.</h2><p>Für die Rezept-Erstellung bietet shliste auch AI-Unterstützung per Link, Foto oder Sprache. Dafür brauchst du eine Anmeldung und eine Internetverbindung. Das kann die Übernahme einer Kochidee erleichtern; es ersetzt deinen Blick auf Mengen, Zutaten und Zubereitung nicht.</p><p>Prüfe übernommene Angaben insbesondere dann, wenn du Zutaten austauschst oder bestimmte Lebensmittel vermeiden möchtest. Die App gibt einer Rezeptidee Struktur. Ob sie für deinen Haushalt und deine Küche passt, entscheidest weiterhin du.</p>
      </div>
      <div class="feature-card">
        <h3>Rezept oder Einkaufsliste?</h3><p>Ein Rezept beschreibt ein Gericht. Eine Liste sammelt, was du besorgen möchtest – auch für mehrere Gerichte und ganz andere Dinge. Du musst deshalb nicht für jedes Essen eine neue Einkaufsliste führen. Ergänze den geplanten Einkauf dort, wo du ohnehin abhaken wirst.</p><p>Wenn ihr gemeinsam einkauft, könnt ihr eure Besorgungen über eine geteilte Liste abstimmen. Dafür benötigen die Beteiligten Anmeldung und Verbindung für den Abgleich. Mehr dazu findest du unter „Gemeinsam einkaufen“.</p>
      </div>
    </section>

    <section class="editorial-section">
      <h2>Zu Hause planen, in der Küche wiederfinden.</h2><p class="max-w-3xl">
        Im Browser kannst du direkt mit deiner Rezeptübersicht beginnen; für Android gibt es die App. Ohne Anmeldung bleiben deine lokal gespeicherten Inhalte auf diesem Gerät. Mit Anmeldung und Verbindung kannst du sie zwischen deinen Geräten abgleichen. Fang mit einem Rezept an, das du tatsächlich wieder kochen möchtest – eine brauchbare Sammlung wächst beim Benutzen.
      </p>
    </section>
  </MarketingPage>
</template>

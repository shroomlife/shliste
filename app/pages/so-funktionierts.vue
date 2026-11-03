<script setup lang="ts">
useSeoMeta({
  title: 'So funktioniert shliste',
  description: 'Liste anlegen, mit KI aus Stimme, Foto oder Link füllen, Rezepte sammeln, Listen mit anderen teilen. Browser und Android jetzt; iPhone über die Web-App, native iOS-App im Aufbau.',
  ogImage: 'https://shliste.app/og-image.png',
})

const jumps = [
  { href: '#liste', label: 'Erste Liste' },
  { href: '#link', label: 'Links & KI' },
  { href: '#rezepte', label: 'Rezepte' },
  { href: '#sync', label: 'Geräte verbinden' },
  { href: '#plattformen', label: 'Plattformen' },
] as const
</script>

<template>
  <MarketingPage
    chapter="Kapitel · Tour"
    eyebrow="Einfach anfangen"
    title="Deine erste Einkaufsliste in shliste."
    intro="Öffne shliste und schreib auf, was du einkaufen möchtest. Dafür brauchst du noch kein Konto. Hier zeigen wir dir auch, wie du Rezepte speicherst und Listen mit anderen teilst."
    image="/images/screenshots/links.png"
    image-alt="Link-Auswahl in shliste: Adresse speichern oder Einträge daraus übernehmen."
    image-caption="Ein Link wird erst durch deine Auswahl übernommen · echte App"
    :jumps="jumps"
  >
    <template #hero>
      <MarketingTourPreview overview />
    </template>
    <MarketingSection
      id="liste"
      label="01 · Deine erste Liste"
      title="Im Browser direkt loslegen."
      tone="soft"
    >
      <div class="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p class="!mt-0">
            Öffne die App und lege eine Liste an. Du kannst Artikel eintragen, Mengen anpassen und Erledigtes abhaken. Das geht auch ohne Konto. Alles landet erstmal lokal auf dem Gerät.
          </p>
          <p>
            Ohne Anmeldung bleibt deine Liste auf diesem Gerät. Wenn du dich anmeldest, kannst du sie auch auf deinen anderen Geräten nutzen. Für den Abgleich brauchst du Internet.
          </p>
        </div>
        <MarketingTourPreview />
      </div>
    </MarketingSection>

    <MarketingSection
      id="link"
      label="02 · Ein Link ist mehr als Text"
      title="Behalten oder übernehmen? Du wählst."
    >
      <p>
        Fügst du in der Web-App eine vollständige Web-Adresse oder einen Link mit „www.“ in die untere Eingabe ein, erkennt shliste ihn. Das Einfügen allein startet keine KI-Anfrage. Über den Optionsknopf oder die Eingabetaste entscheidest du, was als Nächstes passiert.
      </p>
      <div class="mt-8 grid gap-4 md:grid-cols-2">
        <article class="mkt-card">
          <h3>Als Link speichern</h3>
          <p>
            Die Adresse wird zu einem Eintrag in deiner Liste. Das passt für eine Produktseite oder eine Fundstelle, die du später öffnen möchtest. Die Seite muss dafür nicht als Einkaufszettel interpretiert werden.
          </p>
        </article>
        <article class="mkt-card">
          <h3>Einträge daraus übernehmen</h3>
          <p>
            Mit Anmeldung und Verbindung kannst du die KI den Link auslesen lassen. Prüfe anschließend die vorgeschlagenen Einträge, wähle die passenden aus und entscheide zwischen einer vorhandenen und einer neuen Liste. Erst dein Speichern übernimmt die Auswahl.
          </p>
        </article>
      </div>
    </MarketingSection>

    <MarketingSection
      id="rezepte"
      label="03 · Kochen mit Überblick"
      title="Rezepte haben ihren eigenen Platz."
      tone="accent"
    >
      <p>
        Unter Rezepte sammelst du Gerichte mit Zutaten und Zubereitungsschritten. So bleibt die Anleitung beim Gericht, während die Besorgungen auf der Einkaufsliste stehen. Zutaten kannst du von dort zum Einkauf hinzufügen, statt alles erneut einzutippen.
      </p>
      <p>
        Du kannst Rezepte auch mit KI aus einem Foto oder Link übernehmen. Dafür brauchst du Anmeldung und Internet. Vergleiche die erkannten Zutaten, Mengen und Schritte anschließend mit dem Original. Mit KI kannst du ein passendes Rezeptbild ergänzen, damit du das Gericht in der Übersicht leichter wiedererkennst.
      </p>
      <UButton
        to="/rezepte"
        size="lg"
        color="neutral"
        class="mt-6 rounded-full font-bold"
      >
        Mehr über Rezepte
      </UButton>
    </MarketingSection>

    <MarketingSection
      id="sync"
      label="04 · Wenn mehrere Geräte mitmachen"
      title="Deine Liste auf mehreren Geräten."
      tone="soft"
    >
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <p class="!mt-0">
          Melde dich an, wenn du Inhalte zwischen Geräten abgleichen oder Listen gemeinsam nutzen möchtest. Mit Verbindung arbeitet der Abgleich im Hintergrund. Ohne Netz kannst du bereits gespeicherte Listen lokal weiterbearbeiten; andere Geräte erhalten diesen Stand erst wieder mit Verbindung.
        </p>
        <p class="!mt-0">
          Du möchtest die App erst einmal allein ausprobieren? Dann kannst du ohne Anmeldung anfangen. Deine Listen bleiben auf dem Gerät, auf dem du sie angelegt hast.
        </p>
      </div>
      <UButton
        to="/gemeinsam-einkaufen"
        size="lg"
        variant="outline"
        class="mt-6 rounded-full font-bold"
      >
        Gemeinsam einkaufen
      </UButton>
    </MarketingSection>

    <MarketingSection
      id="plattformen"
      label="05 · Auf deinen Geräten"
      title="Browser und Android jetzt. iPhone über die Web-App."
    >
      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <article class="mkt-card">
          <h3>Web-App</h3>
          <p>Öffne shliste im Browser. Mit Anmeldung und Internet kannst du am Laptop planen und später am Handy abhaken.</p>
        </article>
        <article class="mkt-card">
          <h3>Android</h3>
          <p>Im Google Play Store. Dieselbe Listen- und Rezeptwelt, inklusive Offline-Abhaken und gemeinsamen Listen.</p>
        </article>
        <article class="mkt-card">
          <h3>iOS</h3>
          <p>
            Auf dem iPhone kannst du shliste im Browser nutzen. Unsere native iOS-App hat bereits einen eigenen Multiplattform-Build. Die Vorschau zeigt ihre Listenübersicht mit Beispieldaten; die App ist noch in Entwicklung.
          </p>
        </article>
      </div>
    </MarketingSection>

    <MarketingSection
      id="updates"
      label="Zum Schluss"
      title="Was passiert bei einer neuen Web-Version?"
      tone="soft"
    >
      <p>
        Die Web-App prüft im Hintergrund auf eine neue Version und lädt sie automatisch. Dafür wird die App neu geladen. Speichere offene Eingaben deshalb regelmäßig, auch wenn du mehrere Tabs nutzt.
      </p>
      <p>
        Für den Anfang reicht eine Liste mit den nächsten Besorgungen. Wenn du danach Rezeptideen sammeln oder jemanden einladen möchtest, findest du die passenden Möglichkeiten direkt in der App. Du musst nicht alles auf einmal einrichten.
      </p>
    </MarketingSection>
  </MarketingPage>
</template>

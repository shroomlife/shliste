<script setup lang="ts">
useSeoMeta({
  title: 'So funktioniert shliste: Listen, Rezepte und Links ~ shliste',
  description: 'Mit shliste starten: lokal eine Liste anlegen, Links bewusst übernehmen, Rezepte sammeln und bei Bedarf gemeinsam synchronisieren. Ein verständlicher Einstieg.',
})
</script>

<template>
  <MarketingPage
    eyebrow="Einfach anfangen"
    title="Ein Gedanke. Ein Eintrag. Schon auf der Liste."
    intro="Du musst nicht zuerst deinen ganzen Haushalt organisieren. Öffne shliste und beginne mit dem nächsten Einkauf. Rezepte, Links und gemeinsame Listen kommen dann dazu, wenn du sie brauchst."
    image="/images/screenshots/links.png"
    image-alt="Link-Auswahl in shliste: Adresse speichern oder Einträge daraus übernehmen."
    image-caption="Ein Link wird erst durch deine Auswahl übernommen"
  >
    <section class="editorial-section grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p class="section-label">
          01 · Deine erste Liste
        </p><h2>Im Browser direkt loslegen.</h2>
      </div>
      <div><p>Öffne die App und lege eine Liste mit einem passenden Namen an. Ergänze unten einen Artikel, passe bei Bedarf die Menge an und bestätige die Eingabe. Ein erledigter Eintrag lässt sich abhaken. Diese Grundfunktionen brauchen kein Konto: Deine Inhalte werden zunächst lokal auf diesem Gerät gespeichert.</p><p>Du kannst shliste im Browser verwenden oder die Android-App öffnen. Ohne Anmeldung bedeutet „gespeichert“ zunächst genau das: auf dem gerade genutzten Gerät. Erst wenn du den Abgleich mit einem Konto nutzt, kommt ein gemeinsamer Stand zwischen Geräten hinzu.</p></div>
    </section>

    <section class="editorial-section grid gap-8 lg:grid-cols-2">
      <div>
        <p class="section-label">
          02 · Ein Link ist mehr als Text
        </p><h2>Behalten oder übernehmen? Du wählst.</h2><p>Fügst du in der Web-App eine vollständige Web-Adresse oder einen Link mit „www.“ in die untere Eingabe ein, erkennt shliste ihn. Das Einfügen allein startet keine AI-Anfrage. Über den Optionsknopf oder die Eingabetaste entscheidest du, was als Nächstes passiert.</p>
      </div>
      <div class="feature-card">
        <h3>Als Link speichern</h3><p>Die Adresse wird zu einem Eintrag in deiner Liste. Das passt für eine Produktseite oder eine Fundstelle, die du später öffnen möchtest. Die Seite muss dafür nicht als Einkaufszettel interpretiert werden.</p><h3 class="mt-5">
          Einträge daraus übernehmen
        </h3><p>Mit Anmeldung und Verbindung kannst du die AI den Link auslesen lassen. Prüfe anschließend die vorgeschlagenen Einträge, wähle die passenden aus und entscheide zwischen einer vorhandenen und einer neuen Liste. Erst dein Speichern übernimmt die Auswahl.</p>
      </div>
    </section>

    <section class="editorial-section grid gap-8 lg:grid-cols-2">
      <div>
        <p class="section-label">
          03 · Kochen mit Überblick
        </p><h2>Rezepte haben ihren eigenen Platz.</h2><p>Unter Rezepte sammelst du Gerichte mit Zutaten und Zubereitungsschritten. So bleibt die Anleitung beim Gericht, während die Besorgungen auf der Einkaufsliste stehen. Zutaten kannst du von dort zum Einkauf hinzufügen, statt alles erneut einzutippen.</p><p>Für die Rezept-Erstellung stehen auch AI-Wege zur Verfügung. Eine Anmeldung und Internet sind dafür nötig. Kontrolliere die übernommenen Angaben: Ein Vorschlag ist eine Hilfe beim Erfassen, keine Garantie für richtige Mengen oder eine passende Zubereitung.</p>
      </div>
      <div>
        <p class="section-label">
          04 · Wenn mehrere Geräte mitmachen
        </p><h2>Teilen und Abgleichen bewusst dazunehmen.</h2><p>Melde dich an, wenn du Inhalte zwischen Geräten abgleichen oder Listen gemeinsam nutzen möchtest. Mit Verbindung arbeitet der Abgleich im Hintergrund. Ohne Netz kannst du bereits gespeicherte Listen lokal weiterbearbeiten; andere Geräte erhalten diesen Stand erst wieder mit Verbindung.</p><p>Im Profil unterscheidet shliste deshalb zwischen lokalem Bestand und angemeldeter Synchronisation. Ohne Konto gibt es keinen ausstehenden Geräteabgleich. Ein lokaler Einkauf ist auch dann benutzbar, wenn du dich für die Anmeldung noch gar nicht entschieden hast.</p>
      </div>
    </section>

    <section class="feature-card mt-6">
      <h2>Was passiert bei einer neuen Web-Version?</h2><p>Die Web-App lädt verfügbare Updates im Hintergrund. Wenn ein Update bereitsteht, kannst du es übernehmen oder auf später verschieben. Speichere vorher offene Eingaben – auch in anderen Tabs –, denn beim Aktualisieren wird die App neu geladen. Bereits lokal gespeicherte Inhalte und ein noch nicht bestätigter Entwurf sind unterschiedliche Dinge.</p><p>Für den Anfang reicht eine Liste mit den nächsten Besorgungen. Wenn du danach Rezeptideen sammeln oder jemanden einladen möchtest, findest du die passenden Möglichkeiten direkt in der App. Du musst nicht alles auf einmal einrichten.</p>
    </section>
  </MarketingPage>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Gemeinsame Einkaufsliste für euren Alltag ~ shliste',
  description: 'Besorgungen im Haushalt abstimmen, Zutaten ergänzen und gemeinsam abhaken. So nutzt ihr geteilte Einkaufslisten in shliste – mit klarem lokalem und synchronisiertem Stand.',
})
</script>

<template>
  <MarketingPage
    eyebrow="Ein Einkauf, viele kleine Gedanken"
    title="Die Milch steht schon auf der Liste."
    intro="Eine Person schaut in den Kühlschrank, die andere ist auf dem Weg zum Laden. Mit einer gemeinsamen Einkaufsliste landet das, was fehlt, an einem Ort – statt in mehreren Nachrichten."
    image="/images/screenshots/list.png"
    image-alt="Einkaufsliste in der shliste Web-App mit offenen und abgehakten Einträgen."
    image-caption="So sieht eine Einkaufsliste in der Web-App aus"
  >
    <section class="editorial-section grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p class="section-label">
          Ein gemeinsamer Ausgangspunkt
        </p><h2>Besorgungen gehören dorthin, wo ihr sie braucht.</h2>
      </div>
      <div><p>Richte eine Liste für euren Einkauf ein und lade die Menschen ein, mit denen du sie nutzen möchtest. Gemeinsame Nutzung benötigt eine Anmeldung; Änderungen werden mit Verbindung abgeglichen. Danach muss die Frage „Was brauchen wir noch?“ nicht jedes Mal mit einer neuen Nachricht anfangen. Wer etwas bemerkt, ergänzt es auf der Liste.</p><p>Der Listenname darf so konkret sein wie euer Alltag: der normale Wocheneinkauf, die Besorgungen für einen gemeinsamen Abend oder eine einzelne größere Kochaktion. Verschiedene Listen helfen, diese Anlässe auseinanderzuhalten. Ihr entscheidet, welche davon ihr gemeinsam verwendet.</p></div>
    </section>

    <section
      class="grid gap-4 py-4 md:grid-cols-3"
      aria-label="Gemeinsamer Einkauf in drei Schritten"
    >
      <article class="feature-card">
        <p class="section-label">
          Vor dem Losgehen
        </p><h3>Ergänzen, was fehlt</h3><p>Trage den Artikel und die benötigte Menge ein. Ein klarer Name wie „Haferdrink ungesüßt“ erspart Rückfragen vor dem Regal. Zutaten aus einem geplanten Rezept können denselben Einkauf ergänzen. So stehen Lebensmittel und andere Besorgungen zusammen auf der Liste.</p>
      </article>
      <article class="feature-card">
        <p class="section-label">
          Zwischen den Regalen
        </p><h3>Abhaken, was im Korb liegt</h3><p>Hake erledigte Einträge direkt ab. Die Liste zeigt, was noch offen ist. Wenn du dich vertippst, kannst du ein Häkchen wieder zurücknehmen. Mit Verbindung wird der geänderte Stand auch für die anderen Geräte abgeglichen.</p>
      </article>
      <article class="feature-card">
        <p class="section-label">
          Wenn etwas dazukommt
        </p><h3>Der Einkauf bleibt ergänzbar</h3><p>Eine Einkaufsliste ist selten beim ersten Versuch fertig. Ergänzungen müssen deshalb nicht auf den nächsten Einkauf warten. Wer noch etwas braucht, trägt es ein. Bei schlechtem Empfang hilft eine kurze Absprache, weil andere Geräte deinen lokalen Stand erst nach dem Abgleich sehen.</p>
      </article>
    </section>

    <section class="editorial-section mt-8 grid gap-8 lg:grid-cols-2">
      <div>
        <p class="section-label">
          Auch im Funkloch benutzbar
        </p><h2>Ohne Empfang bleibt deine Liste benutzbar.</h2><p>Bereits lokal gespeicherte Listen kannst du ohne Netz öffnen und bearbeiten. Ein Häkchen bleibt also nicht deshalb aus, weil der Supermarkt schlechten Empfang hat. Lokal gespeicherte Änderungen und ein zwischen Geräten abgeglichener Stand sind dabei zwei verschiedene Dinge.</p><p>Für neue Änderungen auf dem anderen Gerät braucht es wieder eine Verbindung. Wenn ihr gleichzeitig ohne Empfang einkauft, kann deshalb niemand eine sofort aktuelle Sicht auf die Handlungen der anderen erwarten. shliste übernimmt den Abgleich im Hintergrund, sobald er möglich ist.</p>
      </div>
      <div class="feature-card">
        <h3>Allein anfangen ist genauso in Ordnung.</h3><p>Du brauchst kein Konto, um eine lokale Liste anzulegen. Ohne Anmeldung liegt sie auf dem verwendeten Gerät und wird nicht mit anderen geteilt. Das ist ein normaler Nutzungsmodus, kein wartender Sync. Du kannst zuerst ausprobieren, ob die Liste zu deinem Alltag passt.</p><p>Wenn ihr später gemeinsam arbeiten möchtet, kommt die Anmeldung dazu. Prüft beim Einrichten, welche Liste tatsächlich geteilt werden soll. Eine persönliche Sammlung und ein gemeinsamer Einkauf müssen nicht dieselbe Liste sein.</p>
      </div>
    </section>

    <section class="editorial-section">
      <h2>Vom geplanten Essen zum gemeinsamen Einkauf.</h2><p class="max-w-3xl">
        Rezepte und Listen ergänzen sich: Ihr überlegt, was gekocht wird, und übernehmt die benötigten Zutaten in den Einkauf. Für eine wiedergefundene Produktseite kannst du auch einen Link als Eintrag speichern. So bleibt die Information beim Artikel, statt später in einem Chat gesucht werden zu müssen. Mehr über die beiden Wege findest du auf den Rezeptseiten und unter „So funktioniert’s“.
      </p>
    </section>
  </MarketingPage>
</template>

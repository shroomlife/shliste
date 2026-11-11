<script setup lang="ts">
useSeoMeta({
  title: 'Gemeinsam einkaufen mit shliste',
  description: 'Teilt eure Einkaufsliste: Zu Hause ergänzen, im Laden abhaken und mit Internet die Änderungen der anderen sehen.',
  ogImage: 'https://shliste.app/og-image.png',
})

const jumps = [
  { href: '#ausgangspunkt', label: 'Ausgangspunkt' },
  { href: '#zwei-geraete', label: 'Zwei Geräte' },
  { href: '#schritte', label: 'Drei Schritte' },
  { href: '#offline', label: 'Offline & Solo' },
] as const
</script>

<template>
  <MarketingPage
    chapter="Kapitel · Haushalt"
    eyebrow="Haushalt, eine Liste"
    title="Der Haferdrink steht schon auf der Liste."
    intro="Du schaust in den Kühlschrank, Sam ist schon im Laden. Ergänze auf eurer gemeinsamen Liste, was noch fehlt. Sam sieht die Änderung, sobald beide Geräte eine Verbindung haben."
    image="/images/screenshots/android-list-detail.png"
    image-alt="Geteilte Liste Freitag: Freunde zum Essen mit Personen-Icon und Einträgen von Sam."
    image-caption="Gemeinsame Einkaufsliste in der Android-App"
    :jumps="jumps"
  >
    <template #hero>
      <MarketingTourPreview shared />
    </template>
    <MarketingSection
      id="ausgangspunkt"
      label="Ein gemeinsamer Ausgangspunkt"
      title="Besorgungen gehören dorthin, wo ihr sie braucht."
    >
      <div class="mt-6 grid items-center gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-12">
        <div>
          <p class="!mt-0">
            Richte eine Liste für euren Einkauf ein und lade die Menschen ein, mit denen du sie nutzen möchtest. Gemeinsame Nutzung benötigt eine Anmeldung; Änderungen werden mit Verbindung abgeglichen. Danach muss die Frage „Was brauchen wir noch?“ nicht jedes Mal mit einer neuen Nachricht anfangen. Wer etwas bemerkt, ergänzt es auf der Liste.
          </p>
          <p>
            Der Listenname darf so konkret sein wie euer Alltag: der normale Wocheneinkauf, die Besorgungen für einen gemeinsamen Abend oder eine einzelne größere Kochaktion. Verschiedene Listen helfen, diese Anlässe auseinanderzuhalten. Ihr entscheidet, welche davon ihr gemeinsam verwendet.
          </p>
        </div>
        <MarketingMoodImage
          name="fridge-check"
          alt="Eine Person mit roten Locken steht nachdenklich vor dem offenen Kühlschrank und hält ihr Handy in der Hand. Das Gemüsefach ist fast leer."
          caption="Gesehen, was fehlt. Schon steht es auf der Liste."
          icon="i-lucide-refrigerator"
        />
      </div>
    </MarketingSection>

    <MarketingSection
      id="zwei-geraete"
      label="Der Kern"
      title="Dieselbe Liste. Zwei Geräte."
      tone="soft"
    >
      <p>
        Du merkst zu Hause: Rucola fehlt noch. Du ergänzt den Eintrag; Sam sieht ihn beim Einkauf nach dem Abgleich. Sam hakt ab, was im Korb liegt. Mit Anmeldung und Internet bleibt ihr auf einem gemeinsamen Stand.
      </p>
      <MarketingInlineDemo mode="shared" />
    </MarketingSection>

    <MarketingSection
      id="schritte"
      label="Gemeinsamer Einkauf in drei Schritten"
      title="Vor dem Losgehen. Zwischen den Regalen. Wenn etwas dazukommt."
    >
      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <article class="mkt-card">
          <p class="mkt-label">
            Vor dem Losgehen
          </p>
          <h3>Ergänzen, was fehlt</h3>
          <p>
            Trage den Artikel und die benötigte Menge ein. Ein klarer Name wie „Haferdrink ungesüßt“ erspart Rückfragen vor dem Regal. Zutaten aus einem geplanten Rezept können denselben Einkauf ergänzen. So stehen Lebensmittel und andere Besorgungen zusammen auf der Liste.
          </p>
        </article>
        <article class="mkt-card">
          <p class="mkt-label">
            Zwischen den Regalen
          </p>
          <h3>Abhaken, was im Korb liegt</h3>
          <p>
            Hake erledigte Einträge direkt ab. Die Liste zeigt, was noch offen ist. Wenn du dich vertippst, kannst du ein Häkchen wieder zurücknehmen. Mit Verbindung wird der geänderte Stand auch für die anderen Geräte abgeglichen.
          </p>
        </article>
        <article class="mkt-card">
          <p class="mkt-label">
            Wenn etwas dazukommt
          </p>
          <h3>Der Einkauf bleibt ergänzbar</h3>
          <p>
            Eine Einkaufsliste ist selten beim ersten Versuch fertig. Ergänzungen müssen deshalb nicht auf den nächsten Einkauf warten. Wer noch etwas braucht, trägt es ein. Bei schlechtem Empfang hilft eine kurze Absprache, weil andere Geräte deinen lokalen Stand erst nach dem Abgleich sehen.
          </p>
        </article>
      </div>
    </MarketingSection>

    <MarketingSection
      id="offline"
      label="Auch im Funkloch · Solo geht auch"
      title="Ohne Empfang bleibt deine Liste benutzbar."
      tone="accent"
    >
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p class="!mt-0">
            Bereits lokal gespeicherte Listen kannst du ohne Netz öffnen und bearbeiten. Ein Häkchen bleibt also nicht deshalb aus, weil der Supermarkt schlechten Empfang hat. Die anderen sehen deine Änderungen, sobald wieder eine Verbindung besteht.
          </p>
          <p>
            Für neue Änderungen auf dem anderen Gerät braucht es wieder eine Verbindung. Wenn ihr beide ohne Empfang einkauft, sprecht vorher ab, wer was mitbringt. shliste übernimmt den Abgleich im Hintergrund, sobald er möglich ist.
          </p>
        </div>
        <div class="mkt-card">
          <h3>Allein anfangen ist genauso in Ordnung.</h3>
          <p>
            Du brauchst kein Konto, um eine lokale Liste anzulegen. Ohne Anmeldung liegt sie auf dem verwendeten Gerät und wird nicht mit anderen geteilt. Du kannst die App also erst einmal allein ausprobieren.
          </p>
          <p>
            Wenn ihr später gemeinsam arbeiten möchtet, kommt die Anmeldung dazu. Prüft beim Einrichten, welche Liste tatsächlich geteilt werden soll. Eine persönliche Sammlung und ein gemeinsamer Einkauf müssen nicht dieselbe Liste sein.
          </p>
        </div>
      </div>
    </MarketingSection>

    <MarketingSection
      id="bridge"
      label="Brücke zum Kochen"
      title="Vom geplanten Essen zum gemeinsamen Einkauf."
    >
      <p>
        Rezepte und Listen ergänzen sich: Ihr überlegt, was gekocht wird, und übernehmt die benötigten Zutaten in den Einkauf. Für eine wiedergefundene Produktseite kannst du auch einen Link als Eintrag speichern. So bleibt die Information beim Artikel, statt später in einem Chat gesucht werden zu müssen. Mehr über die beiden Wege findest du auf den Rezeptseiten und unter „So funktioniert’s“.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <UButton
          to="/rezepte"
          size="lg"
          class="rounded-full font-bold"
        >
          Rezepte ansehen
        </UButton>
        <UButton
          to="/so-funktionierts"
          size="lg"
          variant="outline"
          class="rounded-full font-bold"
        >
          Zur Tour
        </UButton>
      </div>
    </MarketingSection>
  </MarketingPage>
</template>

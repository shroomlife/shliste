<script setup lang="ts">
useSeoMeta({ title: 'Datenschutz' })
const { openSettings } = useAnalyticsConsent()
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
        Datenschutz
      </h1>

      <h2 class="mt-8 text-[1.25rem] font-bold">
        Verantwortlicher
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Robin Lehmann, Kontakt siehe <NuxtLink
          to="/imprint"
          style="color: var(--md-primary)"
        >Impressum</NuxtLink>.
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Ohne Anmeldung
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Ohne Anmeldung bleiben deine Listen und Rezepte in diesem Browser beziehungsweise auf deinem Gerät. Beim Aufrufen der Website werden technisch notwendige Verbindungsdaten verarbeitet, insbesondere deine IP-Adresse und die angeforderte Adresse. Rezeptbilder und andere öffentliche Inhalte werden vom Server geladen. Deine lokal angelegten Listen werden dadurch nicht zum Geräteabgleich hochgeladen.
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Mit Anmeldung über Google
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Meldest du dich an, übermittelt Google uns deine E-Mail-Adresse, deinen Anzeigenamen und dein Profilbild. Diese Daten und deine Listen, Einträge und Rezepte werden auf einem Server in Deutschland gespeichert, um sie zwischen deinen Geräten abzugleichen. Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags nach Artikel 6 Absatz 1 Buchstabe b DSGVO.
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Geteilte Listen
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Teilst du eine Liste, sehen die eingeladenen Personen deren Inhalt sowie deinen Anzeigenamen und dein Profilbild. Deine E-Mail-Adresse ist ausschließlich für den Eigentümer der Liste sichtbar.
      </p>

      <h2
        id="ki-warteliste"
        class="mt-6 text-[1.25rem] font-bold"
      >
        KI-Warteliste
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Wenn du dich zur KI-Warteliste anmeldest, speichern wir die von dir eingetragene E-Mail-Adresse, den Zeitpunkt und die Fassung deiner Einwilligung sowie die Bestätigung deiner Anmeldung. Wir verwenden diese Daten auf Grundlage deiner Einwilligung, um dich zu benachrichtigen, sobald du die KI-Funktionen nutzen kannst. Die Anmeldung schaltet die KI nicht automatisch frei. Bestätigte Anmeldungen bleiben bis zur Benachrichtigung oder deinem Widerruf gespeichert.
      </p>
      <p class="mt-2 text-[1.125rem]">
        Die Bestätigungsmail versenden wir über Resend. Dein Bestätigungslink gilt 48 Stunden; gespeichert wird nur seine Prüfsumme. Im shliste-Projektkanal unseres VeganCode-Discord-Servers erscheint eine Meldung mit deiner E-Mail-Adresse und deinem Bestätigungsstatus. Die Meldung ist für Personen sichtbar, die Zugang zu diesem Projektkanal haben.
      </p>
      <p class="mt-2 text-[1.125rem]">
        Du kannst deine Anmeldung jederzeit über den Abmeldelink in deiner Bestätigungsmail auf der <NuxtLink to="/warteliste">Wartelistenseite</NuxtLink> zurücknehmen oder dich über die im Impressum genannte Adresse an uns wenden. Danach senden wir keine Startbenachrichtigung und entfernen den Wartelisteneintrag sowie die zugehörige Discord-Meldung. Unbestätigte Anmeldungen werden spätestens 30 Tage nach Versand zur Löschung vorgemerkt. Bei einem Ausfall von Discord wird die Entfernung der Meldung erneut versucht.
      </p>
      <h2
        id="statistik"
        class="mt-6 text-[1.25rem] font-bold"
      >
        Statistik mit Google Analytics
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Nur wenn du im Banner zustimmst, nutzen wir auf den öffentlichen Seiten dieser Website Google Analytics der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. So erfahren wir, welche Seiten gelesen werden, wie Besucher zu uns finden und wie oft jemand die App öffnet oder sich zur Warteliste anmeldet. Die App unter shliste.app/app misst nichts, deine Listen und Rezepte gehen nie an Google.
      </p>
      <p class="mt-2 text-[1.125rem]">
        Verarbeitet werden dabei aufgerufene Seiten, Klicks auf „App öffnen“, die Anmeldung zur Warteliste (ohne E-Mail-Adresse), Angaben zu Gerät und Browser, die ungefähre Herkunft sowie die verweisende Seite. Google setzt dafür die Cookies „_ga“ und „_ga_XRRVDNBWGN“ mit einer Laufzeit von zwei Jahren. Werbefunktionen und Google Signals sind ausgeschaltet. Die Daten werden nach 14 Monaten gelöscht. Google kann Daten in den USA verarbeiten; Google ist nach dem EU-US Data Privacy Framework zertifiziert.
      </p>
      <p class="mt-2 text-[1.125rem]">
        Rechtsgrundlage ist deine Einwilligung nach Artikel 6 Absatz 1 Buchstabe a DSGVO und § 25 Absatz 1 TDDDG. Deine Entscheidung, ob Zustimmung oder Ablehnung, speichern wir nur in deinem Browser und fragen nach 90 Tagen erneut. Du kannst sie jederzeit über „🍪 Cookies“ im Footer oder <button
          type="button"
          class="legal-inline-button"
          @click="openSettings"
        >
          hier
        </button> ändern; bei einem Widerruf löschen wir die Cookies und die Messung endet sofort. Mehr dazu in der <a
          href="https://policies.google.com/privacy"
          rel="noopener noreferrer"
          target="_blank"
        >Datenschutzerklärung von Google</a>.
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Deine Rechte
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Du kannst Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung sowie Datenübertragbarkeit verlangen und hast ein Beschwerderecht bei einer Aufsichtsbehörde. Eine Anfrage genügt an die im Impressum genannte Adresse.
      </p>

      <h2 class="mt-6 text-[1.25rem] font-bold">
        Technische Dienstleister
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Unsere Server werden bei Hetzner betrieben. Für die Anmeldung und, nur mit deiner Einwilligung, für die Statistik nutzen wir Google, für Bestätigungs- und Einladungsmails Resend und für die beschriebenen Wartelistenmeldungen Discord. Bei Resend und Discord kann eine Verarbeitung außerhalb der EU stattfinden. Informationen der Anbieter findest du bei <a
          href="https://resend.com/legal/privacy-policy"
          rel="noopener noreferrer"
          target="_blank"
        >Resend</a> und <a
          href="https://discord.com/privacy"
          rel="noopener noreferrer"
          target="_blank"
        >Discord</a>.
      </p>
      <h2 class="mt-6 text-[1.25rem] font-bold">
        KI-Funktionen
      </h2>
      <p class="mt-2 text-[1.125rem]">
        Die KI-Funktionen sind derzeit nur für zwei freigeschaltete Testkonten verfügbar. Bei einem ausdrücklich gestarteten KI-Aufruf werden die dafür benötigten Texte, Bilder, Links oder Sprachaufnahmen an die eingesetzten Anbieter übermittelt: Anthropic für Textverarbeitung, OpenAI für Spracherkennung und Inhaltsprüfung sowie Recraft für Rezeptillustrationen. Eine Anmeldung zur Warteliste startet keinen KI-Aufruf.
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
.legal-inline-button { padding:0; border:0; background:none; font:inherit; color:var(--md-primary); text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
@media(max-width:600px) { .legal-page { padding-block:1.5rem 3rem; } }
</style>

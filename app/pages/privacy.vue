<script setup lang="ts">
useSeoMeta({ title: 'Datenschutz ~ shliste', robots: 'noindex' })
</script>

<template>
  <div
    class="mx-auto max-w-2xl px-6 py-12"
    style="color: var(--md-on-background)"
  >
    <NuxtLink
      to="/"
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
      Ohne Anmeldung bleiben deine Listen ausschliesslich auf deinem Gerät. Es werden keine
      Inhalte an einen Server übertragen.
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Mit Anmeldung über Google
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Meldest du dich an, übermittelt Google uns deine E-Mail-Adresse, deinen Anzeigenamen und
      dein Profilbild. Diese Daten und deine Listen, Einträge und Rezepte werden auf einem
      Server in Deutschland gespeichert, um sie zwischen deinen Geräten abzugleichen.
      Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags nach Artikel 6 Absatz 1 Buchstabe b DSGVO.
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Geteilte Listen
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Teilst du eine Liste, sehen die eingeladenen Personen deren Inhalt sowie deinen Anzeigenamen
      und dein Profilbild. Deine E-Mail-Adresse ist ausschliesslich für den Eigentümer der Liste
      sichtbar.
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Deine Rechte
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Du kannst Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung sowie
      Datenübertragbarkeit verlangen und hast ein Beschwerderecht bei einer Aufsichtsbehörde.
      Eine Anfrage genügt an die im Impressum genannte Adresse.
    </p>

    <p
      class="mt-8 text-[1rem]"
      style="color: var(--md-on-surface-variant)"
    >
      Hinweis: Vor Veröffentlichung juristisch prüfen lassen. Ergänzt werden müssen unter
      anderem Hosting-Dienstleister, Speicherdauer und eingesetzte Auftragsverarbeiter.
    </p>
  </div>
</template>

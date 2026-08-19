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
    >Zurueck</NuxtLink>
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
      Ohne Anmeldung bleiben deine Listen ausschliesslich auf deinem Geraet. Es werden keine
      Inhalte an einen Server uebertragen.
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Mit Anmeldung ueber Google
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Meldest du dich an, uebermittelt Google uns deine E-Mail-Adresse, deinen Anzeigenamen und
      dein Profilbild. Diese Daten und deine Listen, Eintraege und Rezepte werden auf einem
      Server in Deutschland gespeichert, um sie zwischen deinen Geraeten abzugleichen.
      Rechtsgrundlage ist die Erfuellung des Nutzungsvertrags nach Artikel 6 Absatz 1 Buchstabe b DSGVO.
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Geteilte Listen
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Teilst du eine Liste, sehen die eingeladenen Personen deren Inhalt sowie deinen Anzeigenamen
      und dein Profilbild. Deine E-Mail-Adresse ist ausschliesslich fuer den Eigentuemer der Liste
      sichtbar.
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Deine Rechte
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Du kannst Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung sowie
      Datenuebertragbarkeit verlangen und hast ein Beschwerderecht bei einer Aufsichtsbehoerde.
      Eine Anfrage genuegt an die im Impressum genannte Adresse.
    </p>

    <p
      class="mt-8 text-[1rem]"
      style="color: var(--md-on-surface-variant)"
    >
      Hinweis: Vor Veroeffentlichung juristisch pruefen lassen. Ergaenzt werden muessen unter
      anderem Hosting-Dienstleister, Speicherdauer und eingesetzte Auftragsverarbeiter.
    </p>
  </div>
</template>

<script setup lang="ts">
// Ohne explizite Locale setzt UApp lang="en" auf das html-Element und
// überschreibt damit still das globale htmlAttrs lang="de" aus nuxt.config.
// Mit der deutschen Locale stimmen außerdem die eingebauten Komponenten-
// Texte (aria-Labels, Schließen-Knöpfe) zur Sprache der App.
import { de } from '@nuxt/ui/locale'
</script>

<template>
  <UApp :locale="de">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Außerhalb des Layouts: Eine neue Fassung der App betrifft jede Seite,
         auch die öffentlichen. -->
  </UApp>
</template>

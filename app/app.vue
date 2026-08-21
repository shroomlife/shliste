<script setup lang="ts">
// Ohne explizite Locale setzt UApp lang="en" auf das html-Element und
// überschreibt damit still das globale htmlAttrs lang="de" aus nuxt.config.
// Mit der deutschen Locale stimmen ausserdem die eingebauten Komponenten-
// Texte (aria-Labels, Schliessen-Knöpfe) zur Sprache der App.
import { de } from '@nuxt/ui/locale'
</script>

<template>
  <UApp :locale="de">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Ausserhalb des Layouts: Eine neue Fassung der App betrifft jede Seite,
         auch die öffentlichen. -->
    <PwaUpdatePrompt />
  </UApp>
</template>

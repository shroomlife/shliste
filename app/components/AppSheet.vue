<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

/**
 * Ein Dialog, der sich der Eingabeart anpasst: auf dem Desktop ein zentriertes
 * Fenster, auf dem Handy ein von unten einfahrendes Blatt mit Ziehgriff — so
 * wie es die Android-App macht.
 *
 * Das ist das offiziell dokumentierte Muster von Nuxt UI ("Responsive drawer"):
 * dieselbe Bedienlogik, zwei Darstellungen. Alle Dialoge der App laufen über
 * diese Komponente, damit sich keine zwei Varianten auseinanderentwickeln.
 *
 * Der Umbruch liegt bei 1024 Pixeln und damit auf derselben Grenze wie der
 * Wechsel von der Bottom-Navigation zur Icon-Rail im Layout.
 */
const { title, description } = defineProps<{
  title: string
  description?: string
}>()

/** Offen-Zustand liegt beim Aufrufer, damit er den Dialog steuern kann */
const open = defineModel<boolean>('open', { default: false })

// SSR-sicher: useMediaQuery liefert auf dem Server false, der Dialog startet
// also als Blatt und korrigiert sich nach der Hydration. Da die App-Seiten
// ohnehin client-seitig rendern (routeRules), fällt das nicht auf.
const isDesktop = useMediaQuery('(min-width: 1024px)')
</script>

<template>
  <UModal
    v-if="isDesktop"
    v-model:open="open"
    :title="title"
    :description="description"
    close
  >
    <template #body>
      <slot />
    </template>
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UModal>

  <UDrawer
    v-else
    v-model:open="open"
    :title="title"
    :description="description"
    direction="bottom"
  >
    <template #body>
      <slot />
    </template>
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UDrawer>
</template>

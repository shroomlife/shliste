<script setup lang="ts">
import type { NuxtError } from '#app'

const { error } = defineProps<{ error: NuxtError }>()

const istNichtGefunden = computed(() => error.statusCode === 404)

// clearError ist im Template nicht auto-importiert, deshalb als Handler im Setup.
function zurueckZurStartseite() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div
    class="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center"
    style="background: var(--md-background); color: var(--md-on-background)"
  >
    <UIcon
      :name="istNichtGefunden ? 'i-lucide-map-pin-off' : 'i-lucide-triangle-alert'"
      class="size-10"
      style="color: var(--md-on-surface-variant)"
    />
    <h1 class="text-[2rem] font-black tracking-tight">
      {{ istNichtGefunden ? 'Seite nicht gefunden' : 'Da ist etwas schiefgegangen' }}
    </h1>
    <p
      class="max-w-md text-[1.125rem]"
      style="color: var(--md-on-surface-variant); text-wrap: pretty"
    >
      {{ istNichtGefunden
        ? 'Die Adresse gibt es nicht. Vielleicht hat sich ein Tippfehler eingeschlichen.'
        : 'Der Fehler wurde protokolliert. Versuch es gleich noch einmal.' }}
    </p>
    <UButton
      to="/"
      size="lg"
      class="mt-2 rounded-full font-bold"
      @click="zurueckZurStartseite"
    >
      Zur Startseite
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { Recipe } from '~/types/domain'

/**
 * Rezepte-Uebersicht. Wie bei den Listen gilt: ohne Konto nutzbar, die Daten
 * liegen lokal. Ein Konto braucht es erst fuer Abgleich und Teilen.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Rezepte ~ shliste' })

const rezepte = shallowRef<Recipe[]>([])
</script>

<template>
  <div
    class="flex min-w-0 grow flex-col"
    style="background: var(--md-surface-low)"
  >
    <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <h1 class="text-[1.875rem] leading-8 font-extrabold">
        Rezepte
      </h1>
      <UButton
        icon="i-lucide-plus"
        class="rounded-full font-bold"
      >
        Neu
      </UButton>
    </header>

    <div
      v-if="rezepte.length"
      class="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <article
        v-for="rezept in rezepte"
        :key="rezept.id"
        class="list-tint rounded-xl p-4"
        :style="{ '--list-color': rezept.color }"
      >
        <h2 class="text-[1.25rem] font-bold">
          {{ rezept.name }}
        </h2>
      </article>
    </div>

    <div
      v-else
      class="flex grow flex-col items-center justify-center gap-3 px-8 py-16 text-center"
    >
      <UIcon
        name="i-lucide-chef-hat"
        class="size-10"
        style="color: var(--md-on-surface-variant)"
      />
      <p class="text-[1.25rem] font-bold">
        Noch keine Rezepte
      </p>
      <p
        class="text-[1rem]"
        style="color: var(--md-on-surface-variant); text-wrap: pretty"
      >
        Lege ein Rezept an und hol seine Zutaten spaeter mit einem Tippen auf die Einkaufsliste.
      </p>
    </div>
  </div>
</template>

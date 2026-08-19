<script setup lang="ts">
/**
 * Listen-Uebersicht, Design-Richtung A.
 *
 * Auf Desktop ist das die mittlere Spalte (Index) neben dem Detailbereich,
 * auf Mobil die erste Ebene des bekannten Stacks.
 *
 * Stand: Die Sync-Schicht (Phasen 3 bis 5) ist noch nicht gebaut. Diese Seite
 * zeigt deshalb bewusst den ehrlichen Leerzustand statt erfundener Beispieldaten.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Listen ~ shliste' })

const listen = shallowRef<import('~/types/domain').List[]>([])
</script>

<template>
  <div
    class="flex min-w-0 grow lg:divide-x"
    style="border-color: var(--md-outline-variant)"
  >
    <!-- Index -->
    <section
      class="flex w-full shrink-0 flex-col lg:w-86"
      style="background: var(--md-surface-low)"
    >
      <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <h1 class="text-[1.875rem] leading-8 font-extrabold">
          Listen
        </h1>
        <!-- Statt schwebendem FAB: echter Knopf im Kopf. Auf Mobil unten rechts. -->
        <UButton
          icon="i-lucide-plus"
          class="hidden rounded-full font-bold lg:flex"
        >
          Neu
        </UButton>
      </header>

      <div
        v-if="listen.length"
        class="flex flex-col gap-2 px-4 pb-4"
      >
        <ListCard
          v-for="liste in listen"
          :key="liste.id"
          :liste="liste"
        />
      </div>

      <div
        v-else
        class="flex grow flex-col items-center justify-center gap-3 px-8 py-16 text-center"
      >
        <UIcon
          name="i-lucide-list-checks"
          class="size-10"
          style="color: var(--md-on-surface-variant)"
        />
        <p class="text-[1.25rem] font-bold">
          Noch keine Listen
        </p>
        <p
          class="text-[1rem]"
          style="color: var(--md-on-surface-variant); text-wrap: pretty"
        >
          Leg einfach los. Ein Konto brauchst du erst, wenn du zwischen Geraeten
          abgleichen oder eine Liste teilen moechtest.
        </p>
      </div>

      <!-- Mobil: FAB wie in Android -->
      <UButton
        icon="i-lucide-plus"
        size="xl"
        class="fixed right-5 bottom-24 z-10 size-14 justify-center rounded-2xl shadow-md lg:hidden"
        aria-label="Neue Liste"
      />
    </section>

    <!-- Detail: auf Desktop dauerhaft sichtbar, auf Mobil eine eigene Route -->
    <section
      class="hidden min-w-0 grow lg:flex lg:flex-col"
      style="background: var(--md-surface)"
    >
      <div class="flex grow flex-col items-center justify-center gap-2 px-8 text-center">
        <UIcon
          name="i-lucide-arrow-left"
          class="size-6"
          style="color: var(--md-on-surface-variant)"
        />
        <p
          class="text-[1.25rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Waehle links eine Liste aus.
        </p>
      </div>
    </section>
  </div>
</template>

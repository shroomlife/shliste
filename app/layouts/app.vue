<script setup lang="ts">
/**
 * App-Shell, Design-Richtung A ("Material treu").
 *
 * Die Umformung von Android auf Desktop, nicht das blosse Skalieren:
 * - Bottom-Nav (Touch) wird auf grossen Schirmen zur schmalen Icon-Rail
 * - der schwebende Knopf wandert in den Kopf des Index, weil ein Kreis unten
 *   rechts auf 1600 Pixel das klassische Handy-Klon-Signal ist
 * - auf Mobil bleibt beides so, wie es Android macht
 */
const route = useRoute()

interface Destination {
  label: string
  to: string
  icon: string
}

const destinations: Destination[] = [
  { label: 'Listen', to: '/app/lists', icon: 'i-lucide-list-checks' },
  { label: 'Rezepte', to: '/app/recipes', icon: 'i-lucide-chef-hat' },
]

function isActive(destination: Destination): boolean {
  return route.path.startsWith(destination.to)
}
</script>

<template>
  <div
    class="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0 lg:flex-row lg:overflow-hidden"
    style="background: var(--md-background)"
  >
    <!-- Desktop: Icon-Rail. Auf Mobil ausgeblendet. -->
    <nav
      class="hidden w-21 shrink-0 flex-col items-center gap-2 border-r py-4 lg:flex"
      style="background: var(--md-surface-container); border-color: var(--md-outline-variant)"
      aria-label="Hauptnavigation"
    >
      <NuxtLink
        to="/"
        class="mb-4 flex size-10 items-center justify-center rounded-xl"
        style="background: var(--md-primary)"
        aria-label="Zur Startseite"
      >
        <UIcon
          name="i-lucide-menu"
          class="size-5 text-white"
        />
      </NuxtLink>

      <NuxtLink
        v-for="destination in destinations"
        :key="destination.to"
        :to="destination.to"
        class="flex w-full flex-col items-center gap-1 py-1"
        :aria-current="isActive(destination) ? 'page' : undefined"
      >
        <span
          class="flex h-8 w-14 items-center justify-center rounded-full transition-colors"
          :style="isActive(destination)
            ? 'background: var(--md-primary-container); color: var(--md-on-primary-container)'
            : 'color: var(--md-on-surface-variant)'"
        >
          <UIcon
            :name="destination.icon"
            class="size-5"
          />
        </span>
        <span
          class="text-[0.875rem]"
          :style="isActive(destination)
            ? 'color: var(--md-on-primary-container); font-weight: 700'
            : 'color: var(--md-on-surface-variant)'"
        >{{ destination.label }}</span>
      </NuxtLink>

      <div class="grow" />
      <!-- Konto und Abgleich stehen zusammen am unteren Ende der Rail: beides
           betrifft nicht den Inhalt, sondern den Zustand der App. -->
      <div class="flex flex-col items-center gap-2">
        <SyncStatus />
        <AuthButton compact />
      </div>
    </nav>

    <!-- Mobil: schmale Kopfzeile fuer Konto und Abgleich. Auf dem Desktop
         uebernimmt das die Rail, deshalb dort ausgeblendet. -->
    <div
      class="flex h-12 shrink-0 items-center justify-end gap-2 px-3 lg:hidden"
      style="background: var(--md-surface-container)"
    >
      <SyncStatus />
      <AuthButton />
    </div>

    <main class="flex min-w-0 grow flex-col lg:min-h-0">
      <slot />
    </main>

    <!-- Mobil: Bottom-Nav wie in Android. Auf Desktop ausgeblendet. -->
    <nav
      class="flex h-18 shrink-0 items-center border-t lg:hidden"
      style="background: var(--md-surface-container); border-color: var(--md-outline-variant)"
      aria-label="Hauptnavigation"
    >
      <NuxtLink
        v-for="destination in destinations"
        :key="destination.to"
        :to="destination.to"
        class="flex grow flex-col items-center gap-0.5 py-2"
        :aria-current="isActive(destination) ? 'page' : undefined"
      >
        <span
          class="flex h-8 w-16 items-center justify-center rounded-full transition-colors"
          :style="isActive(destination)
            ? 'background: var(--md-primary-container); color: var(--md-on-primary-container)'
            : 'color: var(--md-on-surface-variant)'"
        >
          <UIcon
            :name="destination.icon"
            class="size-5"
          />
        </span>
        <span
          class="text-[0.875rem]"
          :style="isActive(destination)
            ? 'color: var(--md-on-primary-container); font-weight: 700'
            : 'color: var(--md-on-surface-variant)'"
        >{{ destination.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

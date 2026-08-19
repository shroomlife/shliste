<script setup lang="ts">
/**
 * App-Shell, Design-Richtung A ("Material treu").
 *
 * Die Umformung von Android auf Desktop, nicht das blosse Skalieren:
 * - Bottom-Nav (Touch) wird auf grossen Schirmen zur schmalen Icon-Rail
 * - der schwebende Knopf wandert in den Kopf des Index, weil ein Kreis unten
 *   rechts auf 1600 Pixel das klassische Handy-Klon-Signal ist
 * - auf Mobil bleibt beides so, wie es Android macht
 *
 * Hier und nur hier läuft der Abgleich an: Das Layout umschliesst den ganzen
 * App-Bereich und lebt genau so lange wie er. Ein zweiter Aufruf an anderer
 * Stelle öffnete eine zweite Echtzeit-Verbindung.
 */
const route = useRoute()

const { isSignedIn } = useAuth()
const { display } = useSync()

useSyncRunner()

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
      <!-- Die Bildmarke der Android-App (drawable ci_logo), nicht nachgebaut.
           Vorher stand hier ein Menü-Symbol, das kein Menü öffnete — genau die
           Art Versprechen, das eine Oberfläche nicht halten kann. -->
      <NuxtLink
        to="/"
        class="mb-4 flex size-10 items-center justify-center"
        aria-label="shliste, zur Startseite"
      >
        <img
          src="/images/brand/mark.svg"
          alt=""
          width="28"
          height="22"
          class="w-7"
        >
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
        <!-- Ohne Konto gibt es nichts abzugleichen. Eine Anzeige wäre dann
             kein Hinweis, sondern eine Frage ohne Anlass. -->
        <SyncStatus
          v-if="isSignedIn"
          :state="display"
        />
        <AuthButton compact />
      </div>
    </nav>

    <!-- Mobil: schmale Kopfzeile für Konto und Abgleich. Auf dem Desktop
         übernimmt das die Rail, deshalb dort ausgeblendet. -->
    <div
      class="flex h-12 shrink-0 items-center gap-2 px-3 lg:hidden"
      style="background: var(--md-surface-container)"
    >
      <NuxtLink
        to="/"
        aria-label="shliste, zur Startseite"
      >
        <img
          src="/images/brand/wordmark.svg"
          alt="shliste"
          width="91"
          height="24"
          class="h-6 w-auto"
        >
      </NuxtLink>
      <div class="grow" />
      <SyncStatus
        v-if="isSignedIn"
        :state="display"
      />
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

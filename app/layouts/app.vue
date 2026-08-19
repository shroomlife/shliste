<script setup lang="ts">
/**
 * App-Shell, Design-Richtung A ("Material treu").
 *
 * Die Umformung von Android auf Desktop, nicht das Skalieren:
 * - Bottom-Nav (Touch) wird auf grossen Schirmen zur schmalen Icon-Rail
 * - der schwebende FAB wandert in den Kopf des Index, weil ein Kreis unten
 *   rechts auf 1600px das klassische Handy-Klon-Signal ist
 * - auf Mobil bleibt beides so, wie es Android macht
 */
const route = useRoute()

interface Ziel {
  label: string
  to: string
  icon: string
}

const ziele: Ziel[] = [
  { label: 'Listen', to: '/app', icon: 'i-lucide-list-checks' },
  { label: 'Rezepte', to: '/app/rezepte', icon: 'i-lucide-chef-hat' },
]

function istAktiv(ziel: Ziel): boolean {
  return ziel.to === '/app'
    ? route.path === '/app' || route.path.startsWith('/app/liste')
    : route.path.startsWith(ziel.to)
}
</script>

<template>
  <div
    class="flex min-h-dvh flex-col lg:flex-row"
    style="background: var(--md-background)"
  >
    <!-- Desktop: Icon-Rail. Auf Mobil ausgeblendet. -->
    <nav
      class="hidden lg:flex w-21 shrink-0 flex-col items-center gap-2 border-r py-4"
      style="background: var(--md-surface-container); border-color: var(--md-outline-variant)"
      aria-label="Hauptnavigation"
    >
      <NuxtLink
        to="/"
        class="mb-4 flex size-10 items-center justify-center rounded-xl"
        style="background: var(--md-primary)"
      >
        <UIcon
          name="i-lucide-menu"
          class="size-5 text-white"
        />
      </NuxtLink>

      <NuxtLink
        v-for="ziel in ziele"
        :key="ziel.to"
        :to="ziel.to"
        class="flex w-full flex-col items-center gap-1 py-1"
        :aria-current="istAktiv(ziel) ? 'page' : undefined"
      >
        <span
          class="flex h-8 w-14 items-center justify-center rounded-full transition-colors"
          :style="istAktiv(ziel)
            ? 'background: var(--md-primary-container); color: var(--md-on-primary-container)'
            : 'color: var(--md-on-surface-variant)'"
        >
          <UIcon
            :name="ziel.icon"
            class="size-5"
          />
        </span>
        <span
          class="text-[0.875rem]"
          :style="istAktiv(ziel)
            ? 'color: var(--md-on-primary-container); font-weight: 700'
            : 'color: var(--md-on-surface-variant)'"
        >{{ ziel.label }}</span>
      </NuxtLink>

      <div class="grow" />
      <SyncStatus />
    </nav>

    <main class="flex min-w-0 grow flex-col">
      <slot />
    </main>

    <!-- Mobil: Bottom-Nav wie in Android. Auf Desktop ausgeblendet. -->
    <nav
      class="flex h-18 shrink-0 items-center border-t lg:hidden"
      style="background: var(--md-surface-container); border-color: var(--md-outline-variant)"
      aria-label="Hauptnavigation"
    >
      <NuxtLink
        v-for="ziel in ziele"
        :key="ziel.to"
        :to="ziel.to"
        class="flex grow flex-col items-center gap-0.5 py-2"
        :aria-current="istAktiv(ziel) ? 'page' : undefined"
      >
        <span
          class="flex h-8 w-16 items-center justify-center rounded-full transition-colors"
          :style="istAktiv(ziel)
            ? 'background: var(--md-primary-container); color: var(--md-on-primary-container)'
            : 'color: var(--md-on-surface-variant)'"
        >
          <UIcon
            :name="ziel.icon"
            class="size-5"
          />
        </span>
        <span
          class="text-[0.875rem]"
          :style="istAktiv(ziel)
            ? 'color: var(--md-on-primary-container); font-weight: 700'
            : 'color: var(--md-on-surface-variant)'"
        >{{ ziel.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

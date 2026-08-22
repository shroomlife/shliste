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

const { profile, isSignedIn } = useAuth()
const { display, snapshot, resolveConflict } = useSync()

useSyncRunner()

/**
 * Die Frage "welcher Stand gilt?" öffnet sich von selbst, sobald sie entsteht,
 * lässt sich aber schliessen. Sie bleibt danach im Zustand stehen und ist über
 * die Abgleich-Anzeige wieder erreichbar.
 */
const isConflictOpen = ref(false)
const hasConflict = computed(() => snapshot.value.conflict !== null)

watch(hasConflict, (pending) => {
  if (pending) isConflictOpen.value = true
})

/**
 * Offene Einladungen als Badge am Listen-Tab: Sie warten auf eine Antwort,
 * und der Weg zur Antwort führt über die Listen-Übersicht.
 */
const inviteCount = computed(() => snapshot.value.pendingInvites.length)

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

/**
 * Der Badge selbst ist für Sprachausgaben unsichtbar (nur eine Zahl im
 * Kreis) — die Aussage trägt stattdessen der Link als Ganzes.
 */
function navAriaLabel(destination: Destination): string | undefined {
  if (destination.to !== '/app/lists' || inviteCount.value === 0) return undefined
  return inviteCount.value === 1
    ? 'Listen, 1 offene Einladung'
    : `Listen, ${inviteCount.value} offene Einladungen`
}
</script>

<template>
  <div
    class="flex h-dvh flex-col overflow-hidden lg:flex-row"
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
        :to="isSignedIn ? '/app/lists' : '/'"
        class="mb-4 flex size-10 items-center justify-center"
        :aria-label="isSignedIn ? 'shliste, zu deinen Listen' : 'shliste, zur Startseite'"
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
        <ThemeToggle />
        <!-- Ohne Konto gibt es nichts abzugleichen. Eine Anzeige wäre dann
             kein Hinweis, sondern eine Frage ohne Anlass. -->
        <SyncStatus
          v-if="isSignedIn"
          :state="display"
          :actionable="hasConflict"
          @activate="isConflictOpen = true"
        />
        <!-- Der Profil-Zugang ist IMMER da, auch abgemeldet (AppHeader.kt):
             Die Profilseite beantwortet dann, warum man sich anmelden würde. -->
        <NuxtLink
          to="/app/profile"
          class="state-layer flex size-10 items-center justify-center rounded-full"
          aria-label="Mein Profil"
        >
          <img
            v-if="profile?.photoUrl"
            :src="profile.photoUrl"
            alt=""
            referrerpolicy="no-referrer"
            class="size-6 rounded-full object-cover"
          >
          <UIcon
            v-else
            name="i-lucide-circle-user-round"
            class="size-6"
            style="color: var(--md-primary)"
          />
        </NuxtLink>
        <AuthButton
          v-if="!isSignedIn"
          compact
        />
      </div>
    </nav>

    <!-- Mobil: schmale Kopfzeile für Konto und Abgleich. Auf dem Desktop
         übernimmt das die Rail, deshalb dort ausgeblendet. Die 1px-Linie in
         der Markenfarbe ist Androids Trennstrich unter der TopAppBar
         (AppHeader.kt, HorizontalDivider). -->
    <div
      class="flex h-16 shrink-0 items-center gap-2 border-b px-3 lg:hidden"
      style="background: var(--md-surface-container); border-color: var(--md-primary)"
    >
      <NuxtLink
        :to="isSignedIn ? '/app/lists' : '/'"
        :aria-label="isSignedIn ? 'shliste, zu deinen Listen' : 'shliste, zur Startseite'"
      >
        <img
          src="/images/brand/wordmark.svg"
          alt="shliste"
          width="91"
          height="24"
          class="h-7 w-auto"
        >
      </NuxtLink>
      <div class="grow" />
      <ThemeToggle />
      <SyncStatus
        v-if="isSignedIn"
        :state="display"
        :actionable="hasConflict"
        @activate="isConflictOpen = true"
      />
      <!-- Wie in der Rail: der Profil-Zugang ist immer sichtbar. -->
      <NuxtLink
        to="/app/profile"
        class="state-layer flex size-10 items-center justify-center rounded-full"
        aria-label="Mein Profil"
      >
        <img
          v-if="profile?.photoUrl"
          :src="profile.photoUrl"
          alt=""
          referrerpolicy="no-referrer"
          class="size-6 rounded-full object-cover"
        >
        <UIcon
          v-else
          name="i-lucide-circle-user-round"
          class="size-6"
          style="color: var(--md-primary)"
        />
      </NuxtLink>
      <AuthButton v-if="!isSignedIn" />
    </div>

    <!-- Banner und Inhalt teilen sich eine Spalte, damit ein einziger
         Mount-Punkt für beide Umbrüche gilt: auf Mobil direkt unter der
         Kopfzeile, auf dem Desktop am Kopf der Inhaltsspalte neben der Rail. -->
    <div class="flex min-h-0 min-w-0 grow flex-col">
      <OfflineBanner />
      <main class="flex min-h-0 min-w-0 grow flex-col overflow-y-auto">
        <slot />
      </main>
    </div>

    <!-- Steht über allem: Solange nicht entschieden ist, welcher Stand gilt,
         gleicht die App nicht ab. Benutzbar bleibt sie trotzdem. -->
    <SyncConflictDialog
      v-model:open="isConflictOpen"
      :conflict="snapshot.conflict"
      @resolve="resolveConflict"
    />

    <!-- Sichtbarer Re-Login: öffnet sich, wenn der Abgleich `authRequired`
         meldet (der stille Refresh der BFF ist dann endgültig gescheitert).
         Den Zustand steuert der Sync-Runner über useSessionExpiredSheet(). -->
    <SessionExpiredSheet />

    <!-- Mobil: Bottom-Nav wie in Android. Auf Desktop ausgeblendet. -->
    <nav
      class="flex min-h-18 shrink-0 items-center border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      style="background: var(--md-surface-container); border-color: var(--md-outline-variant)"
      aria-label="Hauptnavigation"
    >
      <NuxtLink
        v-for="destination in destinations"
        :key="destination.to"
        :to="destination.to"
        class="flex grow flex-col items-center gap-0.5 py-2"
        :aria-current="isActive(destination) ? 'page' : undefined"
        :aria-label="navAriaLabel(destination)"
      >
        <span
          class="relative flex h-12 w-16 items-center justify-center rounded-full transition-colors"
          :style="isActive(destination)
            ? 'background: var(--md-primary-container); color: var(--md-on-primary-container)'
            : 'color: var(--md-on-surface-variant)'"
        >
          <UIcon
            :name="destination.icon"
            class="size-9"
          />
          <!-- Deckender Kreis wie der "N neu"-Chip: eine Nachricht, keine
               Dauereigenschaft. Für Sprachausgaben trägt der Link die Aussage. -->
          <span
            v-if="destination.to === '/app/lists' && inviteCount > 0"
            class="absolute top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.75rem] leading-none font-bold text-white"
            style="background-color: var(--md-primary)"
            aria-hidden="true"
          >{{ inviteCount }}</span>
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

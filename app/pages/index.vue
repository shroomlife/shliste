<script setup lang="ts">
// Oeffentliche Startseite. Wird per routeRules vorgerendert (SEO, First Paint),
// waehrend der App-Bereich unter /app rein client-seitig laeuft.
useSeoMeta({
  title: 'shliste ~ Deine smarte Einkaufsliste',
  description: 'Einkaufslisten teilen und gemeinsam abhaken, in Echtzeit. Rezepte verwalten und Zutaten mit einem Tippen auf die Liste holen. Funktioniert auch ohne Netz.',
})

const features = [
  {
    icon: 'i-lucide-users',
    title: 'Gemeinsam statt getrennt',
    text: 'Lade jemanden zu einer Liste ein. Aenderungen erscheinen sofort auf allen Geraeten, ohne Neuladen.',
  },
  {
    icon: 'i-lucide-cloud-off',
    title: 'Auch ohne Netz',
    text: 'Im Laden zaehlt nicht der Empfang. Abhaken geht offline, der Abgleich passiert automatisch, sobald wieder Netz da ist.',
  },
  {
    icon: 'i-lucide-chef-hat',
    title: 'Vom Rezept zur Liste',
    text: 'Zutaten eines Rezepts mit einem Tippen auf die Einkaufsliste holen, statt sie abzutippen.',
  },
]
</script>

<template>
  <div
    class="min-h-dvh"
    style="background: var(--md-background); color: var(--md-on-background)"
  >
    <header class="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
      <div
        class="flex size-8 items-center justify-center rounded-lg"
        style="background: var(--md-primary)"
      >
        <UIcon
          name="i-lucide-list-checks"
          class="size-5 text-white"
        />
      </div>
      <span class="text-[1.625rem] font-black tracking-tight">shliste</span>
      <div class="grow" />
      <UButton
        to="/app"
        size="lg"
        class="rounded-full font-bold"
      >
        Zur App
      </UButton>
    </header>

    <main class="mx-auto max-w-5xl px-6">
      <section class="py-12 sm:py-20">
        <h1
          class="max-w-3xl text-[2.25rem] leading-[1.05] font-black tracking-tight sm:text-6xl"
          style="text-wrap: balance"
        >
          Einkaufen zu zweit, ohne sich abzusprechen.
        </h1>
        <p
          class="mt-6 max-w-2xl text-[1.25rem]"
          style="color: var(--md-on-surface-variant); text-wrap: pretty"
        >
          Teile eine Liste, und was der eine abhakt, verschwindet beim anderen im selben Moment.
          Auch dann, wenn im Laden das Netz wegbricht.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <UButton
            to="/app"
            size="xl"
            class="rounded-full font-bold"
          >
            Liste anlegen
          </UButton>
          <UButton
            to="https://play.google.com/store/apps/details?id=com.shroomlife.shliste"
            target="_blank"
            rel="noopener"
            size="xl"
            variant="outline"
            class="rounded-full font-bold"
          >
            Android-App
          </UButton>
        </div>
      </section>

      <section class="grid gap-4 pb-16 sm:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="rounded-xl p-6"
          style="background: var(--md-surface-container)"
        >
          <UIcon
            :name="feature.icon"
            class="size-6"
            style="color: var(--md-primary)"
          />
          <h2 class="mt-3 text-[1.25rem] font-bold">
            {{ feature.title }}
          </h2>
          <p
            class="mt-2 text-[1rem]"
            style="color: var(--md-on-surface-variant); text-wrap: pretty"
          >
            {{ feature.text }}
          </p>
        </article>
      </section>
    </main>

    <footer
      class="mx-auto max-w-5xl px-6 py-10 text-[1rem]"
      style="color: var(--md-on-surface-variant)"
    >
      <nav class="flex gap-6">
        <NuxtLink
          to="/imprint"
          class="hover:underline"
        >Impressum</NuxtLink>
        <NuxtLink
          to="/privacy"
          class="hover:underline"
        >Datenschutz</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

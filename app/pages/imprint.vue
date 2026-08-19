<script setup lang="ts">
useSeoMeta({ title: 'Impressum ~ shliste', robots: 'noindex' })
</script>

<template>
  <div
    class="mx-auto max-w-2xl px-6 py-12"
    style="color: var(--md-on-background)"
  >
    <NuxtLink
      to="/"
      class="text-[1rem] hover:underline"
      style="color: var(--md-primary)"
    >Zurück</NuxtLink>
    <h1 class="mt-4 text-[2rem] font-black tracking-tight">
      Impressum
    </h1>

    <h2 class="mt-8 text-[1.25rem] font-bold">
      Angaben gemäss Paragraf 5 DDG
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Robin Lehmann<br>
      shroomlife<br>
      Deutschland
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Kontakt
    </h2>
    <p class="mt-2 text-[1.125rem]">
      E-Mail: <a
        href="mailto:robin@shroomlife.de"
        style="color: var(--md-primary)"
      >robin@shroomlife.de</a>
    </p>

    <h2 class="mt-6 text-[1.25rem] font-bold">
      Verantwortlich nach Paragraf 18 Absatz 2 MStV
    </h2>
    <p class="mt-2 text-[1.125rem]">
      Robin Lehmann, Anschrift wie oben.
    </p>

    <p
      class="mt-8 text-[1rem]"
      style="color: var(--md-on-surface-variant)"
    >
      Hinweis: Die vollständige Anschrift ist vor Veröffentlichung zu ergänzen.
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Leerer Detailbereich neben dem Rezeptindex.
 *
 * Nur auf dem Desktop sichtbar, genau wie bei den Listen: Dort steht die
 * Detailspalte immer, auf Mobil ist der Index selbst der Inhalt dieser Ebene.
 *
 * Kein definePageMeta: Das Layout kommt von der Elternroute.
 */
</script>

<template>
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
        Wähle links ein Rezept aus.
      </p>
    </div>
  </section>
</template>

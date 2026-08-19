<script setup lang="ts">
/**
 * Leerer Detailbereich neben dem Index.
 *
 * Nur auf dem Desktop sichtbar: dort steht die Detailspalte immer, auch wenn
 * noch nichts gewaehlt ist. Auf Mobil ist der Index selbst der Inhalt dieser
 * Ebene, ein zweiter Hinweis waere dort nur im Weg.
 *
 * Kein definePageMeta: das Layout kommt von der Elternroute. Ein eigener
 * Eintrag wuerde den geerbten Wert ueberschreiben, weil vue-router die
 * Metadaten aller gefundenen Routen zusammenfuehrt und das Kind gewinnt.
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
        Waehle links eine Liste aus.
      </p>
    </div>
  </section>
</template>

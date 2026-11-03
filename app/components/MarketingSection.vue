<script setup lang="ts">
/**
 * Eine Scroll-Sektion der Marketing-Story: Label, Titel, optional Band-Ton.
 * Gleiche Optik auf Startseite und Unterseiten.
 */
withDefaults(defineProps<{
  label: string
  title: string
  id?: string
  tone?: 'plain' | 'soft' | 'accent'
}>(), {
  tone: 'plain',
})
</script>

<template>
  <section
    :id="id"
    class="mkt-section"
    :class="`mkt-section--${tone}`"
    :aria-labelledby="id ? `${id}-title` : undefined"
  >
    <div class="mkt-section-inner">
      <p class="mkt-label">
        {{ label }}
      </p>
      <h2 :id="id ? `${id}-title` : undefined">
        {{ title }}
      </h2>
      <slot />
    </div>
  </section>
</template>

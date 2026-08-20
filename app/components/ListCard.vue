<script setup lang="ts">
import type { List } from '#shared/types/domain'

/**
 * Listenkarte, Design-Richtung A.
 *
 * Die Listenfarbe wird als 20-Prozent-Lasur gelegt, nicht voll gesättigt —
 * genau wie ColorUtils.colorWith20Opacity in Android. Weil die Farben echtes
 * Zufalls-RGB sind (Summe der Kanäle zwischen 100 und 700), wäre jede
 * kräftigere Darstellung unruhig.
 */
const { list, openCount = 0, doneCount = 0, active = false, isShared = false } = defineProps<{
  list: List
  openCount?: number
  doneCount?: number
  active?: boolean
  /** Liest jemand anderes mit? Wird wie das Schloss als Symbol am Namen gezeigt. */
  isShared?: boolean
}>()

const summary = computed(() => {
  if (openCount === 0 && doneCount > 0) return 'Alles erledigt'
  if (openCount === 0) return 'Leer'
  return doneCount > 0 ? `${openCount} offen · ${doneCount} erledigt` : `${openCount} offen`
})
</script>

<template>
  <NuxtLink
    :to="`/app/lists/${list.id}`"
    class="state-layer list-tint flex flex-col gap-1.5 rounded-xl p-3.5 transition-shadow"
    :style="{
      '--list-color': list.color,
      ...(active ? { boxShadow: `inset 0 0 0 2px ${list.color}` } : {}),
    }"
  >
    <div class="flex items-center gap-2">
      <!-- Geteilt und geheim sind dieselbe Art von Aussage: "mit dieser Liste
           stimmt etwas Besonderes". Deshalb stehen sie am selben Platz, in
           derselben Grösse und derselben Tönung.

           `role="img"` samt Beschriftung ist nicht schmückend: Ohne beides
           liest eine Sprachausgabe hier gar nichts vor, und die Aussage
           "geteilt" bzw. "geheim" steht nirgendwo sonst auf der Karte. -->
      <UIcon
        v-if="isShared"
        name="i-lucide-users"
        class="size-4 shrink-0"
        style="color: var(--md-on-surface-variant)"
        role="img"
        aria-label="Geteilte Liste"
      />
      <UIcon
        v-if="list.secret"
        name="i-lucide-lock"
        class="size-4 shrink-0"
        style="color: var(--md-on-surface-variant)"
        role="img"
        aria-label="Geheime Liste"
      />
      <span class="min-w-0 grow truncate text-[1.25rem] font-bold">{{ list.name }}</span>
      <slot name="badge" />
    </div>
    <span
      class="text-[0.9375rem]"
      style="color: var(--md-on-surface-variant)"
    >{{ summary }}</span>
  </NuxtLink>
</template>

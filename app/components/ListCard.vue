<script setup lang="ts">
import type { List } from '~/types/domain'

/**
 * Listenkarte, Design-Richtung A.
 *
 * Die Listenfarbe wird als 20-Prozent-Lasur gelegt, nicht voll gesaettigt —
 * genau wie ColorUtils.colorWith20Opacity in Android. Weil die Farben echtes
 * Zufalls-RGB sind (r+g+b zwischen 100 und 700), waere jede kraeftigere
 * Darstellung unruhig.
 */
const { liste, offen = 0, erledigt = 0, aktiv = false } = defineProps<{
  liste: List
  offen?: number
  erledigt?: number
  aktiv?: boolean
}>()

const status = computed(() => {
  if (offen === 0 && erledigt > 0) return 'Alles erledigt'
  if (offen === 0) return 'Leer'
  return erledigt > 0 ? `${offen} offen · ${erledigt} erledigt` : `${offen} offen`
})
</script>

<template>
  <NuxtLink
    :to="`/app/liste/${liste.id}`"
    class="list-tint flex flex-col gap-1.5 rounded-xl p-3.5 transition-shadow"
    :style="{
      '--list-color': liste.color,
      ...(aktiv ? { boxShadow: `inset 0 0 0 2px ${liste.color}` } : {}),
    }"
  >
    <div class="flex items-center gap-2">
      <UIcon
        v-if="liste.secret"
        name="i-lucide-lock"
        class="size-4 shrink-0"
        style="color: var(--md-on-surface-variant)"
      />
      <span class="min-w-0 grow truncate text-[1.25rem] font-bold">{{ liste.name }}</span>
      <slot name="badge" />
    </div>
    <span
      class="text-[0.9375rem]"
      style="color: var(--md-on-surface-variant)"
    >{{ status }}</span>
  </NuxtLink>
</template>

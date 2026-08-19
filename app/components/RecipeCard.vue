<script setup lang="ts">
import type { Recipe } from '#shared/types/domain'

/**
 * Rezeptkarte, Gegenstück zu `ListCard`.
 *
 * Dieselbe Anatomie und dieselbe 20-Prozent-Lasur der eigenen Farbe: Für die
 * Bedienung sind Listen und Rezepte dasselbe Muster, und was gleich
 * funktioniert, soll auch gleich aussehen.
 */
const { recipe, ingredientCount = 0, stepCount = 0, active = false } = defineProps<{
  recipe: Recipe
  ingredientCount?: number
  stepCount?: number
  active?: boolean
}>()

const summary = computed(() => {
  if (ingredientCount === 0 && stepCount === 0) return 'Noch leer'

  const parts: string[] = []
  if (ingredientCount > 0) parts.push(ingredientCount === 1 ? '1 Zutat' : `${ingredientCount} Zutaten`)
  if (stepCount > 0) parts.push(stepCount === 1 ? '1 Schritt' : `${stepCount} Schritte`)
  return parts.join(' · ')
})
</script>

<template>
  <NuxtLink
    :to="`/app/recipes/${recipe.id}`"
    class="list-tint flex flex-col gap-1.5 rounded-xl p-3.5 transition-shadow"
    :style="{
      '--list-color': recipe.color,
      ...(active ? { boxShadow: `inset 0 0 0 2px ${recipe.color}` } : {}),
    }"
  >
    <span class="min-w-0 truncate text-[1.25rem] font-bold">{{ recipe.name }}</span>
    <span
      class="text-[0.9375rem]"
      style="color: var(--md-on-surface-variant)"
    >{{ summary }}</span>
  </NuxtLink>
</template>

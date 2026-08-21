<script setup lang="ts">
import type { Recipe } from '#shared/types/domain'

/**
 * Rezeptkarte, Gegenstück zu `ListCard`.
 *
 * Dieselbe Anatomie und dieselbe 20-Prozent-Lasur der eigenen Farbe: Für die
 * Bedienung sind Listen und Rezepte dasselbe Muster, und was gleich
 * funktioniert, soll auch gleich aussehen.
 *
 * Liegt ein Serverbild vor, wird es wie in der Android-App (RecipeCard.kt)
 * als Hintergrund über die volle Karte gelegt: object-cover, 25 % Deckkraft,
 * darüber der Farbverlauf des Kartenkopfs (DefaultCard.kt), zuoberst der Text.
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

/** Nur `sync:`-Referenzen sind auflösbar; lokale Android-Pfade ergeben null. */
const imageUrl = computed(() => resolveRecipeImageUrl(recipe.imagePath))

/** Ladefehler blenden das Bild aus — ein Broken-Image-Icon hilft niemandem. */
const isImageBroken = ref(false)
watch(imageUrl, () => {
  isImageBroken.value = false
})
</script>

<template>
  <NuxtLink
    :to="`/app/recipes/${recipe.id}`"
    class="state-layer list-tint relative flex flex-col gap-1.5 overflow-hidden rounded-xl p-3.5 transition-shadow"
    :style="{
      '--list-color': recipe.color,
      ...(active ? { boxShadow: `inset 0 0 0 2px ${recipe.color}` } : {}),
    }"
  >
    <img
      v-if="imageUrl !== null && !isImageBroken"
      :src="imageUrl"
      alt=""
      loading="lazy"
      class="absolute inset-0 size-full object-cover opacity-25"
      @error="isImageBroken = true"
    >
    <!--
      Vertikaler Verlauf des Kartenkopfs wie in DefaultCard.kt: die Rezeptfarbe
      mit 20 % Deckkraft, nach unten auslaufend. Liegt über dem Bild und bleibt
      auch ohne Bild — dieselbe Mischformel wie die list-tint-Utility, nur als
      Verlauf statt als Fläche.
    -->
    <span
      class="pointer-events-none absolute inset-0"
      style="background: linear-gradient(to bottom, color-mix(in srgb, var(--list-color, var(--md-primary)) 20%, transparent), transparent)"
      aria-hidden="true"
    />
    <span class="relative min-w-0 truncate text-[1.25rem] font-bold">{{ recipe.name }}</span>
    <span
      class="relative text-[0.9375rem]"
      style="color: var(--md-on-surface-variant)"
    >{{ summary }}</span>
  </NuxtLink>
</template>

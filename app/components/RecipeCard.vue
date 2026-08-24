<script setup lang="ts">
import type { Recipe } from '#shared/types/domain'

/**
 * Rezeptkarte, Gegenstück zu `ListCard`.
 *
 * Dieselbe Anatomie und dieselbe 20-Prozent-Lasur der eigenen Farbe: Für die
 * Bedienung sind Listen und Rezepte dasselbe Muster, und was gleich
 * funktioniert, soll auch gleich aussehen.
 *
 * DIESE KARTE TRUG DIE LASUR ZWEIMAL: einmal flach als `list-tint`-Fläche und
 * darüber noch einmal als Verlauf. Zwei Lagen à 20 Prozent ergeben oben rund
 * 36 Prozent, also fast das Doppelte einer Listenkarte, und weil die flache
 * Lasur bis zur Unterkante durchlief, lief der Verlauf auch nicht mehr in die
 * Kartenfläche aus. Geblieben ist der Verlauf; die Grundfläche ist jetzt
 * `--md-surface` wie bei `ListCard`. Nebenwirkung mit Ansage: Der Auslauf des
 * Fotos endet in `--md-surface` und traf damit vorher gar nicht die Farbe der
 * eigenen Karte.
 *
 * Liegt ein Serverbild vor, wird es wie in der Android-App (RecipeCard.kt)
 * als Hintergrund über die volle Karte gelegt: object-cover, 25 % Deckkraft,
 * darüber der Auslauf-Verlauf nach unten in die Kartenfläche (RecipeCard.kt
 * "Fade nach unten"), dann der Farbverlauf des Kartenkopfs (DefaultCard.kt),
 * zuoberst der Text.
 */
const {
  recipe,
  ingredientCount = 0,
  stepCount = 0,
  checkedStepCount = 0,
  hasBadge = false,
  active = false,
} = defineProps<{
  recipe: Recipe
  ingredientCount?: number
  stepCount?: number
  /** Abgehakte Schritte — steuert Fortschrittsfarbe und -balken wie in Android. */
  checkedStepCount?: number
  /** Wurde dieses Rezept schon fertig gekocht? Zeigt das goldene Abzeichen. */
  hasBadge?: boolean
  active?: boolean
}>()

/** Androids Regel aus Overview.kt: Fortschritt gibt es erst ab einem Haken. */
const hasProgress = computed(() => checkedStepCount > 0 && stepCount > 0)

/** Zähler im Android-Format: "N Zutaten · 2/5 Schritte". */
const summary = computed(() => {
  const ingredients = ingredientCount === 1 ? '1 Zutat' : `${ingredientCount} Zutaten`
  const steps = hasProgress.value
    ? `${checkedStepCount}/${stepCount} Schritte`
    : stepCount === 1 ? '1 Schritt' : `${stepCount} Schritte`
  return `${ingredients} · ${steps}`
})

const progressPercent = computed(() =>
  stepCount === 0 ? 0 : (checkedStepCount / stepCount) * 100,
)

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
    class="state-layer relative flex flex-col gap-1.5 overflow-hidden rounded-lg p-4"
    :style="{
      '--list-color': recipe.color,
      'backgroundColor': 'var(--md-surface)',
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
      Auslauf-Verlauf unter dem Bild wie in RecipeCard.kt ("Fade nach unten"):
      transparent oben, unten die Kartenfläche. Er lässt das Foto in die Karte
      auslaufen, statt es hart am Rand enden zu lassen.
    -->
    <span
      v-if="imageUrl !== null && !isImageBroken"
      class="pointer-events-none absolute inset-0"
      style="background: linear-gradient(to bottom, transparent, var(--md-surface))"
      aria-hidden="true"
    />
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

    <!--
      DER AUSWAHLRAHMEN ALS EIGENE LAGE, ganz oben — nicht als `inset`-Schatten
      am Element selbst.

      DAS FEHLERBILD: Ein inset-Schatten wird VOR den Kindern gemalt. Der
      Auslauf-Verlauf des Bildes darüber ist unten deckend (`--md-surface`) und
      hat den Rahmen an der Unterkante und in den unteren Ecken schlicht
      übermalt — oben blieb er sichtbar, unten löste er sich auf.

      Bei `ListCard` fällt das nicht auf, obwohl dort dieselbe Zeile steht: Der
      Verlauf ist dort die `background-image` des Elements selbst, und die liegt
      UNTER dem inset-Schatten. Der Unterschied ist nicht die Farbe, sondern wer
      den Verlauf trägt.
    -->
    <span
      v-if="active"
      class="pointer-events-none absolute inset-0 rounded-lg"
      :style="{ boxShadow: `inset 0 0 0 2px ${recipe.color}` }"
      aria-hidden="true"
    />

    <span class="relative min-w-0 truncate text-[1.375rem] leading-7 font-bold">{{ recipe.name }}</span>

    <div class="relative flex items-center gap-1.5">
      <!-- Gold wie Androids badgeGold (0xFFDAA520) — bewusst kein Token: die
           Auszeichnung ist in beiden Apps dieselbe feste Farbe. -->
      <UIcon
        v-if="hasBadge"
        name="i-lucide-award"
        class="size-3.5 shrink-0"
        style="color: #DAA520"
        role="img"
        aria-label="Ausgezeichnetes Rezept"
      />
      <span
        class="text-[1rem]"
        :style="{ color: hasProgress ? 'var(--md-primary)' : 'var(--md-on-surface)' }"
      >{{ summary }}</span>
    </div>

    <!-- Fortschrittsbalken wie bei den Listen: 4px hoch, 2px Radius, rein
         dekorativ — die Zähler-Zeile trägt dieselbe Aussage bereits als Text. -->
    <div
      v-if="checkedStepCount > 0 && stepCount > 0"
      class="relative h-1 overflow-hidden rounded-[2px]"
      style="background-color: var(--md-surface-variant)"
      aria-hidden="true"
    >
      <div
        class="h-full rounded-[2px]"
        :style="{ width: `${progressPercent}%`, backgroundColor: 'var(--md-primary)' }"
      />
    </div>
  </NuxtLink>
</template>

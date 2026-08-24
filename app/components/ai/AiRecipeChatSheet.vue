<script setup lang="ts">
/**
 * Der Rezept-Chat als Blatt — der Weg für alles unterhalb sehr breiter
 * Fenster. Den Chat selbst rendert `AiRecipeChatPanel`; hier steht nur der
 * Behälter drumherum.
 *
 * Ab der Breite, an der die Rezeptseite eine dritte Spalte tragen kann, steht
 * derselbe Chat dort dauerhaft und dieses Blatt wird gar nicht erst gebaut.
 * Beides gleichzeitig wäre kein Luxus, sondern ein Fehler: `useRecipeChat`
 * hält seinen Zustand je Aufruf, zwei Instanzen hätten also zwei Verläufe.
 */
import type { ChatRecipePayload } from '~/ai/recipeContract'

const { recipeId, recipe } = defineProps<{
  recipeId: string
  /** Das Rezept in der Anfrage-Form (Mengen bereits ganzzahlig). */
  recipe: ChatRecipePayload
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Rezept-Chat"
    description="Stelle Fragen zu diesem Rezept"
  >
    <AiRecipeChatPanel
      :recipe-id="recipeId"
      :recipe="recipe"
      :active="open"
    />
  </AppSheet>
</template>

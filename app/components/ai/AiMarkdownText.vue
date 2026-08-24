<script setup lang="ts">
/**
 * Stellt eine AI-Antwort dar: fette Stellen, Aufzählungen, nummerierte Zeilen.
 * Der Umfang und die Begründung stehen in `~/ai/markdown` — kurz gesagt, es
 * ist derselbe kleine Umfang wie in der Android-App, und er kommt ohne
 * Fremdpaket aus.
 *
 * Hier wird aus den geparsten Blöcken ein echter Knotenbaum. Kein `v-html`:
 * Der Text stammt von einem Sprachmodell, und dessen Ausgabe als Markup in die
 * Seite zu giessen wäre genau der Weg, den man nicht offen lässt.
 *
 * Aufzählungen bekommen einen hängenden Einzug, keine führenden Leerzeichen
 * wie in Android. Dort ist es ein einzelner Textblock, hier gibt es Zeilen —
 * eine umbrechende Aufzählung sieht so richtig aus statt eingerückt-zerfallen.
 */
import { parseMarkdown } from '~/ai/markdown'

const { text } = defineProps<{ text: string }>()

const blocks = computed(() => parseMarkdown(text))
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <component
      :is="block.kind === 'paragraph' ? 'p' : 'div'"
      v-for="(block, index) in blocks"
      :key="index"
      class="text-[0.9375rem]"
      :class="block.kind !== 'paragraph' && 'flex gap-2'"
    >
      <span
        v-if="block.kind === 'bullet'"
        class="shrink-0 select-none"
        aria-hidden="true"
      >&bull;</span>
      <span
        v-else-if="block.kind === 'numbered'"
        class="shrink-0 tabular-nums select-none"
      >{{ block.marker }}.</span>

      <span :class="block.kind !== 'paragraph' && 'min-w-0'"><template
        v-for="(segment, segmentIndex) in block.segments"
        :key="segmentIndex"
      ><strong
        v-if="segment.bold"
        class="font-bold"
      >{{ segment.text }}</strong><template v-else>{{ segment.text }}</template></template></span>
    </component>
  </div>
</template>

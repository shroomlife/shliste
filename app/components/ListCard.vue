<script setup lang="ts">
import type { List } from '#shared/types/domain'

/**
 * Listenkarte, Design-Richtung A — Anatomie wie Androids ListCard.kt samt
 * Overview.kt: grosser Titel, Sonderzustands-Symbole rechts daneben,
 * darunter die Zähler-Zeile mit optionalem Fortschrittsbalken.
 *
 * Die Listenfarbe wird als 20-Prozent-Lasur gelegt, nicht voll gesättigt —
 * genau wie ColorUtils.colorWith20Opacity in Android. Weil die Farben echtes
 * Zufalls-RGB sind (Summe der Kanäle zwischen 100 und 700), wäre jede
 * kräftigere Darstellung unruhig.
 *
 * ALS VERLAUF, NICHT ALS FLÄCHE: Android legt die Lasur als vertikalen
 * Farbverlauf über die Karte — oben die Farbe, nach unten auslaufend
 * (DefaultCard.kt, Brush.verticalGradient). Die flache Tönung der ersten
 * Fassung hat genau diesen Wiedererkennungswert verschluckt. Damit der
 * Verlauf unten nicht im Seitenhintergrund verschwindet, liegt er auf
 * einer Kartenfläche (surface) statt auf transparent.
 */
const {
  list,
  openCount = 0,
  doneCount = 0,
  active = false,
  isShared = false,
  unseenCount = 0,
  justChanged = false,
} = defineProps<{
  list: List
  openCount?: number
  doneCount?: number
  active?: boolean
  /** Liest jemand anderes mit? Wird wie das Schloss als Symbol am Namen gezeigt. */
  isShared?: boolean
  /** Ungesehene Änderungen von anderen — der "N neu"-Chip in der Zähler-Zeile. */
  unseenCount?: number
  /** Gerade per Echtzeit geändert — löst das Delta-Aufleuchten der Karte aus. */
  justChanged?: boolean
}>()

const totalCount = computed(() => openCount + doneCount)

/** Androids Regel aus Overview.kt: Fortschritt gibt es erst ab einem Haken. */
const hasProgress = computed(() => doneCount > 0 && totalCount.value > 0)

const isAllDone = computed(() => hasProgress.value && openCount === 0)

/** Zähler im Android-Format: "2/5 Einträge" bei Fortschritt, sonst die Anzahl. */
const countLabel = computed(() => {
  if (hasProgress.value) return `${doneCount}/${totalCount.value} Einträge`
  return totalCount.value === 1 ? '1 Eintrag' : `${totalCount.value} Einträge`
})

const progressPercent = computed(() =>
  totalCount.value === 0 ? 0 : (doneCount / totalCount.value) * 100,
)

/**
 * Die Zahl ist die der Einträge, nicht der Personen — "3 neu" beantwortet
 * "lohnt sich das Reinschauen", dieselbe Formulierung wie ListStatusChips.kt.
 */
const unseenLabel = computed(() =>
  unseenCount === 1
    ? 'Ein neuer Eintrag von jemand anderem'
    : `${unseenCount} neue Einträge von anderen`,
)
</script>

<template>
  <NuxtLink
    :to="`/app/lists/${list.id}`"
    class="state-layer flex flex-col gap-1.5 rounded-lg p-4 shadow-sm transition-shadow"
    :class="justChanged && 'delta-flash-overlay'"
    :style="{
      '--list-color': list.color,
      'backgroundColor': 'var(--md-surface)',
      'backgroundImage': 'linear-gradient(to bottom, color-mix(in srgb, var(--list-color) 20%, transparent), transparent)',
      ...(active ? { boxShadow: `inset 0 0 0 2px ${list.color}` } : {}),
    }"
  >
    <div class="flex items-center gap-3">
      <span class="min-w-0 grow truncate text-[2.25rem] leading-9 font-bold">{{ list.name }}</span>
      <!-- Geteilt und geheim sind dieselbe Art von Aussage: "mit dieser Liste
           stimmt etwas Besonderes". Deshalb stehen sie am selben Platz RECHTS
           des Namens, in derselben Grösse und derselben Tönung — wie in
           ListCard.kt (36dp, primary).

           `role="img"` samt Beschriftung ist nicht schmückend: Ohne beides
           liest eine Sprachausgabe hier gar nichts vor, und die Aussage
           "geteilt" bzw. "geheim" steht nirgendwo sonst auf der Karte. -->
      <UIcon
        v-if="isShared"
        name="i-lucide-users"
        class="size-9 shrink-0"
        style="color: var(--md-primary)"
        role="img"
        aria-label="Geteilte Liste"
      />
      <UIcon
        v-if="list.secret"
        name="i-lucide-lock"
        class="size-9 shrink-0"
        style="color: var(--md-primary)"
        role="img"
        aria-label="Geheime Liste"
      />
      <slot name="badge" />
    </div>

    <div class="flex items-center gap-1.5">
      <span
        class="text-[1rem]"
        :style="{ color: hasProgress ? 'var(--md-primary)' : 'var(--md-on-surface)' }"
      >{{ countLabel }}</span>
      <UIcon
        v-if="isAllDone"
        name="i-lucide-check"
        class="size-3.5 shrink-0"
        style="color: var(--md-primary)"
        aria-hidden="true"
      />
      <!-- "Neu" ist bewusst ein Chip und kein Symbol am Namen: keine
           Dauereigenschaft der Liste, sondern eine Nachricht, die wieder
           verschwindet (ListStatusChips.kt). Deckend statt zart — ein blasser
           Chip wäre keine Nachricht. -->
      <span
        v-if="unseenCount > 0"
        class="rounded-sm px-2 py-0.5 text-[0.75rem] leading-4 font-bold text-white"
        style="background-color: var(--md-primary)"
      >
        <span aria-hidden="true">{{ unseenCount }} neu</span>
        <span class="sr-only">{{ unseenLabel }}</span>
      </span>
    </div>

    <!-- Fortschrittsbalken wie Androids LinearProgressIndicator: 4px hoch,
         2px Radius. Rein dekorativ — die Zähler-Zeile trägt dieselbe Aussage
         bereits als Text. -->
    <div
      v-if="doneCount > 0"
      class="h-1 overflow-hidden rounded-[2px]"
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

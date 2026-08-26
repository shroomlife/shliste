<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

/**
 * Eintrag bearbeiten — Name, Link und Menge, das Pendant zu Androids
 * ListItemEditSheet.kt über dem AppSheet-Muster der App.
 *
 * Die Mengensteuerung übersetzt Androids NumberSliderInput sinngemäss auf
 * Zeigegeräte: grosse Minus- und Plus-Knöpfe (44 Pixel, WCAG 2.2 SC 2.5.8)
 * fürs Feinjustieren und eine Ziffernreihe 1–9 für den schnellen Griff — die
 * allermeisten Einkäufe liegen in genau diesem Bereich. Der Wertebereich ist
 * derselbe wie auf Android: 1 bis 999.
 *
 * DER NAME DARF LEER BLEIBEN, ABER NUR MIT LINK. Dann zeigt die Liste den
 * Titel der Seite. Genau dafür steht der Seitentitel als Platzhalter im
 * Namensfeld: Er zeigt, was ohne eigene Eingabe erscheinen wird, statt eine
 * Eingabe zu erzwingen, die niemand tippen will.
 *
 * Gespeichert wird erst auf den Knopf: Das Blatt arbeitet auf einer lokalen
 * Kopie, Abbrechen verwirft sie folgenlos. Was beim Speichern tatsächlich
 * geschrieben wird, entscheidet `updateItem` im Composable — dort wird der
 * Eintrag frisch nachgeschlagen und nur Geändertes gestempelt.
 */
const { item = null } = defineProps<{
  /** Der Stand des Eintrags, wie er beim Öffnen übernommen wird. */
  item?: Pick<ListItem, 'name' | 'quantity' | 'url' | 'linkTitle' | 'linkImagePath' | 'linkImageKind'> | null
}>()

/** Offen-Zustand liegt beim Aufrufer, damit er das Blatt steuern kann. */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ save: [changes: { name: string, quantity: number, url: string | null }] }>()

const name = ref('')
const quantity = ref(QUANTITY_MIN)
const url = ref('')

// Beim ÖFFNEN übernehmen, nicht fortlaufend: Während das Blatt offen ist,
// darf ein Sync den Eintrag ändern, ohne dem Menschen ins Feld zu tippen.
watch(open, (isOpen) => {
  if (!isOpen || item === null) return
  name.value = item.name
  quantity.value = clampQuantity(item.quantity)
  url.value = item.url ?? ''
})

/** Die geprüfte Adresse aus dem Feld, oder `null`. Nie umgeschrieben. */
const parsedUrl = computed(() => validHttpUrlOrNull(url.value))

/**
 * Steht etwas im Feld, das keine Adresse ist?
 *
 * Ein leeres Feld ist kein Fehler, sondern der Normalfall: Die allermeisten
 * Einträge sind keine Links.
 */
const urlError = computed(() => url.value.trim().length > 0 && parsedUrl.value === null)

/**
 * Gehören Titel und Vorschaubild noch zu dem, was gerade im Feld steht?
 *
 * Wer die Adresse ändert, sieht sonst den Titel der ALTEN Seite unter der
 * neuen — und beim Speichern verschwindet er ohnehin (`linkFieldsAfterWrite`).
 * Also lieber sofort ehrlich sein.
 */
const mirrorsApply = computed(() => parsedUrl.value !== null && parsedUrl.value === (item?.url ?? null))

/** Der Platzhalter des Namensfelds zeigt, was ohne Eingabe erscheinen wird. */
const namePlaceholder = computed(() =>
  (mirrorsApply.value ? item?.linkTitle ?? null : null) ?? 'Name des Eintrags')

/** Die Vorschauzeile — nur mit brauchbarer Adresse. */
const previewHost = computed(() => hostOf(parsedUrl.value))
const previewTitle = computed(() => (mirrorsApply.value ? item?.linkTitle?.trim() ?? '' : ''))
const previewImagePath = computed(() => (mirrorsApply.value ? item?.linkImagePath ?? null : null))
const previewImageKind = computed(() => (mirrorsApply.value ? item?.linkImageKind ?? null : null))

/**
 * Speichern geht, solange die Adresse lesbar ist UND etwas übrig bleibt:
 * ein Name oder ein Link. Ohne beides entstünde eine leere Zeile.
 */
const canSave = computed(() => !urlError.value && (name.value.trim().length > 0 || parsedUrl.value !== null))

// Als computed statt Konstanten-Vergleich im Template: Auto-Importe stehen
// dem Template-Typecheck (vue-tsc) nicht zur Verfügung, und die Frage "geht
// noch weniger/mehr?" ist ohnehin die eigentliche Aussage.
const canDecrease = computed(() => quantity.value > QUANTITY_MIN)
const canIncrease = computed(() => quantity.value < QUANTITY_MAX)

function setQuantity(value: number): void {
  quantity.value = clampQuantity(value)
}

function submit(): void {
  if (!canSave.value) return
  open.value = false
  emit('save', { name: name.value.trim(), quantity: quantity.value, url: parsedUrl.value })
}
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Eintrag bearbeiten"
    description="Name, Link und Menge anpassen"
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-1.5">
        <UInput
          v-model="name"
          size="xl"
          autofocus
          enterkeyhint="done"
          aria-label="Name des Eintrags"
          :placeholder="namePlaceholder"
          :ui="{ root: 'w-full' }"
          @keyup.enter="submit"
        />
        <span
          v-if="parsedUrl"
          class="text-[0.875rem]"
          style="color: var(--md-on-surface-variant)"
        >Ohne Namen zeigt die Liste den Titel der Seite.</span>
      </div>

      <div class="flex flex-col gap-1.5">
        <UInput
          v-model="url"
          type="url"
          size="xl"
          icon="i-lucide-link"
          inputmode="url"
          enterkeyhint="done"
          placeholder="Link (optional)"
          aria-label="Link des Eintrags"
          :aria-invalid="urlError"
          :aria-describedby="urlError ? 'item-url-error' : undefined"
          :ui="{ root: 'w-full' }"
          @keyup.enter="submit"
        />
        <!-- Der Fehlertext ist per aria-describedby am Feld verankert: Ein
             roter Text daneben ist für einen Screenreader sonst nur ein
             beliebiger Absatz irgendwo im Blatt. -->
        <span
          v-if="urlError"
          id="item-url-error"
          class="text-[0.875rem] font-bold"
          style="color: var(--md-delete-content)"
        >Das sieht nicht nach einer gültigen Adresse aus.</span>

        <!-- Die Vorschau zeigt, was die Zeile später zeigen wird. -->
        <div
          v-else-if="parsedUrl"
          class="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5"
          style="background: var(--md-surface-low)"
        >
          <LinkTile
            :url="parsedUrl"
            :link-image-path="previewImagePath"
            :link-image-kind="previewImageKind"
          />
          <span class="flex min-w-0 grow flex-col">
            <span
              v-if="previewTitle"
              class="truncate text-[1rem] font-bold"
            >{{ previewTitle }}</span>
            <span
              class="truncate text-[0.875rem]"
              style="color: var(--md-on-surface-variant)"
            >{{ previewHost }}</span>
          </span>
          <a
            :href="parsedUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 rounded-lg px-2.5 py-1.5 text-[0.9375rem] font-bold"
            style="color: var(--md-primary)"
          >Öffnen</a>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <span
          class="text-[0.9375rem] font-bold"
          style="color: var(--md-on-surface-variant)"
        >Menge</span>

        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40"
            style="background: var(--md-surface-high)"
            :disabled="!canDecrease"
            aria-label="Menge verringern"
            @click="setQuantity(quantity - 1)"
          >
            <UIcon
              name="i-lucide-minus"
              class="size-5"
            />
          </button>

          <!-- aria-live, damit der Screenreader den neuen Wert ansagt — die
               Knöpfe selbst ändern ihn nur stumm. -->
          <span
            class="min-w-16 text-center text-[1.375rem] font-bold"
            style="color: var(--md-primary)"
            aria-live="polite"
          >{{ quantity }}&times;</span>

          <button
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40"
            style="background: var(--md-surface-high)"
            :disabled="!canIncrease"
            aria-label="Menge erhöhen"
            @click="setQuantity(quantity + 1)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-5"
            />
          </button>
        </div>

        <div class="flex gap-1">
          <button
            v-for="digit in 9"
            :key="digit"
            type="button"
            class="flex h-10 min-w-0 grow items-center justify-center rounded-sm text-[1.0625rem] font-bold transition-colors"
            :style="digit === quantity
              ? 'background: var(--md-secondary); color: var(--md-on-secondary)'
              : 'background: var(--md-surface-low); color: var(--md-on-surface-variant)'"
            :aria-label="`Menge ${digit}`"
            :aria-pressed="digit === quantity"
            @click="setQuantity(digit)"
          >
            {{ digit }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          class="font-bold"
          @click="open = false"
        >
          Abbrechen
        </UButton>
        <UButton
          :disabled="!canSave"
          class="font-bold"
          @click="submit"
        >
          Speichern
        </UButton>
      </div>
    </template>
  </AppSheet>
</template>

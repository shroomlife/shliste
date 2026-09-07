<script setup lang="ts">
import type { PendingInvite } from '#shared/types/domain'
import { acceptInvite, declineInvite } from '../sync/members'

/**
 * Einladungen zu fremden Listen, die noch nicht beantwortet sind.
 *
 * WARUM SIE OBEN IM INDEX STEHEN und nicht in einem eigenen Bereich: Eine
 * Einladung ist eine Liste, die gleich dazugehören könnte. Sie gehört dorthin,
 * wo die Listen stehen, und verschwindet in dem Moment, in dem sie beantwortet
 * ist.
 *
 * Angenommen wird über die API, nicht lokal: Die Mitgliedschaft entscheidet
 * der Server. Danach wird abgeglichen, und die Liste kommt mit ihren Einträgen
 * herunter. Genau deshalb sind die Knöpfe offline gesperrt — eine Antwort, die
 * den Server nie erreicht, wäre nur ein Versprechen ins Leere.
 *
 * Ablehnen erst nach Bestätigung, wie `PendingInviteBanner.kt` in der
 * Android-App: Die Einladung lässt sich nicht zurückholen, wer ablehnt,
 * müsste neu eingeladen werden — das ist eine Rückfrage wert.
 */
const { invites } = defineProps<{ invites: readonly PendingInvite[] }>()

const emit = defineEmits<{ answered: [] }>()

const { isOnline } = useNetworkStatus()

const busyListId = ref<string | null>(null)
const error = ref<string | null>(null)

/** Die Einladung, deren Ablehnung gerade zur Bestätigung ansteht. */
const declineTarget = ref<PendingInvite | null>(null)
const isDeclineOpen = ref(false)

/**
 * Wer lädt hier ein? `null` heißt "Name nicht sichtbar" — dann übernimmt
 * "Die Person" den Satz, derselbe Rückfall wie in der Android-App.
 */
const declineInviterName = computed(() => {
  const name = declineTarget.value?.invitedBy?.displayName
  return name !== undefined && name !== null && name.trim().length > 0 ? name : 'Die Person'
})

async function answer(invite: PendingInvite, accept: boolean): Promise<void> {
  if (busyListId.value !== null) return

  busyListId.value = invite.listId
  error.value = null
  try {
    await (accept ? acceptInvite(invite.listId) : declineInvite(invite.listId))
    emit('answered')
  }
  catch {
    // Bewusst knapp: Der genaue Grund (Netz, abgelaufen, schon beantwortet)
    // ändert nichts daran, was zu tun ist — später noch einmal versuchen.
    error.value = 'Das hat nicht geklappt. Versuch es gleich noch einmal.'
  }
  finally {
    busyListId.value = null
  }
}

function askDecline(invite: PendingInvite): void {
  declineTarget.value = invite
  isDeclineOpen.value = true
}

function confirmDecline(): void {
  const invite = declineTarget.value
  isDeclineOpen.value = false
  if (invite === null) return

  void answer(invite, false)
}

// Verschwindet die Einladung, während ihre Rückfrage offen steht (der
// Einladende zieht zurück, ein Pull räumt sie ab), schließt die Rückfrage
// mit — sonst bestätigte man ins Leere oder das Blatt stünde beim nächsten
// Auftauchen einer Einladung sofort wieder offen da.
watch(() => invites, (current) => {
  const target = declineTarget.value
  if (target === null) return
  if (!current.some(invite => invite.listId === target.listId)) {
    isDeclineOpen.value = false
    declineTarget.value = null
  }
})
</script>

<template>
  <!-- Das Bestätigungs-Blatt steht AUSSERHALB des v-if: Verschwindet die
       letzte Einladung, während es offen ist, darf es nicht kommentarlos aus
       dem DOM gerissen werden — es schließt sich über den watch im Script. -->
  <div>
    <div
      v-if="invites.length"
      class="flex flex-col gap-2 px-4 pb-3"
    >
      <p
        v-if="error"
        class="rounded-lg px-3 py-2 text-[0.9375rem]"
        style="background: var(--md-delete-surface); color: var(--md-delete-content)"
        role="alert"
      >
        {{ error }}
      </p>

      <article
        v-for="invite in invites"
        :key="invite.listId"
        class="list-tint flex flex-col gap-2.5 rounded-xl p-3.5"
        :style="{ '--list-color': invite.listColor }"
      >
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-[1.25rem] font-bold">{{ invite.listName }}</span>
          <span
            class="text-[0.9375rem]"
            style="color: var(--md-on-surface-variant)"
          >{{ invite.invitedBy?.displayName
            ? `${invite.invitedBy.displayName} teilt diese Liste mit dir`
            : 'Du wurdest zu dieser Liste eingeladen' }}</span>
        </div>

        <div class="flex gap-2">
          <UButton
            :loading="busyListId === invite.listId"
            :disabled="!isOnline"
            size="sm"
            class="rounded-full font-bold"
            @click="answer(invite, true)"
          >
            Annehmen
          </UButton>
          <UButton
            :disabled="!isOnline || busyListId === invite.listId"
            color="neutral"
            variant="ghost"
            size="sm"
            class="rounded-full font-bold"
            @click="askDecline(invite)"
          >
            Ablehnen
          </UButton>
        </div>

        <p
          v-if="!isOnline"
          class="text-[0.9375rem]"
          style="color: var(--md-on-surface-variant)"
          role="status"
        >
          Offline. Einladungen lassen sich erst beantworten, wenn du verbunden bist.
        </p>
      </article>
    </div>

    <AppSheet
      v-model:open="isDeclineOpen"
      title="Einladung ablehnen?"
      :description="`${declineInviterName} müsste dich neu einladen.`"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            class="font-bold"
            @click="isDeclineOpen = false"
          >
            Abbrechen
          </UButton>
          <UButton
            color="error"
            class="font-bold"
            @click="confirmDecline"
          >
            Ablehnen
          </UButton>
        </div>
      </template>
    </AppSheet>
  </div>
</template>

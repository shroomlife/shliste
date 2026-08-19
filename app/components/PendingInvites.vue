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
 * herunter.
 */
const { invites } = defineProps<{ invites: readonly PendingInvite[] }>()

const emit = defineEmits<{ answered: [] }>()

const busyListId = ref<string | null>(null)
const error = ref<string | null>(null)

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
</script>

<template>
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
          size="sm"
          class="rounded-full font-bold"
          @click="answer(invite, true)"
        >
          Annehmen
        </UButton>
        <UButton
          :disabled="busyListId === invite.listId"
          color="neutral"
          variant="ghost"
          size="sm"
          class="rounded-full font-bold"
          @click="answer(invite, false)"
        >
          Ablehnen
        </UButton>
      </div>
    </article>
  </div>
</template>

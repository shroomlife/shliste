<script setup lang="ts">
import type { ListMember } from '#shared/types/domain'

/**
 * Wer darf diese Liste sehen und ändern.
 *
 * ZWEI ROLLEN, ZWEI ANSICHTEN: Der Eigentümer lädt ein und entfernt; jedes
 * andere Mitglied sieht die Runde und kann sie verlassen. Was hier ausgeblendet
 * wird, verbietet der Server ohnehin — die Oberfläche zeigt nur nicht an, was
 * ohne Berechtigung ins Leere liefe.
 *
 * `email: null` bei einem Mitglied heisst "Adresse nicht sichtbar" und NICHT
 * "kein Konto": Die Adresse bekommt allein der Eigentümer zu sehen. Diese
 * Unterscheidung darf die Anzeige nicht verwischen, sonst liest sich ein
 * vollwertiges Mitglied wie eine offene Einladung.
 *
 * Eine Einladung an eine Adresse ohne Konto ist ausdrücklich in Ordnung: Sie
 * wartet, bis sich jemand damit anmeldet.
 */
const { listId, isOwner = false } = defineProps<{
  listId: string
  /** Nur der Eigentümer darf einladen und entfernen. */
  isOwner?: boolean
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { members, invites, isLoading, error, load, invite, remove, withdrawInvite } = useListMembers()

const email = ref('')
const isInviting = ref(false)
const busyUserId = ref<string | null>(null)

// Erst beim Öffnen laden: Die Mitgliederliste kommt vom Server, und ein Aufruf
// für jede angesehene Liste wäre Netzverkehr für etwas, das niemand sieht.
watch(isOpen, (open) => {
  if (open) void load(listId)
})

async function submitInvite(): Promise<void> {
  if (isInviting.value) return

  isInviting.value = true
  try {
    if (await invite(email.value)) email.value = ''
  }
  finally {
    isInviting.value = false
  }
}

async function removeMemberRow(member: ListMember): Promise<void> {
  busyUserId.value = member.userId
  try {
    await remove(member)
  }
  finally {
    busyUserId.value = null
  }
}

function nameOf(member: ListMember): string {
  return member.displayName ?? member.email ?? 'Unbekannt'
}

function initialsOf(member: ListMember): string {
  return nameOf(member).slice(0, 1).toUpperCase()
}
</script>

<template>
  <AppSheet
    v-model:open="isOpen"
    title="Geteilt mit"
    :description="isOwner
      ? 'Lade jemanden per E-Mail-Adresse ein. Änderungen erscheinen sofort auf allen Geräten.'
      : 'Diese Liste wird geteilt.'"
  >
    <div class="flex flex-col gap-4">
      <p
        v-if="error"
        class="rounded-lg px-3 py-2 text-[1rem]"
        style="background: var(--md-delete-surface); color: var(--md-delete-content)"
        role="alert"
      >
        {{ error }}
      </p>

      <div
        v-if="isLoading && members.length === 0"
        class="flex items-center gap-2 px-1 text-[1rem]"
        style="color: var(--md-on-surface-variant)"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 animate-spin motion-reduce:animate-none"
        />
        Wird geladen…
      </div>

      <ul class="flex flex-col gap-1">
        <li
          v-for="member in members"
          :key="member.userId"
          class="flex min-h-12 items-center gap-3 rounded-lg px-1"
        >
          <UAvatar
            :src="member.photoUrl ?? undefined"
            :alt="nameOf(member)"
            :text="initialsOf(member)"
            size="sm"
            style="background: var(--md-primary-container); color: var(--md-on-primary-container)"
          />
          <span class="flex min-w-0 grow flex-col">
            <span class="truncate text-[1.0625rem]">{{ nameOf(member) }}</span>
            <span
              v-if="member.status === 'pending'"
              class="text-[0.875rem]"
              style="color: var(--md-on-surface-variant)"
            >Einladung offen</span>
          </span>

          <span
            v-if="member.role === 'owner'"
            class="shrink-0 rounded-full px-2.5 py-1 text-[0.875rem] font-bold"
            style="background: var(--md-surface-high); color: var(--md-on-surface-variant)"
          >Eigentümer</span>

          <UButton
            v-else-if="isOwner"
            icon="i-lucide-user-minus"
            color="neutral"
            variant="ghost"
            size="sm"
            class="shrink-0 rounded-full"
            :loading="busyUserId === member.userId"
            :aria-label="`${nameOf(member)} entfernen`"
            @click="removeMemberRow(member)"
          />
        </li>

        <!-- Adress-Einladungen: Personen ohne Konto, die noch nicht zugegriffen
             haben. Nur der Eigentümer bekommt sie vom Server. -->
        <li
          v-for="pending in invites"
          :key="pending.email"
          class="flex min-h-12 items-center gap-3 rounded-lg px-1"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-full"
            style="background: var(--md-surface-high)"
          >
            <UIcon
              name="i-lucide-mail"
              class="size-4"
              style="color: var(--md-on-surface-variant)"
            />
          </span>
          <span class="flex min-w-0 grow flex-col">
            <span class="truncate text-[1.0625rem]">{{ pending.email }}</span>
            <span
              class="text-[0.875rem]"
              style="color: var(--md-on-surface-variant)"
            >Eingeladen, noch kein Konto</span>
          </span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            class="shrink-0 rounded-full"
            :aria-label="`Einladung an ${pending.email} zurückziehen`"
            @click="withdrawInvite(pending.email)"
          />
        </li>
      </ul>

      <form
        v-if="isOwner"
        class="flex items-center gap-2"
        @submit.prevent="submitInvite"
      >
        <UInput
          v-model="email"
          type="email"
          placeholder="E-Mail-Adresse"
          icon="i-lucide-user-plus"
          size="lg"
          autocomplete="email"
          class="grow"
          :ui="{ root: 'w-full' }"
        />
        <UButton
          type="submit"
          :loading="isInviting"
          :disabled="email.trim().length === 0"
          size="lg"
          class="shrink-0 rounded-xl font-bold"
        >
          Einladen
        </UButton>
      </form>
    </div>
  </AppSheet>
</template>

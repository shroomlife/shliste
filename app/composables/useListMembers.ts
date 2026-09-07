/**
 * Mitglieder einer geteilten Liste, für die Oberfläche.
 *
 * ANDERS ALS DIE ÜBRIGEN COMPOSABLES LIEST DIESES VOM SERVER und nicht aus
 * IndexedDB. Grund: Mitgliedschaften sind kein Offline-Zustand. Wer eingeladen
 * ist, entscheidet allein der Server, und eine lokal gespiegelte Mitgliederliste
 * wäre eine Behauptung, die ohne Netz nicht mehr stimmen muss. Der Abgleich
 * legt zwar eine Projektion in `list_members` ab (der Pull braucht sie), aber
 * die Verwaltung arbeitet auf dem echten Stand.
 *
 * OHNE KONTO GIBT ES HIER NICHTS ZU TUN. Teilen setzt eine Anmeldung voraus;
 * der Aufrufer blendet die Verwaltung sonst gar nicht erst ein.
 */
import type { ListMember } from '../../shared/types/domain'
import { describeSyncError, toSyncError } from '../sync/engine/errors'
import {
  fetchMembers,
  inviteMember,
  removeInvite,
  removeMember,
  type EmailInvite,
} from '../sync/members'

export function useListMembers() {
  const members = useState<ListMember[]>('list-members', () => [])
  const invites = useState<EmailInvite[]>('list-member-invites', () => [])
  const isLoading = useState<boolean>('list-members-loading', () => false)
  const error = useState<string | null>('list-members-error', () => null)

  /** Welche Liste zuletzt angefordert wurde — Schutz gegen das Wettrennen. */
  const requestedListId = useState<string | null>('list-members-id', () => null)

  /**
   * Führt einen Aufruf aus und übersetzt einen Fehler in einen Satz.
   *
   * Fehler landen im Zustand statt als geworfene Ausnahme: Ein fehlgeschlagenes
   * Einladen darf die Ansicht nicht zerlegen, es soll erklärt werden.
   */
  async function guarded(work: () => Promise<void>): Promise<boolean> {
    error.value = null
    try {
      await work()
      return true
    }
    catch (cause) {
      error.value = describeSyncError(toSyncError(cause))
      return false
    }
  }

  async function load(listId: string): Promise<void> {
    if (import.meta.server) return

    requestedListId.value = listId
    isLoading.value = true

    await guarded(async () => {
      const membership = await fetchMembers(listId)
      // Ein zwischenzeitlicher Wechsel gewinnt.
      if (requestedListId.value !== listId) return

      members.value = membership.members
      invites.value = membership.invites
    })

    if (requestedListId.value === listId) isLoading.value = false
  }

  async function reload(): Promise<void> {
    const listId = requestedListId.value
    if (listId === null) return
    await load(listId)
  }

  /**
   * Lädt eine Adresse ein.
   *
   * Gibt zurück, ob es geklappt hat. Ein Erfolg heißt NICHT, dass die Person
   * schon Mitglied ist: Gibt es zu der Adresse kein Konto, wartet die
   * Einladung, bis sich jemand damit anmeldet.
   */
  async function invite(email: string): Promise<boolean> {
    const listId = requestedListId.value
    const trimmed = email.trim()
    if (listId === null || trimmed.length === 0) return false

    const ok = await guarded(() => inviteMember(listId, trimmed))
    if (ok) await reload()
    return ok
  }

  async function remove(member: ListMember): Promise<boolean> {
    const listId = requestedListId.value
    if (listId === null) return false

    const ok = await guarded(() => removeMember(listId, member.userId))
    if (ok) await reload()
    return ok
  }

  async function withdrawInvite(email: string): Promise<boolean> {
    const listId = requestedListId.value
    if (listId === null) return false

    const ok = await guarded(() => removeInvite(listId, email))
    if (ok) await reload()
    return ok
  }

  return {
    members: readonly(members),
    invites: readonly(invites),
    isLoading: readonly(isLoading),
    error: readonly(error),
    load,
    reload,
    invite,
    remove,
    withdrawInvite,
  }
}

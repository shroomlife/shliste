/**
 * Mitglieder einer geteilten Liste — der Weg zur API.
 *
 * Alles läuft über die eigene BFF (siehe `engine/transport.ts`): Die API
 * verlangt eine HMAC-Signatur mit dem APP_SECRET, und das kennt der Browser
 * nicht. Die Pfade müssen exakt in der Allowlist von
 * `server/api/sync/[...path].ts` stehen.
 *
 * WAS DER SERVER DURCHSETZT, wird hier nicht noch einmal behauptet: Einladen
 * und Entfernen darf nur der Eigentümer, und die E-Mail-Adresse eines
 * Mitglieds bekommt auch nur er zu sehen. Diese Datei ruft auf und engt
 * Antworten ein; die Regeln stehen in `api.shliste.app/src/routes/sync/members.ts`.
 *
 * `email: null` in einer Mitgliedschaft heisst deshalb "Adresse nicht
 * sichtbar" und NICHT "kein Konto" — ein Unterschied, den die Oberfläche
 * niemals verwischen darf.
 */
import type { ListMember } from '../../shared/types/domain'
import { parseMember } from './engine/entities'
import { isRecord, parseAll, readArray, readIso, readString } from './engine/json'
import { requestJson } from './engine/transport'

/** Eine Einladung an eine Adresse, für die es (noch) kein Konto gibt. */
export interface EmailInvite {
  email: string
  /** Wann eingeladen wurde. `null`, wenn der Server es nicht mitgeschickt hat. */
  createdAt: string | null
}

export interface ListMembership {
  members: ListMember[]
  /**
   * Offene Einladungen an Adressen. Sieht ausschliesslich der Eigentümer —
   * für Mitglieder wäre das eine Kontaktliste fremder Personen, und der
   * Server liefert ihnen deshalb eine leere Liste.
   */
  invites: EmailInvite[]
}

function parseEmailInvite(value: unknown): EmailInvite | null {
  if (!isRecord(value)) return null

  const email = readString(value, 'email')
  if (email === null) return null

  return { email, createdAt: readIso(value, 'createdAt') }
}

export function parseListMembership(value: unknown, listId: string): ListMembership {
  const record = isRecord(value) ? value : {}

  return {
    members: parseAll(readArray(record, 'members'), member => parseMember(member, listId)),
    invites: parseAll(readArray(record, 'invites'), parseEmailInvite),
  }
}

/* ------------------------------------------------------------------ *
 * Die Aufrufe
 * ------------------------------------------------------------------ */

export async function fetchMembers(listId: string): Promise<ListMembership> {
  return parseListMembership(await requestJson(`/api/sync/members/${listId}`), listId)
}

/**
 * Lädt eine Adresse ein.
 *
 * Der Server antwortet auch dann mit Erfolg, wenn zu der Adresse kein Konto
 * gehört — die Einladung wartet dann, bis sich jemand damit anmeldet. Das ist
 * Absicht und darf hier nicht als Fehler dargestellt werden.
 */
export async function inviteMember(listId: string, email: string): Promise<void> {
  await requestJson('/api/sync/members/add', {
    method: 'POST',
    body: { listId, email: email.trim() },
  })
}

/** Entfernt ein Mitglied. Nur der Eigentümer darf das, geprüft vom Server. */
export async function removeMember(listId: string, userId: string): Promise<void> {
  await requestJson('/api/sync/members/remove', {
    method: 'POST',
    body: { listId, userId },
  })
}

/** Zieht eine Einladung an eine Adresse zurück. */
export async function removeInvite(listId: string, email: string): Promise<void> {
  await requestJson('/api/sync/members/remove-invite', {
    method: 'POST',
    body: { listId, email },
  })
}

export async function acceptInvite(listId: string): Promise<void> {
  await requestJson('/api/sync/members/accept', { method: 'POST', body: { listId } })
}

export async function declineInvite(listId: string): Promise<void> {
  await requestJson('/api/sync/members/decline', { method: 'POST', body: { listId } })
}

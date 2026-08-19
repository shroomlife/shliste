/**
 * Das Einlesen der Mitglieder-Antwort.
 *
 * DER PUNKT, AN DEM ES WEHTUT: `email: null` heisst "Adresse nicht sichtbar"
 * und NICHT "kein Konto". Der Server füllt das Feld ausschliesslich für den
 * Eigentümer der Liste. Wer daraus "hat kein Konto" liest, zeigt einem
 * Mitglied an, es sei nur eingeladen — und der Eigentümer entfernt womöglich
 * jemanden, der längst dabei ist.
 *
 * Die Aufrufe selbst sind dünne Hüllen um `requestJson` und stehen deshalb
 * nicht im Test; ihre Pfade sichert die Allowlist der BFF ab.
 */
import { describe, expect, test } from 'bun:test'
import { parseListMembership } from './members'

const LIST = 'l1'

function serverMember(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    memberId: 7,
    userId: 'u-2',
    email: 'wer@example.com',
    displayName: 'Wer',
    photoUrl: null,
    role: 'member',
    status: 'accepted',
    ...overrides,
  }
}

describe('parseListMembership', () => {
  test('liest Mitglieder samt Rolle und Zustand', () => {
    const result = parseListMembership({ members: [serverMember()], invites: [] }, LIST)

    expect(result.members).toHaveLength(1)
    expect(result.members[0]).toMatchObject({
      listId: LIST,
      userId: 'u-2',
      email: 'wer@example.com',
      displayName: 'Wer',
      role: 'member',
      status: 'accepted',
    })
  })

  test('eine unsichtbare Adresse bleibt null und wird nicht zu "pending"', () => {
    const result = parseListMembership(
      { members: [serverMember({ email: null })], invites: [] },
      LIST,
    )

    expect(result.members[0]?.email).toBeNull()
    // Entscheidend: Der Zustand kommt vom Server und nicht aus dem Fehlen der
    // Adresse.
    expect(result.members[0]?.status).toBe('accepted')
  })

  test('eine offene Einladung wird als pending gelesen', () => {
    const result = parseListMembership(
      { members: [serverMember({ status: 'pending' })], invites: [] },
      LIST,
    )

    expect(result.members[0]?.status).toBe('pending')
  })

  test('liest Adress-Einladungen', () => {
    const result = parseListMembership({
      members: [],
      invites: [{ email: 'neu@example.com', createdAt: '2026-08-19T10:00:00.000Z' }],
    }, LIST)

    expect(result.invites).toEqual([
      { email: 'neu@example.com', createdAt: '2026-08-19T10:00:00.000Z' },
    ])
  })

  test('eine Einladung ohne Adresse fällt raus', () => {
    const result = parseListMembership({ members: [], invites: [{ createdAt: null }] }, LIST)
    expect(result.invites).toEqual([])
  })

  test('fehlende Felder ergeben leere Listen statt eines Fehlers', () => {
    // So antwortet der Server einem Mitglied: Adress-Einladungen sieht nur der
    // Eigentümer, das Feld kommt dann als leere Liste — oder gar nicht.
    expect(parseListMembership({}, LIST)).toEqual({ members: [], invites: [] })
    expect(parseListMembership(null, LIST)).toEqual({ members: [], invites: [] })
  })

  test('ein Mitglied ohne Kennung fällt raus, die übrigen bleiben', () => {
    const result = parseListMembership({
      members: [serverMember(), { displayName: 'Ohne Kennung' }],
      invites: [],
    }, LIST)

    expect(result.members).toHaveLength(1)
    expect(result.members[0]?.userId).toBe('u-2')
  })
})

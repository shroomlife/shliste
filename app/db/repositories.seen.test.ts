/// <reference types="bun" />
/**
 * Tests des Gesehen-Wasserzeichens aus `repositories.ts`.
 *
 * Geprüft wird das reine Prädikat `isUnseenForeignChange` — es entscheidet,
 * welche Einträge auf der Übersicht als "ungesehen fremd geändert" zählen.
 * Die IndexedDB-Verdrahtung (`markListSeen`, `countUnseenForeignChanges`)
 * bleibt aussen vor, wie bei allen Nachbartests dieser Schicht.
 */
import { describe, expect, test } from 'bun:test'
import { isUnseenForeignChange } from './repositories'

const OWN_USER = 'user-own'
const OTHER_USER = 'user-other'

const SEEN = '2026-08-19T10:00:00.000Z'
const BEFORE_SEEN = '2026-08-19T09:59:59.999Z'
const AFTER_SEEN = '2026-08-19T10:00:00.001Z'

function foreignItem(updatedAt: string, modifiedBy: string | null = OTHER_USER) {
  return { modifiedBy, updatedAt }
}

describe('isUnseenForeignChange', () => {
  test('eine fremde Änderung nach dem Wasserzeichen zählt', () => {
    expect(isUnseenForeignChange(foreignItem(AFTER_SEEN), OWN_USER, SEEN)).toBe(true)
  })

  test('eine fremde Änderung vor dem Wasserzeichen zählt nicht', () => {
    expect(isUnseenForeignChange(foreignItem(BEFORE_SEEN), OWN_USER, SEEN)).toBe(false)
  })

  test('exakt auf dem Wasserzeichen gilt als gesehen', () => {
    // Beim Öffnen wird `seenAt` auf jetzt gesetzt — alles bis einschliesslich
    // dieses Moments hatte man vor sich. Erst strikt Neueres zählt wieder.
    expect(isUnseenForeignChange(foreignItem(SEEN), OWN_USER, SEEN)).toBe(false)
  })

  test('ohne Wasserzeichen zählt alles Fremde', () => {
    // Der Fall einer gerade angenommenen Einladung: die Liste war noch nie
    // offen, ihr gesamter Inhalt ist tatsächlich neu.
    expect(isUnseenForeignChange(foreignItem(BEFORE_SEEN), OWN_USER, null)).toBe(true)
  })

  test('die eigene Änderung zählt nie', () => {
    expect(isUnseenForeignChange(foreignItem(AFTER_SEEN, OWN_USER), OWN_USER, SEEN)).toBe(false)
    expect(isUnseenForeignChange(foreignItem(AFTER_SEEN, OWN_USER), OWN_USER, null)).toBe(false)
  })

  test('ohne modifiedBy zählt der Eintrag nicht', () => {
    // Lokal angelegte Einträge tragen noch keinen Bearbeiter — sie stammen
    // zwangsläufig von diesem Gerät.
    expect(isUnseenForeignChange(foreignItem(AFTER_SEEN, null), OWN_USER, null)).toBe(false)
  })

  test('ohne eigenes Konto zählt nichts', () => {
    // Ohne Konto gibt es keinen Abgleich; ein übrig gebliebener fremder
    // Bearbeiter aus einer früheren Sitzung darf keinen Hinweis erzeugen.
    expect(isUnseenForeignChange(foreignItem(AFTER_SEEN), null, null)).toBe(false)
  })
})

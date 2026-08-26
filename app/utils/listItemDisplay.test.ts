/// <reference types="bun" />
/**
 * Der Anzeigename einer Zeile und die Frage nach der Host-Zeile.
 *
 * Die Fallsammlung dazu ist `app/sync/merge/link-fixtures.json` und läuft in
 * allen drei Repos (siehe `link-fixtures.test.ts`). Hier stehen nur die
 * Eigenschaften, die sich als Datensatz schlecht ausdrücken lassen.
 */
import { describe, expect, test } from 'bun:test'
import { listItemDisplayName, showHostLine } from './listItemDisplay'

describe('listItemDisplayName', () => {
  test('kommt auch mit einer Zeile ohne Link-Felder zurecht', () => {
    // Bestandszeilen aus der Zeit vor den Link-Feldern haben die Schlüssel
    // schlicht nicht. Ein `undefined` darf hier nichts umwerfen.
    expect(listItemDisplayName({ name: 'Milch' })).toBe('Milch')
  })

  test('der Server schreibt nie in name, deshalb gewinnt der Name immer', () => {
    expect(listItemDisplayName({
      name: 'Mein Name',
      linkTitle: 'Der Seitentitel',
      url: 'https://kochwelt.de/x',
    })).toBe('Mein Name')
  })

  test('ohne alles bleibt der Name leer statt undefined', () => {
    expect(listItemDisplayName({ name: '' })).toBe('')
  })
})

describe('showHostLine', () => {
  test('ohne Link keine zweite Zeile', () => {
    expect(showHostLine({ name: 'Milch' })).toBe(false)
  })

  test('der Host steht nie doppelt untereinander', () => {
    expect(showHostLine({ name: '', url: 'https://www.rewe.de/x' })).toBe(false)
  })

  test('ein eigener Name bekommt den Host als zweite Zeile', () => {
    expect(showHostLine({ name: 'Angebote', url: 'https://www.rewe.de/x' })).toBe(true)
  })

  test('eine unlesbare Adresse hat keinen Host und damit keine Zeile', () => {
    expect(showHostLine({ name: '', url: 'kaputt' })).toBe(false)
  })
})

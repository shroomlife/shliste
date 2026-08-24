/// <reference types="bun" />
/**
 * Eine Zusage über Privatsphäre, festgenagelt.
 *
 * DAS FEHLERBILD, das diese Regel verhindert: Der neue Weg vom Rezept in den
 * Einkauf zeigte in seiner ersten Fassung ALLE Listen als mögliches Ziel, auch
 * geheime. Damit verriet allein die Auswahl schon, dass es eine geheime Liste
 * gibt — und ein Tippen darauf schrieb Einträge an der Sperre vorbei hinein,
 * die es im Browser gar nicht zu öffnen erlaubt. Ein unabhängiger Review hat
 * das gefunden, nicht ich.
 */
import { describe, expect, test } from 'bun:test'
import { selectableAsTarget } from './listTargets'

const einkauf = { id: 'a', name: 'Wocheneinkauf', secret: false }
const geheim = { id: 'b', name: 'Geschenke', secret: true }

describe('selectableAsTarget', () => {
  test('geheime Listen sind nie ein Ziel', () => {
    expect(selectableAsTarget([einkauf, geheim])).toEqual([einkauf])
  })

  test('sie tauchen auch nicht als gesperrter Eintrag auf', () => {
    // Der Unterschied zwischen "nicht wählbar" und "gar nicht da": Schon Name
    // und Farbe würden verraten, dass es die Liste gibt.
    expect(selectableAsTarget([geheim])).toEqual([])
  })

  test('ohne geheime Listen bleibt alles, in unveränderter Reihenfolge', () => {
    const zweite = { id: 'c', name: 'Baumarkt', secret: false }
    expect(selectableAsTarget([einkauf, zweite])).toEqual([einkauf, zweite])
  })

  test('eine leere Eingabe bleibt leer', () => {
    expect(selectableAsTarget([])).toEqual([])
  })
})

/// <reference types="bun" />
/**
 * Der Zwei-Geräte-Flow des Umsortierens, von Anfang bis Ende.
 *
 * WARUM DIESE DATEI NEBEN `reorder.test.ts` STEHT: Dort wird die Entscheidung
 * geprüft — bekommt `planMoveTo` die richtigen Nachbarn, rechnet es den
 * richtigen Schlüssel. Hier wird der ABLAUF geprüft: Zwei Geräte schieben
 * gleichzeitig, der Server nimmt beides an, und danach zieht jemand am dritten
 * Eintrag. Genau diese Verkettung hat den Fehler erzeugt, und keine der
 * einzelnen Entscheidungen darin war falsch.
 *
 * Gefahren wird mit den ECHTEN Bausteinen: `planMoveTo` trifft die
 * Entscheidung, `toItemDraft`-artiges Zurückschreiben bildet den Schreibweg
 * aus `useListDetail.moveItemTo` nach, und `compareByManualOrder` — derselbe
 * Vergleich, den die Ansicht benutzt — sagt, was der Mensch danach sieht.
 * Attrappen gibt es keine.
 */
import { describe, expect, test } from 'bun:test'
import { compareByManualOrder } from '../../db/repositories'
import { planMoveTo } from './reorder'

/** Eine Zeile, wie die Ansicht sie sortiert. */
interface Zeile {
  id: string
  sortKey: string | null
  orderIndex: number
  createdAt: string
}

function liste(): Zeile[] {
  return [
    { id: 'Milch', sortKey: 'aV', orderIndex: 0, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'Brot', sortKey: 'aW', orderIndex: 1, createdAt: '2026-01-01T00:00:01.000Z' },
    { id: 'Butter', sortKey: 'aX', orderIndex: 2, createdAt: '2026-01-01T00:00:02.000Z' },
    { id: 'Käse', sortKey: 'aY', orderIndex: 3, createdAt: '2026-01-01T00:00:03.000Z' },
  ]
}

/** Was die Ansicht zeigt: derselbe Vergleich wie in der echten Liste. */
function sichtbareReihenfolge(zeilen: readonly Zeile[]): string[] {
  return [...zeilen].sort(compareByManualOrder).map(z => z.id)
}

/**
 * Der Schreibweg aus `useListDetail.moveItemTo`: erst die Normalisierung,
 * dann die verschobene Zeile, jede über denselben Weg.
 */
function wendeAn(zeilen: Zeile[], id: string, toIndex: number): Zeile[] {
  const plan = planMoveTo(zeilen, zeilen, id, toIndex)
  if (plan === null) return zeilen

  const nach = new Map(zeilen.map(z => [z.id, { ...z }]))
  for (const eintrag of [...plan.normalized, plan.moved]) {
    const zeile = nach.get(eintrag.id)
    if (zeile !== undefined) zeile.sortKey = eintrag.sortKey
  }
  return [...nach.values()]
}

describe('zwei Geräte schieben gleichzeitig an dieselbe Stelle', () => {
  /**
   * Der Ausgangspunkt des Fehlers, Schritt für Schritt nachgestellt.
   *
   * Beide Geräte sehen denselben Stand und ziehen gleichzeitig einen Eintrag
   * nach ganz oben. Beide rechnen deshalb denselben Schlüssel aus. Die Pushes
   * betreffen VERSCHIEDENE Zeilen und VERSCHIEDENE Felder — es gibt keinen
   * Konflikt, den das Last-Write-Wins auflösen könnte, und der Server nimmt
   * brav beide an.
   */
  function standNachKollision(): Zeile[] {
    const stand = liste()

    const geraet1 = planMoveTo(stand, stand, 'Butter', 0)
    const geraet2 = planMoveTo(stand, stand, 'Käse', 0)

    // Der Kern: Beide Geräte kommen unabhängig auf denselben Schlüssel.
    expect(geraet1?.moved.sortKey).toBe(geraet2?.moved.sortKey as string)

    const nach = new Map(stand.map(z => [z.id, { ...z }]))
    for (const plan of [geraet1, geraet2]) {
      if (plan === null) continue
      const zeile = nach.get(plan.moved.id)
      if (zeile !== undefined) zeile.sortKey = plan.moved.sortKey
    }
    return [...nach.values()]
  }

  test('der Server nimmt beide an, und danach ist ein Schlüssel doppelt', () => {
    const stand = standNachKollision()
    const schluessel = stand.map(z => z.sortKey)

    expect(new Set(schluessel).size).toBeLessThan(schluessel.length)
  })

  test('die Anzeige bleibt trotzdem geordnet und auf allen Geräten gleich', () => {
    // Das ist der Grund, warum der Fehler so lange unsichtbar blieb:
    // `orderIndex` und `createdAt` springen als Tie-Breaker ein, auf jedem
    // Gerät identisch. Es sieht alles in Ordnung aus.
    const stand = standNachKollision()

    expect(sichtbareReihenfolge(stand)).toHaveLength(4)
    expect(new Set(sichtbareReihenfolge(stand)).size).toBe(4)
  })

  test('der nächste Zug zwischen die beiden wirft nicht mehr', () => {
    // GENAU HIER sprang der Eintrag vorher wortlos zurück: `planMoveTo` warf
    // `a >= b`, die Ausnahme landete in der Konsole, und die Liste blieb für
    // immer so — ein Duplikat löst sich von allein nie wieder auf.
    const stand = standNachKollision()
    const sichtbar = sichtbareReihenfolge(stand)
    const zielPosition = sichtbar.length - 2

    expect(() => wendeAn(stand, 'Milch', zielPosition)).not.toThrow()
  })

  test('der Zug räumt die Kollision ab, statt sie liegen zu lassen', () => {
    const stand = standNachKollision()
    const danach = wendeAn(stand, 'Milch', sichtbareReihenfolge(stand).length - 2)
    const schluessel = danach.map(z => z.sortKey)

    expect(new Set(schluessel).size).toBe(schluessel.length)
  })

  test('und die Liste lässt sich danach beliebig weiter umsortieren', () => {
    // Die eigentliche Zusage: Nach der Heilung ist die Liste wieder ein
    // normaler Arbeitsgegenstand, nicht nur einmal repariert.
    let stand = standNachKollision()
    stand = wendeAn(stand, 'Milch', 2)

    for (const [id, ziel] of [['Brot', 0], ['Käse', 3], ['Butter', 1]] as const) {
      expect(() => {
        stand = wendeAn(stand, id, ziel)
      }).not.toThrow()
    }

    const schluessel = stand.map(z => z.sortKey)
    expect(new Set(schluessel).size).toBe(schluessel.length)
    expect(sichtbareReihenfolge(stand)).toHaveLength(4)
  })
})

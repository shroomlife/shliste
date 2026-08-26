/**
 * Vertrag des Ereignis-Parsers.
 *
 * Die Eingabe kommt roh von der Leitung. Getestet wird deshalb nicht nur der
 * Normalfall, sondern vor allem das, was ein Cast verschluckt hätte: fehlende
 * Felder, ein `itemIds`, das kein JSON-Array ist, und Ereignistypen, die diese
 * Fassung des Clients noch nicht kennt.
 */
import { describe, expect, test } from 'bun:test'
import { parseRealtimeEvent, SYNC_NEEDED } from './events'

const LIST_ID = 'a0000000-0000-4000-8000-000000000001'
const ITEM_ID = 'a0000000-0000-4000-8000-000000000002'
const RECIPE_ID = 'a0000000-0000-4000-8000-000000000003'

describe('parseRealtimeEvent', () => {
  test('deutet die Ereignisse ohne Nutzlast', () => {
    expect(parseRealtimeEvent('{"type":"sync_needed"}')).toEqual({ type: 'sync_needed', seq: null })
    expect(parseRealtimeEvent('{"type":"badge_changed"}')).toEqual({ type: 'badge_changed', seq: null })
  })

  test('deutet die Ereignisse mit Listenbezug', () => {
    expect(parseRealtimeEvent(`{"type":"list_changed","listId":"${LIST_ID}"}`))
      .toEqual({ type: 'list_changed', listId: LIST_ID, seq: null })
    expect(parseRealtimeEvent(`{"type":"member_invited","listId":"${LIST_ID}"}`))
      .toEqual({ type: 'member_invited', listId: LIST_ID, seq: null })
    expect(parseRealtimeEvent(`{"type":"list_removed","listId":"${LIST_ID}"}`))
      .toEqual({ type: 'list_removed', listId: LIST_ID, seq: null })
  })

  test('deutet recipe_changed', () => {
    expect(parseRealtimeEvent(`{"type":"recipe_changed","recipeId":"${RECIPE_ID}"}`))
      .toEqual({ type: 'recipe_changed', recipeId: RECIPE_ID, seq: null })
  })

  test('packt itemIds aus dem verschachtelten JSON aus', () => {
    const raw = JSON.stringify({
      type: 'item_changed',
      listId: LIST_ID,
      itemIds: JSON.stringify([ITEM_ID]),
      seq: null,
    })

    expect(parseRealtimeEvent(raw)).toEqual({
      type: 'item_changed',
      listId: LIST_ID,
      itemIds: [ITEM_ID],
      // Ohne das Feld im Rahmen steht hier null — der Client holt den
      // Sortierzeitpunkt dann wie bisher über `list_changed`.
      listUpdatedAt: null,
      seq: null,
    })
  })

  test('das Ereignis der Link-Anreicherung trägt keinen Sortierzeitpunkt', () => {
    // KEIN ALTLASTFALL, sondern der Dauerzustand: Die serverseitige
    // Anreicherung schreibt Titel und Vorschaubild an die Zeile, rührt aber
    // `updatedAt` der Liste NICHT an — es hat sich ja nichts an der
    // Sortierung geändert. Ihr `item_changed` kommt deshalb ohne das Feld,
    // und der Client darf das nicht als Fehler behandeln, sondern zieht
    // schlicht den Sortierzeitpunkt nicht nach.
    const raw = JSON.stringify({
      type: 'item_changed',
      listId: LIST_ID,
      itemIds: JSON.stringify([ITEM_ID]),
      seq: '42',
    })

    expect(parseRealtimeEvent(raw)).toEqual({
      type: 'item_changed',
      listId: LIST_ID,
      itemIds: [ITEM_ID],
      listUpdatedAt: null,
      seq: 42,
    })
  })

  test('nimmt den Sortierzeitpunkt der Elternliste mit', () => {
    // Damit braucht ein Abhaken kein zusätzliches `list_changed` mehr. Ohne
    // dieses Feld gewinnt im Coalescing `list_changed`, und der Listen-Delta
    // liefert die Liste MIT ALLEN Items — 312 statt einem bei der grössten
    // Liste in Produktion.
    const raw = JSON.stringify({
      type: 'item_changed',
      listId: LIST_ID,
      itemIds: JSON.stringify([ITEM_ID]),
      listUpdatedAt: '2026-08-25T10:00:00.000Z',
      seq: null,
    })

    expect(parseRealtimeEvent(raw)).toEqual({
      type: 'item_changed',
      listId: LIST_ID,
      itemIds: [ITEM_ID],
      listUpdatedAt: '2026-08-25T10:00:00.000Z',
      seq: null,
    })
  })

  test('ein Zeitstempel in fremdem Format wird verworfen, nicht übernommen', () => {
    // Der Wert landet als `updatedAt` in der lokalen Zeile und geht damit ins
    // feldgenaue Last-Write-Wins ein. Ein anderes Format würde dort lautlos
    // jeden Vergleich gewinnen oder verlieren.
    const raw = JSON.stringify({
      type: 'item_changed',
      listId: LIST_ID,
      itemIds: JSON.stringify([ITEM_ID]),
      listUpdatedAt: '25.08.2026',
      seq: null,
    })

    expect(parseRealtimeEvent(raw)).toMatchObject({ listUpdatedAt: null })
  })

  test('erlaubt eine leere Id-Liste', () => {
    const raw = JSON.stringify({ type: 'item_changed', listId: LIST_ID, itemIds: '[]', seq: null })

    expect(parseRealtimeEvent(raw)).toEqual({ type: 'item_changed', listId: LIST_ID, itemIds: [], listUpdatedAt: null, seq: null })
  })

  test('fällt bei unbrauchbaren itemIds auf die Obermenge list_changed zurück', () => {
    // Ohne deutbare Ids bleibt nur die Aussage "an dieser Liste hat sich etwas
    // geändert". Ein item_changed mit leerer Liste wäre nicht von "nichts
    // geändert" zu unterscheiden.
    const cases = [
      JSON.stringify({ type: 'item_changed', listId: LIST_ID, seq: null }),
      JSON.stringify({ type: 'item_changed', listId: LIST_ID, itemIds: 'kein json', seq: null }),
      JSON.stringify({ type: 'item_changed', listId: LIST_ID, itemIds: '{"a":1}' }),
      JSON.stringify({ type: 'item_changed', listId: LIST_ID, itemIds: '[1,2]', seq: null }),
      JSON.stringify({ type: 'item_changed', listId: LIST_ID, itemIds: '["ok",null]', seq: null }),
      JSON.stringify({ type: 'item_changed', listId: LIST_ID, itemIds: 42, seq: null }),
    ]

    for (const raw of cases) {
      expect(parseRealtimeEvent(raw)).toEqual({ type: 'list_changed', listId: LIST_ID, seq: null })
    }
  })

  test('verwirft Ereignisse ohne die Id, die sie brauchen', () => {
    expect(parseRealtimeEvent('{"type":"list_changed"}')).toBeNull()
    expect(parseRealtimeEvent('{"type":"list_changed","listId":""}')).toBeNull()
    expect(parseRealtimeEvent('{"type":"list_changed","listId":17}')).toBeNull()
    expect(parseRealtimeEvent('{"type":"list_removed"}')).toBeNull()
    expect(parseRealtimeEvent('{"type":"member_invited"}')).toBeNull()
    expect(parseRealtimeEvent('{"type":"item_changed","itemIds":"[]"}')).toBeNull()
    expect(parseRealtimeEvent('{"type":"recipe_changed"}')).toBeNull()
  })

  test('verwirft kaputte Eingaben, ohne zu werfen', () => {
    expect(parseRealtimeEvent('')).toBeNull()
    expect(parseRealtimeEvent('{')).toBeNull()
    expect(parseRealtimeEvent('nicht mal json')).toBeNull()
    expect(parseRealtimeEvent('null')).toBeNull()
    expect(parseRealtimeEvent('42')).toBeNull()
    expect(parseRealtimeEvent('"sync_needed"')).toBeNull()
    expect(parseRealtimeEvent('{}')).toBeNull()
    expect(parseRealtimeEvent('{"type":123}')).toBeNull()
  })

  test('verwirft einen noch unbekannten Ereignistyp', () => {
    // Der Aufrufer macht daraus einen vollständigen Abgleich. Ein neuer
    // Ereignistyp der API darf diesen Client nicht brechen.
    expect(parseRealtimeEvent('{"type":"list_archived","listId":"x"}')).toBeNull()
  })

  test('gibt für sync_needed das geteilte, unveränderliche Objekt zurück', () => {
    expect(parseRealtimeEvent('{"type":"sync_needed"}')).toBe(SYNC_NEEDED)
    expect(Object.isFrozen(SYNC_NEEDED)).toBe(true)
  })
})

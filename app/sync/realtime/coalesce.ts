/**
 * Bündelt Echtzeit-Ereignisse, bevor sie den Abgleich auslösen.
 *
 * WARUM ÜBERHAUPT BÜNDELN: Ein einziger Push eines anderen Geräts erzeugt
 * leicht ein Dutzend Ereignisse (jedes geänderte Item, dazu die Liste selbst).
 * Ohne Bündelung würde jedes davon einen eigenen Delta-Abruf anstossen. Ein
 * kurzes Sammelfenster macht daraus einen Abruf je betroffener Liste.
 *
 * Das Fenster ist bewusst kurz: 300 Millisekunden sind kürzer als die Zeit, in
 * der ein Mensch eine Änderung erwartet, aber lang genug, um die Ereignisse
 * eines Pushes zusammenzufassen.
 */
import type { ItemChangedEvent, RealtimeEvent } from './events'

/** Sammelfenster in Millisekunden. */
export const COALESCE_WINDOW_MS = 300

/**
 * Der Schlüssel, unter dem ein Ereignis andere Ereignisse verdrängt.
 *
 * `item_changed` und `list_changed` teilen sich `list:<id>`: Beide führen zum
 * selben Delta-Abruf für dieselbe Liste, zwei Abrufe wären verschwendet.
 *
 * `list_removed` bekommt einen EIGENEN Schlüssel. Eine Entfernung darf nie von
 * einer Änderung überschrieben werden: Sie sagt "diese Liste gehört dir nicht
 * mehr", und die Änderung würde daraus wieder ein harmloses "hol das Delta"
 * machen. Der Delta-Abruf liefert mangels Mitgliedschaft nichts zurück, die
 * Liste bliebe für immer sichtbar. Beide Ereignisse dürfen deshalb parallel
 * durchgereicht werden.
 *
 * `member_invited` und `badge_changed` landen unter `other:<type>`, obwohl
 * `member_invited` eine `listId` trägt. Das ist Absicht: Der Aufrufer holt
 * daraufhin ALLE offenen Einladungen, nicht die eine. Zwei Einladungen in
 * derselben halben Sekunde zusammenzufassen verliert deshalb nichts.
 */
export function coalesceKeyFor(event: RealtimeEvent): string {
  switch (event.type) {
    case 'item_changed':
    case 'list_changed':
      return `list:${event.listId}`
    case 'list_removed':
      return `list-removed:${event.listId}`
    case 'recipe_changed':
      return `recipe:${event.recipeId}`
    default:
      return `other:${event.type}`
  }
}

/** Vereinigt zwei Id-Mengen unter Beibehaltung der Reihenfolge. */
function unionIds(first: readonly string[], second: readonly string[]): string[] {
  return Array.from(new Set([...first, ...second]))
}

/**
 * Führt zwei Ereignisse desselben Schlüssels zusammen.
 *
 * `list_changed` schlägt `item_changed`, und zwar in beide Richtungen: Es ist
 * die Obermenge, denn eine geänderte Liste zieht ihre Positionen ohnehin mit.
 * Andersherum wäre es ein Verlust, weil die Änderung an der Liste selbst (Name,
 * Farbe, Mitglieder, Löschung) dann unter den Tisch fiele.
 *
 * Zwei `item_changed` derselben Liste vereinigen ihre Ids, statt dass das
 * spätere das frühere ersetzt. Andernfalls verlöre der Aufrufer die Ids des
 * ersten Ereignisses.
 */
export function mergeEvents(existing: RealtimeEvent, incoming: RealtimeEvent): RealtimeEvent {
  if (existing.type === 'list_changed' && incoming.type === 'item_changed') return existing
  if (existing.type === 'item_changed' && incoming.type === 'list_changed') return incoming

  if (existing.type === 'item_changed' && incoming.type === 'item_changed') {
    const merged: ItemChangedEvent = {
      type: 'item_changed',
      listId: existing.listId,
      itemIds: unionIds(existing.itemIds, incoming.itemIds),
    }
    return merged
  }

  // Für alle übrigen Paare gilt: gleicher Schlüssel, gleicher Ereignistyp,
  // gleiche Aussage. Das jüngere ist das aktuellere.
  return incoming
}

/**
 * Faltet eine Folge von Ereignissen zusammen.
 *
 * Die Reihenfolge des Ergebnisses ist die des ERSTEN Auftretens je Schlüssel.
 * Das ist wichtiger, als es klingt: Kommt eine Entfernung vor einer Änderung
 * derselben Liste, soll der Aufrufer sie auch zuerst zu sehen bekommen.
 *
 * Als reine Funktion herausgezogen, weil sich die eigentliche Regel damit ohne
 * Zeitgeber prüfen lässt.
 */
export function coalesceEvents(events: Iterable<RealtimeEvent>): RealtimeEvent[] {
  const byKey = new Map<string, RealtimeEvent>()

  for (const event of events) {
    const key = coalesceKeyFor(event)
    const existing = byKey.get(key)
    byKey.set(key, existing === undefined ? event : mergeEvents(existing, event))
  }

  return Array.from(byKey.values())
}

export interface EventCoalescer {
  /** Nimmt ein Ereignis auf und startet bei Bedarf das Sammelfenster. */
  push: (event: RealtimeEvent) => void
  /** Liefert sofort aus, was gesammelt ist. Ohne Inhalt folgenlos. */
  flush: () => void
  /** Verwirft Gesammeltes und den Zeitgeber. Für das Aufräumen. */
  cancel: () => void
}

/**
 * Sammelt Ereignisse für `windowMs` und liefert sie danach gebündelt aus.
 *
 * Das Fenster beginnt mit dem ersten Ereignis und wird von weiteren NICHT
 * verlängert. Ein fortlaufend nachgeladenes Fenster (Debounce) könnte bei
 * einem stetigen Strom von Änderungen beliebig lange nie ausliefern.
 */
export function createEventCoalescer(
  deliver: (events: RealtimeEvent[]) => void,
  windowMs: number = COALESCE_WINDOW_MS,
): EventCoalescer {
  const pending: RealtimeEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  function clear(): void {
    if (timer === null) return
    clearTimeout(timer)
    timer = null
  }

  function flush(): void {
    clear()
    if (pending.length === 0) return

    const batch = coalesceEvents(pending)
    pending.length = 0
    deliver(batch)
  }

  return {
    push(event: RealtimeEvent): void {
      pending.push(event)
      if (timer !== null) return
      timer = setTimeout(flush, windowMs)
    },

    flush,

    cancel(): void {
      clear()
      pending.length = 0
    },
  }
}

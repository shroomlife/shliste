/**
 * Von Echtzeit-Ereignissen zu Datenabrufen.
 *
 * Hier schliesst sich der Kreis: `app/sync/realtime/` hält die Verbindung und
 * bündelt die Hinweise, diese Datei entscheidet, was daraufhin geholt wird.
 * Die Trennung ist Absicht — die Verbindung soll nichts von Datenbanken wissen
 * und der Abgleich nichts von `EventSource`.
 *
 * DIE ENTSCHEIDUNG IN EINEM SATZ: Ein Ereignis mit klarem Bezug (Liste,
 * Positionen, Rezept) wird mit einem Delta beantwortet, alles andere mit einem
 * vollständigen Lauf. Und sobald an der betroffenen Zeile lokal etwas
 * ungesendet ist, wird auch aus dem Delta ein vollständiger Lauf: Ein Delta
 * zieht nur, es pusht nicht, und der eigene Stand darf dabei nicht unter den
 * Tisch fallen.
 *
 * Vorbild ist der Android-Client, der aus denselben Ereignissen dieselben
 * Schlüsse zieht. Weichen die beiden voneinander ab, sehen zwei Geräte nach
 * demselben Ereignis unterschiedliche Daten.
 */
import type { RealtimeEvent } from '../realtime/events'
import type { DeltaFetcher, DeltaTarget } from './delta'
import { runDelta } from './delta'
import type { RealtimeStore } from './ports'

/* ------------------------------------------------------------------ *
 * Der Plan
 * ------------------------------------------------------------------ */

export interface RealtimePlan {
  /**
   * Listen, die dieses Konto nicht mehr sieht. Werden IMMER ausgeführt, auch
   * wenn zusätzlich ein vollständiger Lauf ansteht: Ein Pull erwähnt eine
   * Liste, deren Mitgliedschaft endete, gar nicht mehr — sie bliebe sonst für
   * immer sichtbar.
   */
  removals: string[]
  /** Gezielte Abrufe, in der Reihenfolge des ersten Auftretens. */
  deltas: DeltaTarget[]
  /** Mindestens ein Ereignis liess sich nicht auf ein Delta abbilden. */
  needsFullSync: boolean
}

/**
 * Bildet gebündelte Ereignisse auf Abrufe ab.
 *
 * Rein und ohne Datenbank, damit die Regel ohne Netz und ohne IndexedDB
 * prüfbar ist. Die Frage "ist lokal etwas ungesendet" beantwortet erst die
 * Ausführung, weil nur sie den Speicher kennt.
 *
 * Die Bündelung (`coalesceEvents`) hat bereits je Liste höchstens ein
 * Ereignis übriggelassen. Die Maps hier sind trotzdem da: Diese Funktion soll
 * auch mit ungebündelten Ereignissen richtig sein, sonst wäre sie an eine
 * Eigenschaft ihres Aufrufers gebunden.
 */
export function planRealtimeActions(events: Iterable<RealtimeEvent>): RealtimePlan {
  const removals = new Set<string>()
  const deltas = new Map<string, DeltaTarget>()
  let needsFullSync = false

  for (const event of events) {
    switch (event.type) {
      case 'list_removed':
        removals.add(event.listId)
        break

      case 'list_changed':
        // Überschreibt ein bereits geplantes `items`-Delta derselben Liste:
        // Die Liste zieht ihre Positionen ohnehin mit, der engere Abruf wäre
        // eine zweite Runde ohne Mehrwert.
        deltas.set(`list:${event.listId}`, { kind: 'list', listId: event.listId })
        break

      case 'item_changed': {
        const key = `list:${event.listId}`
        const planned = deltas.get(key)
        // Ein bereits geplanter Listen-Abruf bleibt stehen, er ist die
        // Obermenge. Zwei Positions-Ereignisse derselben Liste vereinigen ihre
        // Ids, statt dass das spätere das frühere verdrängt.
        if (planned?.kind === 'list') break

        const previous = planned?.kind === 'items' ? planned.itemIds : []
        deltas.set(key, {
          kind: 'items',
          listId: event.listId,
          itemIds: Array.from(new Set([...previous, ...event.itemIds])),
          /*
           * Der jüngere Sortierzeitpunkt gewinnt, und ein fehlender darf einen
           * vorhandenen nicht verdrängen — dieselbe Regel wie beim Bündeln der
           * Ereignisse (`mergeEvents` in ../realtime/coalesce.ts).
           *
           * Genau dieser Wert macht das begleitende `list_changed` entbehrlich:
           * Ohne ihn gewinnt es im Coalescing, und der Listen-Delta liefert die
           * Liste MIT ALLEN Items — 312 statt einem bei der grössten Liste in
           * Produktion.
           */
          listUpdatedAt: event.listUpdatedAt
            ?? (planned?.kind === 'items' ? planned.listUpdatedAt : null),
        })
        break
      }

      case 'recipe_changed':
        deltas.set(`recipe:${event.recipeId}`, { kind: 'recipe', recipeId: event.recipeId })
        break

      // Einladungen und Abzeichen haben keinen Delta-Abruf. Ein vollständiger
      // Lauf holt beides mit, denn `GET /sync/pull` liefert `pendingInvites`
      // und `badges` gleich mit.
      case 'member_invited':
      case 'badge_changed':
      case 'sync_needed':
        needsFullSync = true
        break
    }
  }

  return {
    removals: Array.from(removals),
    deltas: Array.from(deltas.values()),
    needsFullSync,
  }
}

/* ------------------------------------------------------------------ *
 * Die Ausführung
 * ------------------------------------------------------------------ */

export interface RealtimeSyncDeps {
  store: RealtimeStore
  fetchDelta: DeltaFetcher
  /**
   * Der vollständige Lauf (pushen, dann ziehen). Bewusst als Rückruf statt
   * als Import der Engine: So bleibt diese Datei ohne Zyklus zur Engine
   * prüfbar, und die Engine behält ihren Mutex für sich.
   */
  runFullSync: () => Promise<unknown>
  /**
   * Es wurde lokal etwas geschrieben. Die Oberfläche soll neu lesen.
   *
   * Nur nach tatsächlichen Änderungen gerufen, nicht nach jedem Ereignis:
   * Ein Delta, das nichts zurückbringt, ist kein Grund, jede Ansicht neu
   * aufzubauen.
   */
  onApplied?: () => void
}

export interface RealtimeSync {
  handleEvents: (events: readonly RealtimeEvent[]) => Promise<void>
}

export function createRealtimeSync(deps: RealtimeSyncDeps): RealtimeSync {
  const { store, fetchDelta, runFullSync, onApplied } = deps

  /** Liegt an dem, was das Delta holen würde, lokal etwas Ungesendetes? */
  const hasLocalChanges = async (target: DeltaTarget): Promise<boolean> =>
    target.kind === 'recipe'
      ? await store.isRecipeDirty(target.recipeId)
      : await store.isListDirty(target.listId)

  const handleEvents = async (events: readonly RealtimeEvent[]): Promise<void> => {
    if (events.length === 0) return

    const plan = planRealtimeActions(events)
    let changed = false

    // Zuerst und unabhängig von allem anderen: Was diesem Konto entzogen
    // wurde, verschwindet lokal. Ein Delta danach könnte es nicht neu
    // anlegen, denn ohne Mitgliedschaft antwortet der Server mit leeren
    // Feldern.
    for (const listId of plan.removals) {
      await store.removeList(listId)
      changed = true
    }

    // Ein vollständiger Lauf deckt jedes Delta ab. Erst prüfen, dann
    // abrufen — sonst liefe ein Delta, dessen Ergebnis der Lauf gleich darauf
    // ohnehin mitbrächte.
    let full = plan.needsFullSync
    const targets: DeltaTarget[] = []

    if (!full) {
      for (const target of plan.deltas) {
        if (await hasLocalChanges(target)) {
          full = true
          break
        }
        targets.push(target)
      }
    }

    if (full) {
      await runFullSync()
      // Der Lauf meldet selbst, was er getan hat; hier zählt nur, dass die
      // Ansichten danach neu lesen müssen.
      onApplied?.()
      return
    }

    for (const target of targets) {
      const outcome = await runDelta(store, fetchDelta, target)
      if (outcome.changed) changed = true
    }

    if (changed) onApplied?.()
  }

  return { handleEvents }
}

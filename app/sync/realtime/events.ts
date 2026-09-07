/**
 * Das Ereignisformat des Echtzeit-Streams von api.shliste.app.
 *
 * Die Ereignisse sind HINWEISE, keine Nutzdaten: Sie sagen "an dieser Liste hat
 * sich etwas geändert", nicht was. Die Daten holt der Aufrufer anschließend
 * über den normalen Sync-Weg. Deshalb darf ein Ereignis auch verloren gehen,
 * ohne dass Daten fehlen; es verzögert nur den Abgleich bis zum nächsten
 * Ereignis oder Zeitgeber.
 *
 * Gegenstück in der API: `api.shliste.app/src/routes/sync/events.ts` (die neun
 * notify-Funktionen) und `event-bus.ts` (Transport). Über die Leitung sind alle
 * Werte Zeichenketten, weil Redis-Streams nur Zeichenketten kennen. `itemIds`
 * ist deshalb ein JSON-String und keine Liste.
 */
import type { IsoUtc } from '../../../shared/types/domain'
import { isIsoUtc } from '../../db/timestamps'

/**
 * Die Änderungsnummer des Kontos nach dem Commit, der dieses Ereignis
 * ausgelöst hat (`lib/change-seq.ts` der API).
 *
 * WOZU AUF JEDEM EREIGNIS: Der Herzschlag trägt dieselbe Nummer. Ohne sie hier
 * könnte ein Tab nach einem Delta-Abgleich seinen Stand nicht fortschreiben —
 * der nächste Herzschlag zeigte eine höhere Nummer als die gespeicherte und
 * löste jedes Mal einen vollen Abgleich aus. Die Delta-Optimierung wäre damit
 * nicht nur wertlos, sondern teurer als vorher.
 *
 * AUF DER LEITUNG IST SIE EINE ZEICHENKETTE, im Herzschlag dagegen eine Zahl.
 * Der Unterschied ist nicht willkürlich: Redis-Streams kennen nur Zeichenketten,
 * der Herzschlag entsteht dagegen als JSON im API-Prozess. Hier wird beides zur
 * Zahl.
 *
 * `null`, wenn der Server sie nicht mitschickt (ältere API).
 */
export interface WithChangeSeq {
  seq: number | null
}

/** Der Server schickt kein Detail: den gesamten Bestand abgleichen. */
export interface SyncNeededEvent extends WithChangeSeq {
  type: 'sync_needed'
}

/** Einzelne Positionen einer Liste haben sich geändert. */
export interface ItemChangedEvent extends WithChangeSeq {
  type: 'item_changed'
  listId: string
  /** Kann leer sein, wenn der Server keine Ids mitgeschickt hat. */
  itemIds: string[]
  /**
   * Der neue Sortierzeitpunkt der Elternliste.
   *
   * Jede Item-Änderung zieht `list.updatedAt` hoch, weil die Übersicht danach
   * sortiert. Ohne dieses Feld erfuhr der Client das nur über ein zusätzliches
   * `list_changed` — und weil das Coalescing `list_changed` gewinnen lässt,
   * landete jedes Abhaken im Listen-Delta, das die Liste MIT ALLEN Items
   * zurückgibt. Bei der größten Liste in Produktion sind das 312 Einträge
   * statt einem.
   *
   * `null`, wenn der Server das Feld nicht schickt (ältere API).
   */
  listUpdatedAt: IsoUtc | null
}

/** Die Liste selbst hat sich geändert (Name, Farbe, Mitglieder, Löschung). */
export interface ListChangedEvent extends WithChangeSeq {
  type: 'list_changed'
  listId: string
}

export interface RecipeChangedEvent extends WithChangeSeq {
  type: 'recipe_changed'
  recipeId: string
}

/** Eine Einladung liegt vor. Der Aufrufer holt alle offenen Einladungen. */
export interface MemberInvitedEvent extends WithChangeSeq {
  type: 'member_invited'
  listId: string
}

/**
 * Das Konto ist nicht mehr Mitglied dieser Liste: entfernt worden, selbst
 * gegangen oder der Eigentümer hat sie gelöscht.
 *
 * Warum ein eigener Typ und nicht `list_changed`: Beim Verlassen setzt der
 * Server bewusst kein `deletedAt` auf die Liste, sie lebt für die anderen
 * Mitglieder weiter. Ein Delta-Abruf liefert mangels Mitgliedschaft nichts
 * zurück, die Liste bliebe hier also für immer sichtbar.
 */
export interface ListRemovedEvent extends WithChangeSeq {
  type: 'list_removed'
  listId: string
}

export interface BadgeChangedEvent extends WithChangeSeq {
  type: 'badge_changed'
}

export type RealtimeEvent
  = | SyncNeededEvent
    | ItemChangedEvent
    | ListChangedEvent
    | RecipeChangedEvent
    | MemberInvitedEvent
    | ListRemovedEvent
    | BadgeChangedEvent

export type RealtimeEventType = RealtimeEvent['type']

/**
 * Der Rückfall, wenn ein Ereignis nicht deutbar ist.
 *
 * Als Konstante exportiert, damit Aufrufer nicht jedes Mal ein eigenes Objekt
 * bauen. Der Typ ist unveränderlich, ein geteiltes Objekt also gefahrlos.
 */
export const SYNC_NEEDED: SyncNeededEvent = Object.freeze<SyncNeededEvent>({ type: 'sync_needed', seq: null })

/** Wahr für jedes nicht-null Objekt. Arrays eingeschlossen. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Ein Zeitstempel aus einem Ereignis, oder `null`.
 *
 * Geprüft statt behauptet: Der Wert landet als `updatedAt` in der lokalen
 * Zeile und geht damit ins feldgenaue Last-Write-Wins ein. Ein Wert in einem
 * anderen Format würde dort lautlos jeden Vergleich verlieren oder gewinnen.
 */
function readIsoOrNull(value: unknown): IsoUtc | null {
  return isIsoUtc(value) ? value : null
}

/**
 * Die Änderungsnummer aus einem Ereignis.
 *
 * Auf der Leitung ist sie eine ZEICHENKETTE — Redis-Streams kennen nichts
 * anderes. Der Herzschlag dagegen ist JSON aus dem API-Prozess und trägt eine
 * Zahl. Beide Formen landen hier als Zahl, alles andere als `null`.
 *
 * Die 0 ist ein gültiger Stand (frisches Konto) und darf nicht durchfallen.
 */
function readSeq(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.length === 0) return null
  const zahl = Number(value)
  return Number.isFinite(zahl) ? zahl : null
}

/**
 * Engt den `itemIds`-String auf eine Liste von Ids ein.
 *
 * Der Wert ist doppelt verpackt: JSON im JSON. Er kommt von außen und wird
 * deshalb geprüft statt gecastet. Alles, was kein String-Array ist, ergibt
 * `null` und nicht ein halb gefülltes Ergebnis.
 */
function parseItemIds(value: unknown): string[] | null {
  if (typeof value !== 'string') return null

  let decoded: unknown
  try {
    decoded = JSON.parse(value)
  }
  catch {
    return null
  }

  if (!Array.isArray(decoded)) return null

  const ids: string[] = []
  for (const entry of decoded) {
    const id = readNonEmptyString(entry)
    // Ein einzelner kaputter Eintrag macht die ganze Liste unbrauchbar: Wer
    // weiß, welche Ids sonst noch fehlen. Lieber gar keine Ids melden.
    if (id === null) return null
    ids.push(id)
  }
  return ids
}

/**
 * Deutet die `data`-Zeile eines Ereignisses.
 *
 * `null` heißt "nicht deutbar" und nicht "kein Ereignis". Der Aufrufer soll
 * daraus `SYNC_NEEDED` machen: Dass der Server etwas geschickt hat, ist der
 * Beweis, dass sich etwas geändert hat. Nur das Was ist unklar, und ein
 * vollständiger Abgleich ist die sichere Deutung. Genau so verhält sich auch
 * der Android-Client.
 */
export function parseRealtimeEvent(raw: string): RealtimeEvent | null {
  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  }
  catch {
    return null
  }

  if (!isRecord(decoded)) return null

  const type = decoded.type
  const seq = readSeq(decoded.seq)
  switch (type) {
    case 'sync_needed':
      // Mit Nummer ein eigenes Objekt, ohne die geteilte Konstante.
      return seq === null ? SYNC_NEEDED : { type: 'sync_needed', seq }

    case 'badge_changed':
      return { type: 'badge_changed', seq }

    case 'item_changed': {
      const listId = readNonEmptyString(decoded.listId)
      if (listId === null) return null

      const itemIds = parseItemIds(decoded.itemIds)
      // Ohne deutbare Ids bleibt die sichere Obermenge: Die Liste hat sich
      // geändert. Ein `item_changed` mit leerem Array wäre die schlechtere
      // Wahl, weil es sich nicht von "nichts hat sich geändert" unterscheiden
      // ließe und die Bündelung es als leere Menge weiterreichen würde.
      if (itemIds === null) return { type: 'list_changed', listId, seq }

      return { type: 'item_changed', listId, itemIds, listUpdatedAt: readIsoOrNull(decoded.listUpdatedAt), seq }
    }

    case 'list_changed':
    case 'member_invited':
    case 'list_removed': {
      const listId = readNonEmptyString(decoded.listId)
      if (listId === null) return null
      return { type, listId, seq }
    }

    case 'recipe_changed': {
      const recipeId = readNonEmptyString(decoded.recipeId)
      if (recipeId === null) return null
      return { type: 'recipe_changed', recipeId, seq }
    }

    default:
      // Auch ein künftiger, hier noch unbekannter Ereignistyp landet hier und
      // wird vom Aufrufer zum vollständigen Abgleich. Ein neuer Ereignistyp
      // der API bricht diesen Client damit nicht.
      return null
  }
}

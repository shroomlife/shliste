/**
 * Gesehen je Konto: der Abgleich der Gesehen-Zeitpunkte.
 *
 * Zwei Richtungen, beide nur vorwärts (Regeln in `app/db/seen.ts`):
 *
 * - herunter: Der Pull bringt `seenMarks`, die eigenen Zeitpunkte des Kontos
 *   von allen Geräten. `applySeenMarks` übernimmt sie mit dem Maximum.
 * - hinauf: Nach dem Pull meldet `pushSeenMarksQuietly` alles, was lokal
 *   gesehen und dem Server noch unbekannt ist (`POST /sync/seen`).
 *
 * Gesehen ist kein Inhalt. Es steht in keinem Hash, macht keine Zeile
 * schmutzig und darf einen Abgleich NIE scheitern lassen. Andere Mitglieder
 * einer geteilten Liste erfahren davon nichts, das trennt der Server.
 */
import type { IsoUtc } from '../../../shared/types/domain'
import { withKnownSeen, type SeenMark } from '../../db/seen'
import { toSyncError, type SyncError } from './errors'
import { isRecord, readArray, readIso } from './json'
import type { RowStores, SeenStore } from './ports'

/** Deckel je Upload, derselbe Wert wie `MAX_SEEN_MARKS` in `api/src/routes/sync/seen.ts`. */
export const MAX_SEEN_MARKS_PER_PUSH = 500

/**
 * Eine Marke aus Pull oder Antwort. Alles andere als eine nicht-leere Id mit
 * gültigem Zeitpunkt fällt weg — `parseAll` lässt es dann aus.
 *
 * Der Zeitpunkt geht durch `readIso` und ist danach auf das lokale Format
 * normalisiert. Nur so vergleicht `compareIso` ihn korrekt als Zeitpunkt.
 */
export function parseSeenMark(value: unknown): SeenMark | null {
  if (!isRecord(value)) return null
  const listId = value['listId']
  const seenAt = readIso(value, 'seenAt')
  if (typeof listId !== 'string' || listId.length === 0 || seenAt === null) return null
  return { listId, seenAt }
}

/**
 * Übernimmt Marken des Servers in die Listenzeilen.
 *
 * Eine Marke für eine Liste, die hier (noch) nicht liegt, trifft keine Zeile
 * und bleibt folgenlos. Deshalb ruft `runPull` dies erst am Ende auf, wenn die
 * Listen ALLER Seiten stehen. Kommt dieselbe Liste später dazu, bringt ein
 * voller Pull die Marke erneut mit.
 *
 * Je Marke eine eigene Transaktion über `mutate`: Ein gleichzeitiges
 * `markListSeen` kann dazwischen nicht verlorengehen, und das Maximum sieht
 * immer den aktuellen Stand der Zeile.
 */
export async function applySeenMarks(rows: RowStores, marks: readonly SeenMark[]): Promise<void> {
  for (const mark of marks) {
    await rows.lists.mutate(mark.listId, local => (local === undefined ? null : withKnownSeen(local, mark.seenAt)))
  }
}

/** Schickt einen Block an `POST /sync/seen` und liefert die rohe Antwort. */
export type SeenSender = (marks: readonly SeenMark[]) => Promise<unknown>

export interface SeenPushOutcome {
  /** Wie viele Zeitpunkte gemeldet wurden. `0` heißt: nichts offen, keine Anfrage. */
  sent: number
  /** Für wie viele Listen der Server einen gültigen Stand geantwortet hat. */
  answered: number
  /** Der verschluckte Fehler, falls das Melden gescheitert ist. */
  error: SyncError | null
}

/**
 * Meldet offene Gesehen-Zeitpunkte ans Konto und wirft NIE.
 *
 * Was nicht ankommt, bleibt über `seenPushedAt` offen und geht beim nächsten
 * Abgleich mit. Was der Server nicht angenommen hat (etwa eine Liste, die er
 * nicht kennt oder die dieses Konto nicht mehr sieht), gilt trotzdem als
 * gemeldet: Sonst ginge es bei jedem Abgleich erneut hinaus, ohne je
 * anzukommen.
 */
export async function pushSeenMarksQuietly(store: SeenStore, send: SeenSender): Promise<SeenPushOutcome> {
  let sent = 0
  try {
    const pending = await store.readPendingSeenMarks(MAX_SEEN_MARKS_PER_PUSH)
    if (pending.length === 0) return { sent: 0, answered: 0, error: null }
    sent = pending.length

    const response = await send(pending)
    // Ohne die erwartete Form ist unklar, was angekommen ist. Dann bleibt alles
    // offen, statt es auf Verdacht als gemeldet abzuhaken.
    if (!isRecord(response) || !Array.isArray(response['marks'])) {
      throw new Error('Die Antwort auf die Gesehen-Meldung ist ungültig.')
    }
    const answered = new Map<string, IsoUtc>()
    for (const value of readArray(response, 'marks')) {
      const mark = parseSeenMark(value)
      if (mark !== null) answered.set(mark.listId, mark.seenAt)
    }

    for (const mark of pending) {
      const known = answered.get(mark.listId) ?? mark.seenAt
      await store.rows.lists.mutate(mark.listId, local => (local === undefined ? null : withKnownSeen(local, known, mark.seenAt)))
    }
    return { sent, answered: answered.size, error: null }
  }
  catch (cause) {
    return { sent, answered: 0, error: toSyncError(cause) }
  }
}

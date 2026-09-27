/**
 * Das Gesehen-Wasserzeichen einer Liste, als reine Rechenregeln.
 *
 * Gesehen gilt für das KONTO: Wer eine Liste auf einem Gerät öffnet, hat sie
 * auf allen seinen Geräten gesehen (`POST /sync/seen` der API, zurück kommt es
 * als `seenMarks` im Pull). Zwei Felder an der Listenzeile tragen das:
 *
 * - `seenAt`: wann die Liste zuletzt offen war, auf irgendeinem Gerät
 * - `seenPushedAt`: bis zu welchem `seenAt` der Server Bescheid weiß
 *
 * Liegt `seenAt` über `seenPushedAt`, steht der Zeitpunkt zum Hochladen an.
 * Das ist die ganze Warteschlange: Sie übersteht Offline-Phasen und Neuladen
 * von selbst. Dasselbe Muster wie `seenPushedAt` in der Android-App.
 *
 * Beide Felder laufen nur vorwärts. Alle Zeitstempel hier sind im Format von
 * `toIso()` (feste Breite, UTC), deshalb vergleicht `compareIso` sie als
 * Zeitpunkte. Werte vom Server gehen vorher durch `readIso`, das normalisiert.
 */
import type { IsoUtc } from '../../shared/types/domain'
import type { ListLocalFields, ListRow } from './schema'
import { compareIso } from './timestamps'

/** Der spätere von zwei Zeitpunkten. `null` heißt "keiner", nicht "ältester". */
export function laterIso(a: IsoUtc | null, b: IsoUtc | null): IsoUtc | null {
  if (a === null) return b
  if (b === null) return a
  return compareIso(a, b) >= 0 ? a : b
}

/**
 * Die gerätelokalen Felder einer bestehenden Zeile, für jeden Weg, der eine
 * Listenzeile aus anderen Daten neu baut (Pull, Push-Konflikt, Umbenennen).
 *
 * Fehlt eines davon in der neuen Zeile, gälte die Liste danach als nie gesehen
 * oder ein längst hochgeladener Zeitpunkt wieder als offen. `undefined` aus
 * Zeilen von vor diesen Feldern wird dabei zu `null`, das bedeutet dasselbe.
 */
export function keepListLocalFields(local: ListLocalFields | undefined): Required<ListLocalFields> {
  return {
    seenAt: local?.seenAt ?? null,
    seenPushedAt: local?.seenPushedAt ?? null,
  }
}

/** Ein Gesehen-Zeitpunkt einer Liste, wie ihn `POST /sync/seen` und der Pull tragen. */
export interface SeenMark {
  listId: string
  seenAt: IsoUtc
}

/**
 * Der Gesehen-Zeitpunkt dieser Liste, falls der Server ihn noch nicht kennt,
 * sonst `null`.
 *
 * Eine Zeile ohne `seenPushedAt` (auch jede aus der Zeit vor diesem Feld) hat
 * noch nie etwas gemeldet. Genau dadurch gehen bestehende lokale Zeitpunkte
 * beim ersten Abgleich nach dem Update ans Konto.
 */
export function pendingSeenMark(row: ListRow): SeenMark | null {
  const { seenAt, seenPushedAt } = keepListLocalFields(row)
  if (seenAt === null) return null
  if (seenPushedAt !== null && compareIso(seenAt, seenPushedAt) <= 0) return null
  return { listId: row.id, seenAt }
}

/**
 * Übernimmt einen Zeitpunkt, den der Server kennt: aus dem Pull (ein anderes
 * Gerät desselben Kontos) oder aus der Antwort auf den eigenen Upload.
 *
 * Beide Felder nehmen das Maximum. Ein lokal jüngeres `seenAt` bleibt also
 * stehen und bleibt, weil es über `seenPushedAt` liegt, zum Hochladen offen.
 * Nichts sonst an der Zeile ändert sich, insbesondere nicht `dirty` und
 * `updatedAt`: Hinschauen ist keine Bearbeitung.
 *
 * `reportedSeenAt` ist der Wert, den dieses Gerät selbst gemeldet hat. Er
 * zählt für `seenPushedAt` mit, auch wenn der Server ihn auf seine Uhr gekappt
 * hat: Gemeldet ist gemeldet. Sonst bliebe bei einer vorgehenden Geräteuhr der
 * Zeitpunkt offen, jeder Abgleich meldete ihn erneut, der Server rückte jedes
 * Mal auf seine Uhr vor und weckte damit die eigenen Geräte zum nächsten
 * Abgleich, bis die echte Zeit die Geräteuhr eingeholt hat.
 *
 * `null` heißt "nichts zu schreiben", dann bleibt die Zeile unberührt.
 */
export function withKnownSeen(row: ListRow, knownSeenAt: IsoUtc, reportedSeenAt: IsoUtc | null = null): ListRow | null {
  const current = keepListLocalFields(row)
  const seenAt = laterIso(current.seenAt, knownSeenAt)
  const seenPushedAt = laterIso(current.seenPushedAt, laterIso(knownSeenAt, reportedSeenAt))
  if (seenAt === current.seenAt && seenPushedAt === current.seenPushedAt) return null
  return { ...row, seenAt, seenPushedAt }
}

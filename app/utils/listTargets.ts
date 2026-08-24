import type { ListRow } from '../db/schema'

/**
 * Welche Listen dürfen im Browser Einträge entgegennehmen?
 *
 * Geheime Listen nicht. Sie lassen sich hier nicht öffnen, weil es im Browser
 * kein Gegenstück zur biometrischen Sperre der Android-App gibt und ein
 * schwächerer Schutz schlechter wäre als keiner. Stünden sie trotzdem als Ziel
 * zur Wahl, könnte man an genau dieser Sperre vorbei in sie hineinschreiben.
 *
 * Sie tauchen auch nicht als gesperrter Eintrag auf: Schon Name und Farbe
 * würden verraten, dass es sie gibt, und mehr hat eine geheime Liste gar nicht
 * zu verbergen.
 *
 * Diese Regel steht bewusst hier und nicht als Filter in einer Komponente. Sie
 * ist eine Zusage über Privatsphäre, und die soll geprüft werden können und an
 * einer Stelle gelten, egal wie viele Wege es künftig in eine Liste hinein gibt.
 */
export function selectableAsTarget<T extends Pick<ListRow, 'secret'>>(lists: readonly T[]): T[] {
  return lists.filter(list => !list.secret)
}

/**
 * Wie eine Zeile heisst, wenn sie ein Link ist.
 *
 * WARUM ES DIESEN HELFER GIBT: Ein Link-Eintrag entsteht mit LEEREM Namen —
 * niemand tippt beim Teilen einer Seite einen Namen. Angezeigt wird deshalb
 * der Seitentitel, den der Server nachträgt, und bis der da ist der Host.
 * Sobald jemand die Zeile umbenennt, gewinnt sein Name für immer: `name`
 * gehört dem Menschen, `linkTitle` dem Server, und der Server schreibt NIE in
 * `name`. Genau dadurch kann eine Anreicherung eine Umbenennung nicht
 * überschreiben.
 *
 * Der Anzeigename gehört an JEDE menschen- und KI-gerichtete Stelle: Zeile,
 * Toasts, Verlaufstexte, Vorschlags- und Bearbeitungsanfragen. Sonst stünde
 * dort ein leerer Text, und die KI bekäme eine namenlose Position vorgesetzt.
 *
 * Rein und ohne Vue — die Fallsammlung dazu ist
 * `app/sync/merge/link-fixtures.json` und läuft in allen drei Repos.
 */
import { hostOf } from './url'

/**
 * Was der Helfer von einer Zeile braucht.
 *
 * `linkTitle` und `url` sind optional, weil Bestandszeilen in IndexedDB die
 * Schlüssel schlicht nicht tragen (siehe `DB_VERSION` 3) und weil Aufrufer
 * wie die Verlaufs-Wiederherstellung mit Teilzeilen arbeiten.
 */
export interface DisplayableListItem {
  name: string
  linkTitle?: string | null
  url?: string | null
}

/**
 * Der Name, der auf dem Schirm steht: eigener Name, sonst Seitentitel, sonst
 * Host, sonst die Adresse selbst, sonst leer.
 *
 * Die Adresse als letzte Stufe ist Absicht: Eine unlesbare Adresse anzuzeigen
 * ist immer noch besser als eine leere Zeile, auf die niemand tippen mag.
 */
export function listItemDisplayName(item: DisplayableListItem): string {
  const name = item.name.trim()
  if (name.length > 0) return name

  const title = item.linkTitle?.trim() ?? ''
  if (title.length > 0) return title

  const host = hostOf(item.url)
  if (host.length > 0) return host

  return item.url ?? ''
}

/**
 * Steht unter dem Namen noch die Herkunft?
 *
 * Nur wenn es einen lesbaren Host gibt UND der Anzeigename nicht schon der
 * Host ist. Sonst stünde derselbe Text zweimal untereinander — der häufigste
 * Fall überhaupt, nämlich ein frisch geteilter Link ohne Titel.
 */
export function showHostLine(item: DisplayableListItem): boolean {
  const host = hostOf(item.url)
  if (host.length === 0) return false
  return listItemDisplayName(item) !== host
}

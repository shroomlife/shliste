/**
 * EINE Regel für die drei Server-Spiegel eines Listeneintrags — und die
 * einzige Stelle, an der sie steht.
 *
 * DIE REGEL: Titel, Vorschaubild und Bildart gehören zu GENAU EINER Adresse.
 * Sie werden übernommen, solange die Zeile noch auf dieselbe Adresse zeigt,
 * und fallen sonst weg. Sie werden nie gemergt und nie erfunden — der Server
 * ist ihr einziger Schreiber.
 *
 * WARUM DAS NICHT "IMMER VERBATIM VOM SERVER" HEISSEN KANN: Es gibt einen
 * Fall, in dem die Serverzeile und die Zeile, die wir schreiben, auf
 * VERSCHIEDENE Seiten zeigen — nämlich wenn die Adresse lokal geändert wurde
 * und diese Änderung den Konflikt gewinnt (Push-Konfliktantwort) oder das
 * feldweise Last-Write-Wins (Pull). Der Titel des Servers beschreibt dann die
 * ALTE Seite. Ihn trotzdem zu übernehmen, klebte einen fremden Titel und ein
 * fremdes Bild an einen frisch gesetzten Link — sichtbar falsch, und zwar so
 * lange, bis der Server die neue Adresse gesehen und angereichert hat. Genau
 * dieselbe Überlegung hat die Android-Kollegin dazu gebracht, im Konfliktpfad
 * gar nichts zu übernehmen; diese Fassung ist eine Spur genauer, weil sie den
 * häufigen Fall (Adresse unverändert, Zeile nur abgehakt) weiterhin sofort
 * anreichert, statt auf den nächsten Pull zu warten.
 *
 * Drei Aufrufer, dieselbe Regel:
 * - `linkFieldsAfterWrite` in `app/db/repositories.ts` (lokaler Schreibweg)
 * - `applyItem` in `app/sync/engine/pull.ts` (Pull und Delta)
 * - `applyConflicts` in `app/sync/engine/push.ts` (Konfliktantwort)
 */
import type { LinkImageKind, LinkMirrorField, ListItem } from '../../../shared/types/domain'

/** Die drei serverseitig gepflegten Felder eines Listeneintrags. */
export interface LinkMirrors {
  linkTitle: string | null
  linkImagePath: string | null
  linkImageKind: LinkImageKind | null
}

/** Kein Titel, kein Bild — der Ruhezustand. */
export function emptyLinkMirrors(): LinkMirrors {
  return { linkTitle: null, linkImagePath: null, linkImageKind: null }
}

/**
 * Die Spiegel, die zu `effectiveUrl` gehören.
 *
 * `source` ist die Zeile, die sie mitbringt: beim lokalen Schreiben die
 * bestehende Zeile, beim Abgleich die Serverzeile. `effectiveUrl` ist die
 * Adresse, die die geschriebene Zeile TATSÄCHLICH tragen wird.
 *
 * Stimmen beide Adressen überein, werden die Spiegel wörtlich übernommen —
 * auch `null`, denn ein Zurücksetzen auf dem Server ist eine Aussage. Weichen
 * sie ab (oder gibt es keine Quelle), bleiben drei `null` übrig.
 */
export function linkMirrorsFor(
  source: Pick<ListItem, 'url' | LinkMirrorField> | undefined,
  effectiveUrl: string | null,
): LinkMirrors {
  if (source === undefined || source.url !== effectiveUrl) return emptyLinkMirrors()

  return {
    linkTitle: source.linkTitle,
    linkImagePath: source.linkImagePath,
    linkImageKind: source.linkImageKind,
  }
}

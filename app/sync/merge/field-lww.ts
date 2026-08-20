/**
 * Field-Level Last-Write-Wins (LWW) + Add-Wins — Pull-Richtung für die Web-PWA.
 *
 * QUELLE: `api.shliste.app/src/lib/field-lww.ts`. Dort steht die massgebliche
 * Semantik, diese Datei ist eine Portierung davon. Gegenprobe:
 * `android-app/app/src/main/java/com/shroomlife/shliste/sync/FieldTimestampManager.kt`.
 *
 * ACHTUNG CROSS-PLATTFORM: Dieselbe Logik existiert dreifach — API, Android,
 * Web. Änderungen an `MUTABLE_FIELDS`, an `ADD_WINS_CONTENT_FIELDS` oder an
 * einer der Vergleichsregeln dürfen NUR gemeinsam mit API und Android
 * ausgerollt werden, und die API muss zuerst live gehen (siehe
 * `api.shliste.app/CLAUDE.md`). Laufen die drei Implementierungen auseinander,
 * mergen die Geräte denselben Konflikt unterschiedlich und konvergieren nicht
 * mehr: Daten verschwinden oder tauchen wieder auf.
 *
 * Alle Zeitvergleiche laufen NUMERISCH über Epoch-Millisekunden, niemals
 * lexikografisch über die ISO-Strings. Grund: Javas `Instant.toString()`
 * (Android) lässt `.000` weg ("2026-07-16T10:15:00Z"), JS `toISOString()`
 * schreibt immer "2026-07-16T10:15:00.000Z". Als Strings verglichen wäre
 * "…00Z" grösser als "…00.000Z", obwohl beide denselben Zeitpunkt bezeichnen.
 */
import type { FieldTimestamps } from '../../../shared/types/domain'

export type { FieldTimestamps }

/** Die sechs synchronisierten Entitätstypen — SSOT für die Karten unten. */
export const ENTITY_TYPES = [
  'list',
  'listItem',
  'recipe',
  'recipeIngredient',
  'recipeStep',
  'badge',
] as const

export type EntityType = typeof ENTITY_TYPES[number]

/**
 * Mutable Fields pro Entitätstyp — nur diese nehmen am feldweisen Vergleich
 * teil. Zeichengleich mit `MUTABLE_FIELDS` in API und Android.
 *
 * Bewusst `Record<string, …>` statt `Record<EntityType, …>`: Ein unbekannter
 * Typ liefert dann `undefined` statt eines Compile-Fehlers, und der Aufrufer
 * fällt auf "keine Felder" zurück. Das ist die sichere Richtung (dieselbe
 * Begründung wie bei `applyAddWins`). Die Vollständigkeit sichert ein Test.
 */
export const MUTABLE_FIELDS: Record<string, readonly string[]> = {
  list: ['name', 'color', 'secret', 'lastSuggestedItems', 'sourceUrl', 'deletedAt'],
  listItem: ['name', 'quantity', 'checked', 'removed', 'orderIndex', 'sortKey', 'deletedAt'],
  recipe: ['name', 'color', 'sourceUrl', 'imagePath', 'deletedAt'],
  recipeIngredient: ['name', 'quantity', 'orderIndex', 'sortKey', 'deletedAt'],
  recipeStep: ['description', 'orderIndex', 'sortKey', 'isChecked', 'aiExplanation', 'deletedAt'],
  badge: ['recipeName', 'recipeColor', 'recipeImagePath', 'earnedAt', 'deletedAt'],
}

/**
 * Felder, deren Zeitstempel eine Löschung zurücknehmen darf — pro Entitätstyp.
 *
 * Warum eine eigene Liste statt einfach "alle MUTABLE_FIELDS":
 *
 * 1. `orderIndex` und `sortKey` sind Positionsfelder. Eine einzige
 *    Umsortierung stempelt sie für ALLE Geschwister neu. Sie sind damit
 *    Nebenwirkung einer Massenoperation und drücken keine Absicht aus, ein
 *    gelöschtes Element zurückzuholen. Ohne diesen Ausschluss holt jemand, der
 *    sortiert, während ein anderes Gerät ein Item löscht, das gelöschte Item
 *    für alle zurück — und zwar gleich reihenweise.
 * 2. Die Löschmarker `deletedAt` und `removed` fehlen ebenfalls bewusst: Ein
 *    Delete darf kein anderes Delete aufheben. Sonst nähme ein späteres
 *    `removed = true` ein früheres `deletedAt` zurück und die Zeile stünde als
 *    Zombie wieder da.
 *
 * Beides sieht beim Lesen wie ein vergessener Eintrag aus und ist keiner.
 */
export const ADD_WINS_CONTENT_FIELDS: Record<string, readonly string[]> = {
  list: ['name', 'color', 'secret', 'lastSuggestedItems', 'sourceUrl'],
  listItem: ['name', 'quantity', 'checked'],
  recipe: ['name', 'color', 'sourceUrl', 'imagePath'],
  recipeIngredient: ['name', 'quantity'],
  recipeStep: ['description', 'isChecked', 'aiExplanation'],
  badge: ['recipeName', 'recipeColor', 'recipeImagePath', 'earnedAt'],
}

/**
 * Parst einen ISO-8601-Zeitstempel zu Epoch-Millisekunden.
 *
 * Fehlende ("" / `undefined`) und unparsbare Werte (`Date.parse` liefert `NaN`,
 * etwa bei einem kaputten Client-Wert) gelten als "ältestmöglich"
 * (`-Infinity`): Sie verlieren jeden Vergleich gegen einen gültigen
 * Zeitstempel. Bewusst kein Throw — ein einzelner kaputter Wert darf den Merge
 * nicht abbrechen.
 */
function toEpochMs(ts: string | undefined): number {
  if (!ts) return Number.NEGATIVE_INFINITY
  const ms = Date.parse(ts)
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms
}

export interface MergeResult {
  /** Zusammengeführte Werte — pro Feld der Gewinner */
  mergedValues: Record<string, unknown>
  /** Zusammengeführte Zeitstempel — pro Feld der des Gewinners */
  mergedTimestamps: FieldTimestamps
  /** Felder, die die lokale Seite gewonnen hat: Sie müssen beim nächsten Push raus. */
  localWinFields: string[]
  /** Kurzform für `localWinFields.length > 0` — die Zeile bleibt dirty. */
  hasLocalWins: boolean
}

/**
 * Feldweises Last-Write-Wins zwischen lokaler Zeile und Serverzeile.
 *
 * ASYMMETRISCHER GLEICHSTAND — ABSICHTLICH, BITTE NICHT "AUFRÄUMEN":
 * - Pull (hier, Web und Android): der SERVER gewinnt bei Gleichstand. Die
 *   Bedingung für einen lokalen Sieg lautet `lokal > server`, also strikt neuer.
 * - Push (API, `mergeFields` in `src/lib/field-lww.ts`): der CLIENT gewinnt bei
 *   Gleichstand. Die Bedingung lautet dort `incoming >= existing`.
 *
 * Damit ist pro Richtung genau eine Seite autoritativ: Was ein Client hochlädt,
 * setzt sich bei identischem Zeitstempel durch (Push ist client-freundlich);
 * was er wieder herunterlädt, bleibt bei identischem Zeitstempel der
 * Serverstand (Pull ist server-autoritativ). Zöge man beide Seiten auf `>=`,
 * könnte ein Feld bei gleichem Zeitstempel endlos zwischen zwei Geräten
 * hin- und herwechseln, weil jede Seite ihren eigenen Wert für den neueren
 * hielte.
 *
 * `-Infinity` für fehlende und kaputte Werte erledigt die Sonderfälle von
 * selbst: Ein fehlender lokaler Zeitstempel ist nie strikt grösser und
 * verliert; ein gültiger lokaler Wert schlägt einen fehlenden Serverwert;
 * fehlen beide, ist es ein Gleichstand und der Server gewinnt.
 *
 * Mutiert die Eingaben nicht.
 */
export function mergeFields(
  fields: readonly string[],
  local: Record<string, unknown>,
  localTs: FieldTimestamps,
  server: Record<string, unknown>,
  serverTs: FieldTimestamps,
): MergeResult {
  const mergedValues: Record<string, unknown> = {}
  const mergedTimestamps: FieldTimestamps = {}
  const localWinFields: string[] = []

  for (const field of fields) {
    const localTime = localTs[field] ?? ''
    const serverTime = serverTs[field] ?? ''

    if (toEpochMs(localTime) > toEpochMs(serverTime)) {
      // Lokal gewinnt: gültig und strikt neuer.
      mergedValues[field] = local[field]
      mergedTimestamps[field] = localTime
      localWinFields.push(field)
    }
    else {
      // Server gewinnt — Gleichstand eingeschlossen (siehe Asymmetrie oben).
      mergedValues[field] = server[field]
      // Hat der Server für dieses Feld gar keinen Zeitstempel, wird der lokale
      // weitergetragen statt verworfen: Sonst verlöre die Zeile die einzige
      // Information darüber, wann das Feld zuletzt angefasst wurde, und der
      // nächste Vergleich startete wieder bei -Infinity.
      mergedTimestamps[field] = serverTime !== '' ? serverTime : localTime
    }
  }

  return {
    mergedValues,
    mergedTimestamps,
    localWinFields,
    hasLocalWins: localWinFields.length > 0,
  }
}

/**
 * Add-Wins: Ein Inhalts-Edit nach einem Delete ist ein Restore (AW-Set,
 * Shapiro 2011).
 *
 * Wurde ein INHALTSFELD (siehe `ADD_WINS_CONTENT_FIELDS`) strikt NACH
 * `deletedAt` bearbeitet, wird `deletedAt` auf `null` gesetzt. Analog für den
 * ListItem-Marker `removed`. "Strikt" ist wichtig: Bei Gleichstand bleibt
 * gelöscht gelöscht, sonst höbe eine Löschung, die zufällig auf derselben
 * Millisekunde wie ein Edit landet, sich selbst auf.
 *
 * Der Zeitstempel von `deletedAt` bleibt stehen. Er wird beim nächsten echten
 * Delete überschrieben — würde man ihn hier mitlöschen, verlöre der nächste
 * Vergleich seinen Bezugspunkt.
 *
 * Ein unbekannter `entityType` hat keine Inhaltsfelder und kann deshalb nichts
 * reanimieren. Das ist die sichere Richtung: Ein vergessener Eintrag in der
 * Karte kostet ein Restore, kein stilles Wiederauferstehen gelöschter Daten.
 *
 * Mutiert `mergedValues` in-place — genau wie API und Android, damit die drei
 * Implementierungen Zeile für Zeile vergleichbar bleiben — und meldet per
 * Rückgabewert, ob wiederhergestellt wurde.
 */
export function applyAddWins(
  entityType: string,
  mergedValues: Record<string, unknown>,
  mergedTimestamps: FieldTimestamps,
): boolean {
  const contentFields = ADD_WINS_CONTENT_FIELDS[entityType] ?? []
  let restored = false

  /** Gibt es ein Inhaltsfeld, das strikt später bearbeitet wurde als der Marker? */
  const hasLaterContentEdit = (markerTs: string): boolean =>
    contentFields.some(field => toEpochMs(mergedTimestamps[field]) > toEpochMs(markerTs))

  // Restore von deletedAt.
  // Der Marker braucht einen nicht-leeren Zeitstempel: Ohne ihn ist unbekannt,
  // wann gelöscht wurde, und "danach bearbeitet" liesse sich nicht belegen.
  //
  // Hier lief Android bis zum 20.08.2026 auseinander: `applyAddWins` prüfte dort
  // nur auf `!= null`, liess den leeren String durch und stellte die Zeile
  // wieder her, während API und Web sie gelöscht liessen. Behoben, und seither
  // durch den Fixture-Fall "gelöschte Zeile ohne deletedAt-Zeitstempel bleibt
  // gelöscht" abgesichert, der in allen drei Repos läuft. Nicht wieder auf eine
  // reine null-Prüfung zurückbauen.
  const deletedAtTs = mergedTimestamps['deletedAt']
  if (mergedValues['deletedAt'] != null && deletedAtTs && hasLaterContentEdit(deletedAtTs)) {
    mergedValues['deletedAt'] = null
    restored = true
  }

  // Restore von removed (nur ListItem trägt diesen zweiten Löschmarker).
  const removedTs = mergedTimestamps['removed']
  if (mergedValues['removed'] === true && removedTs && hasLaterContentEdit(removedTs)) {
    mergedValues['removed'] = false
    restored = true
  }

  return restored
}

/** Lokale Zeile, so wie sie aus dem Offline-Speicher kommt. */
export interface LocalRow {
  values: Record<string, unknown>
  fieldTimestamps: FieldTimestamps | null
  /** Es gibt lokale Änderungen, die noch nicht gepusht wurden. */
  dirty: boolean
}

/** Serverzeile, so wie sie aus dem Pull kommt. */
export interface ServerRow {
  values: Record<string, unknown>
  fieldTimestamps: FieldTimestamps | null
}

export interface PullMergeResult {
  /**
   * ACHTUNG für den Aufrufer: Im Merge-Zweig enthält `values` ausschliesslich
   * die Felder aus `MUTABLE_FIELDS` — `id`, `listId`, `createdAt` und alles
   * andere Unveränderliche steht NICHT darin. Die Zeile wird aus der
   * Serverzeile plus diesen Werten zusammengesetzt, genau wie im
   * Android-Client. Im Nicht-Merge-Zweig ist es eine Kopie der Serverwerte.
   */
  values: Record<string, unknown>
  fieldTimestamps: FieldTimestamps
  /** Muss die Zeile beim nächsten Push wieder mit? */
  dirty: boolean
  /** Hat Add-Wins eine Löschung zurückgenommen? */
  restored: boolean
}

/**
 * Wendet eine Serverzeile auf den lokalen Stand an — der komplette Pull-Pfad
 * für eine Zeile.
 *
 * GEMERGT WIRD NUR EINE DIRTY-ZEILE. Ist die lokale Zeile sauber (oder gibt es
 * sie noch nicht), wird die Serverzeile unverändert übernommen. Das ist keine
 * Optimierung, sondern Korrektheit: Eine saubere Zeile hat nichts
 * beizusteuern, ihre Zeitstempel stammen ohnehin vom Server. Ein Merge könnte
 * hier nur Schaden anrichten, etwa indem er Felder wiederbelebt, die der
 * Server längst korrekt aufgelöst hat.
 *
 * GEWINNT LOKAL EIN FELD, BLEIBT DIE ZEILE DIRTY. Sonst fiele der lokale
 * Gewinner beim nächsten Push aus der Auswahl und wäre verloren, obwohl er den
 * Konflikt gewonnen hat.
 *
 * `applyAddWins` läuft bewusst nur im Merge-Zweig: Bei einer sauberen Zeile hat
 * der Server Add-Wins bereits angewendet.
 */
export function mergePulledEntity(
  entityType: EntityType,
  local: LocalRow | null,
  server: ServerRow,
): PullMergeResult {
  if (local === null || !local.dirty) {
    return {
      values: { ...server.values },
      fieldTimestamps: { ...(server.fieldTimestamps ?? {}) },
      dirty: false,
      restored: false,
    }
  }

  const fields = MUTABLE_FIELDS[entityType] ?? []
  const merged = mergeFields(
    fields,
    local.values,
    local.fieldTimestamps ?? {},
    server.values,
    server.fieldTimestamps ?? {},
  )
  const restored = applyAddWins(entityType, merged.mergedValues, merged.mergedTimestamps)

  return {
    values: merged.mergedValues,
    fieldTimestamps: merged.mergedTimestamps,
    dirty: merged.hasLocalWins,
    restored,
  }
}

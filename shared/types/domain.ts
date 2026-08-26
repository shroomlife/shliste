/**
 * Domänenmodell — exakt am Contract von api.shliste.app ausgerichtet.
 *
 * Wichtig gegenüber der alten Web-App:
 * - Schlüssel heisst `id`, nicht `uuid`
 * - Items liegen in einer eigenen Tabelle, nicht eingebettet in der Liste
 * - Rezeptschritte sind Zeilen mit eigenen Feldern, kein string[]
 * - Zeitstempel sind ISO-UTC mit GENAU drei Millisekundenstellen
 * - Jede synchronisierte Zeile trägt `fieldTimestamps` und `deletedAt`
 */

/**
 * ISO-8601 UTC mit exakt drei Millisekundenstellen, z.B. 2026-08-19T10:15:00.000Z
 *
 * Nicht verhandelbar: Die API validiert per Regex (ISO_UTC_TIMESTAMP_PATTERN),
 * Android erzwingt es mit appendInstant(3). Ein abweichendes Format bedeutet
 * 422 auf den GESAMTEN Push, nicht nur auf die betroffene Zeile.
 */
export type IsoUtc = string

/** Feldname -> Zeitpunkt der letzten Änderung dieses Feldes */
export type FieldTimestamps = Record<string, IsoUtc>

/** Gemeinsame Felder jeder synchronisierten Entität */
export interface SyncedEntity {
  id: string
  createdAt: IsoUtc
  /** Client-gestempelt, speist das Last-Write-Wins. NICHT der Server-Cursor. */
  updatedAt: IsoUtc
  /** Tombstone. Löschungen sind immer weich. */
  deletedAt: IsoUtc | null
  fieldTimestamps: FieldTimestamps | null
}

export interface List extends SyncedEntity {
  name: string
  /** Zufalls-RGB als #RRGGBB, wird als 20-Prozent-Lasur dargestellt */
  color: string
  /** Geheime Listen sind nicht teilbar und werden im Web gesperrt dargestellt */
  secret: boolean
  lastSuggestedItems: string
  sourceUrl: string | null
  /** UUID des Eigentümers. Aus dem Pull als `ownerUserId ?? userId` lesen. */
  ownerUserId: string | null
}

/**
 * Woher das Vorschaubild eines Links stammt.
 *
 * `preview` ist das Bild der Seite (og:image), `icon` ihr Favicon. Der
 * Unterschied ist eine Anzeigefrage: Ein Vorschaubild füllt die Kachel
 * (`object-cover`), ein Favicon steht klein und mittig auf getöntem Grund.
 * Ein unbekannter Wert vom Server wird beim Lesen zu `null` (siehe
 * `parseListItem`).
 */
export type LinkImageKind = 'preview' | 'icon'

/**
 * Die drei Felder, die AUSSCHLIESSLICH der Server pflegt.
 *
 * Sie sind ein Spiegel und kein Besitz: Der Client sendet sie nie und mergt
 * sie nie, sondern übernimmt sie bei jedem Abgleich wörtlich vom Server — auf
 * JEDEM Pfad (Pull, Delta, Konfliktantwort des Pushs). Sie tragen deshalb auch
 * keine `fieldTimestamps` und stehen in keiner der beiden LWW-Karten.
 *
 * Die eine lokale Ausnahme: Ändert sich `url`, nullt der Client die drei
 * sofort selbst — sonst stünde der Titel der alten Seite unter der neuen
 * Adresse, bis der Server nachzieht.
 *
 * NUR EIN TYP UND KEINE KONSTANTE: Diese Datei enthält ausschliesslich Typen
 * und wird deshalb beim Übersetzen restlos wegradiert. Ein Laufzeitwert darin
 * erzeugte einen echten Import über die Grenze von `app/` nach `shared/`, und
 * genau daran ist der Produktionsbuild gescheitert. Die Liste als Werte steht
 * dort, wo sie gebraucht wird (`app/db/schema.ts`).
 */
export type LinkMirrorField = 'linkTitle' | 'linkImagePath' | 'linkImageKind'

export interface ListItem extends SyncedEntity {
  listId: string
  /**
   * Der Name, den ein MENSCH vergeben hat. Der Server schreibt hier nie
   * hinein, und genau dadurch kann eine Anreicherung eine Umbenennung nicht
   * überschreiben.
   *
   * Darf leer sein, aber nur wenn `url` gesetzt ist: Ein Link-Eintrag entsteht
   * beim Teilen ohne Namen und zeigt dann `linkTitle` oder den Host
   * (`app/utils/listItemDisplay.ts`).
   */
  name: string
  quantity: number
  checked: boolean
  /**
   * Zweiter Löschmarker neben deletedAt: "rausgeworfen", per Undo
   * wiederherstellbar, bleibt als Verlauf für Vorschläge erhalten.
   */
  removed: boolean
  orderIndex: number
  /** Base-62 Bruchindex. Lieber null als gekürzt — ein gekürzter Key ist ungültig. */
  sortKey: string | null
  /**
   * Die Adresse hinter dem Eintrag. NUTZER-FELD: gemergt wie `name`, gesendet
   * wie `name`, und beim Merge zählt es als Inhalt (Add-Wins).
   *
   * Gespeichert wird die getrimmte Eingabe, nie eine normalisierte Fassung
   * (Begründung in `app/utils/url.ts`).
   */
  url: string | null
  /** Server-Spiegel: der Titel der Seite. Siehe `LINK_MIRROR_FIELDS`. */
  linkTitle: string | null
  /** Server-Spiegel: `link:{32 hex}.webp`. Siehe `LINK_MIRROR_FIELDS`. */
  linkImagePath: string | null
  /** Server-Spiegel: Art des Bildes. Siehe `LINK_MIRROR_FIELDS`. */
  linkImageKind: LinkImageKind | null
  createdBy: string | null
  modifiedBy: string | null
}

export interface Recipe extends SyncedEntity {
  name: string
  color: string
  sourceUrl: string | null
  /** Serverreferenz in der Form `sync:{userId}/{recipeId}/{hash}.webp` */
  imagePath: string | null
}

export interface RecipeIngredient extends SyncedEntity {
  recipeId: string
  name: string
  quantity: number
  orderIndex: number
  sortKey: string | null
  createdBy: string | null
  modifiedBy: string | null
}

export interface RecipeStep extends SyncedEntity {
  recipeId: string
  description: string
  orderIndex: number
  sortKey: string | null
  isChecked: boolean
  aiExplanation: string | null
  createdBy: string | null
  modifiedBy: string | null
}

export interface Badge extends SyncedEntity {
  recipeId: string
  recipeName: string
  recipeImagePath: string | null
  recipeColor: string
  earnedAt: IsoUtc
}

/** Append-only, deshalb ohne updatedAt/deletedAt/fieldTimestamps */
export interface RecipeChatMessage {
  id: string
  recipeId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: IsoUtc
  createdBy: string | null
}

/** Wozu ein Historien-Eintrag gehört: Liste oder Rezept. */
export type HistoryParentType = 'list' | 'recipe'

/**
 * Was der Eintrag festhält. Bisher nur Löschungen — der Verlauf zeigt
 * ausschliesslich, was sich wiederherstellen lässt.
 */
export type HistoryActionType = 'deleted'

/** Welche Art Zeile gelöscht wurde. */
export type HistoryEntityType = 'list_item' | 'recipe_ingredient' | 'recipe_step'

/**
 * Ein Eintrag der Lösch-Historie — das Gegenstück zu Androids HistorySheet.
 *
 * Append-only wie RecipeChatMessage, deshalb ohne updatedAt/deletedAt/
 * fieldTimestamps: Ein Eintrag wird geschrieben und nie geändert. `createdBy`
 * ist die Server-User-UUID des Verursachers und kommt ausschliesslich per
 * Pull — lokal erzeugte Einträge tragen `null` ("von mir"), der Server
 * stempelt den Wert beim Push selbst.
 *
 * `snapshotJson` ist die gelöschte Zeile als JSON. ACHTUNG INTEROP: Beide
 * Clients schreiben ihre EIGENE Objektform hinein (Android `uuid`/`order`,
 * PWA `id`/`orderIndex`). Gelesen wird deshalb nur über den toleranten
 * Parser `parseHistorySnapshot` in `app/history/snapshot.ts`.
 */
export interface HistoryEntry {
  id: string
  parentId: string
  parentType: HistoryParentType
  actionType: HistoryActionType
  entityType: HistoryEntityType
  entityId: string
  description: string
  snapshotJson: string
  createdBy: string | null
  createdAt: IsoUtc
}

export type MemberRole = 'owner' | 'member'
export type MemberStatus = 'accepted' | 'pending'

export interface ListMember {
  listId: string
  /** UUID des Nutzers, nicht die interne Ganzzahl-ID */
  userId: string
  /**
   * Nur für den Eigentümer der Liste gefüllt. `null` heisst
   * "Adresse nicht sichtbar" und NICHT "kein Konto".
   */
  email: string | null
  displayName: string | null
  photoUrl: string | null
  role: MemberRole
  status: MemberStatus
}

export interface PendingInvite {
  listId: string
  listName: string
  listColor: string
  invitedBy: {
    userId: string
    displayName: string | null
    photoUrl: string | null
  } | null
}

/** Das Profil, das die BFF nach dem Sign-in an den Client gibt */
export interface UserProfile {
  userId: string
  email: string
  displayName: string | null
  photoUrl: string | null
}

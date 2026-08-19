/**
 * Domaenenmodell — exakt am Contract von api.shliste.app ausgerichtet.
 *
 * Wichtig gegenueber der alten Web-App:
 * - Schluessel heisst `id`, nicht `uuid`
 * - Items liegen in einer eigenen Tabelle, nicht eingebettet in der Liste
 * - Rezeptschritte sind Zeilen mit eigenen Feldern, kein string[]
 * - Zeitstempel sind ISO-UTC mit GENAU drei Millisekundenstellen
 * - Jede synchronisierte Zeile traegt `fieldTimestamps` und `deletedAt`
 */

/**
 * ISO-8601 UTC mit exakt drei Millisekundenstellen, z.B. 2026-08-19T10:15:00.000Z
 *
 * Nicht verhandelbar: Die API validiert per Regex (ISO_UTC_TIMESTAMP_PATTERN),
 * Android erzwingt es mit appendInstant(3). Ein abweichendes Format bedeutet
 * 422 auf den GESAMTEN Push, nicht nur auf die betroffene Zeile.
 */
export type IsoUtc = string

/** Feldname -> Zeitpunkt der letzten Aenderung dieses Feldes */
export type FieldTimestamps = Record<string, IsoUtc>

/** Gemeinsame Felder jeder synchronisierten Entitaet */
export interface SyncedEntity {
  id: string
  createdAt: IsoUtc
  /** Client-gestempelt, speist das Last-Write-Wins. NICHT der Server-Cursor. */
  updatedAt: IsoUtc
  /** Tombstone. Loeschungen sind immer weich. */
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
  /** UUID des Eigentuemers. Aus dem Pull als `ownerUserId ?? userId` lesen. */
  ownerUserId: string | null
}

export interface ListItem extends SyncedEntity {
  listId: string
  name: string
  quantity: number
  checked: boolean
  /**
   * Zweiter Loeschmarker neben deletedAt: "rausgeworfen", per Undo
   * wiederherstellbar, bleibt als Verlauf fuer Vorschlaege erhalten.
   */
  removed: boolean
  orderIndex: number
  /** Base-62 Bruchindex. Lieber null als gekuerzt — ein gekuerzter Key ist ungueltig. */
  sortKey: string | null
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

export type MemberRole = 'owner' | 'member'
export type MemberStatus = 'accepted' | 'pending'

export interface ListMember {
  listId: string
  /** UUID des Nutzers, nicht die interne Ganzzahl-ID */
  userId: string
  /**
   * Nur fuer den Eigentuemer der Liste gefuellt. `null` heisst
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

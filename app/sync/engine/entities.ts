/**
 * Serverzeilen zu Domänenzeilen.
 *
 * Diese Datei ist die Kante zwischen fremdem JSON und dem Domänenmodell. Alles
 * dahinter darf sich auf die Typen verlassen, alles davor auf gar nichts.
 *
 * WAS EINE ZEILE UNGÜLTIG MACHT: Nur was ohne sinnvollen Ersatz fehlt — die
 * Id, die Elternreferenz und die Pflichtzeitstempel. Für alles andere gilt der
 * Vorgabewert aus dem API-Schema (`SyncPushBodySchema`), denn genau den hätte
 * der Server auch eingesetzt. Eine kaputte Zeile wird verworfen und nicht
 * geworfen: Ein einzelner Datensatz darf den Abgleich des ganzen Geräts nicht
 * anhalten.
 */
import type {
  Badge,
  HistoryEntry,
  LinkImageKind,
  List,
  ListItem,
  ListMember,
  MemberRole,
  MemberStatus,
  PendingInvite,
  Recipe,
  RecipeChatMessage,
  RecipeIngredient,
  RecipeStep,
} from '../../../shared/types/domain'
import {
  isRecord,
  readBooleanOr,
  readFieldTimestamps,
  readIso,
  readNullableIso,
  readNullableString,
  readNumberOr,
  readString,
  readStringOr,
} from './json'

/**
 * Der Eigentümer einer Liste.
 *
 * `List.userId` ist ein befristetes Duplikat von `ownerUserId` (siehe
 * `api.shliste.app/src/routes/sync/pull.ts`, Contract 3.1). Gelesen wird
 * `ownerUserId ?? userId`, damit die Reihenfolge des Rollouts egal ist.
 */
export function readOwnerUserId(source: Record<string, unknown>): string | null {
  return readNullableString(source, 'ownerUserId') ?? readNullableString(source, 'userId')
}

/** Die drei Felder, die jede synchronisierte Zeile braucht. */
interface Base {
  id: string
  createdAt: string
  updatedAt: string
}

function readBase(source: Record<string, unknown>): Base | null {
  const id = readString(source, 'id')
  const createdAt = readIso(source, 'createdAt')
  const updatedAt = readIso(source, 'updatedAt')

  if (id === null || id === '' || createdAt === null || updatedAt === null) return null
  return { id, createdAt, updatedAt }
}

export function parseList(value: unknown): List | null {
  if (!isRecord(value)) return null
  const base = readBase(value)
  if (base === null) return null

  return {
    ...base,
    name: readStringOr(value, 'name', ''),
    color: readStringOr(value, 'color', ''),
    secret: readBooleanOr(value, 'secret', false),
    lastSuggestedItems: readStringOr(value, 'lastSuggestedItems', ''),
    sourceUrl: readNullableString(value, 'sourceUrl'),
    ownerUserId: readOwnerUserId(value),
    deletedAt: readNullableIso(value, 'deletedAt'),
    fieldTimestamps: readFieldTimestamps(value, 'fieldTimestamps'),
  }
}

/**
 * Die Art des Vorschaubildes.
 *
 * Ein unbekannter Wert wird zu `null` statt geraten — dieselbe Regel wie bei
 * der Chat-Rolle. Der Domänentyp zählt zwei Literale auf, und ein erfundenes
 * drittes liefe in jedem `v-if` der Oberfläche ins Leere. `null` heißt dann
 * schlicht "kein Bild", und die Kachel zeigt ihr Ersatz-Icon.
 */
function readLinkImageKind(source: Record<string, unknown>): LinkImageKind | null {
  const value = readNullableString(source, 'linkImageKind')
  return value === 'preview' || value === 'icon' ? value : null
}

/**
 * Ein Listeneintrag.
 *
 * DIE VIER LINK-FELDER SIND TOLERANT GELESEN: Ein Server, der sie noch nicht
 * kennt, schickt sie nicht mit — dann sind sie `null`, und das ist der
 * richtige Ruhezustand. Umgekehrt schickt der Server drei Felder mit, die den
 * Client NICHTS angehen (`linkFetchedAt`, `linkAttempts`,
 * `linkNextAttemptAt`): Sie sind sein Warteschlangenzustand, werden hier gar
 * nicht erst gelesen und fallen damit von selbst weg.
 */
export function parseListItem(value: unknown): ListItem | null {
  if (!isRecord(value)) return null
  const base = readBase(value)
  if (base === null) return null

  const listId = readString(value, 'listId')
  if (listId === null || listId === '') return null

  return {
    ...base,
    listId,
    name: readStringOr(value, 'name', ''),
    quantity: readNumberOr(value, 'quantity', 1),
    checked: readBooleanOr(value, 'checked', false),
    removed: readBooleanOr(value, 'removed', false),
    orderIndex: readNumberOr(value, 'orderIndex', 0),
    sortKey: readNullableString(value, 'sortKey'),
    url: readNullableString(value, 'url'),
    linkTitle: readNullableString(value, 'linkTitle'),
    linkImagePath: readNullableString(value, 'linkImagePath'),
    linkImageKind: readLinkImageKind(value),
    createdBy: readNullableString(value, 'createdBy'),
    modifiedBy: readNullableString(value, 'modifiedBy'),
    deletedAt: readNullableIso(value, 'deletedAt'),
    fieldTimestamps: readFieldTimestamps(value, 'fieldTimestamps'),
  }
}

export function parseRecipe(value: unknown): Recipe | null {
  if (!isRecord(value)) return null
  const base = readBase(value)
  if (base === null) return null

  return {
    ...base,
    name: readStringOr(value, 'name', ''),
    color: readStringOr(value, 'color', ''),
    sourceUrl: readNullableString(value, 'sourceUrl'),
    imagePath: readNullableString(value, 'imagePath'),
    deletedAt: readNullableIso(value, 'deletedAt'),
    fieldTimestamps: readFieldTimestamps(value, 'fieldTimestamps'),
  }
}

export function parseIngredient(value: unknown): RecipeIngredient | null {
  if (!isRecord(value)) return null
  const base = readBase(value)
  if (base === null) return null

  const recipeId = readString(value, 'recipeId')
  if (recipeId === null || recipeId === '') return null

  return {
    ...base,
    recipeId,
    name: readStringOr(value, 'name', ''),
    quantity: readNumberOr(value, 'quantity', 1),
    orderIndex: readNumberOr(value, 'orderIndex', 0),
    sortKey: readNullableString(value, 'sortKey'),
    createdBy: readNullableString(value, 'createdBy'),
    modifiedBy: readNullableString(value, 'modifiedBy'),
    deletedAt: readNullableIso(value, 'deletedAt'),
    fieldTimestamps: readFieldTimestamps(value, 'fieldTimestamps'),
  }
}

export function parseStep(value: unknown): RecipeStep | null {
  if (!isRecord(value)) return null
  const base = readBase(value)
  if (base === null) return null

  const recipeId = readString(value, 'recipeId')
  if (recipeId === null || recipeId === '') return null

  return {
    ...base,
    recipeId,
    description: readStringOr(value, 'description', ''),
    orderIndex: readNumberOr(value, 'orderIndex', 0),
    sortKey: readNullableString(value, 'sortKey'),
    isChecked: readBooleanOr(value, 'isChecked', false),
    aiExplanation: readNullableString(value, 'aiExplanation'),
    createdBy: readNullableString(value, 'createdBy'),
    modifiedBy: readNullableString(value, 'modifiedBy'),
    deletedAt: readNullableIso(value, 'deletedAt'),
    fieldTimestamps: readFieldTimestamps(value, 'fieldTimestamps'),
  }
}

export function parseBadge(value: unknown): Badge | null {
  if (!isRecord(value)) return null
  const base = readBase(value)
  if (base === null) return null

  const recipeId = readString(value, 'recipeId')
  const earnedAt = readIso(value, 'earnedAt')
  if (recipeId === null || recipeId === '' || earnedAt === null) return null

  return {
    ...base,
    recipeId,
    recipeName: readStringOr(value, 'recipeName', ''),
    recipeImagePath: readNullableString(value, 'recipeImagePath'),
    recipeColor: readStringOr(value, 'recipeColor', ''),
    earnedAt,
    deletedAt: readNullableIso(value, 'deletedAt'),
    fieldTimestamps: readFieldTimestamps(value, 'fieldTimestamps'),
  }
}

/**
 * Chat-Nachrichten sind append-only: kein `updatedAt`, kein `deletedAt`, keine
 * Feldstempel. Eine unbekannte Rolle wird verworfen statt geraten — der
 * Domänentyp lässt nur zwei zu, und eine erfundene dritte würde in jedem
 * `switch` der Oberfläche ins Leere laufen.
 */
export function parseChatMessage(value: unknown): RecipeChatMessage | null {
  if (!isRecord(value)) return null

  const id = readString(value, 'id')
  const recipeId = readString(value, 'recipeId')
  const createdAt = readIso(value, 'createdAt')
  const role = readString(value, 'role')

  if (id === null || id === '' || recipeId === null || recipeId === '' || createdAt === null) return null
  if (role !== 'user' && role !== 'assistant') return null

  return {
    id,
    recipeId,
    role,
    content: readStringOr(value, 'content', ''),
    createdAt,
    createdBy: readNullableString(value, 'createdBy'),
  }
}

/**
 * Ein Eintrag der Lösch-Historie — append-only wie die Chat-Nachricht.
 *
 * Unbekannte Werte in den drei Typfeldern werden verworfen statt geraten,
 * dieselbe Regel wie bei der Chat-Rolle: Der Domänentyp zählt seine Literale
 * auf, und ein erfundener vierter Entitätstyp liefe bei der
 * Wiederherstellung in jedem `switch` ins Leere. Verwerfen ist folgenlos —
 * die Anzeige filtert ohnehin auf `deleted`, und was der Client nicht
 * wiederherstellen kann, soll er auch nicht anbieten.
 *
 * `snapshotJson` bleibt hier ein roher String: Seine Form gehört dem
 * toleranten `parseHistorySnapshot` (`app/history/snapshot.ts`), denn beide
 * Clients schreiben ihre eigene Objektform hinein.
 */
export function parseHistoryEntry(value: unknown): HistoryEntry | null {
  if (!isRecord(value)) return null

  const id = readString(value, 'id')
  const parentId = readString(value, 'parentId')
  const entityId = readString(value, 'entityId')
  const createdAt = readIso(value, 'createdAt')
  const parentType = readString(value, 'parentType')
  const actionType = readString(value, 'actionType')
  const entityType = readString(value, 'entityType')

  if (id === null || id === '' || parentId === null || parentId === '') return null
  if (entityId === null || entityId === '' || createdAt === null) return null
  if (parentType !== 'list' && parentType !== 'recipe') return null
  if (actionType !== 'deleted') return null
  if (entityType !== 'list_item' && entityType !== 'recipe_ingredient' && entityType !== 'recipe_step') return null

  return {
    id,
    parentId,
    parentType,
    actionType,
    entityType,
    entityId,
    description: readStringOr(value, 'description', ''),
    snapshotJson: readStringOr(value, 'snapshotJson', ''),
    createdBy: readNullableString(value, 'createdBy'),
    createdAt,
  }
}

/**
 * Ein Mitglied einer geteilten Liste.
 *
 * `email` bleibt `null`, wenn der Server sie nicht mitschickt — das heißt
 * "Adresse nicht sichtbar" und NICHT "kein Konto" (siehe `member-view.ts` in
 * der API).
 */
export function parseMember(value: unknown, listId: string): ListMember | null {
  if (!isRecord(value)) return null

  const userId = readNullableString(value, 'userId') ?? readNullableString(value, 'uuid')
  if (userId === null || userId === '') return null

  return {
    listId,
    userId,
    email: readNullableString(value, 'email'),
    displayName: readNullableString(value, 'displayName'),
    photoUrl: readNullableString(value, 'photoUrl'),
    role: readRole(value),
    status: readStatus(value),
  }
}

function readRole(source: Record<string, unknown>): MemberRole {
  return readString(source, 'role') === 'owner' ? 'owner' : 'member'
}

/**
 * Angenommen oder noch offen.
 *
 * Der Server schickt `status`; fehlt es, entscheidet `acceptedAt`. Ohne beides
 * gilt "pending" — eine offene Einladung fälschlich als angenommen zu zeigen
 * wäre die schlechtere Richtung.
 */
function readStatus(source: Record<string, unknown>): MemberStatus {
  const status = readString(source, 'status')
  if (status === 'accepted' || status === 'pending') return status
  return readNullableString(source, 'acceptedAt') === null ? 'pending' : 'accepted'
}

export function parsePendingInvite(value: unknown): PendingInvite | null {
  if (!isRecord(value)) return null

  const listId = readString(value, 'listId')
  if (listId === null || listId === '') return null

  const invitedByRaw = value['invitedBy']
  const invitedById = isRecord(invitedByRaw) ? readNullableString(invitedByRaw, 'userId') : null

  return {
    listId,
    listName: readStringOr(value, 'listName', ''),
    listColor: readStringOr(value, 'listColor', ''),
    invitedBy: isRecord(invitedByRaw) && invitedById !== null
      ? {
          userId: invitedById,
          displayName: readNullableString(invitedByRaw, 'displayName'),
          photoUrl: readNullableString(invitedByRaw, 'photoUrl'),
        }
      : null,
  }
}

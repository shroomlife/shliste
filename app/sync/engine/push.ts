/**
 * Der Push: lokale Änderungen hoch zur API.
 *
 * DREI REGELN TRAGEN DIESE DATEI:
 *
 * 1. `pushSnapshot` wird VOR dem Lesen der schmutzigen Zeilen genommen. Alles,
 *    was während des Netzwerk-Roundtrips bearbeitet wird, bleibt danach
 *    schmutzig — sonst bestätigte der Server den alten Stand, das Flag fiele
 *    weg und die neue Fassung würde nie hochgeladen.
 * 2. Kein Kind liegt in einem früheren Block als sein Elternteil (siehe
 *    `splitIntoBlocks`).
 * 3. Die Blöcke gehen streng nacheinander über die Leitung. Wer sie
 *    parallelisiert oder umsortiert, bricht Regel 2.
 *
 * Vorbild ist `SyncManager.performPush` und `SyncPushChunker` der Android-App;
 * die Invarianten sind dort erprobt und dürfen nicht auseinanderlaufen.
 */
import type {
  Badge,
  FieldTimestamps,
  HistoryEntry,
  IsoUtc,
  List,
  ListItem,
  Recipe,
  RecipeChatMessage,
  RecipeIngredient,
  RecipeStep,
} from '../../../shared/types/domain'
import { CLEAN, type ListItemRow } from '../../db/schema'
import { isAtOrBefore, nowIso } from '../../db/timestamps'
import { linkMirrorsFor, type LinkMirrors } from '../merge/link-mirrors'
import { sanitize } from '../merge/limits'
import {
  parseBadge,
  parseIngredient,
  parseList,
  parseListItem,
  parseRecipe,
  parseStep,
} from './entities'
import { API_ISO_PATTERN, isRecord, parseAll, readArray, readIso, readNumberOr } from './json'
import type { DirtyRows, PushStore, RowStores } from './ports'

/* ------------------------------------------------------------------ *
 * Die Nutzlast — exakt die Felder aus `SyncPushBodySchema`
 *
 * Bewusst eigene Typen statt der Domänentypen: Der Push ist ein Vertrag, und
 * ein Vertrag zählt seine Felder auf. Nebenbei bleibt so garantiert weder das
 * lokale `dirty` noch `List.ownerUserId` in der Nutzlast — beides kennt das
 * Schema der API nicht.
 * ------------------------------------------------------------------ */

export interface PushList {
  id: string
  name: string
  color: string
  secret: boolean
  lastSuggestedItems: string
  sourceUrl: string | null
  createdAt: IsoUtc
  updatedAt: IsoUtc
  deletedAt: IsoUtc | null
  fieldTimestamps: FieldTimestamps | null
}

/**
 * Die drei Server-Spiegel stehen bewusst NICHT in dieser Nutzlast: Sie
 * gehören dem Server, der sie beim Anreichern selbst schreibt. Ein Client,
 * der sie mitschickte, behauptete ein Wissen, das er nicht hat — die API
 * ignoriert sie deshalb ohnehin.
 */
export interface PushListItem {
  id: string
  listId: string
  name: string
  quantity: number
  checked: boolean
  removed: boolean
  orderIndex: number
  sortKey: string | null
  url: string | null
  createdAt: IsoUtc
  updatedAt: IsoUtc
  deletedAt: IsoUtc | null
  fieldTimestamps: FieldTimestamps | null
  createdBy: string | null
  modifiedBy: string | null
}

export interface PushRecipe {
  id: string
  name: string
  color: string
  sourceUrl: string | null
  imagePath: string | null
  createdAt: IsoUtc
  updatedAt: IsoUtc
  deletedAt: IsoUtc | null
  fieldTimestamps: FieldTimestamps | null
}

export interface PushRecipeIngredient {
  id: string
  recipeId: string
  name: string
  quantity: number
  orderIndex: number
  sortKey: string | null
  createdAt: IsoUtc
  updatedAt: IsoUtc
  deletedAt: IsoUtc | null
  fieldTimestamps: FieldTimestamps | null
  createdBy: string | null
  modifiedBy: string | null
}

export interface PushRecipeStep {
  id: string
  recipeId: string
  description: string
  orderIndex: number
  sortKey: string | null
  isChecked: boolean
  aiExplanation: string | null
  createdAt: IsoUtc
  updatedAt: IsoUtc
  deletedAt: IsoUtc | null
  fieldTimestamps: FieldTimestamps | null
  createdBy: string | null
  modifiedBy: string | null
}

export interface PushRecipeChatMessage {
  id: string
  recipeId: string
  role: string
  content: string
  createdAt: IsoUtc
  createdBy: string | null
}

export interface PushBadge {
  id: string
  recipeId: string
  recipeName: string
  recipeImagePath: string | null
  recipeColor: string
  earnedAt: IsoUtc
  createdAt: IsoUtc
  updatedAt: IsoUtc
  deletedAt: IsoUtc | null
  fieldTimestamps: FieldTimestamps | null
}

/**
 * `createdBy` fehlt mit Absicht: Der Server stempelt den Verursacher beim
 * Push selbst (Contract) — ein mitgeschickter Wert würde ohnehin
 * überschrieben, ihn gar nicht erst zu senden ist die ehrlichere Aussage.
 */
export interface PushHistoryEntry {
  id: string
  parentId: string
  parentType: string
  actionType: string
  entityType: string
  entityId: string
  description: string
  snapshotJson: string
  createdAt: IsoUtc
}

export interface PushPayload {
  lists: PushList[]
  listItems: PushListItem[]
  recipes: PushRecipe[]
  recipeIngredients: PushRecipeIngredient[]
  recipeSteps: PushRecipeStep[]
  recipeChatMessages: PushRecipeChatMessage[]
  badges: PushBadge[]
  historyEntries: PushHistoryEntry[]
}

/**
 * MÜSSEN mit `maxItems` in `api.shliste.app/src/routes/sync/schemas.ts`
 * übereinstimmen. Ein einziges Element zu viel, und der komplette Block fällt
 * mit 422 durch — nicht nur die überzählige Zeile.
 */
export const PUSH_BLOCK_LIMITS = {
  lists: 500,
  listItems: 5000,
  recipes: 500,
  recipeIngredients: 5000,
  recipeSteps: 5000,
  recipeChatMessages: 5000,
  badges: 500,
  historyEntries: 500,
} as const

export function emptyPayload(): PushPayload {
  return {
    lists: [],
    listItems: [],
    recipes: [],
    recipeIngredients: [],
    recipeSteps: [],
    recipeChatMessages: [],
    badges: [],
    historyEntries: [],
  }
}

export function countRows(payload: PushPayload): number {
  return payload.lists.length
    + payload.listItems.length
    + payload.recipes.length
    + payload.recipeIngredients.length
    + payload.recipeSteps.length
    + payload.recipeChatMessages.length
    + payload.badges.length
    + payload.historyEntries.length
}

export function isEmptyPayload(payload: PushPayload): boolean {
  return countRows(payload) === 0
}

/* ------------------------------------------------------------------ *
 * Zeilen zur Nutzlast
 * ------------------------------------------------------------------ */

/**
 * Baut die Nutzlast aus den schmutzigen Zeilen.
 *
 * `sanitize` läuft hier und nirgendwo sonst: Es ist die letzte
 * Verteidigungslinie vor dem Push. Ein einziger zu langer Wert lässt die API
 * den GESAMTEN Block mit 422 ablehnen und legt damit den Abgleich des Geräts
 * dauerhaft still (siehe `app/sync/merge/limits.ts`).
 *
 * Die Feld-Zeitstempel sind von `sanitize` ausdrücklich ausgenommen — sie
 * gehören dem Merge und nicht den Längenlimits. Ihre eigene Kante ist
 * `toWireTimestamps`, das jede `toPush…`-Funktion durchläuft.
 *
 * ABWEICHUNG VON ANDROID, MIT ANSAGE: Dort werden die gekappten Werte auch
 * lokal zurückgeschrieben, damit der lokale Content-Hash nicht vom gesendeten
 * Stand abdriftet. Hier passiert das nicht — der Web-Client bildet noch keinen
 * lokalen Content-Hash (siehe `sync.ts`). Sobald er das tut, gehört das
 * Zurückschreiben hierher.
 */
export function buildPushPayload(dirty: DirtyRows): PushPayload {
  return {
    lists: dirty.lists.map(row => toPushList(sanitize('list', row))),
    listItems: dirty.items.map(row => toPushListItem(sanitize('listItem', row))),
    recipes: dirty.recipes.map(row => toPushRecipe(sanitize('recipe', row))),
    recipeIngredients: dirty.ingredients.map(row => toPushIngredient(sanitize('recipeIngredient', row))),
    recipeSteps: dirty.steps.map(row => toPushStep(sanitize('recipeStep', row))),
    recipeChatMessages: dirty.chatMessages.map(row => toPushChatMessage(sanitize('recipeChatMessage', row))),
    badges: dirty.badges.map(row => toPushBadge(sanitize('badge', row))),
    historyEntries: dirty.historyEntries.map(row => toPushHistoryEntry(sanitize('historyEntry', row))),
  }
}

/**
 * Feld-Zeitstempel in der Form, die die API annimmt.
 *
 * DAS PROBLEM: Das Merge schreibt einen LEEREN String, wenn weder lokal noch
 * auf dem Server ein Stempel für ein Feld existiert (`mergeFields` in
 * `app/sync/merge/field-lww.ts`). Für das Merge ist das der richtige Wert — er
 * bedeutet "ältestmöglich" und verliert jeden Vergleich. Die API dagegen nimmt
 * nur Werte an, die ihrem ISO-Muster entsprechen.
 *
 * WARUM DAS TROTZ SERVERSEITIGER ABSICHERUNG HIER STEHT: Bis August 2026 lehnte
 * die API einen ungültigen Zeitstempel mit 422 ab — und zwar nicht die Zeile,
 * sondern den GESAMTEN Push. Ein einziger leerer String legte das Gerät
 * dauerhaft lahm, ohne Ausweg in der Oberfläche. Seither verwirft die API
 * stattdessen den einzelnen Eintrag und protokolliert ihn.
 *
 * Diese Kante bleibt trotzdem: Die beiden Seiten werden getrennt ausgerollt,
 * ein Client trifft also auf beide Fassungen. Und ein Wert, den der Server
 * verwirft, geht als Information verloren — ihn gar nicht erst zu senden ist
 * ehrlicher, als sich auf das Aufräumen der Gegenseite zu verlassen.
 *
 * DESHALB HIER UND NICHT IM MERGE: Die Merge-Semantik ist zwischen Web, API
 * und Android abgestimmt und in `fixtures.json` als gemeinsamer Vertrag
 * festgeschrieben — `""` ist dort das erwartete Ergebnis. Repariert wird
 * folglich nicht die Bedeutung, sondern die Kante zum Server. Vorbild ist
 * `SyncSanitizer.sanitizeFieldTimestamps` im Android-Client.
 *
 * Bleibt nichts übrig, wird `null` gesendet statt eines leeren Objekts —
 * ebenfalls wie dort (`.ifEmpty { null }`). Beides ist für die API dasselbe:
 * keine feldgenaue Information.
 */
function toWireTimestamps(stamps: FieldTimestamps | null): FieldTimestamps | null {
  if (stamps === null) return null

  const clean: FieldTimestamps = {}
  for (const [field, stamp] of Object.entries(stamps)) {
    if (API_ISO_PATTERN.test(stamp)) clean[field] = stamp
  }

  return Object.keys(clean).length === 0 ? null : clean
}

function toPushList(row: List): PushList {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    secret: row.secret,
    lastSuggestedItems: row.lastSuggestedItems,
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    fieldTimestamps: toWireTimestamps(row.fieldTimestamps),
  }
}

function toPushListItem(row: ListItem): PushListItem {
  return {
    id: row.id,
    listId: row.listId,
    name: row.name,
    quantity: row.quantity,
    checked: row.checked,
    removed: row.removed,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    url: row.url,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    fieldTimestamps: toWireTimestamps(row.fieldTimestamps),
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
  }
}

function toPushRecipe(row: Recipe): PushRecipe {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sourceUrl: row.sourceUrl,
    imagePath: row.imagePath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    fieldTimestamps: toWireTimestamps(row.fieldTimestamps),
  }
}

function toPushIngredient(row: RecipeIngredient): PushRecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipeId,
    name: row.name,
    quantity: row.quantity,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    fieldTimestamps: toWireTimestamps(row.fieldTimestamps),
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
  }
}

function toPushStep(row: RecipeStep): PushRecipeStep {
  return {
    id: row.id,
    recipeId: row.recipeId,
    description: row.description,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    isChecked: row.isChecked,
    aiExplanation: row.aiExplanation,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    fieldTimestamps: toWireTimestamps(row.fieldTimestamps),
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
  }
}

function toPushChatMessage(row: RecipeChatMessage): PushRecipeChatMessage {
  return {
    id: row.id,
    recipeId: row.recipeId,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  }
}

function toPushBadge(row: Badge): PushBadge {
  return {
    id: row.id,
    recipeId: row.recipeId,
    recipeName: row.recipeName,
    recipeImagePath: row.recipeImagePath,
    recipeColor: row.recipeColor,
    earnedAt: row.earnedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    fieldTimestamps: toWireTimestamps(row.fieldTimestamps),
  }
}

/**
 * `createdAt` geht UNVERÄNDERT hinaus: Er stammt aus `nowIso()` bzw. dem
 * normalisierten Pull und entspricht damit bereits dem ISO-Muster der API.
 * `createdBy` bleibt zu Hause — der Server stempelt den Verursacher selbst.
 */
function toPushHistoryEntry(row: HistoryEntry): PushHistoryEntry {
  return {
    id: row.id,
    parentId: row.parentId,
    parentType: row.parentType,
    actionType: row.actionType,
    entityType: row.entityType,
    entityId: row.entityId,
    description: row.description,
    snapshotJson: row.snapshotJson,
    createdAt: row.createdAt,
  }
}

/* ------------------------------------------------------------------ *
 * Blockbildung
 * ------------------------------------------------------------------ */

/** Passt die Nutzlast so wie sie ist unter alle Grenzen? */
export function fitsInOneBlock(payload: PushPayload): boolean {
  return payload.lists.length <= PUSH_BLOCK_LIMITS.lists
    && payload.listItems.length <= PUSH_BLOCK_LIMITS.listItems
    && payload.recipes.length <= PUSH_BLOCK_LIMITS.recipes
    && payload.recipeIngredients.length <= PUSH_BLOCK_LIMITS.recipeIngredients
    && payload.recipeSteps.length <= PUSH_BLOCK_LIMITS.recipeSteps
    && payload.recipeChatMessages.length <= PUSH_BLOCK_LIMITS.recipeChatMessages
    && payload.badges.length <= PUSH_BLOCK_LIMITS.badges
    && payload.historyEntries.length <= PUSH_BLOCK_LIMITS.historyEntries
}

/** Meldung über eine Auffälligkeit beim Schneiden. */
export type NoticeSink = (notice: string) => void

type GroupSizes = Partial<Record<keyof PushPayload, number>>

/**
 * Schneidet eine zu grosse Nutzlast in API-legale Blöcke — Eltern nie nach
 * ihren Kindern.
 *
 * DAS PROBLEM, DAS ES ZU VERMEIDEN GILT: Schnitte man jeden Typ unabhängig
 * (`lists` in 500er-Scheiben, `listItems` in 5000er-Scheiben), könnte ein Item
 * in einem FRÜHEREN Block landen als seine Liste. Die API prüft dann
 * `canAccessList`, findet das Elternteil nicht, zählt `skipped.listItems++`
 * und macht weiter. Der Client löscht danach die Dirty-Flags — stiller,
 * dauerhafter Datenverlust.
 *
 * DIE INVARIANTE: Kein Kind landet in einem Block vor dem Block seines
 * Elternteils. Im Normalfall sitzen beide sogar im selben Block.
 *
 * WARUM "nicht davor" genügt und nicht "immer derselbe Block": Die Blöcke
 * gehen streng nacheinander raus. Der Server legt eine neue Liste zusammen mit
 * der Mitgliedschaft an bzw. trägt sich als Rezept-Eigentümer ein — beim
 * nächsten Block findet die Zugriffsprüfung das Elternteil also in der
 * Datenbank. Bricht ein Block ab, werden die folgenden gar nicht mehr
 * gesendet und alle Dirty-Flags bleiben stehen (sie fallen erst nach der
 * Schleife). Ein Kind kann damit nie ohne sein Elternteil ankommen.
 *
 * RANDFALL "Elternteil mit mehr Kindern als in einen Block passen": Das
 * Elternteil kommt in den ersten Block, die Kinder laufen in die folgenden
 * weiter. Die Grenze für diesen einen Block zu überschreiten ist keine
 * Alternative — die API validiert `maxItems` als Schema und antwortet mit 422
 * auf den gesamten Rumpf.
 *
 * Kinder ohne Elternteil in der Nutzlast dürfen überall hin: Dann existiert
 * das Elternteil bereits auf dem Server, denn wäre es lokal geändert worden,
 * wäre es schmutzig und damit mit in der Nutzlast.
 */
export function splitIntoBlocks(payload: PushPayload, onNotice: NoticeSink = () => {}): PushPayload[] {
  // Der häufigste Fall: alles passt. Dann wird nichts umsortiert und nichts
  // kopiert. Gilt auch für die leere Nutzlast — der Import braucht mindestens
  // einen Block, sonst gibt es keine Antwort des Servers.
  if (fitsInOneBlock(payload)) return [payload]

  const itemsByList = groupBy(payload.listItems, item => item.listId)
  const ingredientsByRecipe = groupBy(payload.recipeIngredients, row => row.recipeId)
  const stepsByRecipe = groupBy(payload.recipeSteps, row => row.recipeId)
  const messagesByRecipe = groupBy(payload.recipeChatMessages, row => row.recipeId)
  const badgesByRecipe = groupBy(payload.badges, row => row.recipeId)
  // Historie hängt über `parentId` an einer Liste ODER einem Rezept. Die Ids
  // sind UUIDs und damit über beide Arten eindeutig — eine gemeinsame Gruppe
  // genügt, `parentType` muss hier nicht unterscheiden.
  const historyByParent = groupBy(payload.historyEntries, row => row.parentId)

  const listIds = new Set(payload.lists.map(row => row.id))
  const recipeIds = new Set(payload.recipes.map(row => row.id))

  const packer = createPacker()

  for (const list of payload.lists) {
    const items = itemsByList.get(list.id) ?? []
    const history = historyByParent.get(list.id) ?? []
    if (items.length > PUSH_BLOCK_LIMITS.listItems) {
      onNotice(
        `Liste ${list.id} hat ${items.length} Items (Blockgrenze ${PUSH_BLOCK_LIMITS.listItems}) `
        + '— die Items laufen in Folgeblöcke',
      )
    }
    packer.closeIfGroupDoesNotFit({ lists: 1, listItems: items.length, historyEntries: history.length })
    packer.addLists([list])
    packer.addListItems(items)
    packer.addHistoryEntries(history)
  }
  packer.addListItems(payload.listItems.filter(item => !listIds.has(item.listId)))

  for (const recipe of payload.recipes) {
    const ingredients = ingredientsByRecipe.get(recipe.id) ?? []
    const steps = stepsByRecipe.get(recipe.id) ?? []
    const messages = messagesByRecipe.get(recipe.id) ?? []
    const badges = badgesByRecipe.get(recipe.id) ?? []
    const history = historyByParent.get(recipe.id) ?? []

    if (ingredients.length > PUSH_BLOCK_LIMITS.recipeIngredients
      || steps.length > PUSH_BLOCK_LIMITS.recipeSteps
      || messages.length > PUSH_BLOCK_LIMITS.recipeChatMessages
      || badges.length > PUSH_BLOCK_LIMITS.badges) {
      onNotice(`Rezept ${recipe.id} hat mehr Kinder als in einen Block passen — sie laufen in Folgeblöcke`)
    }

    packer.closeIfGroupDoesNotFit({
      recipes: 1,
      recipeIngredients: ingredients.length,
      recipeSteps: steps.length,
      recipeChatMessages: messages.length,
      badges: badges.length,
      historyEntries: history.length,
    })
    packer.addRecipes([recipe])
    packer.addIngredients(ingredients)
    packer.addSteps(steps)
    packer.addMessages(messages)
    packer.addBadges(badges)
    packer.addHistoryEntries(history)
  }

  packer.addIngredients(payload.recipeIngredients.filter(row => !recipeIds.has(row.recipeId)))
  packer.addSteps(payload.recipeSteps.filter(row => !recipeIds.has(row.recipeId)))
  packer.addMessages(payload.recipeChatMessages.filter(row => !recipeIds.has(row.recipeId)))
  packer.addBadges(payload.badges.filter(row => !recipeIds.has(row.recipeId)))
  packer.addHistoryEntries(payload.historyEntries.filter(
    row => !listIds.has(row.parentId) && !recipeIds.has(row.parentId),
  ))

  return packer.result()
}

function groupBy<T>(values: readonly T[], key: (value: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const value of values) {
    const group = groups.get(key(value))
    if (group === undefined) {
      groups.set(key(value), [value])
    }
    else {
      group.push(value)
    }
  }
  return groups
}

/**
 * Füllt Blöcke der Reihe nach. Jedes Element wird genau einmal abgelegt.
 *
 * Je Entität eine eigene `add`-Funktion statt einer generischen mit
 * Storenamen: Die Grenze und die Zielliste gehören zusammen, und eine
 * generische Fassung müsste die Bindung zwischen Schlüssel und Elementtyp mit
 * einem Cast aufbrechen.
 */
function createPacker() {
  const blocks: PushPayload[] = []
  let bucket = emptyPayload()

  const close = (): void => {
    if (isEmptyPayload(bucket)) return
    blocks.push(bucket)
    bucket = emptyPayload()
  }

  /**
   * Terminiert immer: Jede Grenze ist grösser als null, ein frisch geöffneter
   * Block nimmt also garantiert mindestens ein Element auf.
   *
   * `pick` wird in jeder Runde neu ausgewertet, weil `close()` den Block
   * austauscht — eine einmal gemerkte Zielliste zeigte danach ins Leere.
   */
  const fill = <T>(values: readonly T[], limit: number, pick: (block: PushPayload) => T[]): void => {
    let rest = values
    while (rest.length > 0) {
      const target = pick(bucket)
      const free = limit - target.length
      if (free > 0) {
        target.push(...rest.slice(0, free))
        rest = rest.slice(free)
      }
      if (rest.length > 0) close()
    }
  }

  return {
    addLists: (values: readonly PushList[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.lists, block => block.lists),

    addListItems: (values: readonly PushListItem[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.listItems, block => block.listItems),

    addRecipes: (values: readonly PushRecipe[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.recipes, block => block.recipes),

    addIngredients: (values: readonly PushRecipeIngredient[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.recipeIngredients, block => block.recipeIngredients),

    addSteps: (values: readonly PushRecipeStep[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.recipeSteps, block => block.recipeSteps),

    addMessages: (values: readonly PushRecipeChatMessage[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.recipeChatMessages, block => block.recipeChatMessages),

    addBadges: (values: readonly PushBadge[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.badges, block => block.badges),

    addHistoryEntries: (values: readonly PushHistoryEntry[]): void =>
      fill(values, PUSH_BLOCK_LIMITS.historyEntries, block => block.historyEntries),

    /**
     * Schliesst den aktuellen Block, wenn die ganze Gruppe (Elternteil plus
     * Kinder) nicht mehr hineinpasst. Passt sie auch in einen leeren Block
     * nicht, verteilt `add` den Rest auf Folgeblöcke — das Elternteil steht
     * dann bereits im ersten davon.
     */
    closeIfGroupDoesNotFit(sizes: GroupSizes): void {
      const fits = bucket.lists.length + (sizes.lists ?? 0) <= PUSH_BLOCK_LIMITS.lists
        && bucket.listItems.length + (sizes.listItems ?? 0) <= PUSH_BLOCK_LIMITS.listItems
        && bucket.recipes.length + (sizes.recipes ?? 0) <= PUSH_BLOCK_LIMITS.recipes
        && bucket.recipeIngredients.length + (sizes.recipeIngredients ?? 0) <= PUSH_BLOCK_LIMITS.recipeIngredients
        && bucket.recipeSteps.length + (sizes.recipeSteps ?? 0) <= PUSH_BLOCK_LIMITS.recipeSteps
        && bucket.recipeChatMessages.length + (sizes.recipeChatMessages ?? 0) <= PUSH_BLOCK_LIMITS.recipeChatMessages
        && bucket.badges.length + (sizes.badges ?? 0) <= PUSH_BLOCK_LIMITS.badges
        && bucket.historyEntries.length + (sizes.historyEntries ?? 0) <= PUSH_BLOCK_LIMITS.historyEntries

      if (!fits) close()
    },

    result(): PushPayload[] {
      close()
      return blocks
    },
  }
}

/* ------------------------------------------------------------------ *
 * Die Antwort des Servers
 * ------------------------------------------------------------------ */

/** Zeilen, die der Server verworfen hat — je Typ ihre Ids. */
export interface SkippedIds {
  lists: string[]
  listItems: string[]
  recipes: string[]
  recipeIngredients: string[]
  recipeSteps: string[]
  recipeChatMessages: string[]
  badges: string[]
  historyEntries: string[]
}

export function emptySkipped(): SkippedIds {
  return {
    lists: [],
    listItems: [],
    recipes: [],
    recipeIngredients: [],
    recipeSteps: [],
    recipeChatMessages: [],
    badges: [],
    historyEntries: [],
  }
}

export function countSkipped(skipped: SkippedIds): number {
  return Object.values(skipped).reduce((sum, ids) => sum + ids.length, 0)
}

/** Der Serverstand der Zeilen, bei denen der Server gewonnen hat. */
export interface PushConflicts {
  lists: List[]
  listItems: ListItem[]
  recipes: Recipe[]
  recipeIngredients: RecipeIngredient[]
  recipeSteps: RecipeStep[]
  badges: Badge[]
}

export interface PushResponse {
  conflicts: PushConflicts
  skippedIds: SkippedIds
  serverTime: IsoUtc | null
}

export function parsePushResponse(value: unknown): PushResponse {
  const record = isRecord(value) ? value : {}
  const conflictsRaw = record['conflicts']
  const conflicts = isRecord(conflictsRaw) ? conflictsRaw : {}

  return {
    conflicts: {
      lists: parseAll(readArray(conflicts, 'lists'), parseList),
      listItems: parseAll(readArray(conflicts, 'listItems'), parseListItem),
      recipes: parseAll(readArray(conflicts, 'recipes'), parseRecipe),
      recipeIngredients: parseAll(readArray(conflicts, 'recipeIngredients'), parseIngredient),
      recipeSteps: parseAll(readArray(conflicts, 'recipeSteps'), parseStep),
      badges: parseAll(readArray(conflicts, 'badges'), parseBadge),
    },
    skippedIds: parseSkippedIds(record['skippedIds']),
    serverTime: readIso(record, 'serverTime'),
  }
}

export interface MigrateResponse {
  migrated: { lists: number, recipes: number }
  skippedIds: SkippedIds
  serverTime: IsoUtc | null
}

export function parseMigrateResponse(value: unknown): MigrateResponse {
  const record = isRecord(value) ? value : {}
  const migratedRaw = record['migrated']
  const migrated = isRecord(migratedRaw) ? migratedRaw : {}

  return {
    migrated: {
      lists: readNumberOr(migrated, 'lists', 0),
      recipes: readNumberOr(migrated, 'recipes', 0),
    },
    skippedIds: parseSkippedIds(record['skippedIds']),
    serverTime: readIso(record, 'serverTime'),
  }
}

/**
 * `skippedIds` ist der wichtigste Teil der Antwort: Ohne die konkreten Ids
 * wüsste der Client nicht, welche Zeilen der Server verworfen hat, und würde
 * ihre Dirty-Flags mitlöschen. Fehlt das Feld ganz, gilt "nichts verworfen" —
 * das ist die Aussage einer alten Serverversion und keine Erlaubnis zu raten.
 */
function parseSkippedIds(value: unknown): SkippedIds {
  const record = isRecord(value) ? value : {}
  const ids = (key: keyof SkippedIds): string[] =>
    readArray(record, key).filter((entry): entry is string => typeof entry === 'string')

  return {
    lists: ids('lists'),
    listItems: ids('listItems'),
    recipes: ids('recipes'),
    recipeIngredients: ids('recipeIngredients'),
    recipeSteps: ids('recipeSteps'),
    recipeChatMessages: ids('recipeChatMessages'),
    badges: ids('badges'),
    // Fehlt das Feld (älterer Server), gilt "nichts verworfen" — wie überall.
    historyEntries: ids('historyEntries'),
  }
}

/* ------------------------------------------------------------------ *
 * Der Ablauf
 * ------------------------------------------------------------------ */

/** Schickt einen Block und gibt die rohe Antwort zurück. */
export type PushSender = (payload: PushPayload) => Promise<unknown>

export interface PushOutcome {
  /** Der Zeitpunkt, zu dem die Nutzlast gelesen wurde. */
  pushSnapshot: IsoUtc
  blocks: number
  sentRows: number
  skippedIds: SkippedIds
  skippedCount: number
  conflictCount: number
}

/**
 * Lädt alle schmutzigen Zeilen hoch.
 *
 * Reihenfolge und Begründung:
 *
 * 1. `pushSnapshot` VOR dem Lesen — sonst gingen Bearbeitungen während des
 *    Pushs verloren.
 * 2. Blöcke streng nacheinander. Ein Fehler bricht ab, die restlichen Zeilen
 *    bleiben schmutzig und kommen beim nächsten Lauf mit.
 * 3. Dirty-Flags löschen, aber OHNE die vom Server verworfenen Ids. Sie
 *    bleiben schmutzig, damit der nächste Push es erneut versucht — sonst
 *    wären sie nie wieder Teil einer Nutzlast.
 * 4. Konflikte anwenden.
 *
 * NICHT ATOMAR, MIT ANSAGE: Android erledigt Schritt 3 und 4 in einer
 * gemeinsamen Datenbanktransaktion. Über die hiesige Repository-Schicht geht
 * das nicht — `clearDirtyFlags` öffnet seine eigene Transaktion je Store. Ein
 * Absturz genau dazwischen lässt die Konflikte ungeschrieben; der nächste Pull
 * holt sie nach, weil die Serverzeile neuer ist als das lokale
 * Wasserzeichen. Der Schaden ist damit begrenzt und heilt von selbst.
 */
export async function runPush(store: PushStore, send: PushSender, onNotice?: NoticeSink): Promise<PushOutcome> {
  const pushSnapshot = nowIso()
  const dirty = await store.readDirty()
  const payload = buildPushPayload(dirty)

  if (isEmptyPayload(payload)) {
    return {
      pushSnapshot,
      blocks: 0,
      sentRows: 0,
      skippedIds: emptySkipped(),
      skippedCount: 0,
      conflictCount: 0,
    }
  }

  const blocks = splitIntoBlocks(payload, onNotice)
  const skippedIds = emptySkipped()
  const conflicts: PushConflicts[] = []

  for (const block of blocks) {
    const response = parsePushResponse(await send(block))
    addSkipped(skippedIds, response.skippedIds)
    conflicts.push(response.conflicts)
  }

  await clearPushedFlags(store, dirty, skippedIds, pushSnapshot)

  let conflictCount = 0
  for (const block of conflicts) {
    conflictCount += await applyConflicts(store.rows, block, pushSnapshot)
  }

  return {
    pushSnapshot,
    blocks: blocks.length,
    sentRows: countRows(payload),
    skippedIds,
    skippedCount: countSkipped(skippedIds),
    conflictCount,
  }
}

export interface MigrateOutcome {
  pushSnapshot: IsoUtc
  blocks: number
  migrated: { lists: number, recipes: number }
  skippedIds: SkippedIds
  skippedCount: number
}

/**
 * Der einmalige Voll-Import lokaler Daten in ein leeres Konto.
 *
 * WARUM DIESELBE NUTZLAST WIE DER PUSH: Solange `hasMigrated` nicht gesetzt
 * ist, war nie ein Push erfolgreich — jede lokale Zeile trägt also noch ihr
 * Dirty-Flag. "Alle schmutzigen Zeilen" und "alle lokalen Zeilen" sind in
 * diesem Zustand dieselbe Menge. Ein zweiter Lesepfad über die ganze Datenbank
 * wäre also nicht nur überflüssig, er könnte auch anders zählen als der Push.
 *
 * Konflikte gibt es hier nicht: Der Import läuft gegen ein leeres Konto.
 */
export async function runMigrate(
  store: PushStore,
  send: PushSender,
  onNotice?: NoticeSink,
): Promise<MigrateOutcome> {
  const pushSnapshot = nowIso()
  const dirty = await store.readDirty()
  const payload = buildPushPayload(dirty)
  const blocks = splitIntoBlocks(payload, onNotice)

  const skippedIds = emptySkipped()
  const migrated = { lists: 0, recipes: 0 }

  for (const block of blocks) {
    const response = parseMigrateResponse(await send(block))
    addSkipped(skippedIds, response.skippedIds)
    migrated.lists += response.migrated.lists
    migrated.recipes += response.migrated.recipes
  }

  await clearPushedFlags(store, dirty, skippedIds, pushSnapshot)

  return {
    pushSnapshot,
    blocks: blocks.length,
    migrated,
    skippedIds,
    skippedCount: countSkipped(skippedIds),
  }
}

function addSkipped(target: SkippedIds, addition: SkippedIds): void {
  target.lists.push(...addition.lists)
  target.listItems.push(...addition.listItems)
  target.recipes.push(...addition.recipes)
  target.recipeIngredients.push(...addition.recipeIngredients)
  target.recipeSteps.push(...addition.recipeSteps)
  target.recipeChatMessages.push(...addition.recipeChatMessages)
  target.badges.push(...addition.badges)
  target.historyEntries.push(...addition.historyEntries)
}

/**
 * Nimmt das Push-Flag von den übertragenen Zeilen — ohne die verworfenen.
 *
 * Die zweite Bedingung (`updatedAt <= pushSnapshot`) steckt in
 * `clearDirtyFlags` selbst, weil nur die Datenbankschicht den aktuellen Stand
 * der Zeile kennt.
 */
async function clearPushedFlags(
  store: PushStore,
  dirty: DirtyRows,
  skipped: SkippedIds,
  pushSnapshot: IsoUtc,
): Promise<void> {
  await store.clearDirty('lists', keptIds(dirty.lists, skipped.lists), pushSnapshot)
  await store.clearDirty('list_items', keptIds(dirty.items, skipped.listItems), pushSnapshot)
  await store.clearDirty('recipes', keptIds(dirty.recipes, skipped.recipes), pushSnapshot)
  await store.clearDirty('recipe_ingredients', keptIds(dirty.ingredients, skipped.recipeIngredients), pushSnapshot)
  await store.clearDirty('recipe_steps', keptIds(dirty.steps, skipped.recipeSteps), pushSnapshot)
  await store.clearDirty('recipe_chat_messages', keptIds(dirty.chatMessages, skipped.recipeChatMessages), pushSnapshot)
  await store.clearDirty('badges', keptIds(dirty.badges, skipped.badges), pushSnapshot)
  // Eine bereits bekannte eigene Id überspringt der Server STILL (append-only
  // Re-Push) — sie steht dann nicht in skippedIds, und genau deshalb darf ihr
  // Dirty-Flag hier fallen. Nur echte Verweigerungen (kein Zugriff, fremde
  // Zeile) bleiben schmutzig.
  await store.clearDirty('history_entries', keptIds(dirty.historyEntries, skipped.historyEntries), pushSnapshot)
}

export function keptIds(rows: readonly { id: string }[], skipped: readonly string[]): string[] {
  if (skipped.length === 0) return rows.map(row => row.id)

  const dropped = new Set(skipped)
  return rows.map(row => row.id).filter(id => !dropped.has(id))
}

/**
 * Übernimmt den Serverstand der Zeilen, bei denen der Server gewonnen hat.
 *
 * Eine Zeile, die seit `pushSnapshot` lokal bearbeitet wurde, bleibt
 * unangetastet: Ihre Änderung ist neuer als alles, was der Server zu diesem
 * Push wissen konnte, und geht beim nächsten Push mit.
 *
 * Die übernommenen Zeilen sind sauber — sie kommen gerade vom Server. Ein
 * gesetztes Dirty-Flag würde sie sofort wieder hochladen und den Konflikt
 * erneut auslösen.
 */
async function applyConflicts(rows: RowStores, conflicts: PushConflicts, pushSnapshot: IsoUtc): Promise<number> {
  let applied = 0

  /*
   * Prüfen und Schreiben laufen in EINER Transaktion (`mutate`). Die
   * Prüfung "wurde die Zeile seit dem Push lokal bearbeitet?" wäre sonst
   * wertlos: Sie schützt gegen Änderungen VOR dem Lesen, nicht gegen die
   * zwischen Lesen und Schreiben — und genau dort ist das Fenster.
   */
  for (const list of conflicts.lists) {
    await rows.lists.mutate(list.id, (local) => {
      if (isLocallyNewer(local, pushSnapshot)) return null
      applied += 1
      return {
        ...list,
        // Der Eigentümer kommt hier NICHT verlässlich vom Server: Die
        // Konfliktzeilen des Pushs tragen in `userId` die Kennung des
        // AUFRUFERS, nicht die des Eigentümers (siehe push.ts der API). Bei
        // einer geteilten Liste wäre das falsch, deshalb gewinnt der lokal
        // bekannte Eigentümer.
        ownerUserId: local?.ownerUserId ?? list.ownerUserId,
        dirty: CLEAN,
        // Rein lokales Wasserzeichen, das der Server nicht kennt und nie
        // überschreiben darf (siehe applyList in ./pull.ts).
        seenAt: local?.seenAt ?? null,
      }
    })
  }

  for (const item of conflicts.listItems) {
    await rows.items.mutate(item.id, (local) => {
      if (local !== undefined && isLocallyNewer(local, pushSnapshot)) {
        /*
         * Die Zeile behält ihren neueren lokalen Stand — aber die drei
         * Server-Spiegel kommen mit, SOFERN SIE ZU IHRER ADRESSE GEHÖREN.
         *
         * Beide Hälften sind wichtig. Ohne die Übernahme bekäme ausgerechnet
         * ein Gerät mit ungesendeten Änderungen die Anreicherung nie zu
         * sehen, und zwar dauerhaft: Der nächste Push löst denselben Konflikt
         * wieder aus. Ohne die Bedingung klebte man den Titel der ALTEN Seite
         * an einen frisch gesetzten Link — die lokale Zeile kann längst eine
         * andere `url` tragen, das ist ja der Grund, warum sie neuer ist.
         * `linkMirrorsFor` entscheidet das anhand der Adresse; die Regel
         * gilt wortgleich im Pull und beim lokalen Schreiben.
         *
         * Kein `applied += 1`: Der Konflikt selbst ist NICHT aufgelöst, die
         * Zeile bleibt schmutzig und geht beim nächsten Push wieder mit.
         */
        const mirrors = linkMirrorsFor(item, local.url)
        if (!linkMirrorsDiffer(local, mirrors)) return null
        return { ...local, ...mirrors }
      }
      applied += 1
      return { ...item, dirty: CLEAN }
    })
  }

  for (const recipe of conflicts.recipes) {
    await rows.recipes.mutate(recipe.id, (local) => {
      if (isLocallyNewer(local, pushSnapshot)) return null
      applied += 1
      return { ...recipe, dirty: CLEAN }
    })
  }

  for (const ingredient of conflicts.recipeIngredients) {
    await rows.ingredients.mutate(ingredient.id, (local) => {
      if (isLocallyNewer(local, pushSnapshot)) return null
      applied += 1
      return { ...ingredient, dirty: CLEAN }
    })
  }

  for (const step of conflicts.recipeSteps) {
    await rows.steps.mutate(step.id, (local) => {
      if (isLocallyNewer(local, pushSnapshot)) return null
      applied += 1
      return { ...step, dirty: CLEAN }
    })
  }

  for (const badge of conflicts.badges) {
    await rows.badges.mutate(badge.id, (local) => {
      if (isLocallyNewer(local, pushSnapshot)) return null
      applied += 1
      return { ...badge, dirty: CLEAN }
    })
  }

  return applied
}

function isLocallyNewer(local: { updatedAt: IsoUtc } | undefined, pushSnapshot: IsoUtc): boolean {
  return local !== undefined && !isAtOrBefore(local.updatedAt, pushSnapshot)
}

/**
 * Weicht mindestens einer der drei Server-Spiegel ab?
 *
 * Nur dann lohnt der Schreibvorgang im Konfliktpfad. Sonst schriebe jeder
 * Konflikt dieselbe Zeile grundlos neu.
 */
function linkMirrorsDiffer(local: ListItemRow, next: LinkMirrors): boolean {
  return local.linkTitle !== next.linkTitle
    || local.linkImagePath !== next.linkImagePath
    || local.linkImageKind !== next.linkImageKind
}

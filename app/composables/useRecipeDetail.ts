/**
 * Ein einzelnes Rezept samt Zutaten und Schritten.
 *
 * Aufbau bewusst wie `useListDetail`: Beide Bereiche verhalten sich für die
 * Bedienung gleich, deshalb sollen sie sich auch im Code gleich lesen — bis
 * hin zum Schutz gegen das Wettrennen beim schnellen Wechsel.
 *
 * Ohne Konto nutzbar. Die Daten liegen in IndexedDB; der Abgleich schreibt in
 * dieselbe Datenbank zurück, danach genügt hier ein erneutes `load()`.
 *
 * Der Gesprächsverlauf (`recipe_chat_messages`) bleibt außen vor: Er hat
 * seine eigene Schicht (`useRecipeChat`) mit eigenem, append-only Schreibweg.
 */
import type { IsoUtc, RecipeIngredient, RecipeStep } from '../../shared/types/domain'
import {
  appendHistoryEntry,
  getBadgeForRecipe,
  getIngredientRow,
  getIngredientsForRecipe,
  getRecipe,
  getStepRow,
  getStepsForRecipe,
  upsertBadge,
  upsertIngredient,
  upsertRecipe,
  upsertStep,
  type Draft,
} from '../db/repositories'
import type { RecipeIngredientRow, RecipeRow, RecipeStepRow } from '../db/schema'
import { nowIso } from '../db/timestamps'
import { ingredientSnapshotJson, stepSnapshotJson } from '../history/snapshot'
import { nextSortKey, planMoveTo, type OrderedRow } from '../sync/merge/reorder'
import { validHttpUrlOrNull } from '../utils/url'

/* ------------------------------------------------------------------ *
 * Reine Funktionen — ohne IndexedDB und ohne Vue, deshalb direkt testbar.
 * ------------------------------------------------------------------ */

/**
 * Der Ordnungswert für einen neuen Eintrag: hinter allen bestehenden.
 *
 * Wie bei den Listeneinträgen: Den Sortierschlüssel vergibt `nextSortKey`
 * bereits beim Anlegen. `orderIndex` bleibt daneben die Rückfallordnung für
 * Zeilen ohne Schlüssel und muss deshalb weiterhin eindeutig hinten liegen,
 * sonst springt der neue Eintrag an eine willkürliche Stelle.
 */
export function nextOrderIndex(rows: readonly { readonly orderIndex: number }[]): number {
  return rows.reduce((highest, row) => Math.max(highest, row.orderIndex), -1) + 1
}

/** Der Anteil erledigter Schritte in Prozent, gerundet. */
export function stepProgress(steps: readonly { readonly isChecked: boolean }[]): number {
  if (steps.length === 0) return 0
  return Math.round((steps.filter(step => step.isChecked).length / steps.length) * 100)
}

/**
 * Baut aus einer Zeile den Entwurf für ein Update.
 *
 * Ohne `createdAt`, `updatedAt` und `fieldTimestamps`: Die führt die
 * Datenbankschicht, und wer sie mitschickte, würde genau die Zeitstempel
 * überschreiben, auf denen das feldgenaue Last-Write-Wins beruht.
 */
function toIngredientDraft(row: RecipeIngredient): Draft<RecipeIngredient> {
  return {
    id: row.id,
    recipeId: row.recipeId,
    name: row.name,
    quantity: row.quantity,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    deletedAt: row.deletedAt,
  }
}

function toStepDraft(row: RecipeStep): Draft<RecipeStep> {
  return {
    id: row.id,
    recipeId: row.recipeId,
    description: row.description,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    isChecked: row.isChecked,
    aiExplanation: row.aiExplanation,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    deletedAt: row.deletedAt,
  }
}

/* ------------------------------------------------------------------ *
 * Der Zustand der Ansicht
 * ------------------------------------------------------------------ */

/**
 * Serialisiert die Badge-Vergabe.
 *
 * `awardBadgeIfFirstTime` ist ein Lesen-dann-Schreiben: Zwei schnelle Tipps
 * auf den letzten offenen Schritt könnten beide "kein Badge vorhanden" lesen,
 * bevor einer schreibt — die lokale Dublette bliebe für immer, denn der
 * Server überspringt sie nur, entfernt sie aber nicht. Die Kette lässt die
 * zweite Prüfung erst laufen, wenn die erste fertig geschrieben hat.
 */
let badgeAwardChain: Promise<void> = Promise.resolve()

export function useRecipeDetail() {
  const recipe = useState<RecipeRow | null>('recipe-detail', () => null)
  const ingredients = useState<RecipeIngredientRow[]>('recipe-detail-ingredients', () => [])
  const steps = useState<RecipeStepRow[]>('recipe-detail-steps', () => [])
  const isLoading = useState<boolean>('recipe-detail-loading', () => false)

  /** Welches Rezept zuletzt angefordert wurde — siehe `useListDetail`. */
  const requestedRecipeId = useState<string | null>('recipe-detail-id', () => null)

  /**
   * Die frisch verdiente Auszeichnung — das Signal an die Detailseite, die
   * Zeremonie zu zeigen (`BadgeEarnedSheet`). Bewusst KEIN Toast: Ein fertig
   * gekochtes Rezept ist der größte Moment dieser App und verdient mehr als
   * eine Randnotiz, die nach vier Sekunden verschwindet.
   *
   * Absichtlich nicht readonly herausgegeben: Die Seite setzt es beim
   * Schließen des Sheets auf `null` zurück — sonst stünde die Zeremonie beim
   * nächsten Öffnen des Rezepts wieder da.
   */
  const lastAwardedBadge = useState<{ recipeName: string, earnedAt: IsoUtc } | null>(
    'badge-earned',
    () => null,
  )

  /**
   * Zähler für die kurze Feier OHNE Sheet: Das Rezept trägt schon eine
   * Auszeichnung und wurde erneut fertig gekocht. Jede Erhöhung startet drei
   * Sekunden Konfetti (siehe `BadgeEarnedSheet`, `celebrateTick`) — ein
   * Zähler statt eines booleschen Werts, damit zwei schnelle Feiern nicht in
   * einer einzigen verschwinden.
   */
  const celebrateTick = useState<number>('badge-celebrate-tick', () => 0)

  const progress = computed<number>(() => stepProgress(steps.value))

  async function load(recipeId: string): Promise<void> {
    if (import.meta.server) return

    requestedRecipeId.value = recipeId
    isLoading.value = true

    try {
      const [row, loadedIngredients, loadedSteps] = await Promise.all([
        getRecipe(recipeId),
        getIngredientsForRecipe(recipeId),
        getStepsForRecipe(recipeId),
      ])

      // Ein zwischenzeitlicher Wechsel gewinnt: Sonst könnte das ältere
      // Ergebnis als letztes eintreffen und das falsche Rezept anzeigen.
      if (requestedRecipeId.value !== recipeId) return

      recipe.value = row ?? null
      ingredients.value = loadedIngredients
      steps.value = loadedSteps
    }
    finally {
      if (requestedRecipeId.value === recipeId) isLoading.value = false
    }
  }

  async function reload(): Promise<void> {
    const recipeId = requestedRecipeId.value
    if (recipeId === null) return
    await load(recipeId)
  }

  /**
   * Legt eine Zutat an. Die ID kommt vom Client — dieselbe Begründung wie bei
   * den Listeneinträgen: ohne eigene Schlüssel kein Offline-Betrieb.
   *
   * Der Sortierschlüssel entsteht sofort und nicht erst beim Umsortieren
   * (Begründung in `nextSortKey`); seinen Feld-Zeitstempel bekommt er dabei
   * wie jedes andere Feld einer neuen Zeile.
   */
  async function addIngredient(name: string, quantity: number = 1): Promise<RecipeIngredientRow | null> {
    const trimmed = name.trim()
    const target = recipe.value
    if (trimmed.length === 0 || target === null) return null

    const row = await upsertIngredient({
      id: crypto.randomUUID(),
      recipeId: target.id,
      name: trimmed,
      quantity,
      orderIndex: nextOrderIndex(ingredients.value),
      sortKey: nextSortKey(ingredients.value),
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })

    await reload()
    return row
  }

  async function addStep(description: string): Promise<RecipeStepRow | null> {
    const trimmed = description.trim()
    const target = recipe.value
    if (trimmed.length === 0 || target === null) return null

    const row = await upsertStep({
      id: crypto.randomUUID(),
      recipeId: target.id,
      description: trimmed,
      orderIndex: nextOrderIndex(steps.value),
      sortKey: nextSortKey(steps.value),
      isChecked: false,
      aiExplanation: null,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })

    await reload()
    return row
  }

  /**
   * Hakt einen Schritt beim Kochen ab oder nimmt das Häkchen zurück.
   *
   * Wird mit diesem Häkchen der letzte offene Schritt erledigt, ist das
   * Rezept fertig gekocht und es gibt eine Auszeichnung — dieselbe Regel wie
   * in der Android-App. Der Server erzwingt eine Auszeichnung pro Rezept und
   * Konto; existiert schon eine (auch eine zurückgesetzte), entsteht keine
   * zweite.
   */
  async function toggleStep(step: RecipeStep): Promise<void> {
    const finishesRecipe = !step.isChecked
      && steps.value.length > 0
      && steps.value.every(row => row.isChecked || row.id === step.id)

    await upsertStep({ ...toStepDraft(step), isChecked: !step.isChecked })

    if (finishesRecipe) {
      // Über die Kette statt direkt — Begründung an `badgeAwardChain`. Die
      // Kette selbst schluckt Fehler (sonst bliebe sie für immer gerissen),
      // der Aufrufer hier bekommt sie trotzdem zu sehen.
      const attempt = badgeAwardChain.then(() => awardBadgeIfFirstTime())
      badgeAwardChain = attempt.catch(() => undefined)
      await attempt
    }

    await reload()
  }

  /** Legt die Auszeichnung zum aktuellen Rezept an, falls es noch keine gibt. */
  async function awardBadgeIfFirstTime(): Promise<void> {
    const row = recipe.value
    if (row === null) return

    const existing = await getBadgeForRecipe(row.id)
    if (existing !== undefined) {
      // Schon ausgezeichnet (auch eine zurückgesetzte zählt — der Server
      // erzwingt eine pro Rezept und Konto): keine zweite Zeremonie, aber
      // der Moment bleibt einer — kurze Feier ohne Sheet, wie
      // `RecipeCelebration` in der Android-App.
      celebrateTick.value += 1
      return
    }

    const earnedAt = nowIso()
    await upsertBadge({
      id: crypto.randomUUID(),
      recipeId: row.id,
      recipeName: row.name,
      recipeImagePath: row.imagePath,
      recipeColor: row.color,
      earnedAt,
      deletedAt: null,
    })

    lastAwardedBadge.value = { recipeName: row.name, earnedAt }
  }

  /**
   * Löscht eine Zutat.
   *
   * `deletedAt` und nicht das Entfernen der Zeile: Der Grabstein ist die
   * Löschabsicht, die beim nächsten Push hinausgeht. Würde die Zeile hier
   * verschwinden, wüsste der Server nie davon und brächte sie beim nächsten
   * Pull zurück.
   *
   * VOR dem Grabstein kommt die Löschung in den Verlauf — die Zeile existiert
   * dann noch und der Snapshot trägt ihren letzten Stand. Wortlaut wie
   * `removeIngredientFromRecipe` in Androids RecipeStore. Das Rückgängig im
   * Toast (`restoreIngredient`) schreibt KEINEN Eintrag: Es hebt die Löschung
   * auf, statt eine neue Tat festzuhalten.
   */
  async function removeIngredient(ingredient: RecipeIngredient): Promise<void> {
    await appendHistoryEntry({
      id: crypto.randomUUID(),
      parentId: ingredient.recipeId,
      parentType: 'recipe',
      actionType: 'deleted',
      entityType: 'recipe_ingredient',
      entityId: ingredient.id,
      description: `${ingredient.name} gelöscht`,
      snapshotJson: ingredientSnapshotJson(ingredient),
      createdBy: null,
      createdAt: nowIso(),
    })
    await upsertIngredient({ ...toIngredientDraft(ingredient), deletedAt: nowIso() })
    await reload()
  }

  /** Löscht einen Schritt — Verlauf und Grabstein wie bei der Zutat. */
  async function removeStep(step: RecipeStep): Promise<void> {
    await appendHistoryEntry({
      id: crypto.randomUUID(),
      parentId: step.recipeId,
      parentType: 'recipe',
      actionType: 'deleted',
      entityType: 'recipe_step',
      entityId: step.id,
      // Wortgleich mit Androids RecipeStore.removeStep: Schritte haben keinen
      // Namen, der in eine Zeile passt — die Beschreibung steht im Snapshot.
      description: 'Schritt gelöscht',
      snapshotJson: stepSnapshotJson(step),
      createdBy: null,
      createdAt: nowIso(),
    })
    await upsertStep({ ...toStepDraft(step), deletedAt: nowIso() })
    await reload()
  }

  /**
   * Macht das Löschen einer Zutat rückgängig — der Griff hinter dem
   * "Rückgängig" im Toast, wie `restoreIngredient` im RecipeStore der
   * Android-App.
   *
   * Ein gewöhnliches Feld-Update über den Draft-Weg: `deletedAt` geht zurück
   * auf `null` und bekommt dabei einen frischen Feld-Zeitstempel. Genau
   * deshalb setzt sich das Zurückholen auch auf den anderen Geräten durch —
   * es ist jünger als die Löschung, die es aufhebt.
   */
  async function restoreIngredient(ingredient: RecipeIngredient): Promise<void> {
    // Frische Rohzeile statt Klick-Snapshot — sonst überschriebe der sechs
    // Sekunden alte Stand jede zwischenzeitliche Änderung mit frischen
    // Stempeln (Begründung wie in setStepExplanation und restoreItem).
    const fresh = await getIngredientRow(ingredient.id)
    const source = fresh ?? ingredient
    await upsertIngredient({ ...toIngredientDraft(source), deletedAt: null })
    await reload()
  }

  /** Macht das Löschen eines Schritts rückgängig — siehe `restoreIngredient`. */
  async function restoreStep(step: RecipeStep): Promise<void> {
    const fresh = await getStepRow(step.id)
    const source = fresh ?? step
    await upsertStep({ ...toStepDraft(source), deletedAt: null })
    await reload()
  }

  /**
   * Legt eine Zutat oder einen Schritt an eine andere Stelle.
   *
   * Beide Listen laufen durch dieselbe Funktion, weil sie sich in nichts
   * unterscheiden, was das Sortieren angeht — nur der Schreibweg ist ein
   * anderer. Geschrieben wird in aller Regel genau eine Zeile (Begründung in
   * `sync/merge/reorder.ts`).
   */
  async function moveRowTo(
    rows: readonly OrderedRow[],
    rowId: string,
    toIndex: number,
    write: (id: string, sortKey: string) => Promise<void>,
  ): Promise<void> {
    // Zutaten und Schritte kennen keine Blöcke: Der Block IST die Liste.
    const plan = planMoveTo(rows, rows, rowId, toIndex)
    if (plan === null) return

    for (const entry of [...plan.normalized, plan.moved]) {
      await write(entry.id, entry.sortKey)
    }

    await reload()
  }

  async function moveIngredientTo(toIndex: number, ingredientId: string): Promise<void> {
    const byId = new Map(ingredients.value.map(row => [row.id, row]))
    await moveRowTo(ingredients.value, ingredientId, toIndex, async (id, sortKey) => {
      const row = byId.get(id)
      if (row === undefined) return
      await upsertIngredient({ ...toIngredientDraft(row), sortKey })
    })
  }

  async function moveStepTo(toIndex: number, stepId: string): Promise<void> {
    const byId = new Map(steps.value.map(row => [row.id, row]))
    await moveRowTo(steps.value, stepId, toIndex, async (id, sortKey) => {
      const row = byId.get(id)
      if (row === undefined) return
      await upsertStep({ ...toStepDraft(row), sortKey })
    })
  }

  /**
   * Ändert Name und/oder Menge einer Zutat — der Schreibweg der
   * AI-Bearbeitung. Nur die übergebenen Felder werden neu gestempelt.
   */
  async function updateIngredient(
    ingredient: RecipeIngredient,
    changes: { name?: string, quantity?: number },
  ): Promise<void> {
    const name = changes.name?.trim()
    await upsertIngredient({
      ...toIngredientDraft(ingredient),
      ...(name !== undefined && name.length > 0 ? { name } : {}),
      ...(changes.quantity !== undefined ? { quantity: changes.quantity } : {}),
    })
    await reload()
  }

  /** Formuliert einen Schritt um — der Schreibweg der AI-Bearbeitung. */
  async function updateStepDescription(step: RecipeStep, description: string): Promise<void> {
    const trimmed = description.trim()
    if (trimmed.length === 0) return

    await upsertStep({ ...toStepDraft(step), description: trimmed })
    await reload()
  }

  /**
   * Speichert die AI-Erklärung eines Schritts. Das Feld wird gesynct —
   * beim nächsten Öffnen zeigt jedes Gerät das Gespeicherte statt neu zu laden.
   */
  async function setStepExplanation(step: RecipeStep, explanation: string): Promise<void> {
    // Frisch aus der Datenbank statt aus dem eingefrorenen Ansichts-Snapshot:
    // Die Erklärung kann Minuten unterwegs sein, und ein alter Draft würde
    // zwischenzeitliche Änderungen (etwa ein per Pull angekommenes Häkchen)
    // mit frischen Zeitstempeln zurückdrehen. So ändert sich genau ein Feld.
    const rows = await getStepsForRecipe(step.recipeId)
    const fresh = rows.find(row => row.id === step.id)
    if (fresh === undefined || fresh.deletedAt !== null) return

    await upsertStep({ ...toStepDraft(fresh), aiExplanation: explanation })
    await reload()
  }

  /** Setzt die Server-Bildreferenz (`sync:…`) nach einem Upload. */
  async function setRecipeImagePath(imagePath: string): Promise<void> {
    const target = recipe.value
    if (target === null) return

    await upsertRecipe({
      id: target.id,
      name: target.name,
      color: target.color,
      sourceUrl: target.sourceUrl,
      imagePath,
      deletedAt: target.deletedAt,
    })
    await reload()
  }

  /**
   * Setzt die Quelle des Rezepts — die Seite, aus der es entstanden ist.
   *
   * Nullable, seit die Quelle auch von Hand bearbeitet werden kann: `null`
   * entfernt sie wieder.
   */
  async function setRecipeSourceUrl(sourceUrl: string | null): Promise<void> {
    const target = recipe.value
    if (target === null) return

    const next = validHttpUrlOrNull(sourceUrl)
    if (next === target.sourceUrl) return

    await upsertRecipe({
      id: target.id,
      name: target.name,
      color: target.color,
      sourceUrl: next,
      imagePath: target.imagePath,
      deletedAt: target.deletedAt,
    })
    await reload()
  }

  /** Benennt das Rezept um. Nur das Feld `name` wird neu gestempelt. */
  async function renameRecipe(name: string): Promise<void> {
    const target = recipe.value
    const trimmed = name.trim()
    if (target === null || trimmed.length === 0 || trimmed === target.name) return

    await upsertRecipe({
      id: target.id,
      name: trimmed,
      color: target.color,
      sourceUrl: target.sourceUrl,
      imagePath: target.imagePath,
      deletedAt: target.deletedAt,
    })
    await reload()
  }

  /**
   * Löscht das Rezept.
   *
   * Mit Grabstein und nicht durch Entfernen der Zeile: Ohne `deletedAt`
   * erführe der Server nie davon und brächte es beim nächsten Pull zurück.
   * Rezepte werden nicht geteilt, hier gibt es also anders als bei den Listen
   * keinen zweiten Fall.
   */
  async function deleteRecipe(): Promise<void> {
    const target = recipe.value
    if (target === null) return

    await upsertRecipe({
      id: target.id,
      name: target.name,
      color: target.color,
      sourceUrl: target.sourceUrl,
      imagePath: target.imagePath,
      deletedAt: nowIso(),
    })
  }

  return {
    recipe: readonly(recipe),
    ingredients: readonly(ingredients),
    steps: readonly(steps),
    progress,
    isLoading: readonly(isLoading),
    load,
    reload,
    addIngredient,
    addStep,
    toggleStep,
    removeIngredient,
    removeStep,
    restoreIngredient,
    restoreStep,
    lastAwardedBadge,
    celebrateTick: readonly(celebrateTick),
    moveIngredientTo,
    moveStepTo,
    updateIngredient,
    updateStepDescription,
    setStepExplanation,
    setRecipeImagePath,
    setRecipeSourceUrl,
    renameRecipe,
    deleteRecipe,
  }
}

/**
 * Vollständige Zeilen für Tests gegen die Datenbank, wahlweise abgewandelt.
 * Standard ist eine saubere Zeile (`dirty = 0`) mit altem Zeitstempel.
 */
import type { IsoUtc } from '../../../shared/types/domain'
import {
  CLEAN,
  type BadgeRow,
  type ListItemRow,
  type ListRow,
  type RecipeChatMessageRow,
  type RecipeIngredientRow,
  type RecipeRow,
  type RecipeStepRow,
} from '../schema'

export const OLD: IsoUtc = '2026-06-01T08:00:00.000Z'

export function listRow(id: string, overrides: Partial<ListRow> = {}): ListRow {
  return {
    id,
    name: id,
    color: '#AABBCC',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: { name: OLD },
    dirty: CLEAN,
    ...overrides,
  }
}

export function itemRow(id: string, listId: string, overrides: Partial<ListItemRow> = {}): ListItemRow {
  return {
    id,
    listId,
    name: id,
    quantity: 1,
    checked: false,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    url: null,
    linkTitle: null,
    linkImagePath: null,
    linkImageKind: null,
    createdBy: null,
    modifiedBy: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: { name: OLD },
    dirty: CLEAN,
    ...overrides,
  }
}

export function recipeRow(id: string, overrides: Partial<RecipeRow> = {}): RecipeRow {
  return {
    id,
    name: id,
    color: '#AABBCC',
    sourceUrl: null,
    imagePath: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: { name: OLD },
    dirty: CLEAN,
    ...overrides,
  }
}

export function ingredientRow(id: string, recipeId: string, overrides: Partial<RecipeIngredientRow> = {}): RecipeIngredientRow {
  return {
    id,
    recipeId,
    name: id,
    quantity: 1,
    orderIndex: 0,
    sortKey: null,
    createdBy: null,
    modifiedBy: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: CLEAN,
    ...overrides,
  }
}

export function stepRow(id: string, recipeId: string, overrides: Partial<RecipeStepRow> = {}): RecipeStepRow {
  return {
    id,
    recipeId,
    description: id,
    orderIndex: 0,
    sortKey: null,
    isChecked: false,
    aiExplanation: null,
    createdBy: null,
    modifiedBy: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: CLEAN,
    ...overrides,
  }
}

export function chatMessageRow(id: string, recipeId: string, overrides: Partial<RecipeChatMessageRow> = {}): RecipeChatMessageRow {
  return {
    id,
    recipeId,
    role: 'user',
    content: id,
    createdAt: OLD,
    createdBy: null,
    dirty: CLEAN,
    ...overrides,
  }
}

export function badgeRow(id: string, recipeId: string, overrides: Partial<BadgeRow> = {}): BadgeRow {
  return {
    id,
    recipeId,
    recipeName: recipeId,
    recipeImagePath: null,
    recipeColor: '#AABBCC',
    earnedAt: OLD,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: CLEAN,
    ...overrides,
  }
}

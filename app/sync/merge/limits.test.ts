/**
 * Vertrag der Feldlimits.
 *
 * Der wichtigste Test ist der Snapshot der Zahlen: Ein gesenktes Limit lässt
 * jeden bereits ausgelieferten Client in ein 422 laufen, und ein 422 kippt den
 * gesamten Push — nicht nur die eine Zeile.
 */
import { describe, expect, test } from 'bun:test'
import type { Badge, List, ListItem, Recipe, RecipeChatMessage, RecipeIngredient, RecipeStep } from '../../../shared/types/domain'
import { ENTITY_TYPES } from './field-lww'
import {
  SANITIZABLE_TYPES,
  SYNC_FIELD_LIMITS,
  capText,
  capTextOrNull,
  clampNumber,
  sanitize,
  sortKeyForSync,
  userRefForSync,
} from './limits'

const NOW = '2026-07-16T10:00:00.000Z'

function makeList(overrides: Partial<List> = {}): List {
  return {
    id: 'a0000000-0000-4000-8000-000000000001',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    fieldTimestamps: null,
    name: 'Wocheneinkauf',
    color: '#ABCDEF',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: null,
    ...overrides,
  }
}

function makeListItem(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: 'a0000000-0000-4000-8000-000000000002',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    fieldTimestamps: null,
    listId: 'a0000000-0000-4000-8000-000000000001',
    name: 'Milch',
    quantity: 1,
    checked: false,
    removed: false,
    orderIndex: 0,
    sortKey: 'a0',
    url: null,
    linkTitle: null,
    linkImagePath: null,
    linkImageKind: null,
    createdBy: null,
    modifiedBy: null,
    ...overrides,
  }
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'a0000000-0000-4000-8000-000000000003',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    fieldTimestamps: null,
    name: 'Chili',
    color: '#ABCDEF',
    sourceUrl: null,
    imagePath: null,
    ...overrides,
  }
}

function makeRecipeIngredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    id: 'a0000000-0000-4000-8000-000000000004',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    fieldTimestamps: null,
    recipeId: 'a0000000-0000-4000-8000-000000000003',
    name: 'Bohnen',
    quantity: 2,
    orderIndex: 0,
    sortKey: 'a0',
    createdBy: null,
    modifiedBy: null,
    ...overrides,
  }
}

function makeRecipeStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 'a0000000-0000-4000-8000-000000000005',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    fieldTimestamps: null,
    recipeId: 'a0000000-0000-4000-8000-000000000003',
    description: 'Zwiebeln anbraten',
    orderIndex: 0,
    sortKey: 'a0',
    isChecked: false,
    aiExplanation: null,
    createdBy: null,
    modifiedBy: null,
    ...overrides,
  }
}

function makeBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    id: 'a0000000-0000-4000-8000-000000000006',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    fieldTimestamps: null,
    recipeId: 'a0000000-0000-4000-8000-000000000003',
    recipeName: 'Chili',
    recipeImagePath: null,
    recipeColor: '#ABCDEF',
    earnedAt: NOW,
    ...overrides,
  }
}

function makeChatMessage(overrides: Partial<RecipeChatMessage> = {}): RecipeChatMessage {
  return {
    id: 'a0000000-0000-4000-8000-000000000007',
    recipeId: 'a0000000-0000-4000-8000-000000000003',
    role: 'user',
    content: 'Wie lange muss das köcheln?',
    createdAt: NOW,
    createdBy: null,
    ...overrides,
  }
}

describe('SYNC_FIELD_LIMITS', () => {
  test('spiegelt die Zahlen der API exakt', () => {
    // Snapshot gegen api.shliste.app/src/routes/sync/schemas.ts. Limits dürfen
    // ohne gleichzeitigen Client-Rollout nur ANGEHOBEN werden, nie gesenkt.
    expect(SYNC_FIELD_LIMITS).toEqual({
      ID: 36,
      NAME: 500,
      COLOR: 20,
      SOURCE_URL: 2000,
      IMAGE_PATH: 2000,
      ITEM_URL: 2000,
      LAST_SUGGESTED: 5000,
      SORT_KEY: 100,
      DESCRIPTION: 10000,
      AI_EXPLANATION: 50000,
      CHAT_CONTENT: 50000,
      ROLE: 20,
      HISTORY_TYPE: 40,
      HISTORY_DESCRIPTION: 500,
      HISTORY_SNAPSHOT: 100000,
      NUMBER_MIN: 0,
      NUMBER_MAX: 1000000,
    })
  })
})

describe('capText', () => {
  test('lässt kürzere und exakt lange Werte unangetastet', () => {
    expect(capText('abc', 5)).toBe('abc')
    expect(capText('abcde', 5)).toBe('abcde')
  })

  test('kappt längere Werte auf das Limit', () => {
    expect(capText('abcdef', 5)).toBe('abcde')
    expect(capText('x'.repeat(600), SYNC_FIELD_LIMITS.NAME)).toHaveLength(SYNC_FIELD_LIMITS.NAME)
  })

  test('zerreisst kein Surrogatpaar', () => {
    // Ein halbes Emoji ist kein gültiger Codepoint und würde beim
    // UTF-8-Kodieren still zu "?" degradieren.
    const text = `ab${'\u{1F600}'}cd`
    expect(capText(text, 3)).toBe('ab')
    expect(capText(text, 4)).toBe(`ab${'\u{1F600}'}`)
  })

  test('kappt auch auf null Zeichen, ohne zu werfen', () => {
    expect(capText('abc', 0)).toBe('')
  })

  test('capTextOrNull lässt null null', () => {
    expect(capTextOrNull(null, 5)).toBeNull()
    expect(capTextOrNull('abcdef', 5)).toBe('abcde')
  })
})

describe('clampNumber', () => {
  test('klemmt auf den von der API akzeptierten Bereich', () => {
    expect(clampNumber(-1)).toBe(SYNC_FIELD_LIMITS.NUMBER_MIN)
    expect(clampNumber(2_000_000)).toBe(SYNC_FIELD_LIMITS.NUMBER_MAX)
    expect(clampNumber(42)).toBe(42)
  })

  test('rundet auf ganze Zahlen', () => {
    // Die API validiert per t.Integer; eine 1.5 löste denselben 422 aus wie
    // ein zu langer String. Kotlins Int kann diesen Fall gar nicht erzeugen.
    expect(clampNumber(1.4)).toBe(1)
    expect(clampNumber(1.6)).toBe(2)
  })

  test('fängt NaN und Unendlich ab', () => {
    expect(clampNumber(Number.NaN)).toBe(SYNC_FIELD_LIMITS.NUMBER_MIN)
    expect(clampNumber(Number.POSITIVE_INFINITY)).toBe(SYNC_FIELD_LIMITS.NUMBER_MIN)
  })
})

describe('sortKeyForSync', () => {
  test('lässt gültige Schlüssel unverändert', () => {
    expect(sortKeyForSync('a0V')).toBe('a0V')
    expect(sortKeyForSync(null)).toBeNull()
  })

  test('verwirft einen zu langen Schlüssel, statt ihn zu kürzen', () => {
    // Ein gekürzter Bruchindex ist kein kürzerer Schlüssel, sondern ein
    // FALSCHER: Er sortiert an anderer Stelle und kollidiert mit Nachbarn.
    const tooLong = 'a'.repeat(SYNC_FIELD_LIMITS.SORT_KEY + 1)

    expect(sortKeyForSync(tooLong)).toBeNull()
  })

  test('ein Schlüssel exakt auf dem Limit bleibt erhalten', () => {
    const exact = 'a'.repeat(SYNC_FIELD_LIMITS.SORT_KEY)

    expect(sortKeyForSync(exact)).toBe(exact)
  })
})

describe('userRefForSync', () => {
  test('verwirft eine zu lange UUID, statt sie zu kürzen', () => {
    // Eine abgeschnittene UUID ist eine ANDERE UUID und würde eine fremde
    // Identität behaupten.
    expect(userRefForSync('x'.repeat(SYNC_FIELD_LIMITS.ID + 1))).toBeNull()
  })

  test('lässt eine gültige UUID unverändert', () => {
    const uuid = 'a0000000-0000-4000-8000-000000000001'

    expect(uuid).toHaveLength(SYNC_FIELD_LIMITS.ID)
    expect(userRefForSync(uuid)).toBe(uuid)
  })
})

describe('sanitize', () => {
  test('kennt jeden Entitätstyp, der am Merge teilnimmt', () => {
    for (const entityType of ENTITY_TYPES) {
      expect(SANITIZABLE_TYPES).toContain(entityType)
    }
  })

  test('deckt zusätzlich die append-only Chat-Nachricht ab', () => {
    expect(SANITIZABLE_TYPES).toContain('recipeChatMessage')
  })

  test('kappt die Textfelder einer Liste', () => {
    const result = sanitize('list', makeList({
      name: 'n'.repeat(600),
      color: 'c'.repeat(30),
      lastSuggestedItems: 's'.repeat(6000),
      sourceUrl: `https://example.test/${'p'.repeat(3000)}`,
    }))

    expect(result.name).toHaveLength(SYNC_FIELD_LIMITS.NAME)
    expect(result.color).toHaveLength(SYNC_FIELD_LIMITS.COLOR)
    expect(result.lastSuggestedItems).toHaveLength(SYNC_FIELD_LIMITS.LAST_SUGGESTED)
    expect(result.sourceUrl).toHaveLength(SYNC_FIELD_LIMITS.SOURCE_URL)
  })

  test('lässt die Identität einer Zeile in Ruhe', () => {
    // id, listId und recipeId werden bewusst nie gekappt: Eine gekürzte ID
    // zeigt auf eine andere Zeile oder auf gar keine.
    const row = makeListItem({ id: 'i'.repeat(80), listId: 'l'.repeat(80) })

    const result = sanitize('listItem', row)

    expect(result.id).toBe(row.id)
    expect(result.listId).toBe(row.listId)
  })

  test('lässt Zeitstempel und fieldTimestamps in Ruhe', () => {
    // Sie hier zu verschieben hiesse, eine LWW-Entscheidung zu ändern, ohne
    // dass sich inhaltlich etwas geändert hat.
    const fieldTimestamps = { name: NOW }
    const row = makeListItem({ name: 'n'.repeat(600), fieldTimestamps, deletedAt: NOW })

    const result = sanitize('listItem', row)

    expect(result.fieldTimestamps).toEqual(fieldTimestamps)
    expect(result.createdAt).toBe(NOW)
    expect(result.updatedAt).toBe(NOW)
    expect(result.deletedAt).toBe(NOW)
  })

  test('verwirft sortKey und Fremd-IDs eines Items, statt sie zu kürzen', () => {
    const result = sanitize('listItem', makeListItem({
      sortKey: 'a'.repeat(SYNC_FIELD_LIMITS.SORT_KEY + 1),
      createdBy: 'c'.repeat(SYNC_FIELD_LIMITS.ID + 1),
      modifiedBy: 'm'.repeat(SYNC_FIELD_LIMITS.ID + 1),
    }))

    expect(result.sortKey).toBeNull()
    expect(result.createdBy).toBeNull()
    expect(result.modifiedBy).toBeNull()
  })

  test('klemmt die Zahlen eines Items', () => {
    const result = sanitize('listItem', makeListItem({ quantity: -5, orderIndex: 9_999_999 }))

    expect(result.quantity).toBe(SYNC_FIELD_LIMITS.NUMBER_MIN)
    expect(result.orderIndex).toBe(SYNC_FIELD_LIMITS.NUMBER_MAX)
  })

  test('kappt die Textfelder eines Rezepts', () => {
    const result = sanitize('recipe', makeRecipe({
      name: 'n'.repeat(600),
      color: 'c'.repeat(30),
      sourceUrl: 'u'.repeat(3000),
      imagePath: 'i'.repeat(3000),
    }))

    expect(result.name).toHaveLength(SYNC_FIELD_LIMITS.NAME)
    expect(result.color).toHaveLength(SYNC_FIELD_LIMITS.COLOR)
    expect(result.sourceUrl).toHaveLength(SYNC_FIELD_LIMITS.SOURCE_URL)
    expect(result.imagePath).toHaveLength(SYNC_FIELD_LIMITS.IMAGE_PATH)
  })

  test('kappt Zutaten und Schritte nach denselben Regeln', () => {
    const ingredient = sanitize('recipeIngredient', makeRecipeIngredient({
      name: 'n'.repeat(600),
      sortKey: 'a'.repeat(SYNC_FIELD_LIMITS.SORT_KEY + 1),
    }))
    const step = sanitize('recipeStep', makeRecipeStep({
      description: 'd'.repeat(20_000),
      aiExplanation: 'a'.repeat(60_000),
    }))

    expect(ingredient.name).toHaveLength(SYNC_FIELD_LIMITS.NAME)
    expect(ingredient.sortKey).toBeNull()
    expect(step.description).toHaveLength(SYNC_FIELD_LIMITS.DESCRIPTION)
    expect(step.aiExplanation).toHaveLength(SYNC_FIELD_LIMITS.AI_EXPLANATION)
  })

  test('kappt die Textfelder eines Badges', () => {
    const result = sanitize('badge', makeBadge({
      recipeName: 'n'.repeat(600),
      recipeColor: 'c'.repeat(30),
      recipeImagePath: 'i'.repeat(3000),
    }))

    expect(result.recipeName).toHaveLength(SYNC_FIELD_LIMITS.NAME)
    expect(result.recipeColor).toHaveLength(SYNC_FIELD_LIMITS.COLOR)
    expect(result.recipeImagePath).toHaveLength(SYNC_FIELD_LIMITS.IMAGE_PATH)
  })

  test('kappt den Inhalt einer Chat-Nachricht und lässt die Rolle stehen', () => {
    const result = sanitize('recipeChatMessage', makeChatMessage({ content: 'c'.repeat(60_000) }))

    expect(result.content).toHaveLength(SYNC_FIELD_LIMITS.CHAT_CONTENT)
    expect(result.role).toBe('user')
  })

  test('lässt eine schon konforme Zeile inhaltlich unverändert', () => {
    const row = makeListItem()

    expect(sanitize('listItem', row)).toEqual(row)
  })

  test('mutiert die Eingabe nicht', () => {
    const row = makeListItem({ name: 'n'.repeat(600) })

    sanitize('listItem', row)

    expect(row.name).toHaveLength(600)
  })
})

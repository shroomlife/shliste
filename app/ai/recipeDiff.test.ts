/// <reference types="bun" />
/**
 * Tests der Rezept-Diff-Adapter. Der Algorithmus selbst (`computeListDiff`)
 * ist in diff.test.ts belegt — hier geht es um die Übersetzung: Zutaten und
 * Schritte müssen so durch das idx-Matching laufen, dass eine geänderte
 * Menge als `modified` und ein umformulierter Schritt als `renamed`
 * (Geändert) herauskommt.
 */
import { describe, expect, test } from 'bun:test'
import { computeListDiff } from './diff'
import type { EditedRecipe } from './recipeContract'
import {
  buildCurrentRecipePayload,
  editedIngredientsAsItems,
  editedStepsAsItems,
  hasRecipeChanges,
  ingredientDiffSource,
  stepDiffSource,
} from './recipeDiff'

const INGREDIENTS = [
  { id: 'i-1', name: 'Rote Linsen', quantity: 1 },
  { id: 'i-2', name: 'Kokosmilch', quantity: 2 },
] as const

const STEPS = [
  { id: 's-1', description: 'Linsen waschen.' },
  { id: 's-2', description: 'Köcheln lassen.' },
] as const

describe('buildCurrentRecipePayload', () => {
  test('vergibt den idx als Position im übergebenen Array', () => {
    expect(buildCurrentRecipePayload('Linsencurry', INGREDIENTS, STEPS)).toEqual({
      name: 'Linsencurry',
      ingredients: [
        { idx: 0, name: 'Rote Linsen', quantity: 1 },
        { idx: 1, name: 'Kokosmilch', quantity: 2 },
      ],
      steps: [
        { idx: 0, description: 'Linsen waschen.' },
        { idx: 1, description: 'Köcheln lassen.' },
      ],
    })
  })
})

describe('Zutaten-Diff über die Adapter', () => {
  test('Mengenänderung wird modified, neue Zutat added, fehlende removed', () => {
    const proposal: EditedRecipe = {
      name: 'Linsencurry',
      ingredients: [
        { idx: 0, name: 'Rote Linsen', quantity: 5 },
        { idx: null, name: 'Ingwer', quantity: 1 },
      ],
      steps: [],
    }

    const diff = computeListDiff(ingredientDiffSource(INGREDIENTS), editedIngredientsAsItems(proposal))

    expect(diff).toEqual([
      {
        kind: 'modified',
        itemId: 'i-1',
        name: 'Rote Linsen',
        oldQuantity: 1,
        newQuantity: 5,
        oldChecked: false,
        newChecked: false,
      },
      { kind: 'added', name: 'Ingwer', quantity: 1, checked: false },
      { kind: 'removed', itemId: 'i-2', name: 'Kokosmilch', quantity: 2 },
    ])
  })
})

describe('Schritte-Diff über die Adapter', () => {
  test('Umformulierung wird renamed (Geändert), Unverändertes bleibt unchanged', () => {
    const proposal: EditedRecipe = {
      name: 'Linsencurry',
      ingredients: [],
      steps: [
        { idx: 0, description: 'Linsen gründlich waschen.' },
        { idx: 1, description: 'Köcheln lassen.' },
      ],
    }

    const diff = computeListDiff(stepDiffSource(STEPS), editedStepsAsItems(proposal))

    expect(diff).toEqual([
      {
        kind: 'renamed',
        itemId: 's-1',
        oldName: 'Linsen waschen.',
        newName: 'Linsen gründlich waschen.',
        oldQuantity: 1,
        newQuantity: 1,
        oldChecked: false,
        newChecked: false,
      },
      { kind: 'unchanged', name: 'Köcheln lassen.', quantity: 1, checked: false },
    ])
  })
})

describe('hasRecipeChanges', () => {
  const unchangedProposal: EditedRecipe = {
    name: 'Linsencurry',
    ingredients: [
      { idx: 0, name: 'Rote Linsen', quantity: 1 },
      { idx: 1, name: 'Kokosmilch', quantity: 2 },
    ],
    steps: [
      { idx: 0, description: 'Linsen waschen.' },
      { idx: 1, description: 'Köcheln lassen.' },
    ],
  }

  function diffsFor(proposal: EditedRecipe) {
    return {
      ingredientDiff: computeListDiff(ingredientDiffSource(INGREDIENTS), editedIngredientsAsItems(proposal)),
      stepDiff: computeListDiff(stepDiffSource(STEPS), editedStepsAsItems(proposal)),
    }
  }

  test('nichts geändert ergibt false', () => {
    const { ingredientDiff, stepDiff } = diffsFor(unchangedProposal)
    expect(hasRecipeChanges(ingredientDiff, stepDiff, 'Linsencurry', unchangedProposal)).toBe(false)
  })

  test('ein neuer Rezeptname allein ergibt true', () => {
    const proposal: EditedRecipe = { ...unchangedProposal, name: 'Dal' }
    const { ingredientDiff, stepDiff } = diffsFor(proposal)
    expect(hasRecipeChanges(ingredientDiff, stepDiff, 'Linsencurry', proposal)).toBe(true)
  })

  test('eine Änderung in einem der Blöcke ergibt true', () => {
    const proposal: EditedRecipe = {
      ...unchangedProposal,
      steps: [
        { idx: 0, description: 'Linsen gründlich waschen.' },
        { idx: 1, description: 'Köcheln lassen.' },
      ],
    }
    const { ingredientDiff, stepDiff } = diffsFor(proposal)
    expect(hasRecipeChanges(ingredientDiff, stepDiff, 'Linsencurry', proposal)).toBe(true)
  })
})

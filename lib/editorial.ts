/** Öffentlicher Rezeptvertrag v1. Persönliche Kopien speichern JSON als atomare Sync-Felder. */
export interface IngredientMarker { subject?: string, label: string, x: number, y: number }
export interface RecipeIllustration { src: string, alt: string, markers?: IngredientMarker[] }
export interface IllustratedStep {
  number: number
  title: string
  instruction: string
  image: RecipeIllustration
}
export interface EditorialMetadata {
  catalogId: string
  version: number
  emoji: string
  intro: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  restMinutes?: number
  difficulty: 'einfach' | 'mittel'
  tags: string[]
  hero: RecipeIllustration
  tips: { title: string, text: string }[]
  storage: string
  cookTest: 'ausstehend' | 'nachgekocht'
}
export interface CatalogRecipe extends EditorialMetadata {
  yieldLabel?: string
  variants?: RecipeVariant[]
  story?: { eyebrow: string, sticker: string[], ingredientNote: string }
  previousTitles?: string[]
  slug: string
  title: string
  kind: 'herzhaft' | 'suess'
  meal: 'Hauptgericht' | 'Salat' | 'Snack' | 'Dessert' | 'Frühstück'
  status: 'preview' | 'published'
  ingredients: { id: string, amount: number | null, unit: string, name: string, note?: string }[]
  steps: { id: string, title: string, instruction: string, minutes?: number, illustration: RecipeIllustration }[]
  inspiration?: { title: string, url: string }
  sources: { title: string, url: string, note: string }[]
  researchedAt: string
}
export interface RecipeVariant {
  id: string
  label: string
  description: string
  ingredients: CatalogRecipe['ingredients']
  steps: CatalogRecipe['steps']
  cookMinutes: number
}

/** Variant identity must survive saving and native-app handoff. */
export function selectRecipeVariant(recipe: CatalogRecipe, variantId?: string): CatalogRecipe {
  const variant = recipe.variants?.find(item => item.id === variantId) ?? recipe.variants?.[0]
  if (!variant) return recipe
  const { variants: _variants, ...base } = recipe
  return { ...base, catalogId: `${recipe.catalogId}-${variant.id}`, title: `${recipe.title} · ${variant.label}`, ingredients: variant.ingredients, steps: variant.steps, cookMinutes: variant.cookMinutes }
}
export interface RecipeIdea {
  id: string
  title: string
  emoji: string
  kind: CatalogRecipe['kind']
  meal: CatalogRecipe['meal']
  description: string
  source: string
  sourceName: string
  tags: string[]
}

/** Nur eigene, unveränderliche Katalogdateien dürfen ohne Authentifizierung geladen werden. */
export function isEditorialImage(value: unknown): value is RecipeIllustration {
  if (!value || typeof value !== 'object') return false
  const image = value as Record<string, unknown>
  return typeof image.src === 'string' && /^\/images\/editorial\/[a-z0-9-]+\/v[1-9][0-9]*\/(hero|step-[1-9][0-9]*)\.webp$/.test(image.src)
    && (image.markers === undefined || (Array.isArray(image.markers) && image.markers.length <= 12 && image.markers.every(m => m && typeof m.label === 'string' && m.label.length > 0 && m.label.length <= 80 && [m.x, m.y].every(n => Number.isFinite(n) && n >= 0 && n <= 100))))
    && typeof image.alt === 'string' && image.alt.length > 0 && image.alt.length <= 1000
}

export function parseIllustration(raw: string | null | undefined): RecipeIllustration | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    return isEditorialImage(value) ? value : null
  }
  catch { return null }
}

export function parseEditorialMetadata(raw: string | null | undefined): EditorialMetadata | null {
  if (!raw || raw.length > 20000) return null
  try {
    const v = JSON.parse(raw) as EditorialMetadata
    if (!v || typeof v !== 'object' || typeof v.catalogId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(v.catalogId)
      || !Number.isInteger(v.version) || v.version < 1 || typeof v.intro !== 'string' || typeof v.emoji !== 'string'
      || !Number.isFinite(v.servings) || v.servings <= 0 || !Number.isFinite(v.prepMinutes) || v.prepMinutes < 0
      || (v.restMinutes !== undefined && (!Number.isFinite(v.restMinutes) || v.restMinutes < 0))
      || !Number.isFinite(v.cookMinutes) || v.cookMinutes < 0 || !isEditorialImage(v.hero)
      || !['einfach', 'mittel'].includes(v.difficulty) || !['ausstehend', 'nachgekocht'].includes(v.cookTest)
      || !Array.isArray(v.tags) || !v.tags.every(t => typeof t === 'string') || typeof v.storage !== 'string'
      || !Array.isArray(v.tips) || !v.tips.every(t => t && typeof t.title === 'string' && typeof t.text === 'string')) return null
    return v
  }
  catch { return null }
}

export function totalMinutes(recipe: Pick<EditorialMetadata, 'prepMinutes' | 'cookMinutes' | 'restMinutes'>): number {
  return recipe.prepMinutes + recipe.cookMinutes + (recipe.restMinutes ?? 0)
}

export function durationLabel(recipe: CatalogRecipe): string {
  const minutes = totalMinutes(recipe)
  if (minutes < 120) return `${minutes} Min.`
  return [`${Math.floor(minutes / 60)} Std.`, minutes % 60 ? `${minutes % 60} Min.` : ''].filter(Boolean).join(' ')
}

export function ingredientLabel(ingredient: CatalogRecipe['ingredients'][number]): string {
  const fractions: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' }
  const amount = ingredient.amount === null ? '' : fractions[ingredient.amount] ?? ingredient.amount.toLocaleString('de-DE')
  return [amount, ingredient.unit, ingredient.name].filter(Boolean).join(' ') + (ingredient.note ? ` (${ingredient.note})` : '')
}

export function recipeMetadata(recipe: CatalogRecipe): EditorialMetadata {
  const { catalogId, version, emoji, intro, servings, prepMinutes, cookMinutes, difficulty, tags, hero, tips, storage, cookTest } = recipe
  return { catalogId, version, emoji, intro, servings, prepMinutes, cookMinutes, ...(recipe.restMinutes !== undefined && { restMinutes: recipe.restMinutes }), difficulty, tags, hero, tips, storage, cookTest }
}

export function validateCatalogRecipe(value: unknown): CatalogRecipe {
  const r = value as CatalogRecipe
  if (!r || !parseEditorialMetadata(JSON.stringify(r)) || !/^[a-z0-9-]+$/.test(r.slug) || typeof r.title !== 'string'
    || !['herzhaft', 'suess'].includes(r.kind) || !['Hauptgericht', 'Salat', 'Snack', 'Dessert', 'Frühstück'].includes(r.meal)
    || !['preview', 'published'].includes(r.status) || !Array.isArray(r.ingredients) || !r.ingredients.length
    || !Array.isArray(r.steps) || !r.steps.length || !Array.isArray(r.sources) || !r.sources.length) throw new Error('Ungültiges Katalogrezept')
  if (r.previousTitles && (!Array.isArray(r.previousTitles) || !r.previousTitles.every(name => typeof name === 'string'))) throw new Error('Ungültige frühere Rezeptnamen')
  for (const i of r.ingredients) if (!i.id || typeof i.name !== 'string' || !i.name || typeof i.unit !== 'string' || (i.amount !== null && (!Number.isFinite(i.amount) || i.amount <= 0))) throw new Error('Ungültige Katalogzutat')
  for (const s of r.steps) if (!s.id || !s.title || typeof s.instruction !== 'string' || !s.instruction || !isEditorialImage(s.illustration)) throw new Error('Ungültiger Rezeptschritt')
  if (new Set(r.ingredients.map(i => i.id)).size !== r.ingredients.length || new Set(r.steps.map(s => s.id)).size !== r.steps.length) throw new Error('Doppelte Rezept-IDs')
  if (r.inspiration && !r.sources.some(source => source.url === r.inspiration?.url)) throw new Error('Unbekannte Rezeptinspiration')
  for (const s of r.sources) if (!s.title || !/^https:\/\//.test(s.url)) throw new Error('Ungültige Rezeptquelle')
  if (r.variants !== undefined) {
    if (!Array.isArray(r.variants) || !r.variants.length || new Set(r.variants.map(v => v.id)).size !== r.variants.length) throw new Error('Ungültige Rezeptvarianten')
    for (const v of r.variants) {
      if (!/^[a-z0-9-]+$/.test(v.id) || !v.label || typeof v.description !== 'string') throw new Error('Ungültige Rezeptvariante')
      validateCatalogRecipe(selectRecipeVariant(r, v.id))
    }
  }
  // The plated dish uses the catalog title, including when an editor renames it.
  return {
    ...r,
    steps: r.steps.map((step) => {
      const image = step.illustration
      if (!image.markers?.some(marker => marker.subject === 'dish' && marker.label !== r.title)) return step
      const markers = image.markers.map(marker => marker.subject === 'dish' ? { ...marker, label: r.title } : marker)
      return { ...step, illustration: { ...image, markers } }
    }),
  }
}

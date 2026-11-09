export function androidRecipeLinks(id: string, version: number, asCopy = false, origin = 'https://shliste.app') {
  if (!/^[a-z0-9-]{1,80}$/.test(id) || !Number.isSafeInteger(version) || version < 1) throw new Error('Ungültiges Rezeptziel')
  const params = `version=${version}${asCopy ? '&copy=1' : ''}`
  const path = `/rezept-import/${id}?${params}`
  const fallback = new URL(path, origin).href
  return {
    path,
    app: `shliste://recipe/${id}?${params}`,
    intent: `intent://recipe/${id}?${params}#Intent;scheme=shliste;package=com.shroomlife.shliste;S.browser_fallback_url=${encodeURIComponent(fallback)};end`,
  }
}

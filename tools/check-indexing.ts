const publicOrigin = 'https://shliste.app'
const target = new URL(process.argv[2] ?? publicOrigin)
const noindex = /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i
const issues: string[] = []

function check(condition: unknown, message: string) {
  if (!condition) issues.push(message)
}

function request(path: string) {
  return fetch(new URL(path, target), { redirect: 'manual', signal: AbortSignal.timeout(15000) })
}

async function readPage(path: string) {
  const response = await request(path)
  const robots = [response.headers.get('x-robots-tag') ?? '']
  const canonicals: string[] = []
  const anchors = new Set<string>()
  const jsonLd: string[] = []
  await new HTMLRewriter()
    .on('meta[name="robots"], meta[name="googlebot"]', {
      element: (el) => { robots.push(el.getAttribute('content') ?? '') },
    })
    .on('link[rel="canonical"]', {
      element: (el) => { canonicals.push(el.getAttribute('href') ?? '') },
    })
    .on('[id]', {
      element: (el) => { anchors.add(el.getAttribute('id') ?? '') },
    })
    .on('script[type="application/ld+json"]', {
      element: () => { jsonLd.push('') },
      text: (chunk) => { jsonLd[jsonLd.length - 1] += chunk.text },
    })
    .transform(response).text()
  return { status: response.status, blocked: robots.some(value => noindex.test(value)), canonicals, anchors, jsonLd }
}

const sitemap = await request('/sitemap.xml')
if (!sitemap.ok) throw new Error(`Sitemap returned HTTP ${sitemap.status}`)
const urls = Array.from((await sitemap.text()).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g), match => new URL(match[1]!))
check(urls.length > 0, 'The sitemap is empty')
check(new Set(urls.map(url => url.href)).size === urls.length, 'The sitemap contains duplicate URLs')

const catalog = await request('/api/recipe-catalog/v1')
if (!catalog.ok) throw new Error(`Recipe catalog returned HTTP ${catalog.status}`)
const { recipes } = await catalog.json() as { recipes: { slug: string, status: string }[] }
const recipePaths = new Set(recipes.filter(recipe => recipe.status === 'published').map(recipe => `/rezepte/${recipe.slug}`))
const sitemapPaths = new Set(urls.map(url => url.pathname))
for (const path of ['/', '/rezepte', '/rezeptideen', ...recipePaths]) {
  check(sitemapPaths.has(path), `${path}: missing from sitemap`)
}

for (let offset = 0; offset < urls.length; offset += 8) {
  await Promise.all(urls.slice(offset, offset + 8).map(async (url) => {
    const path = url.pathname
    check(url.origin === publicOrigin && !url.search && !url.hash, `${url.href}: not a public canonical URL`)
    const page = await readPage(path)
    check(page.status === 200, `${path}: sitemap entry returned HTTP ${page.status}`)
    check(!page.blocked, `${path}: sitemap entry is noindex`)
    check(page.canonicals.length === 1 && page.canonicals[0] === url.href, `${path}: canonical differs from sitemap`)
    if (!path.startsWith('/rezepte/')) return
    check(recipePaths.has(path), `${path}: unpublished recipe in sitemap`)
    const recipe = page.jsonLd.map(raw => JSON.parse(raw)).find(data => data['@type'] === 'Recipe')
    check(recipe?.name && recipe?.image && recipe?.keywords && recipe?.recipeInstructions?.length, `${path}: incomplete recipe markup`)
    for (const step of recipe?.recipeInstructions ?? []) {
      const anchor = typeof step.url === 'string' && step.url.startsWith(`${url.href}#`) ? decodeURIComponent(new URL(step.url).hash.slice(1)) : ''
      check(anchor && page.anchors.has(anchor), `${path}: step URL has no matching anchor`)
    }
  }))
}

const utilityPaths = ['/app/lists', '/privacy', '/imprint', '/warteliste', '/rezept-import/french-onion-pasta']
for (const path of utilityPaths) {
  check(!sitemapPaths.has(path), `${path}: utility page is in sitemap`)
  const page = await readPage(path)
  check(page.status === 200 && page.blocked, `${path}: expected an accessible noindex page`)
}
check(!urls.some(url => /^\/(?:app|api|rezept-import|_nuxt)(?:\/|$)/.test(url.pathname)), 'Sitemap includes an app, import, API or build asset URL')

if (issues.length) throw new Error(issues.join('\n'))
console.log(`PASS: ${urls.length} canonical sitemap URLs, ${recipePaths.size} recipes, ${utilityPaths.length} noindex routes`)

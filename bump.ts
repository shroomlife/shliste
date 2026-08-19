/**
 * Versionssprung: `bun run bump <patch|minor|major>`
 *
 * NUR NOCH package.json. Vorher standen hier drei Dateien, weil die Version
 * zusätzlich in `public/manifest.json` und im Cache-Namen des handgeschriebenen
 * Service Workers klebte. Beides gibt es nicht mehr: Das Manifest erzeugt
 * `@vite-pwa/nuxt` beim Build, und Workbox versioniert seinen Cache über die
 * Prüfsummen der Dateien — genauer, als eine Versionsnummer es je könnte.
 *
 * Der Commit entsteht hier mit, damit ein Sprung nicht versehentlich in einer
 * anderen Änderung untergeht.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

type BumpKind = 'patch' | 'minor' | 'major'

const PACKAGE_JSON = 'package.json'

/** Erlaubt Vorab- und Build-Angaben, verwirft sie aber beim Sprung. */
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function readKind(value: string | undefined): BumpKind {
  if (value === 'patch' || value === 'minor' || value === 'major') return value
  return fail('Aufruf: bun run bump <patch|minor|major>')
}

function nextVersion(current: string, kind: BumpKind): string {
  const match = SEMVER.exec(current)
  if (match === null) fail(`Unbrauchbare Version in ${PACKAGE_JSON}: "${current}"`)

  const [major, minor, patch] = match.slice(1, 4).map(part => Number.parseInt(part, 10))
  if (major === undefined || minor === undefined || patch === undefined) {
    fail(`Unbrauchbare Version in ${PACKAGE_JSON}: "${current}"`)
  }

  switch (kind) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
  }
}

const kind = readKind(process.argv[2])

const raw = readFileSync(PACKAGE_JSON, 'utf8')
const pkg: unknown = JSON.parse(raw)
if (typeof pkg !== 'object' || pkg === null || !('version' in pkg) || typeof pkg.version !== 'string') {
  fail(`${PACKAGE_JSON} hat kein brauchbares Feld "version".`)
}

const from = pkg.version
const to = nextVersion(from, kind)

// Über den geparsten Wert schreiben und nicht per Textersetzung: Die
// Versionsnummer taucht sonst auch in Abhängigkeiten auf, und eine davon
// mitzuändern wäre ein stiller Fehler.
writeFileSync(PACKAGE_JSON, `${JSON.stringify({ ...pkg, version: to }, null, 2)}\n`, 'utf8')
console.log(`${from} → ${to}`)

execSync(`git add ${PACKAGE_JSON}`, { stdio: 'inherit' })
execSync(`git commit -m "bump: v${from} → v${to}"`, { stdio: 'inherit' })

// bump.ts
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

/**
 * === Konfiguration ===
 * Passe die Liste bei Bedarf an.
 */
const FILES: string[] = [
  './package.json',
  './public/manifest.json',
  './public/sw.js',
]

/**
 * === CLI / Args ===
 * Erwartet: bun bump.ts <patch|minor|major>
 */
const [, , bumpKindRaw] = process.argv
const bumpKind = (bumpKindRaw || '').toLowerCase()

if (!['patch', 'minor', 'major'].includes(bumpKind)) {
  console.error('Usage: bun bump.ts <patch|minor|major>')
  process.exit(1)
}

/**
 * === Version aus package.json lesen ===
 */
const pkgJsonPath = path.resolve(__dirname, 'package.json')
if (!fs.existsSync(pkgJsonPath)) {
  console.error(`package.json nicht gefunden bei: ${pkgJsonPath}`)
  process.exit(1)
}

let oldVersion: string
let pkg: { version: string }
try {
  pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
  oldVersion = pkg.version
  if (typeof oldVersion !== 'string' || oldVersion.trim() === '') {
    throw new Error('Feld "version" fehlt oder ist leer.')
  }
}
catch (err) {
  console.error('Konnte Version aus package.json nicht lesen:', err)
  process.exit(1)
}

/**
 * === Semver-Parsing ===
 * Erlaubt ggf. vorhandene -preRelease und +build Metadaten, die beim Bump entfernt werden.
 */
const SEMVER
  = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

const match = oldVersion.match(SEMVER)
if (!match) {
  console.error(
    `Ungültiges Versionsformat in package.json: "${oldVersion}". Erwartet z.B. 1.2.3`,
  )
  process.exit(1)
}

const [_, majStr, minStr, patStr] = match
let major = parseInt(majStr, 10)
let minor = parseInt(minStr, 10)
let patch = parseInt(patStr, 10)

switch (bumpKind) {
  case 'patch':
    patch += 1
    break
  case 'minor':
    minor += 1
    patch = 0
    break
  case 'major':
    major += 1
    minor = 0
    patch = 0
    break
}

const newVersion = `${major}.${minor}.${patch}`

if (newVersion === oldVersion) {
  console.warn(
    `Neue Version entspricht der alten Version (${oldVersion}). Es gibt nichts zu ersetzen.`,
  )
}

/**
 * === Ersetzungen in Dateien ===
 */
function replaceAll(haystack: string, needle: string, replacement: string) {
  return haystack.split(needle).join(replacement)
}

let changedCount = 0

FILES.forEach((relFile) => {
  const filePath = path.resolve(process.cwd(), relFile)
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Übersprungen (nicht gefunden): ${filePath}`)
      return
    }

    const content = fs.readFileSync(filePath, 'utf8')
    let newContent = content

    // Speziell package.json: dort das "version"-Feld gezielt setzen,
    // statt blind zu ersetzen (robuster).
    if (path.basename(filePath) === 'package.json') {
      const pkgLocal = JSON.parse(content)
      const before = pkgLocal.version
      if (typeof before === 'string') {
        pkgLocal.version = newVersion
        newContent = JSON.stringify(pkgLocal, null, 2) + '\n'
      }
    }
    else {
      // In den restlichen Dateien: oldVersion -> newVersion ersetzen
      newContent = replaceAll(newContent, oldVersion, newVersion)
    }

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8')
      console.log(`Updated: ${filePath}`)
      changedCount++
    }
    else {
      console.log(`No change: ${filePath}`)
    }
  }
  catch (err) {
    console.error(`Error processing file ${filePath}:`, err)
  }
})

console.log(
  `Fertig. Version "${oldVersion}" → "${newVersion}" in ${changedCount}/${FILES.length} Dateien ersetzt.`,
)

/**
 * === Git Commit nur für die 4 Dateien ===
 */
try {
  const filesArg = FILES.map(f => `"${f}"`).join(' ')
  execSync(`git add ${filesArg}`, { stdio: 'inherit' })
  execSync(`git commit -m "bump: v${oldVersion} → v${newVersion}"`, {
    stdio: 'inherit',
  })
  console.log(`Git commit erstellt: bump: v${oldVersion} → v${newVersion}`)
}
catch (err) {
  console.error('Fehler beim Git-Commit:', err)
  // nicht fatal – Repo könnte clean sein, o.Ä.
}

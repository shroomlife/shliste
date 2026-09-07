/**
 * Fractional Indexing (Base 62) — lexikografisch sortierbare Ordnungsschlüssel
 * für Drag-and-Drop, ohne beim Umsortieren alle Geschwister neu zu schreiben.
 *
 * QUELLE: `api.shliste.app/src/lib/fractional-index.ts` (dort ein Port von
 * rocicorp/fractional-indexing, MIT). Diese Datei muss Zeichen für Zeichen
 * dieselben Schlüssel erzeugen: Ein Schlüssel, den das Web vergibt, wird von
 * API und Android nur verglichen, nie neu berechnet. Weichen die Alphabete oder
 * die Mittelwertbildung ab, sortieren die Geräte dieselbe Liste unterschiedlich.
 *
 * Gegenüber der API-Fassung ohne `!`-Assertions und ohne ungeprüfte
 * Index-Zugriffe formuliert (`noUncheckedIndexedAccess` ist im Web-Projekt an).
 * Das Verhalten für gültige Eingaben ist identisch; für kaputte Eingaben wirft
 * diese Fassung früher, statt "undefined" in den Schlüssel zu schreiben.
 */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE = DIGITS.length

/**
 * Ziffer an einer Position des Alphabets.
 *
 * Der Wurf ersetzt den ungeprüften Index-Zugriff der API-Fassung: Dort ergäbe
 * ein Index außerhalb des Alphabets still den String "undefined" mitten im
 * Schlüssel. Bei gültigen Schlüsseln kann das nicht passieren; passiert es
 * doch, ist Fail Fast die ehrlichere Antwort als ein kaputter Sortierschlüssel,
 * der sich dann über den Sync verteilt.
 */
function digitAt(index: number): string {
  const digit = DIGITS[index]
  if (digit === undefined) throw new Error(`Ungültiger Ziffernindex: ${index}`)
  return digit
}

/** Länge des Integer-Teils anhand des Kopfzeichens (a→2, b→3, …, z→27). */
function intLen(head: string): number {
  if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 95
  if (head >= 'A' && head <= 'Z') return 92 - head.charCodeAt(0)
  throw new Error(`Ungültiges Kopfzeichen im Order Key: ${head}`)
}

/** Schneidet den Integer-Teil aus einem Order Key. */
function intPart(key: string): string {
  return key.slice(0, intLen(key.charAt(0)))
}

/**
 * Mittelwert zwischen zwei Bruchteilen. `b === undefined` heißt "kein oberes
 * Ende", der Mittelwert liegt dann zwischen `a` und dem Ende des Alphabets.
 */
function mid(a: string, b: string | undefined): string {
  if (b !== undefined) {
    // Gemeinsames Präfix überspringen und nur den Rest mitteln.
    // `a.charAt(n)` liefert "" hinter dem Stringende; der Fallback auf die
    // kleinste Ziffer entspricht dem `?? DIGITS[0]` der API-Fassung.
    let n = 0
    while ((a.charAt(n) || DIGITS.charAt(0)) === b.charAt(n)) n++
    if (n > 0) return b.slice(0, n) + mid(a.slice(n), b.slice(n))
  }

  const digitA = a.length > 0 ? DIGITS.indexOf(a.charAt(0)) : 0
  const digitB = b !== undefined ? DIGITS.indexOf(b.charAt(0)) : BASE
  if (digitB - digitA > 1) return digitAt(Math.round((digitA + digitB) / 2))
  if (b !== undefined && b.length > 1) return b.slice(0, 1)
  return digitAt(digitA) + mid(a.slice(1), undefined)
}

/** Erhöht den Integer-Teil um eins. */
function incInt(x: string): string {
  let digits = x
  for (let i = x.length - 1; i >= 1; i--) {
    const next = DIGITS.indexOf(digits.charAt(i)) + 1
    if (next < BASE) return digits.slice(0, i) + digitAt(next) + digits.slice(i + 1)
    // Überlauf: Stelle auf die kleinste Ziffer setzen und weiter nach links.
    digits = digits.slice(0, i) + DIGITS.charAt(0) + digits.slice(i + 1)
  }

  // Das Kopfzeichen wird von der Schleife nie angefasst (sie endet bei i === 1).
  const head = x.charAt(0)
  if (head === 'z') return 'z' + digitAt(BASE - 1)
  // 'Z' und 'a' grenzen im Schlüsselraum aneinander, im Zeichensatz aber NICHT:
  // dazwischen liegen sechs Zeichen ('[' bis '`'). Ohne diesen Sprung rechnet die
  // Zeile darunter 'Z' + 1 = '[' — kein gültiges Kopfzeichen, intLen wirft.
  //
  // Das ist im Alltag erreichbar: generateKeyBetween(null, 'a0') liefert selbst
  // 'Zz', und wer danach etwas anhängt, landet genau hier. Nachgemessen: nach 32
  // Voranstellungen ab dem Startschlüssel steht 'Zz' vorn.
  //
  // Die Referenzimplementierung hat diesen Sonderfall; beim Portieren ist er in
  // allen drei Fassungen verlorengegangen. Nur gemeinsam ändern.
  const nextHead = head === 'Z' ? 'a' : String.fromCharCode(x.charCodeAt(0) + 1)
  return nextHead + DIGITS.charAt(0).repeat(intLen(nextHead) - 1)
}

/** Verringert den Integer-Teil um eins. */
function decInt(x: string): string {
  let digits = x
  for (let i = x.length - 1; i >= 1; i--) {
    const next = DIGITS.indexOf(digits.charAt(i)) - 1
    if (next >= 0) return digits.slice(0, i) + digitAt(next) + digits.slice(i + 1)
    // Unterlauf: Stelle auf die größte Ziffer setzen und weiter nach links.
    digits = digits.slice(0, i) + digitAt(BASE - 1) + digits.slice(i + 1)
  }

  const head = x.charAt(0)
  if (head === 'a') return 'Zz'
  if (head <= 'Z') {
    if (head === 'A') return digits
    const prevHead = String.fromCharCode(x.charCodeAt(0) - 1)
    return prevHead + digitAt(BASE - 1).repeat(intLen(prevHead) - 1)
  }
  return digits
}

/** Schlüssel vor `b` — genutzt, wenn oben nichts mehr steht. */
function keyBefore(b: string): string {
  const integerPart = intPart(b)
  return integerPart < b ? integerPart : decInt(integerPart)
}

/** Schlüssel nach `a` — genutzt, wenn unten nichts mehr steht. */
function keyAfter(a: string): string {
  const integerPart = intPart(a)
  const fraction = a.slice(integerPart.length)
  return fraction === '' ? incInt(integerPart) : integerPart + mid(fraction, undefined)
}

/** Schlüssel echt zwischen `a` und `b`. */
function keyBetween(a: string, b: string): string {
  const intA = intPart(a)
  const fractionA = a.slice(intA.length)
  const intB = intPart(b)
  const fractionB = b.slice(intB.length)
  if (intA === intB) return intA + mid(fractionA, fractionB)
  const next = incInt(intA)
  return next < b ? next : intA + mid(fractionA, undefined)
}

/**
 * Erzeugt einen Order Key zwischen `a` und `b` (beide optional).
 *
 * - `generateKeyBetween(null, null)` → Startschlüssel ("aV")
 * - `generateKeyBetween(null, b)` → Schlüssel vor `b`
 * - `generateKeyBetween(a, null)` → Schlüssel nach `a`
 * - `generateKeyBetween(a, b)` → Schlüssel dazwischen
 *
 * Wirft, wenn `a >= b`: Zwischen zwei gleichen oder verdrehten Grenzen gibt es
 * keinen Platz, und ein still zurückgegebener Schlüssel würde die Sortierung
 * auf allen Geräten unterschiedlich zerlegen.
 */
export function generateKeyBetween(a: string | null, b: string | null): string {
  if (a === null) {
    if (b === null) return 'a' + digitAt(Math.floor(BASE / 2))
    return keyBefore(b)
  }
  if (b === null) return keyAfter(a)
  if (a >= b) throw new Error(`a >= b: ${a}, ${b}`)
  return keyBetween(a, b)
}

/**
 * Erzeugt `n` aufsteigende Schlüssel zwischen `a` und `b`.
 *
 * Achtung, das ist bewusst dieselbe Kettenbildung wie in der API und NICHT
 * gleichmässig verteilt: Jeder Schlüssel wird zwischen seinem Vorgänger und `b`
 * gebildet, die Abstände werden dadurch nach hinten immer kleiner. Wer das
 * ändert, ändert die erzeugten Schlüssel und damit die Sortierung gegenüber
 * API und Android.
 */
export function generateNKeysBetween(a: string | null, b: string | null, n: number): string[] {
  if (n === 0) return []
  const keys: string[] = []
  let prev = a
  for (let i = 0; i < n; i++) {
    const key = generateKeyBetween(prev, b)
    keys.push(key)
    prev = key
  }
  return keys
}

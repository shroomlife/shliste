/**
 * Der Markdown-Umfang der AI-Antworten — bewusst klein, und zwar genau so
 * klein wie in der Android-App (components/MarkdownText.kt): fette Stellen,
 * Aufzählungen mit -, * oder •, nummerierte Zeilen. Sonst nichts.
 *
 * WARUM KEIN `marked` (oder ein anderer vollständiger CommonMark-Parser):
 *
 * 1. Android setzt den Rahmen, nicht wir. Ein voller Parser würde im Browser
 *    Überschriften, Tabellen, Links und Codeblöcke schön darstellen — die App
 *    zeigt dieselbe Nachricht dann roh. Und die Nachricht liegt im Sync, beide
 *    Geräte sehen sie. Zwei Darstellungen derselben Antwort wären kein Feature,
 *    sondern eine Abweichung, die man ewig pflegt.
 * 2. `marked` säubert nichts. Die eigene Dokumentation sagt es wörtlich:
 *    "Marked does not sanitize the output HTML", empfohlen wird DOMPurify
 *    obendrauf. Für drei Auszeichnungen wären das zwei Abhängigkeiten und ein
 *    `v-html`, in das Modellausgabe fliesst.
 * 3. Diese Fassung liefert DATEN, keine HTML-Zeichenkette. Was daraus wird,
 *    baut die Ansicht als echte Knoten. Damit gibt es gar keinen Weg, auf dem
 *    fremdes Markup in die Seite käme — kein `v-html`, keine Lücke.
 *
 * Wächst der Bedarf (Links, Code), gehört die Erweiterung in BEIDE Clients,
 * nicht nur hierher.
 */

/** Ein Stück Text innerhalb einer Zeile, fett oder normal. */
export interface InlineSegment {
  text: string
  bold: boolean
}

export type MarkdownBlock
  = | { kind: 'paragraph', segments: InlineSegment[] }
    | { kind: 'bullet', segments: InlineSegment[] }
    | { kind: 'numbered', marker: string, segments: InlineSegment[] }

/** Aufzählungszeichen wie in Android: Bindestrich, Sternchen oder Punkt. */
const BULLET_PATTERN = /^\s*[-*•]\s+(.+)$/
/** Nummerierte Zeile: "1. ", "12. " — die Zahl bleibt erhalten. */
const NUMBERED_PATTERN = /^\s*(\d+)\.\s+(.+)$/
/**
 * Fette Stellen. Nicht gierig, damit "**a** und **b**" zwei Treffer ergibt und
 * nicht einen langen. Ein Sternchenpaar ohne Inhalt (`****`) trifft bewusst
 * nicht: `.+?` verlangt mindestens ein Zeichen, sonst würde aus einer Zierlinie
 * eine leere fette Stelle.
 */
const BOLD_PATTERN = /\*\*(.+?)\*\*/g

/**
 * Zerlegt eine Zeile in normale und fette Stücke.
 *
 * Leere Stücke entstehen an den Rändern ("**fett**" beginnt direkt mit dem
 * Treffer) und werden weggelassen — sie wären sonst leere Knoten im Baum.
 */
export function parseInline(line: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  let last = 0

  for (const match of line.matchAll(BOLD_PATTERN)) {
    const start = match.index
    if (start > last) segments.push({ text: line.slice(last, start), bold: false })

    const inner = match[1]
    if (inner !== undefined) segments.push({ text: inner, bold: true })

    last = start + match[0].length
  }

  if (last < line.length) segments.push({ text: line.slice(last), bold: false })

  return segments
}

/**
 * Zerlegt eine ganze Antwort in Blöcke.
 *
 * Leerzeilen fallen weg: Im Web trägt der Abstand zwischen den Blöcken die
 * Trennung, ein leerer Absatz wäre eine zweite, doppelte Aussage darüber.
 */
export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (line.trim().length === 0) continue

    const bullet = BULLET_PATTERN.exec(line)
    if (bullet?.[1] !== undefined) {
      blocks.push({ kind: 'bullet', segments: parseInline(bullet[1]) })
      continue
    }

    const numbered = NUMBERED_PATTERN.exec(line)
    if (numbered?.[1] !== undefined && numbered[2] !== undefined) {
      blocks.push({ kind: 'numbered', marker: numbered[1], segments: parseInline(numbered[2]) })
      continue
    }

    blocks.push({ kind: 'paragraph', segments: parseInline(line) })
  }

  return blocks
}

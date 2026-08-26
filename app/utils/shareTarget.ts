/**
 * Was beim Teilen bei uns ankommt — und was davon brauchbar ist.
 *
 * Ein Share-Ziel bekommt drei Felder (`title`, `text`, `url`), und die Apps
 * da draussen füllen sie nach Gutdünken: Chrome legt die Adresse ordentlich
 * in `url`, viele Apps schicken sie mitten in einem Fliesstext in `text`,
 * manche nur einen Betreff. Deshalb wird in dieser Reihenfolge gesucht:
 * `url` → `text` → `title`, jeweils der ERSTE Treffer.
 *
 * Ein mitgeteilter Titel wird NIE zum Namen des Eintrags: Er beschreibt die
 * Seite und nicht das, was man kaufen will — und für die Seite ist der
 * Seitentitel zuständig, den der Server nachträgt. Er dient nur der Vorschau.
 *
 * Dieselbe Reihenfolge und dieselben Regeln im Android-Client
 * (`share/ShareReceive.kt`).
 */
import { validHttpUrlOrNull } from './url'

/** Die erste Zeichenkette, die wie eine Web-Adresse beginnt. */
const URL_IN_TEXT = /https?:\/\/\S+/i

/**
 * Satzzeichen, die am Ende einer Adresse fast immer zum Satz gehören und
 * nicht zur Adresse: „Guck mal hier: https://x.de/y." und „(https://x.de/y)".
 * Alles andere bleibt stehen — `…/rezept.html` darf nichts verlieren.
 */
const TRAILING_PUNCTUATION = /[.,)]+$/

/**
 * Ein einzelner Wert aus `route.query`.
 *
 * Der Router liefert `string | string[] | null | undefined`, je nachdem wie
 * oft ein Parameter in der Adresse steht. Bei mehrfacher Angabe zählt der
 * erste — mehr als eine geteilte Seite gibt es nicht.
 */
export function firstQueryValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : null
  }
  return null
}

/** Die drei Felder eines Teilen-Vorgangs, wie die Oberfläche sie braucht. */
export interface SharedPayload {
  /** Die geprüfte Adresse oder `null`, wenn keine dabei war. */
  url: string | null
  /** Der mitgeteilte Titel, nur für die Vorschau-Karte. */
  title: string
  /** Der mitgeteilte Text. Ohne Adresse wird er der Name des Eintrags. */
  text: string
}

/** Sucht die erste Adresse in einem der Felder und prüft sie. */
function findUrl(candidates: readonly string[]): string | null {
  for (const candidate of candidates) {
    const match = URL_IN_TEXT.exec(candidate)
    if (match === null) continue

    const url = validHttpUrlOrNull(match[0].replace(TRAILING_PUNCTUATION, ''))
    if (url !== null) return url
  }
  return null
}

/**
 * Liest einen Teilen-Vorgang aus.
 *
 * `null` heisst „nichts Brauchbares dabei" — die Seite zeigt dann ihren
 * Leerzustand statt einer Auswahl, die ins Leere liefe. Das ist der Fall bei
 * lauter Leerzeichen und bei einem Betreff ohne alles, denn ein Betreff
 * allein ergibt keinen Eintrag.
 */
export function extractSharedLink(input: {
  title?: string | null
  text?: string | null
  url?: string | null
}): SharedPayload | null {
  const title = input.title?.trim() ?? ''
  const text = input.text?.trim() ?? ''
  const rawUrl = input.url?.trim() ?? ''

  const url = findUrl([rawUrl, text, title])
  if (url === null && text.length === 0) return null

  return { url, title, text }
}

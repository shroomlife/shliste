/**
 * Fehlerklassen des Abgleichs.
 *
 * WARUM EINE EIGENE KLASSE UND KEIN BLOSSER STATUSCODE: Jede Ebene über der
 * Engine muss dieselbe Frage beantworten können — darf ich es gleich noch
 * einmal versuchen? Ein `Response`-Objekt herumzureichen zwingt jede
 * Aufrufstelle, die Statuscodes erneut zu deuten, und genau dabei laufen die
 * Deutungen auseinander.
 *
 * Die Einteilung folgt dem, was der Aufrufer TUN muss, nicht dem, was
 * passiert ist:
 *
 * - `auth`        — die Sitzung ist tot. Kein Wiederholen hilft, der Nutzer
 *                   muss sich neu anmelden.
 * - `rateLimited` — zu viele Anfragen. Wiederholen ist richtig, aber erst
 *                   nach `retryAfterMs`.
 * - `permanent`   — der Server hat die Anfrage inhaltlich abgelehnt. Ein
 *                   zweiter Versuch liefert dasselbe Ergebnis.
 * - `transient`   — der Server hatte ein Problem oder brauchte zu lange.
 *                   Später erneut versuchen.
 * - `offline`     — die Anfrage kam nie an. Später erneut versuchen.
 */
export type SyncFailureKind = 'auth' | 'rateLimited' | 'permanent' | 'transient' | 'offline'

export interface SyncErrorOptions {
  kind: SyncFailureKind
  /** HTTP-Status, falls es einen gab. Netzfehler haben keinen. */
  status?: number
  /** Nur bei `rateLimited` gefüllt: wie lange der Server warten lässt. */
  retryAfterMs?: number
  cause?: unknown
}

export class SyncError extends Error {
  readonly kind: SyncFailureKind
  readonly status: number | null
  readonly retryAfterMs: number | null

  constructor(message: string, options: SyncErrorOptions) {
    super(message, { cause: options.cause })
    this.name = 'SyncError'
    this.kind = options.kind
    this.status = options.status ?? null
    this.retryAfterMs = options.retryAfterMs ?? null
  }
}

/**
 * HTTP-Status zu Handlungsanweisung.
 *
 * 401 und 429 stehen bewusst VOR der allgemeinen 4xx-Regel: Sie sind die
 * beiden Fälle, in denen ein erneuter Versuch etwas bringt, obwohl der Client
 * schuld ist.
 *
 * 408 (Request Timeout) ist formal ein 4xx, beschreibt aber eine
 * Übertragung, die nicht rechtzeitig fertig wurde — dieselbe Lage wie ein
 * 504, also `transient`.
 *
 * ALLE ÜBRIGEN 4xx SIND DAUERHAFT, auch 403. Ein 403 aus dieser App bedeutet
 * eine falsche Signatur oder eine verstellte Uhr auf einer der beiden Seiten
 * (siehe `server/utils/apiSignature.ts`) — beides ändert sich nicht dadurch,
 * dass man es hundertmal probiert. Endlose Wiederholungen würden das
 * Konfigurationsproblem nur verdecken und nebenbei ins Rate-Limit laufen.
 *
 * Ein Status unter 400 darf hier gar nicht ankommen (die Transportschicht
 * wirft nur bei `!response.ok`). Falls doch, gilt er als `transient`: unklar
 * ist kein Grund, dauerhaft aufzugeben.
 */
export function classifyHttpStatus(status: number): SyncFailureKind {
  if (status === 401) return 'auth'
  if (status === 429) return 'rateLimited'
  if (status === 408) return 'transient'
  if (status >= 400 && status < 500) return 'permanent'
  return 'transient'
}

/**
 * `Retry-After` in Millisekunden.
 *
 * Das Feld kennt zwei Schreibweisen (RFC 9110): eine Anzahl Sekunden oder ein
 * HTTP-Datum. Beide werden unterstützt, weil ein Client nicht wählen kann,
 * welche der Server schickt — und ein missverstandenes Datum als "0 Sekunden"
 * würde geradewegs ins nächste Rate-Limit laufen.
 *
 * Ein Datum in der Vergangenheit ergibt 0 und nicht negativ: "sofort" ist die
 * einzige sinnvolle Lesart, und ein negativer Timer wäre für jeden Aufrufer
 * eine Falle.
 *
 * `null` heisst "keine verwertbare Angabe" — der Aufrufer entscheidet dann
 * selbst, wie lange er wartet.
 */
export function parseRetryAfter(value: string | null | undefined, now: Date = new Date()): number | null {
  if (value === null || value === undefined) return null

  const trimmed = value.trim()
  if (trimmed === '') return null

  // Reine Ziffern sind Sekunden. Bewusst kein parseInt: das würde "12abc"
  // klaglos als 12 lesen und damit einen kaputten Header verschleiern.
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000
  }

  const target = Date.parse(trimmed)
  if (Number.isNaN(target)) return null

  return Math.max(0, target - now.getTime())
}

/** Darf der Aufrufer es unverändert noch einmal versuchen? */
export function isRetryable(error: SyncError): boolean {
  return error.kind === 'transient' || error.kind === 'offline' || error.kind === 'rateLimited'
}

/**
 * Macht aus einem beliebigen geworfenen Wert einen `SyncError`.
 *
 * Alles, was nicht schon einer ist, gilt als `offline`: An dieser Stelle
 * landen ausschliesslich Fehler, die VOR einer Antwort passiert sind — DNS,
 * abgebrochene Verbindung, blockierter Netzwerkzugriff. `fetch` wirft dafür
 * ein nacktes `TypeError` ohne verwertbare Unterscheidung.
 */
export function toSyncError(cause: unknown): SyncError {
  if (cause instanceof SyncError) return cause

  const message = cause instanceof Error ? cause.message : String(cause)
  return new SyncError(`Netzwerkfehler: ${message}`, { kind: 'offline', cause })
}

/** Menschenlesbarer Satz für die Statusanzeige. */
export function describeSyncError(error: SyncError): string {
  switch (error.kind) {
    case 'auth':
      return 'Die Anmeldung ist abgelaufen. Bitte melde dich erneut an.'
    case 'rateLimited':
      return 'Zu viele Anfragen. Der Abgleich versucht es später erneut.'
    case 'permanent':
      return `Der Server hat den Abgleich abgelehnt: ${error.message}`
    case 'offline':
      return 'Keine Verbindung. Deine Änderungen bleiben lokal gespeichert.'
    case 'transient':
      return 'Der Abgleich hat nicht geklappt und wird später wiederholt.'
  }
}

/**
 * Geht die Uhr dieses Geräts falsch — und in welche Richtung?
 *
 * WARUM DAS ÜBERHAUPT ZÄHLT: Der Abgleich entscheidet feldweise nach
 * Zeitstempeln, und die Zeitstempel kommen vom Gerät. Eine falsch gehende Uhr
 * ist damit kein Schönheitsfehler, sondern verändert das Ergebnis.
 *
 * Die beiden Richtungen sind NICHT symmetrisch, und das ist Absicht des
 * Servers (`CLOCK_SKEW_TOLERANCE_MS` in `api.shliste.app/src/routes/sync/push.ts`):
 *
 * - **Uhr geht VOR:** Der Server kappt nach oben. Die Änderung kommt an, trägt
 *   aber höchstens die Serverzeit plus Toleranz. Ärgerlich für das Gegenüber,
 *   dessen spätere Änderung bis zu fünf Minuten lang verliert — aber nichts
 *   geht verloren.
 * - **Uhr geht NACH:** Hier wird NICHT gekappt, und das aus einem guten Grund:
 *   Ein echter alter Offline-Eintrag ist von einer falschen Uhr nicht zu
 *   unterscheiden. Die Folge ist trotzdem unangenehm: Der Push wird mit 200
 *   quittiert, der Wert setzt sich aber nicht durch, und der Mensch davor sieht
 *   seinen Text beim nächsten Abgleich zurückspringen. Ohne jede Erklärung.
 *
 * GENAU DIESES SCHWEIGEN LÄSST SICH BEHEBEN. Die Asymmetrie bleibt — sie ist
 * richtig. Was fehlte, war die Auskunft an den Menschen, dass seine Uhr die
 * Ursache ist und er etwas dagegen tun kann.
 *
 * Die Serverzeit liegt jeder Push- und Pull-Antwort bei; die PWA hat sie also
 * längst in der Hand und hat sie bisher weggeworfen. Android sagt an dieser
 * Stelle seit Langem etwas, im Browser passierte es stumm.
 *
 * Wortgleiches Gegenstück zu `ClockSkewPolicy.kt`.
 */

/**
 * Ab wann es eine Aussage wert ist.
 *
 * Dieselben fünf Minuten, die der Server als Toleranz benutzt. Darunter ändert
 * eine Abweichung am Ergebnis nichts, und eine Warnung wäre Lärm: Jedes Gerät
 * weicht um Sekunden ab.
 */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60_000

export type ClockSkewVerdict
  /** Innerhalb der Toleranz — nichts zu melden. */
  = | { kind: 'fine' }
  /** Keine Serverzeit bekommen (alte API, kaputte Antwort). Kein Urteil. */
    | { kind: 'unknown' }
  /** Die Uhr geht VOR. Fremde Änderungen verlieren bis zu dieser Spanne. */
    | { kind: 'ahead', byMs: number }
  /** Die Uhr geht NACH. EIGENE Änderungen können still verlorengehen. */
    | { kind: 'behind', byMs: number }

/**
 * @param serverTimeMs Serverzeit aus der Antwort, in Millisekunden.
 * @param deviceNowMs Die Uhr dieses Geräts zum selben Zeitpunkt.
 */
export function judgeClockSkew(serverTimeMs: number | null, deviceNowMs: number): ClockSkewVerdict {
  if (serverTimeMs === null || !Number.isFinite(serverTimeMs)) return { kind: 'unknown' }

  const abweichung = deviceNowMs - serverTimeMs
  if (Math.abs(abweichung) <= CLOCK_SKEW_TOLERANCE_MS) return { kind: 'fine' }

  return abweichung > 0
    ? { kind: 'ahead', byMs: abweichung }
    : { kind: 'behind', byMs: -abweichung }
}

/**
 * Gerundet auf Minuten: Die Sekunde ist hier ohne Belang, und eine krumme Zahl
 * liest sich wie eine Messung, die es zu deuten gilt.
 */
function minuten(ms: number): string {
  const gerundet = Math.max(1, Math.round(ms / 60_000))
  return gerundet === 1 ? 'eine Minute' : `${gerundet} Minuten`
}

/**
 * Der Satz für den Menschen davor.
 *
 * Er nennt die Ursache und die Folge, und zwar in dieser Reihenfolge — wer nur
 * "Änderungen können verlorengehen" liest, weiss nicht, was er tun soll.
 */
export function describeClockSkew(verdict: ClockSkewVerdict): string | null {
  if (verdict.kind === 'fine' || verdict.kind === 'unknown') return null

  if (verdict.kind === 'behind') {
    return `Die Uhr dieses Geräts geht ${minuten(verdict.byMs)} nach. Deine Änderungen können dadurch verlorengehen, ohne dass es auffällt. Stell die Uhrzeit am besten auf automatisch.`
  }

  return `Die Uhr dieses Geräts geht ${minuten(verdict.byMs)} vor. Änderungen von anderen Geräten können dadurch verlorengehen. Stell die Uhrzeit am besten auf automatisch.`
}

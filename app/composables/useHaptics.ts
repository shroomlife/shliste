/**
 * Haptisches Feedback — die drei Muster der Android-App, übersetzt auf die
 * Vibration API des Browsers.
 *
 * WARUM SYNCHRON IM CLICK-HANDLER: `navigator.vibrate` gehört in die
 * Ereignisbehandlung selbst, VOR jedes `await`. Nach einem Datenbankzugriff
 * käme die Vibration spürbar nach dem Tippen — und ein Feedback, das der
 * Handbewegung hinterherläuft, fühlt sich kaputter an als gar keines.
 *
 * Feature-Detection statt Annahme: iOS Safari kennt die API nicht, Desktops
 * haben keinen Motor. Dann passiert still nichts — die App verhält sich exakt
 * gleich, nur ohne das Summen.
 */

/** Vibriert, wenn das Gerät es kann — sonst still. */
function vibrate(pattern: number | number[]): void {
  if (import.meta.server) return
  if (!('vibrate' in navigator)) return

  navigator.vibrate(pattern)
}

export function useHaptics() {
  /** Kurzer Tick fürs Abhaken — die Bestätigung "ist im Wagen". */
  function confirm(): void {
    vibrate(12)
  }

  /** Doppeltick fürs Enthaken — spürbar anders als die Bestätigung. */
  function toggleOff(): void {
    vibrate([8, 40, 8])
  }

  /** Etwas längerer Puls für gedrückt halten. */
  function longPress(): void {
    vibrate(20)
  }

  return { confirm, toggleOff, longPress }
}

/**
 * Farbvergabe fuer Listen und Rezepte.
 *
 * Portiert aus `ColorUtils.getRandomColor()` der Android-App. Die Regel muss
 * gleich bleiben, weil `List.color` ein synchronisiertes Feld ist: Beide
 * Clients erzeugen Farben fuer dieselben Daten, und eine abweichende Palette
 * waere im geteilten Bestand sofort sichtbar.
 *
 * Die Summe der drei Kanaele wird auf 100 bis 700 begrenzt. Das schliesst
 * nahezu schwarze und nahezu weisse Werte aus, die als Lasur entweder gar
 * nicht oder als schmutziger Schleier erscheinen wuerden.
 */

/** Untere Schranke der Kanalsumme (schliesst zu dunkle Werte aus) */
const MIN_CHANNEL_SUM = 100
/** Obere Schranke der Kanalsumme (schliesst zu helle Werte aus) */
const MAX_CHANNEL_SUM = 700

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase()
}

/**
 * Liefert eine zufaellige Farbe als `#RRGGBB`.
 *
 * Die Schleife verwirft Werte ausserhalb der Schranken, statt sie
 * zurechtzurechnen — genau wie die Android-Fassung. Ein Zurechtrechnen wuerde
 * die Verteilung an den Raendern verzerren und Farben haeufen.
 */
export function randomListColor(): string {
  let r = 0
  let g = 0
  let b = 0

  do {
    r = Math.floor(Math.random() * 256)
    g = Math.floor(Math.random() * 256)
    b = Math.floor(Math.random() * 256)
  } while (r + g + b < MIN_CHANNEL_SUM || r + g + b > MAX_CHANNEL_SUM)

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Prueft, ob ein Wert die Form `#RRGGBB` hat */
export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

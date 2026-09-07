/**
 * Relative Zeitangabe — dieselbe Sprache wie Androids SyncScreen:
 * gerade eben, vor N Min., vor N Std., vor N Tagen, danach das Datum.
 *
 * Aus der Profilseite hierher gezogen, weil der Verlauf (`HistorySheet`)
 * dieselbe Formatierung braucht — eine zweite Abschrift würde
 * auseinanderlaufen.
 */
const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** `null` und Unlesbares heißen "nie" — der Fall "noch nie abgeglichen". */
export function formatRelativeTime(iso: string | null): string {
  if (iso === null) return 'nie'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'nie'

  const minutes = Math.floor((Date.now() - parsed.getTime()) / 60_000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tagen`
  return dateFormat.format(parsed)
}

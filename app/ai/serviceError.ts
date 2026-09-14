/** Stable server codes take precedence over generic HTTP status or raw provider text. */
export function aiServiceError(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('code' in payload)) return null
  switch (payload.code) {
    case 'AI_OPERATOR_BUDGET_EXHAUSTED':
      return 'Die KI ist gerade nicht verfügbar, weil das Budget des Dienstes erreicht ist. Deine Eingaben bleiben erhalten.'
    case 'USER_QUOTA_EXCEEDED':
      return 'Dein heutiges Kontingent ist aufgebraucht. Deine Eingaben bleiben erhalten.'
    case 'AI_BUSY':
      return 'Deine beiden KI-Aufträge laufen noch. Warte bitte, bis einer abgeschlossen ist.'
    case 'AI_DISABLED':
    case 'QUOTA_UNAVAILABLE':
      return 'Die KI ist vorübergehend nicht verfügbar. Deine Eingaben bleiben erhalten.'
    case 'RATE_LIMITED':
      return 'Es laufen gerade viele Anfragen. Bitte versuche es später erneut.'
    case 'AI_REQUEST_CONFLICT':
      return 'Dieser Auftrag wurde bereits übermittelt oder konnte nicht eindeutig zugeordnet werden. Er wird nicht automatisch wiederholt.'
    case 'AI_DEADLINE_EXCEEDED':
      return 'Die KI-Anfrage hat zu lange gedauert. Ihr Ausgang ist unklar; sie wird nicht automatisch wiederholt.'
    default: return null
  }
}

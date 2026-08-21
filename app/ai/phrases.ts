/**
 * Die rotierenden Ladesprüche der AI-Vorgänge — wörtlich aus der Android-App
 * (`getMessagesForEndpoint` in AiJobCard.kt), damit beide Clients beim
 * Warten dieselbe Stimme haben.
 */

export const EDIT_LIST_PHRASES: readonly string[] = [
  'Liste wird überarbeitet...',
  'Änderungen werden eingepflegt...',
  'Einkaufsliste wird aktualisiert...',
  'Produkte werden sortiert...',
  'Smarter Einkauf wird geplant...',
]

export const VOICE_TO_LIST_PHRASES: readonly string[] = [
  'Aufnahme wird angehört...',
  'Einkaufsliste wird erkannt...',
  'Produkte werden notiert...',
  'Mengen werden geschätzt...',
]

export const URL_TO_LIST_PHRASES: readonly string[] = [
  'Einkaufswagen wird geholt...',
  'Regale werden durchsucht...',
  'Sonderangebote werden geprüft...',
  'Einkaufszettel wird entziffert...',
  'Produkte werden verglichen...',
  'Kassenbon wird vorbereitet...',
  'Tiefkühltruhe wird inspiziert...',
  'Pfand wird gezählt...',
]

export const IMAGE_TO_LIST_PHRASES: readonly string[] = [
  'Bild wird untersucht...',
  'Produkte werden erkannt...',
  'Liste wird zusammengestellt...',
  'Mengen werden geschätzt...',
]

export const EDIT_RECIPE_PHRASES: readonly string[] = [
  'Rezept wird angepasst...',
  'Zutaten werden überarbeitet...',
  'Kochschritte werden optimiert...',
  'Rezept wird verfeinert...',
  'Änderungen werden eingearbeitet...',
]

export const URL_TO_RECIPE_PHRASES: readonly string[] = [
  'Kochlöffel werden gesammelt...',
  'Geheime Gewürze werden entschlüsselt...',
  'Rezept wird aus dem Internet gefischt...',
  'Zutaten werden sortiert...',
  'Kochtopf wird vorgeheizt...',
  'Schürze wird umgebunden...',
  'Kräutergarten wird inspiziert...',
  'Geschmacksnerven werden kalibriert...',
]

export const VOICE_TO_RECIPE_PHRASES: readonly string[] = [
  'Aufnahme wird angehört...',
  'Rezept wird erkannt...',
  'Zutaten werden notiert...',
  'Kochschritte werden abgeleitet...',
]

export const IMAGE_TO_RECIPE_PHRASES: readonly string[] = [
  'Bild wird untersucht...',
  'Zutaten werden erkannt...',
  'Rezept wird zusammengestellt...',
  'Kochschritte werden abgeleitet...',
]

export const RECIPE_TO_IMAGE_PHRASES: readonly string[] = [
  'Bild wird gemalt...',
  'Farben werden gemischt...',
  'Komposition wird angepasst...',
  'Licht und Schatten werden gesetzt...',
  'Feinschliff wird gemacht...',
]

/**
 * Zufällige Platzhalter für das Eingabefeld des Rezept-Chats — wörtlich aus
 * der Android-App (RecipeChatPlaceholders.kt).
 */
export const RECIPE_CHAT_PLACEHOLDERS: readonly string[] = [
  'Wie lange dauert die Zubereitung?',
  'Kann ich eine Zutat ersetzen?',
  'Für wie viele Portionen ist das?',
  'Welche Beilagen passen dazu?',
  'Kann ich das Rezept vegan machen?',
  'Was kann ich weglassen?',
  'Wie bewahre ich Reste auf?',
  'Kann ich das vorher vorbereiten?',
  'Welcher Wein passt dazu?',
  'Wie mache ich es glutenfrei?',
  'Kann ich das auch im Ofen machen?',
  'Was ist der schwierigste Schritt?',
  'Wie erkenne ich, dass es fertig ist?',
  'Welche Gewürze kann ich noch nutzen?',
  'Kann ich das einfrieren?',
  'Was für eine Pfanne brauche ich?',
  'Geht das auch mit dem Thermomix?',
  'Wie mache ich die doppelte Menge?',
  'Passt das für Kinder?',
  'Wie viele Kalorien hat eine Portion?',
  'Welche Allergene sind enthalten?',
  'Kann ich das am Vortag zubereiten?',
  'Was ist die beste Beilage?',
  'Wie wird es besonders saftig?',
  'Gibt es eine schnellere Variante?',
  'Kann ich Tiefkühlgemüse verwenden?',
  'Was kann ich als Deko nutzen?',
  'Wie lässt sich das Rezept abwandeln?',
  'Brauche ich spezielles Werkzeug?',
  'Welche Nährwerte hat das Gericht?',
  'Wie mache ich die halbe Menge?',
  'Welches Öl eignet sich am besten?',
  'Kann ich das auf dem Grill machen?',
  'Wie lange ist das Gericht haltbar?',
  'Welche Kräuter passen noch dazu?',
  'Gibt es eine Low-Carb-Variante?',
  'Kann ich das im Airfryer zubereiten?',
  'Was kann ich statt Zucker nehmen?',
  'Wie mache ich es besonders würzig?',
  'Ist das Rezept saisonabhängig?',
  'Welche Soße passt dazu?',
  'Kann ich das meal-preppen?',
  'Wie mache ich es proteinreicher?',
  'Was ist der Trick bei diesem Rezept?',
  'Wie bekomme ich mehr Geschmack rein?',
  'Welche Gewürzmischung empfiehlst du?',
  'Kann ich das dämpfen statt braten?',
  'Wie mache ich es für Gäste schicker?',
  'Gibt es eine Vollkorn-Variante?',
  'Wie kann ich Salz reduzieren?',
]

/** Ein zufälliger Chat-Platzhalter, wie `RecipeChatPlaceholders.random()`. */
export function randomChatPlaceholder(): string {
  return RECIPE_CHAT_PLACEHOLDERS[Math.floor(Math.random() * RECIPE_CHAT_PLACEHOLDERS.length)]
    ?? 'Stelle eine Frage zu diesem Rezept'
}

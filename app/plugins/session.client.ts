/**
 * Prüft beim Start einmal, ob eine Sitzung besteht.
 *
 * Warum ein Plugin und nicht eine Komponente: Von dieser Auskunft hängen
 * inzwischen mehrere Teile ab — der Anmeldeknopf, die Sync-Anzeige, der
 * Abgleich selbst und die Echtzeit-Verbindung. Hänge sie am Mounten einer
 * einzelnen Komponente, wäre sie beim nächsten Umbau der Oberfläche
 * unbemerkt weg.
 *
 * `.client`, weil das Session-Cookie httpOnly ist: Ein Aufruf während des
 * serverseitigen Renderns hätte die Cookies des Besuchers nicht dabei und
 * bekäme verlässlich "abgemeldet" zurück — ein Ergebnis, das die Hydration
 * gleich darauf widerlegen würde.
 *
 * Bewusst ohne `await`: Die Oberfläche ist ohne Konto vollständig benutzbar
 * und soll nicht auf eine Netzantwort warten, bevor sie erscheint.
 */
export default defineNuxtPlugin(() => {
  void useAuth().loadSession()
})

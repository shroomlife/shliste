/**
 * Prueft beim Start einmal, ob eine Sitzung besteht.
 *
 * Warum ein Plugin und nicht eine Komponente: Von dieser Auskunft haengen
 * inzwischen mehrere Teile ab — der Anmeldeknopf, die Sync-Anzeige, der
 * Abgleich selbst und die Echtzeit-Verbindung. Haenge sie am Mounten einer
 * einzelnen Komponente, waere sie beim naechsten Umbau der Oberflaeche
 * unbemerkt weg.
 *
 * `.client`, weil das Session-Cookie httpOnly ist: Ein Aufruf waehrend des
 * serverseitigen Renderns haette die Cookies des Besuchers nicht dabei und
 * bekaeme verlaesslich "abgemeldet" zurueck — ein Ergebnis, das die Hydration
 * gleich darauf widerlegen wuerde.
 *
 * Bewusst ohne `await`: Die Oberflaeche ist ohne Konto vollstaendig benutzbar
 * und soll nicht auf eine Netzantwort warten, bevor sie erscheint.
 */
export default defineNuxtPlugin(() => {
  void useAuth().loadSession()
})

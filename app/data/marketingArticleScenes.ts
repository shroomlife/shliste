export type ArticleSceneKey = 'gaeste-zum-essen' | 'wg-einkauf' | 'zutaten-auf-einkaufsliste' | 'rezept-aus-foto' | 'rezept-aus-link' | 'einkaufsliste-teilen' | 'einkaufsliste-diktieren' | 'offline-einkaufen' | 'rezept-badges' | 'geheime-listen' | 'ferienwohnung-einkauf' | 'raclette-einkauf' | 'umzug-erster-abend'
type Scene = { title: string, label: string, icon: string, steps: readonly string[], captions: readonly string[], note: string }

export const articleScenes: Record<ArticleSceneKey, Scene> = {
  'ferienwohnung-einkauf': { title: 'Das erste Frühstück steht.', label: 'Noor, Lina und Alex kommen an', icon: 'i-lucide-luggage', steps: ['Nachsehen', 'Wünsche sammeln', 'Einkaufen', 'Ankommen'], captions: [], note: 'Fiktives Beispiel für eine gemeinsame Einkaufsliste.' },
  'raclette-einkauf': { title: 'Für jedes Lieblingspfännchen.', label: 'Mina lädt zum Raclette ein', icon: 'i-lucide-cooking-pot', steps: ['Auswählen', 'Ergänzen', 'Vorrat prüfen', 'Einkaufen'], captions: [], note: 'Fiktive Runde. Mengen und vorhandene Zutaten werden selbst geprüft.' },
  'umzug-erster-abend': { title: 'Heute nur das Nötigste.', label: 'Lea und Aylins erster Abend', icon: 'i-lucide-package-open', steps: ['Tasche prüfen', 'Ergänzen', 'Besorgen', 'Pause machen'], captions: [], note: 'Fiktives Beispiel für Besorgungen nach dem Umzug.' },
  'gaeste-zum-essen': {
    title: 'Vom Küchenschrank an den gedeckten Tisch.', label: 'Robins Freitag', icon: 'i-lucide-chef-hat',
    steps: ['17:00 · Essen planen', '17:10 · Vorrat ansehen', '18:00 · Einkauf erledigen', '19:30 · Zusammen essen'],
    captions: ['Die Freunde kommen. Robin öffnet das Lasagnerezept und legt die Freitagsliste bereit.', 'Das Olivenöl bleibt im Schrank. Nur Lasagneblätter und Tomaten kommen auf die Liste.', 'Sam besorgt die Zutaten. Robin sieht nach dem Abgleich, dass der Einkauf erledigt ist.', 'Zurück zum Rezept: schichten, backen, an den Tisch setzen. Der Einkauf ist geschafft.'],
    note: 'Zeiten und Personen sind ein Beispiel. Mengen und Vorrat prüft ihr selbst; ein gemeinsamer Stand braucht Anmeldung und Internet.',
  },
  'wg-einkauf': {
    title: 'Lina macht Kaffee. Oder eben noch nicht.', label: 'Ein Morgen in der WG', icon: 'i-lucide-coffee',
    steps: ['Die Dose ist leer', 'Noor ergänzt Spülmittel', 'Jules kauft ein', 'Die Küche ist versorgt'],
    captions: ['Lina greift zur leeren Kaffeedose und schreibt Kaffee auf die WG-Liste.', 'Noor steht an der Spüle. Spülmittel fehlt auch. Der neue Eintrag erscheint mit ihrem Namen.', 'Jules nimmt den Einkauf mit. Kaffee ist schon im Korb, Spülmittel fehlt noch.', 'Nach dem Abgleich sehen alle drei den erledigten Einkauf. Morgen gibt es wieder Kaffee.'],
    note: 'Fiktive WG mit angenommener Einladung, Anmeldung und Internet. Die Namen an Änderungen zeigen, wer etwas ergänzt hat.',
  },
  'zutaten-auf-einkaufsliste': {
    title: 'Zwei Zutaten wandern. Das Rezept bleibt.', label: 'Einmal in den Vorrat schauen', icon: 'i-lucide-shopping-basket',
    steps: ['Drei Zutaten im Rezept', 'Olivenöl abwählen', 'Wocheneinkauf wählen', 'Beide Seiten ansehen'],
    captions: ['Lasagneblätter, Tomaten und Olivenöl stehen im Rezept. Die Auswahl beginnt mit allen drei Zutaten.', 'Olivenöl ist vorhanden. Du wählst es ab, bevor du die Zutaten übernimmst.', 'Die zwei fehlenden Zutaten kommen auf deine bestehende Liste „Wocheneinkauf“.', 'Auf der Liste stehen zwei neue Einträge. Im Rezept sind weiterhin alle drei Zutaten vorhanden.'],
    note: 'Vereinfachter Auszug eines Rezepts. Die App übernimmt die Auswahl; Vorräte und doppelte Einträge prüfst du selbst.',
  },
  'rezept-aus-foto': {
    title: 'Omas Marmorkuchen bekommt einen festen Platz.', label: 'Vom Zettel ins Rezeptbuch', icon: 'i-lucide-camera',
    steps: ['Das Rezeptblatt', 'Foto auswerten', '250 g kontrollieren', 'Bereit zum Backen'],
    captions: ['Auf dem Rezeptblatt steht Omas Marmorkuchen. Du fotografierst die ganze Seite gut lesbar.', 'Du wählst das Foto in der Rezept-Erstellung aus. Die KI übernimmt die Angaben.', 'Im Beispiel wurde eine Menge falsch gelesen. Du vergleichst sie mit dem Blatt und korrigierst 250 g Mehl.', 'Das Rezept ist geprüft. Zutaten und Zubereitung findest du beim nächsten Backen zusammen wieder.'],
    note: 'Nachgestellter Import mit fiktivem Rezeptauszug, kein echter KI-Abruf. Fotoimport braucht Anmeldung und Internet; Ergebnisse immer prüfen. Das Rezeptbild ist ein vorhandenes Beispielbild.',
  },
  'rezept-aus-link': {
    title: 'Die Pizzabrötchen verschwinden nicht im Chat.', label: 'Eine Fundstelle behalten', icon: 'i-lucide-link',
    steps: ['Den Rezeptlink finden', 'Per Link übernehmen', 'Am Original prüfen', 'Die Quelle bleibt dabei'],
    captions: ['Du hast Pizzabrötchen entdeckt. Kopiere die Adresse der eigentlichen Rezeptseite.', 'Im Rezeptbereich fügst du den Link ein und startest die Erstellung.', 'Vergleiche Zutaten und Backangaben mit der Fundstelle. In diesem Beispiel sind es 200 °C.', 'Die Pizzabrötchen liegen in deinem Rezeptbuch. Die Quellenadresse führt weiterhin zum Original.'],
    note: 'Beispieladresse und Rezeptauszug sind erfunden. Anmeldung und Internet sind erforderlich; nicht jede Website lässt sich importieren.',
  },
  'einkaufsliste-teilen': {
    title: 'Erst die Einladung. Dann euer gemeinsamer Einkauf.', label: 'Mina lädt Alex ein', icon: 'i-lucide-user-plus',
    steps: ['Mina wählt ihre Liste', 'Die Einladung ist offen', 'Alex nimmt an', 'Ein Eintrag auf beiden Geräten'],
    captions: ['Mina öffnet „Unser Wochenende“ und lädt Alex über die Mitgliederverwaltung ein.', 'Die Einladung ist noch offen. Alex muss sie mit dem passenden Konto annehmen.', 'Alex nimmt an. Jetzt können beide diese Liste gemeinsam verwenden.', 'Mina ergänzt zwei Haferdrinks. Nach dem Abgleich sieht Alex dieselbe Menge auf der Liste.'],
    note: 'Fiktive Konten und eine Beispieladresse. Die Animation versendet keine Einladung. Gemeinsame Nutzung braucht Anmeldung, angenommene Einladung und Internet.',
  },
  'einkaufsliste-diktieren': {
    title: 'Vor dem Kühlschrank gesagt. Am Regal verstanden.', label: 'Noors Einkauf für morgen', icon: 'i-lucide-mic',
    steps: ['Artikel und Mengen sagen', 'Aufnahme beenden', 'Die Tomaten prüfen', 'Sechs Tomaten. Passt.'],
    captions: ['Noor sagt: „Zwei Haferdrinks, sechs Tomaten und eine Flasche Spülmittel.“', 'Die Aufnahme wird ausgewertet. Aus dem Satz entstehen einzelne Listeneinträge.', 'Bei den Tomaten steht im Beispiel die falsche Menge. Noor vergleicht das Ergebnis mit ihrem Einkauf.', 'Noor korrigiert auf sechs Tomaten. Die fertige Liste ist bereit für den Laden.'],
    note: 'Nachgestellte Erkennung mit absichtlichem Mengenfehler. Mikrofonzugriff, Anmeldung und Internet sind nötig; die Animation nimmt nichts auf.',
  },
  'offline-einkaufen': {
    title: 'Im Funkloch bleibt das Häkchen erst bei dir.', label: 'Lea zwischen zwei Supermarktregalen', icon: 'i-lucide-wifi-off',
    steps: ['Zu Hause abgleichen', 'Im Laden ohne Netz', 'Zu Hause noch der alte Stand', 'Wieder verbunden'],
    captions: ['Lea öffnet die Liste vor dem Einkauf mit Internet. Brot und Tomaten sind auf dem Handy gespeichert.', 'Im Laden fehlt der Empfang. Lea legt Brot in den Korb und hakt es auf ihrem Gerät ab.', 'Kim sieht zu Hause noch den alten Stand. Ohne Verbindung kommt Leas Häkchen dort nicht an.', 'Draußen hat Lea wieder Empfang. Nach dem Abgleich sieht auch Kim: Das Brot ist besorgt.'],
    note: 'Die Liste muss bereits lokal gespeichert sein. Geräteabgleich braucht ein Konto und Verbindung. Ein erster Besuch der Web-App und KI-Abrufe funktionieren nicht offline.',
  },
  'rezept-badges': {
    title: 'Ein Marmorkuchen. Dein erster Backmoment.', label: 'Was von Sonntagnachmittag bleibt', icon: 'i-lucide-award',
    steps: ['Der Kuchen ist im Ofen', 'Den letzten Schritt abhaken', 'Dein erster Kuchen-Badge', 'Später im Profil wiederfinden'],
    captions: ['Du backst den Marmorkuchen zum ersten Mal und gehst die gespeicherten Schritte durch.', 'Der Kuchen ist fertig. Du hakst den letzten Kochschritt im Rezept ab.', 'shliste verleiht dem Rezept seinen ersten Badge mit Bild und Datum.', 'In deiner Sammlung findest du den Marmorkuchen wieder. Beim nächsten Backen wird erneut gefeiert, ohne zweiten Badge für dasselbe Rezept.'],
    note: 'Beispiel mit vorhandenem Rezeptbild. Der erste vollständig abgehakte Kochdurchgang vergibt den Badge.',
  },
  'geheime-listen': {
    title: 'Die Konzertkarten bleiben bis Samstag geheim.', label: 'Mina plant eine Überraschung', icon: 'i-lucide-fingerprint',
    steps: ['Ein neutraler Listenname', 'Die Einträge sind gesperrt', 'Mina bestätigt am Gerät', 'Jetzt sind die Ideen sichtbar'],
    captions: ['Mina nennt die geheime Liste „Für Samstag“. Der Name bleibt in der Übersicht sichtbar.', 'Beim Öffnen bleiben die Besorgungen hinter der zusätzlichen Bestätigung verborgen.', 'Mina bestätigt mit Fingerabdruck oder ihrer Displaysperre. Der genaue Dialog hängt vom Gerät ab.', 'Erst jetzt sieht Mina Konzertkarten und Geburtstagskarte. Die Überraschung kann vorbereitet werden.'],
    note: 'Nachgebildete Entsperrung. Keine echte biometrische Abfrage; die lokale Öffnungssperre ist kein zusätzlicher verschlüsselter Tresor.',
  },
}

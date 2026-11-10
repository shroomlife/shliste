# Themenwelten und Raclette

Die Themenwelten verbinden einen konkreten Anlass mit einer nutzbaren Einkaufsliste. Der App-Nutzen führt durch jede Seite: gemeinsam planen, Fehlendes sammeln, Liste übernehmen, teilen und abhaken. Die erste Umsetzung liegt unter `/themenwelten` und `/themenwelten/raclette`. Nach lokaler Durchsicht und den angeforderten Detailkorrekturen ist die Veröffentlichung über die bestehende Produktionspipeline vorgesehen.

## Bestand und Suchintention

Vorhanden sind Alltagsgeschichten, Rezeptideen, Rezeptseiten, Anleitungen, native Listenkomponenten, interaktive Einkaufsszenen und responsive KI-Illustrationen. Die Raclette-Illustration wurde visuell geprüft und wiederverwendet: warmer malerischer Stil, goldenes Licht, bunte Zutaten, blaue Keramik. Für diese erste Themenwelt ist kein zusätzliches Bild nötig. Die bereits vorhandene Szene zeigt, wie eine Ergänzung in der gemeinsamen Liste ankommt und abgehakt wird.

Search Console, Property `sc-domain:shliste.app`, Zeitraum 10. Oktober bis 8. November 2026: Die bisherige URL `/im-alltag/raclette-einkauf` erhielt für „einkaufsliste raclette“ eine Impression und für „raclette einkaufsliste“ zwei Impressionen, insgesamt null Klicks. Das ist ein erstes Relevanzsignal, keine belastbare Trend- oder Suchvolumenaussage. Die aktuelle Websuche zeigt Mengenplanung, Einkaufslisten und Vorbereitung als wiederkehrende Suchintentionen. Saisonale Anlässe sind Weihnachten und Silvester; die Seite bleibt ohne Jahreszahl ganzjährig verwendbar.

## Informationsarchitektur und Verlinkung

`/themenwelten` ist die Übersicht; `/themenwelten/raclette` beantwortet die Planungs- und Einkaufsintention. Ferienwohnung und Umzug verweisen zunächst ausdrücklich auf bestehende Alltagsgeschichten. Neue vollwertige Themenwelten folgen erst mit eigenem Inhalt und einem konkreten App-Ablauf. Keine leeren SEO-Seiten anlegen.

Der Header bleibt unverändert. Ein Themenwelten-Modul erscheint im Inhaltsbereich der Startseite, der Rezeptideen und der Alltagsübersicht. Der Footer verlinkt die Übersicht und Raclette direkt. Die bestehende Raclette-Geschichte bleibt erhalten und verweist auf die Themenwelten; ihr Seitentitel fokussiert Minas gemeinsamen Organisationsablauf. Die neue Raclette-Seite verlinkt zurück in die Anleitung zum Teilen und in die Rezeptideen.

Für den späteren Launch sollte die alte Raclette-Seite zusätzlich redaktionell auf ihre Geschichte reduziert werden, falls beide URLs dauerhaft um dieselben Suchanfragen konkurrieren. Alternativ kann ihr nützlicher Inhalt vollständig in die Themenwelt übergehen und die alte URL anschließend per 301 weiterleiten. Eine solche Umleitung ist in dieser Vorschau bewusst noch nicht umgesetzt; bestehende Links bleiben erreichbar. Die neue Seite hat einen eigenen Canonical, Seitentitel und eine Beschreibung. Beide neuen Seiten sind für Prerendering und Sitemap registriert. Personenvarianten bleiben auf einer URL und erzeugen keine einzelnen SEO-Seiten.

## Dramaturgie und App-Nutzen

1. Vorfreude: „Alle an einem Tisch. Alles auf einer Liste.“ Die Illustration zeigt das Ergebnis, der erste Button führt direkt zur Einkaufsliste.
2. Eigener Plan: Gästezahl auswählen, vorhandene Zutaten abwählen, eigene Zeilen ergänzen. Mengen ändern sich sichtbar. Die Werte sind redaktionelle Startmengen, keine getestete Vollverpflegungsformel.
3. Echte Übergabe: „In shliste übernehmen“ legt eine neue lokale Liste über die bestehenden App-Funktionen an. Kein KI-Zugang und kein Konto sind für den lokalen Einstieg nötig. Gemeinsames Bearbeiten benötigt Anmeldung und Internet.
4. Gemeinsamer Einkauf: Die vorhandene Animation zeigt eine Ergänzung und das Abhaken. Drei einfache Schritte erklären das Teilen; die bestehende Anleitung liefert die Details. Eine automatische Aufgabenverteilung wird nicht versprochen.
5. Ideen und Vorbereitung: Drei Pfännchenkombinationen, ein Ablauf vom Vortag bis zu Resten am nächsten Tag und kurze FAQ beantworten typische Fragen. Der Schluss führt wieder zur eigenen Liste.

## Redaktion und Gestaltung

Die Zutaten sind durchgehend ohne tierische Bestandteile geplant. Ernährungslabels werden nicht als Überschriften oder wiederholte Botschaft eingesetzt; konkrete Produktbezeichnungen sichern trotzdem die Auswahl. Raclette-Scheiben auf Kokosölbasis, Sojajoghurt-Dip, Räuchertofu sowie Brot und Schokolade ohne Milch und Ei machen die Zutaten eindeutig. Beim Einkauf Zutatenlisten und Eignung zum Schmelzen prüfen. Vor einer Veröffentlichung sollten die vorgeschlagenen Mengen und Kombinationen praktisch probiert und gegebenenfalls angepasst werden.

Die Umsetzung übernimmt MarketingChrome, Farbvariablen, Typografie, KI-Kennzeichnung und bestehende Animationen. Bilder haben feste Abmessungen und responsive Quellen. Die Mengenwahl funktioniert ohne neue Bibliothek; Inhalte und Standardmengen sind serverseitig lesbar. Die Animation nutzt den vorhandenen Pause- und Reduced-Motion-Mechanismus. Kleine Bildschirme erhalten einspaltige Bereiche; Auswahlfelder und Buttons bleiben gut erreichbar.

## Weitere Themenwelten und Erfolgskontrolle

Nach dem Racletteabend bieten sich zuerst Ferienwohnung, Brunch und Grillabend an. Jeder Ausbau braucht einen eigenständigen Planungsanlass, eine wirklich hilfreiche Liste und einen anschaulichen App-Ablauf. Rezeptideen sollen konkrete Gerichte beisteuern, während Themenwelten den gesamten Anlass organisieren.

Nach Veröffentlichung in Search Console die Suchanfragen und Zielseiten gemeinsam beobachten: Impressionen, Klicks, CTR und mögliche Konkurrenz zwischen alter und neuer Raclette-URL. App-Übergaben nur über das vorhandene Einwilligungskonzept messen; keine Zutaten, Listeninhalte oder Gastnamen an Analytics senden. Erst nach aussagekräftiger Datenmenge entscheiden, ob eine URL-Zusammenführung sinnvoll ist. Es wird kein Rankinggewinn garantiert.

## Recherchequellen

- Eigener Codebestand: MarketingEverydayStories, MarketingEverydayScene, MarketingMiniList, useLists, MarketingChrome und Nuxt-Konfiguration.
- Eigene Search-Console-Auswertung vom 10. November 2026 mit oben genanntem Zeitraum und Filter „raclette“.
- [BVEO zu Raclette in der Weihnachtszeit und zu Silvester](https://geerntet-in-deutschland.de/app/uploads/2016/11/BVEO_161110_PM_Raclette.pdf).
- [Beispiel der Suchintention Mengen und Vorbereitung](https://volkermampft.de/raclette-einkaufen-und-vorbereiten-mengen-tipps-und-tricks-fuer-den-silvester-abend/). Die eigenen Mengen sind ein redaktioneller Entwurf und wurden nicht aus dieser Quelle übernommen.

## Prüfung der lokalen Umsetzung

Die Browserprüfung bestätigt die Mengenwahl für sechs Personen, das Abwählen vorhandener Gewürzgurken, das Ergänzen zweier eigener Einträge und die Übernahme von zehn Einträgen in die App. Das Abhaken einer Position funktioniert. Die endgültige Implementierung nutzt den vorhandenen atomaren Import, sodass Liste und Einträge gemeinsam gespeichert werden; auch dieser Weg wurde im Browser geprüft. Die responsive Ansicht wurde bei 390 Pixeln geprüft, ohne horizontalen Überlauf. 13 Listen-Tests und fünf Import-Tests bestehen. Der Nuxt-Linkchecker meldet null Fehler und null Warnungen auf 23 geprüften Seiten. Beide neuen Seiten werden erfolgreich vorgerendert.

Die fünf Typfehler wurden über eine zentrale Typverknüpfung von RuntimeConfig.public mit dem generierten PublicRuntimeConfig behoben; es sind keine Type-Casts und keine Änderungen am Authentifizierungs- oder Analytics-Verhalten nötig. Die projektweite Typprüfung und alle 1.015 Tests bestehen. Der erneute Browsertest prüft leere Auswahl, Mengenwahl für acht Personen, eigene Zeilen einschließlich leerer Zwischenzeilen, Textkopie, exakt drei übernommene Einträge sowie Abhaken und Erhalt nach Neuladen. Die Designprüfung umfasst 320, 390, 768 und 1440 Pixel ohne horizontalen Überlauf. Die Szene steht rechts neben dem Text und wird unter 1000 Pixeln gestapelt. Buttontexte, Zahlen und Bildunterschrift sind optisch zentriert. Der Listenkopf ist linksbündig und der Footer enthält den direkten Link zur KI-Warteliste. Die Vorschau läuft unter http://127.0.0.1:3020/themenwelten/raclette.

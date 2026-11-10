# Themenwelt Weihnachtsbäckerei

Stand: 10. November 2026. Lokaler Entwurf unter `/themenwelten/plaetzchen-backen`.

## Saisonale Entscheidung

Google Trends wurde direkt für Deutschland, Websuche, die letzten fünf Jahre und die Suchbegriffe „Plätzchen backen“, „Adventsbrunch“ und „Fondue“ geprüft: https://trends.google.com/trends/explore?date=today%205-y&geo=DE&q=Pl%C3%A4tzchen%20backen,Adventsbrunch,Fondue&hl=de

„Plätzchen backen“ zeigt einen wiederkehrenden Anstieg im November und Höhepunkte Ende November beziehungsweise Anfang Dezember. Im gemeinsamen Vergleich betrug der Index 2025 in den Wochen ab 2., 9., 16., 23. und 30. November jeweils 3, 4, 8, 11 und 13; ab 7. Dezember 10. Die laufende Woche ab 8. November 2026 ist unvollständig und keine belastbare Wachstumsprognose. Fondue erzielt im Vergleich höhere Spitzen, aber erst später im Dezember. Die Wahl der Weihnachtsbäckerei basiert auf dem unmittelbar bevorstehenden Anlass und der Eignung für gemeinsames Planen und Einkaufen, nicht auf einem behaupteten höchsten Suchvolumen.

Trends zeigt normalisierte relative Indizes, keine absoluten Suchzahlen. Werte von null bedeuten nicht, dass niemand sucht. Die geprüften Werte gelten für diese gemeinsame Vergleichsabfrage; sie sind nicht mit separat normalisierten Abfragen gleichzusetzen. Die Seite macht keine Trend- oder Rankingversprechen.

## Erlebnis und App-Nutzen

Vier Illustrationen verbinden eine vielfältige Backrunde mit drei konkreten Plätzchensorten. Der Planer summiert gemeinsame Zutaten, skaliert Portionen pro Sorte, entfernt vorhandene Vorräte und ergänzt freie Einträge. Die Übernahme erstellt atomar eine echte bearbeitbare Liste. Teilen wird mit den tatsächlichen Voraussetzungen Anmeldung und Internet erklärt; Aufgaben werden nicht automatisch Personen zugewiesen.

Weitere Abschnitte behandeln Rezeptanleitungen, Vorbereitung und Backablauf, Dekoration, Geschenke, Aufbewahrung und häufige Fragen. Die KI-Warteliste bleibt als gemeinsame Komponente eingebunden. Links aus Themenübersicht, Raclette und Footer sowie Canonical, Metadaten, Sitemap und Prerender-Route integrieren die Seite in die bestehende Struktur. Interaktive Symbole verwenden die vorhandenen Lucide-Icons über Iconify; keine typografischen Pfeile.

## Bilder

Vier neue WebP-Bilder wurden über die OpenAI API mit `gpt-image-2.6-sunburst`, Qualität high, 1536 × 1024 und WebP-Kompression 85 erzeugt. Stilreferenz war die bestehende Raclette-Illustration. Prompts liegen in `docs/image-prompts/plaetzchen-*.txt`. Bilder sind als KI-generiert gekennzeichnet und mit Alternativtexten sowie festen Abmessungen eingebunden; Bilder unterhalb des Einstiegs laden verzögert.

## Prüfung und redaktionelle Grenze

Unit-Tests prüfen das Zusammenzählen gemeinsamer Zutaten, die Skalierung ausgewählter Sorten, unveränderte Rezeptgrundlagen, leere Auswahl und deutsche Mengenformatierung. Typecheck erfolgreich. Im Browser wurde die Kombination Vanille und Schoko mit jeweils zwei Portionen, vorhandenem Mehl und dem Extra Backpapier übernommen: sieben korrekte Einträge in einer neuen App-Liste. Textkopie stimmt mit dieser Auswahl überein; eine leere Auswahl deaktiviert die Übernahme. Mobile und Tablet-Darstellung wurden bei Viewport-Vorgaben 320, 375 und 768 Pixel ohne horizontales Überlaufen kontrolliert; Rezeptdetails lassen sich öffnen.

Die Rezeptmengen und Anleitungen sind redaktionell ausgearbeitet, aber noch nicht praktisch in einer Küche getestet. Stückzahlen und Backzeiten sind Richtwerte. Optionaler Guss und Dekor sind klar als zusätzliche Zutaten gekennzeichnet und werden nicht stillschweigend in die Einkaufsliste übernommen.

Der Produktionsbuild wurde erfolgreich abgeschlossen, einschließlich Prerendering der neuen Route. Der erste Durchlauf fand ein zu großes Raclette-PNG im Offline-Precache; Marketing-Illustrationen sind nun explizit vom Vorab-Download der App-Hülle ausgenommen. Der erneute Build mit Netzwerkzugriff war erfolgreich. ESLint und `git diff --check` bestanden. Die importierte Testliste blieb nach erneutem Öffnen erhalten. Die Umsetzung ist weiterhin lokal und wurde in diesem Arbeitsschritt nicht veröffentlicht.

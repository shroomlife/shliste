# Weihnachtsbäckerei und Rezeptvarianten

Stand: 10. November 2026. Die Themenwelt behält die gemeinsame Einkaufsplanung und erhält fünf visuelle Abschnitte: Teiggefühl mit auswählbarer Hilfestellung, Ausrollen und Ausstechen, ungewöhnliche Formen, Backpunkt sowie Dekoration und Geschenke. Die bisherigen vollständigen Kurzanleitungen sind durch Links zur zentralen Rezeptidee „Weihnachtsplätzchen“ ersetzt. Damit unterscheiden sich Planung/Ratgeber und eigentliche Rezeptanleitung. Das volle Wartelisten-Banner bleibt erhalten.

## Eigenständige Redaktion

Techniken wurden anhand der [Plätzchen-Grundlagen von Dr. Oetker](https://www.oetker.de/inspiration/tipps-tricks/t/die-besten-plaetzchen-so-gelingts-ganz-einfach), der [Mürbeteig-Grundlagen](https://www.oetker.de/inspiration/tipps-tricks/t/muerbeteig-so-einfach-gelingts) und der [Ausrolltipps von Kuchentratsch](https://www.kuchentratsch.com/blogs/backtipps/weihnachts-plaetzchen) recherchiert. Ungewöhnliche Motive sind anhand eines [Faultier-Ausstechers von Birkmann](https://birkmann.de/de/ausstechform-faultier-auf-ast-liegend-10-cm-198012.html) und eines [Weltall-Sets](https://www.horbacher-muehle.de/neu/2958/ausstechform-set-space-4-ausstecher?c=32) belegt. Keine Quellentexte oder Produktbilder werden übernommen. Kombinationen, Texte und Schaubilder sind eigenständig. Quellen stehen zurückhaltend in einer aufklappbaren Hintergrundnotiz.

## Ein Rezept, drei Varianten

Vanille, Kakao und Marmelade nutzen die Mengen aus `lib/christmas-baking.ts`, ebenso wie der gemeinsame Backplaner. Die Rezeptseite wechselt Zutaten, Formtechnik und Backzeit. Eine ausgewählte Variante erhält beim Speichern eine eigene Katalogkennung, sodass verschiedene Sorten nebeneinander existieren und wiederholtes Speichern dieselbe vorhandene Sorte öffnet. Auch der API-Endpunkt für den nativen Import kann die Variantenkennungen auflösen. Die App übernimmt jeweils ein fertiges Rezept; sie bietet dadurch keinen nachträglichen Variantenumschalter innerhalb gespeicherter persönlicher Rezepte.

Eine Portion ergibt ungefähr 30 kleine Plätzchen. Gesamtzeiten enthalten 25 Minuten aktive Vorbereitung, 30 Minuten Kühlung, 12 beziehungsweise 15 Minuten Backen für ein Blech und 20 Minuten Auskühlen. Weitere Bleche und Dekoration benötigen zusätzliche Zeit. Die Rezeptentwicklung ist redaktionell; eine tatsächliche Backprobe steht aus (`cookTest: ausstehend`). Es wird keine erprobte Gelinggarantie behauptet.

## Bilder und SEO

Neun neue Motive über die OpenAI API mit `gpt-image-2.6-sunburst`, Qualität high, 1536 × 1024, WebP 85: Hero, sieben Arbeitsschrittbilder und eine Formenübersicht. Referenz ist die bestehende Bananenbrot-Serie. Das Kühlmotiv wurde nach Sichtprüfung korrigiert: glatter Vanilleteig und Zitronen statt unpassender Zutaten im Hintergrund. Kleinere 600-Pixel-Fassungen unterstützen das bestehende responsive Bildsystem. Prompts liegen in `docs/image-prompts/christmas-cookie-*`; Rezeptbilder in `public/images/editorial/weihnachtsplaetzchen/v1`, Formenübersicht in `public/images/illustrations/plaetzchen-ausstechformen.webp`.

Die neue Rezeptidee ist im Katalog, auf der Rezeptideen-Seite und automatisch in der Sitemap enthalten. Die kanonische Adresse ist `/rezepte/weihnachtsplaetzchen`; Variantenlinks verwenden einen Query-Parameter. Recipe-Daten beschreiben die sichtbare Variante, ohne erfundene Bewertungen oder Nährwerte. Die Themenwelt enthält jetzt nur noch ihre Brotkrumennavigation als zusätzliches strukturiertes Datum, da dort keine vollständigen Rezepte mehr stehen.

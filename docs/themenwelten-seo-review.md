# Themenwelten: SEO- und Veröffentlichungsprüfung

Stand: 10. November 2026.

Die Themenübersicht verwendet CollectionPage im vorhandenen Nuxt-SEO-Graphen. Beide Themenwelten erhalten BreadcrumbList entsprechend der sichtbaren Navigation. Die Weihnachtsbäckerei enthält drei Recipe-Objekte mit eindeutigen Fragment-IDs, Bildern, Zutaten, Ausbeute und HowToStep-Anleitungen aus derselben Datenquelle wie der sichtbare Inhalt. Keine erfundenen Bewertungen, Nährwerte oder exakten Gesamtzeiten. Raclette ist eine Planungsseite und erhält keine unbegründete Recipe-Auszeichnung. FAQ-Inhalte bleiben sichtbar; zusätzliche FAQ-Rich-Result-Auszeichnung ist für diese Themenwelten nicht vorgesehen.

Grundlagen: [Google Recipe-Dokumentation](https://developers.google.com/search/docs/appearance/structured-data/recipe), [Breadcrumb-Dokumentation](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) und [allgemeine Richtlinien für strukturierte Daten](https://developers.google.com/search/docs/appearance/structured-data/sd-policies). Strukturierte Daten garantieren weder Indexierung noch Rich Results. Optionale Rezeptfelder bleiben leer, wenn verlässliche Informationen fehlen.

Die drei Themenrouten werden serverseitig vorgerendert und sind in der Sitemap enthalten. Canonicals verwenden die Produktionsdomain. Die Prüfung kontrolliert das tatsächlich erzeugte HTML auf eindeutige Canonicals, H1, Robots-Metadaten, parsebares JSON-LD, Rezeptanzahl und vorhandene Rezeptanker. Die Backanleitungen bleiben auch in geschlossenen nativen Details-Elementen im HTML verfügbar.

Die Themenkarten verwenden einen auf den Bildbereich begrenzten Zoom von 1,025 mit 420 Millisekunden und derselben Easing-Kurve wie Rezeptideen. Native Details-Elemente auf der Website öffnen und schließen in unterstützenden Browsern mit 220 Millisekunden. Nicht unterstützende Browser behalten die native Funktion. Beide Effekte respektieren reduzierte Bewegung. Tastaturbedienung und mobile Darstellung wurden im Browser kontrolliert.

Vor der Veröffentlichung: vollständiger Lint-Lauf, Typecheck und 1.018 Tests ohne Fehler. Der Produktionsbuild und seine Linkprüfung werden vor dem Push kontrolliert; danach werden die ausgelieferten Seiten und die öffentliche Sitemap geprüft und diese über die Search-Console-Verbindung erneut eingereicht. Die Rezeptideen sind redaktionell ausgearbeitet; ein praktischer Backtest ist weiterhin nicht erfolgt.

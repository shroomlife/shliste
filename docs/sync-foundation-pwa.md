# PWA Sync-Foundation: implementierter Stand

Stand: 2026-09-14. Lokal umgesetzt, kein Push oder Deployment.

## Dauerhafte lokale Arbeit (1B)

Alle lokalen Upserts sowie Listen-/Altimporte schreiben die Arbeitsgeneration
in derselben IndexedDB-Transaktion wie die Nutzdaten. Empfangene Serverzeilen
und das Zuruecksetzen von Dirty-Flags erzeugen keine lokale Arbeit. Rezept- und
Zutaten-Upserts lesen und schreiben jetzt ebenfalls innerhalb einer Transaktion.

Die bestehende Web-Lock-Sperre koordiniert bis zu acht Zyklen pro Arbeitslauf.
Neue Generationen werden nachgeladen; Fehler erzeugen keine sofortige
Wiederholungsschleife. Nach Freigabe der Tab-Sperre erkennt die
Abschlussbeobachtung weitere Generationen und plant einen neuen Lauf.
Der lokale Mutex bleibt bis zum Ende dieser Beobachtung gehalten.
Start, Wiederkehr in den Vordergrund und der bestehende periodische Abgleich
bleiben der Wiederanlauf, wenn ein Tab oder Browser beendet wurde.

Der Abschlussmarker enthaelt die erfasste Generation und die Konto-ID.
Ein am Ende festgestellter Sitzungswechsel bestaetigt keine Generation.
Der Marker ist keine Erlaubnis, einen aktuellen Abgleich auszulassen.

## Bestaetigter Abschluss (1D)

Die bisherige Integritaetspruefung im Composable wurde entfernt. Die Engine
prueft den aktuellen Serverhash und den lokalen Bestand vor Erfolg unter der
Sync-Sperre. Unbekannter Hash, fortbestehende Abweichung, ausstehende Seiten,
offene oder abgewiesene Zeilen ergeben keinen Erfolgszustand.

Normaler und vom Nutzer ausgeloester Abgleich verwenden denselben Pfad.
Hoechstens ein automatischer voller Merge wird je Lauf versucht, mit dem
bestehenden dauerhaften Versuchslimit. Der volle Merge bewahrt lokale Inhalte;
er loescht sie nicht. Erfolg der Reparatur verlangt einen neuen Hashvergleich.
Die Erfolgsmeldung und ihr Zeitpunkt erscheinen erst nach der Abschlusspruefung.

## AI-Transport

API-Ausfuehrungsfrist 60 s, BFF-Abbruch 75 s, Browserfrist 90 s.
Die BFF benutzt einen eigenen AbortController-Timer und leitet einen
vorzeitigen Response-Verbindungsabbruch weiter. Die echte Produktionskette
bleibt ein Freigabenachweis; diese Codewerte ersetzen keinen Proxy-Test.

Nach einem unklaren Transportfehler oder Gateway-502/504 liest der Browser
hoechstens einmal `/api/ai/requests/:requestId`. Kein erneuter POST.
Der Status `finished` bestaetigt ohne Nutzlast kein empfangenes Ergebnis.
Statusabfragen verlangen die Sitzung, akzeptieren nur UUIDs, sind nicht
cachebar und haben eigene kurze Fristen (BFF 8 s, Browser 10 s).

## Pruefung und Grenzen

800 Bun-Tests bestanden, Typecheck und Lint der geaenderten Dateien bestanden.
Regressionen fuer neue Arbeit waehrend Pull, begrenzten Drain, Fehler ohne
Wiederholung, Kontowechsel, zweiten Zyklus ohne Sitzung, Hashabweichung,
unbekannte Verifikation, fehlenden fruehen Erfolg und lesenden AI-Statusabgleich.
Die Repository-Tests pruefen Transaktionsumfang und Ablauf mit Test-Doubles;
ein echter Browser-Abbruch-/Mehrtab-Geratelauf bleibt Teil der Release-Abnahme.

Noch nicht enthalten: Restore-Epoche, allgemeiner Konto-Wechsel-Vertrag,
persistenter PWA-Seitencheckpoint, Web-Locks-Ersatz fuer inkompatible Browser.
Die bestehende explizite Konfliktentscheidung `pullServer` ist weiterhin ein
separater bestaetigungspflichtiger Loeschpfad und wird nicht automatisch genutzt.

Offizielle Referenzen fuer Transportverhalten:
- https://nodejs.org/api/http.html#event-close_2
- https://github.com/unjs/ofetch

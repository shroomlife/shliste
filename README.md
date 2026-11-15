# shliste – Einkaufslisten und Rezepte

Offlinefähige Einkaufslisten und Rezepte mit optionalem Konto, gemeinsamen Listen und Abgleich über die eigene [shliste-API](https://api.shliste.app). Die [PWA](https://shliste.app/app/lists) und die öffentliche Website werden aus diesem Nuxt-Repository ausgeliefert.

## Release-Stand

Stand 15.11.2026: **PWA 0.13.1 ist live**. Veröffentlicht sind Tag [v0.13.1](https://github.com/shroomlife/shliste/releases/tag/v0.13.1) und Commit `a725e2d4d36bb5612a658194316fdbdcf6e6e3ee`. [Tests, Image-Build und Deployment](https://github.com/shroomlife/shliste/actions/runs/43711243686) sind erfolgreich; Container und mobile Oberfläche wurden live geprüft. Spätere Dokumentationscommits ändern diesen ausgelieferten Anwendungsstand nicht.

- Das Logo scrollt die aktuelle Übersicht nach oben. Steht die Rezeptübersicht bereits oben, öffnet der nächste Tipp die Listen. Aus Rezeptdetails führt das Logo zunächst zur Rezeptübersicht.
- Der mobile Badge-Shortcut sitzt links neben dem Menü und erscheint bei Anmeldung oder vorhandenen lokalen Badges. Ohne beides bleibt er verborgen.
- Die mobile Bottom Bar enthält nur Listen und Rezepte. Der Website-Link steht im Profil.
- Die fünf Runtime-Config-Typfehler sind durch die Schema-Erweiterung in `shared/types/runtime-config.d.ts` behoben. Typecheck, Lint und alle 1.026 Bun-Tests bestanden für diesen Release.
- Logo-Verhalten, Badge-Sichtbarkeit und Layout wurden im mobilen Browser bei 320 und 390 Pixel Breite geprüft, einschließlich reduzierter Bewegung.

## Architektur

| Bereich | Implementierung |
|---|---|
| Oberfläche | Nuxt 4, Vue 3, Nuxt UI und Tailwind CSS |
| Lokale Daten | IndexedDB über `idb`; Schema und atomare Repository-Operationen in `app/db/` |
| Synchronisation | Eigene API; Engine, Merge und Wiederanlauf in `app/sync/` |
| App-Routen | `app/pages/app/`: Listen, Rezepte, Profil und Teilen; clientseitig gerendert |
| Website | Server-renderte bzw. vorgerenderte Seiten, Rezeptkatalog und Themenwelten |
| Backend-for-Frontend | `server/api/`: Anmeldung, Sync, Bilder, KI und Echtzeit; API-Zugangsdaten bleiben auf dem Server |
| Laufzeit | Bun 1.4.4; CI und Docker-Build verwenden zusätzlich Node 24.22.1 für Nuxt-Werkzeuge |

Der aktuelle Abgleich verwendet keine Google-Drive-Datenbank. Google dient der Anmeldung; lokale App-Daten liegen in IndexedDB und werden bei verbundenem Konto mit der eigenen API abgeglichen.

## Entwicklung und Prüfung

```bash
bun install --frozen-lockfile
bun run dev
bun run typecheck
bun run lint
bun test
bun run build
```

Konfigurationsfelder stehen in `nuxt.config.ts`. Lokale Umgebungsdateien und Zugangsdaten werden nicht veröffentlicht.

## Veröffentlichung

Ein regulärer Push auf `main` startet `.github/workflows/main.yml`: Typecheck, Lint und Tests, anschließend Docker-Build und Deployment auf `xva001`. Das Image erhält `latest` und den Commit-SHA als Tags. Der Server aktualisiert den Compose-Service `shliste_app`; das Ergebnis wird anschließend live geprüft. Die lokalen Skripte `docker:build`, `docker:push` und `pb` sind Hilfswerkzeuge und ersetzen die Pipeline nicht.

Die Version steht in `package.json`. Release-Tags und GitHub-Release-Notizen dokumentieren den ausgelieferten Stand. Reine Dokumentationskorrekturen können `[skip ci]` verwenden, damit sie kein erneutes Deployment auslösen; dies gilt nicht für Anwendungscode, Konfiguration oder Abhängigkeiten.

## Weitere Dokumentation

- [Sync-Foundation](docs/sync-foundation-pwa.md): datierter Implementierungsbericht; historische Testzahlen und damalige Grenzen sind kein aktueller Release-Status.
- [Website-Veröffentlichung vom 03.11.2026](docs/website-release-2026-11-03.md).
- [Bewegung der Themenwelten](docs/theme-world-motion.md).
- [SEO-Prüfung der Themenwelten](docs/themenwelten-seo-review.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).

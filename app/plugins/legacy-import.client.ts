/**
 * Übernimmt beim ersten Start die Daten der alten Fassung.
 *
 * WARUM EIN PLUGIN UND NICHT DER ABGLEICH: Der Import läuft ohne Konto. Wer
 * die Vorgängerin ohne Anmeldung benutzt hat, muss seine Listen auch ohne
 * Anmeldung wiederfinden — alles andere wäre eine Anmeldepflicht durch die
 * Hintertür. Erst danach nimmt der gewöhnliche Abgleich die Zeilen mit, wenn
 * überhaupt jemand angemeldet ist.
 *
 * GENAU EINMAL, gemerkt in `sync_meta.legacyImported`. Ein zweiter Lauf wäre
 * allerdings auch folgenlos: Geschrieben wird mit `add`, vorhandene Zeilen
 * bleiben unangetastet.
 *
 * `.client`, weil `localStorage` und IndexedDB den Browser brauchen.
 */
import {
  getLegacyImported,
  insertLegacyRows,
  setLegacyImported,
} from '../db/repositories'
import { isEmptyPlan, LEGACY_KEYS, planLegacyImport } from '../sync/legacy-import'
import { randomListColor } from '../utils/color'

/** Liest ein altes Dokument. Unlesbares gilt als "nicht vorhanden". */
function readLegacyDocument(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw)
  }
  catch {
    // Beschädigtes JSON: Der Rest der Übernahme soll trotzdem laufen.
    console.warn(`[Import] ${key} liess sich nicht lesen und wird übersprungen.`)
    return null
  }
}

export default defineNuxtPlugin(() => {
  // Ohne `await`: Die App ist sofort benutzbar, die alten Daten erscheinen,
  // sobald sie geschrieben sind. Ein Ladebalken vor der ersten Liste wäre der
  // schlechtere Tausch.
  void (async () => {
    try {
      if (await getLegacyImported()) return

      const plan = planLegacyImport({
        lists: readLegacyDocument(LEGACY_KEYS.lists),
        recipes: readLegacyDocument(LEGACY_KEYS.recipes),
        markets: readLegacyDocument(LEGACY_KEYS.markets),
        products: readLegacyDocument(LEGACY_KEYS.products),
        fallbackColor: randomListColor,
      })

      if (isEmptyPlan(plan)) {
        // Nichts da — der Normalfall für jeden neuen Besucher. Trotzdem
        // merken, damit nicht bei jedem Start vier Dokumente gelesen werden.
        await setLegacyImported(true)
        return
      }

      const written = await insertLegacyRows(plan)
      await setLegacyImported(true)

      // Die alten Dokumente bleiben liegen: Solange sie da sind, ist der
      // Import umkehrbar, falls sich diese Abbildung als lückenhaft erweist.
      console.info(
        `[Import] ${plan.lists.length} Listen und ${plan.recipes.length} Rezepte übernommen `
        + `(${written} Zeilen). Archiviert: ${plan.archivedLists}. `
        + `Nicht übernommen: ${plan.droppedDescriptions} Beschreibungen, `
        + `${plan.droppedCatalogRows} Zeilen aus Märkten und Produktkatalog.`,
      )

      // Die Ansichten lesen neu. Ohne dieses Signal stünden die übernommenen
      // Listen erst nach dem nächsten Wechsel der Seite da.
      useSync().notifyDataChanged()
    }
    catch (error) {
      // Ein gescheiterter Import darf die App nicht aufhalten. Die alten
      // Daten liegen weiterhin in localStorage und gehen nicht verloren.
      console.error('[Import] Übernahme der alten Daten fehlgeschlagen:', error)
    }
  })()
})

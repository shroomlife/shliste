/**
 * Aus einem AI-Ergebnis eine Liste oder ein Rezept anlegen.
 *
 * WARUM DAS HIER LIEGT UND NICHT MEHR IN DEN BEIDEN ÜBERSICHTSSEITEN: Es gibt
 * einen dritten Aufrufer. Der Teilen-Empfang (`app/pages/app/share.vue`)
 * bietet dieselben beiden AI-Wege an und braucht denselben Ablauf — anlegen,
 * Details schreiben, neu laden, Abgleich anstossen, Hinweis zeigen,
 * hinnavigieren. Eine dritte Kopie davon wäre die dritte Gelegenheit, einen
 * dieser Schritte zu vergessen.
 *
 * BEWUSST NICHT ÜBER DEN GETEILTEN DETAIL-ZUSTAND: Der gehört der offenen
 * Detailansicht. Ein Abgleich während der langen AI-Wartezeit würde ihn auf
 * die per Route geöffnete Zeile zurücksetzen, und die restlichen Schreibzüge
 * (Einträge, Bildpfad) landeten am FALSCHEN Datensatz. Alles hier ist an die
 * ausdrücklich übergebene Id gebunden (`app/ai/persist.ts`).
 */
import type { GeneratedList } from '../ai/contract'
import { base64ToWebpBlob, toSyncImagePath, uploadRecipeImage } from '../ai/images'
import { attachRecipeImageById, persistGeneratedListDetails, persistGeneratedRecipeDetails } from '../ai/persist'
import type { GeneratedRecipe } from '../ai/recipeContract'

export function useAiCreate() {
  const { reload: reloadLists, createList } = useLists()
  const { reload: reloadRecipes, createRecipe } = useRecipes()
  const { scheduleSync } = useSync()
  const toast = useToast()

  /**
   * Legt die von der AI gelieferte Liste an und öffnet sie.
   *
   * `sourceUrl` (bei „Per Link") wandert wie in Android an den
   * Listen-Datensatz.
   */
  async function createListFromAi(result: GeneratedList): Promise<void> {
    const created = await createList(result.name)
    await persistGeneratedListDetails(created.id, result)

    await reloadLists()
    scheduleSync()

    toast.add({ title: `Liste "${created.name}" erstellt`, icon: 'i-lucide-sparkles' })
    await navigateTo(`/app/lists/${created.id}`)
  }

  /**
   * Legt das von der AI gelieferte Rezept an und öffnet es.
   *
   * Ein mitgeliefertes Bild geht sofort zum Server, damit es als
   * `sync:`-Referenz auf allen Geräten ankommt. Ein gescheiterter Upload
   * lässt das Rezept trotzdem entstehen: Zutaten und Schritte sind der Kern,
   * das Bild ist die Zugabe.
   */
  async function createRecipeFromAi(result: GeneratedRecipe): Promise<void> {
    const created = await createRecipe(result.name)
    await persistGeneratedRecipeDetails(created.id, result)

    if (result.imageData !== null) {
      const blob = base64ToWebpBlob(result.imageData)
      const upload = blob !== null ? await uploadRecipeImage(created.id, blob) : null
      const attached = upload !== null && upload.ok
        ? await attachRecipeImageById(created.id, toSyncImagePath(upload.value))
        : false
      if (!attached) {
        toast.add({
          title: 'Bild konnte nicht gespeichert werden',
          description: 'Das Rezept wurde ohne Bild angelegt.',
          icon: 'i-lucide-image-off',
        })
      }
    }

    await reloadRecipes()
    scheduleSync()

    toast.add({ title: `Rezept "${created.name}" erstellt`, icon: 'i-lucide-sparkles' })
    await navigateTo(`/app/recipes/${created.id}`)
  }

  return { createListFromAi, createRecipeFromAi }
}

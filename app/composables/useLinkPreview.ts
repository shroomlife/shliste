/**
 * Vom Serverpfad eines Vorschaubildes zur Adresse, die ein `<img src>` laden kann.
 *
 * Der Server speichert das Bild als `link:{32 Hex}.webp` an der Zeile. Der
 * Browser kann diese Referenz nicht selbst abrufen: Ein `<img>` schickt weder
 * die HMAC-Signatur noch das Session-JWT mit. Dazwischen steht deshalb die
 * eigene BFF (`server/api/link-previews/[hash].get.ts`), genau wie bei den
 * Rezeptbildern.
 *
 * DAS MUSTER IST DER WACHPOSTEN: Der Pfad kommt vom Server, wird aber
 * behandelt wie jede fremde Eingabe. Nur 32 kleingeschriebene Hex-Zeichen
 * kommen durch — alles andere ergibt `null` und damit das Ersatz-Icon.
 * Andernfalls liesse sich über ein manipuliertes Feld eine beliebige Adresse
 * in ein `src` schreiben.
 *
 * Rein und ohne Vue, damit es mit `bun test` prüfbar bleibt.
 */

/** `link:{32 Hex}.webp` — exakt das Format, das die API vergibt. */
export const LINK_IMAGE_PATH = /^link:([0-9a-f]{32})\.webp$/

/**
 * Die BFF-Adresse zum gespeicherten Vorschaubild, oder `null`.
 *
 * Die Antwort trägt einen unbegrenzten Cache: Der Dateiname ist die Prüfsumme
 * der Bytes, ein geändertes Bild bekommt also eine neue Adresse und ein
 * Eintrag kann nie veralten.
 */
export function resolveLinkPreviewUrl(linkImagePath: string | null | undefined): string | null {
  if (typeof linkImagePath !== 'string') return null

  const match = LINK_IMAGE_PATH.exec(linkImagePath)
  const hash = match?.[1]
  return hash === undefined ? null : `/api/link-previews/${hash}`
}

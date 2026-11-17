/**
 * Vom Serverpfad eines KI-Bilds (`item:{32 Hex}.webp`) zur BFF-Adresse, die
 * ein `<img src>` laden kann (`server/api/item-images/[hash].get.ts`).
 *
 * Wie bei `resolveLinkPreviewUrl`: Der Pfad kommt vom Server, wird aber wie
 * fremde Eingabe behandelt. Nur das exakte Format kommt durch, sonst `null`.
 */
export const ITEM_IMAGE_PATH = /^item:([0-9a-f]{32})\.webp$/

export function resolveItemImageUrl(itemImagePath: string | null | undefined): string | null {
  if (typeof itemImagePath !== 'string') return null
  const hash = ITEM_IMAGE_PATH.exec(itemImagePath)?.[1]
  return hash === undefined ? null : `/api/item-images/${hash}`
}

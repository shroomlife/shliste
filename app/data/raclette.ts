export const racletteIngredients = [
  { id: 'kartoffeln', name: 'Kleine Kartoffeln', grams: 250, group: 'Die Basis' },
  { id: 'belag', name: 'Raclette-Scheiben auf Kokosölbasis', grams: 100, group: 'Die Basis' },
  { id: 'brot', name: 'Baguette ohne Milch und Ei', grams: 75, group: 'Die Basis' },
  { id: 'pilze', name: 'Champignons', grams: 100, group: 'Für die Pfännchen' },
  { id: 'paprika', name: 'Paprika', grams: 100, group: 'Für die Pfännchen' },
  { id: 'mais', name: 'Mais (Abtropfgewicht)', grams: 50, group: 'Für die Pfännchen' },
  { id: 'tofu', name: 'Räuchertofu', grams: 75, group: 'Für die Pfännchen' },
  { id: 'gurken', name: 'Gewürzgurken (Abtropfgewicht)', grams: 40, group: 'Dazu auf den Tisch' },
  { id: 'dip', name: 'Kräuterdip auf Sojajoghurtbasis', grams: 50, group: 'Dazu auf den Tisch' },
]
export function racletteAmount(grams: number, guests: number) {
  const amount = grams * guests
  return amount >= 1000 ? `${(amount / 1000).toLocaleString('de-DE')} kg` : `${amount} g`
}

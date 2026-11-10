export type BakingIngredient = { id: string, name: string, amount: number, unit: string }
const base = (flour: number, drink: number): BakingIngredient[] => [
  { id: 'mehl', name: 'Weizenmehl Type 405', amount: flour, unit: 'g' },
  { id: 'margarine', name: 'Backmargarine ohne Milchbestandteile', amount: 125, unit: 'g' },
  { id: 'zucker', name: 'Zucker', amount: 80, unit: 'g' },
  { id: 'vanillezucker', name: 'Vanillezucker', amount: 8, unit: 'g' },
  { id: 'haferdrink', name: 'Haferdrink', amount: drink, unit: 'ml' },
  { id: 'salz', name: 'Salz', amount: 1, unit: 'Prise(n)' },
]
export const bakingRecipes = [
  { id: 'vanille', name: 'Vanille-Sterne', subtitle: 'Ausstechen. Verzieren. Noch einen naschen.', image: '/images/illustrations/plaetzchen-vanille.webp', alt: 'Goldene Vanille-Sterne und Herzen auf einem blauen Keramikteller.', time: '10–12 Minuten', ingredients: base(250, 30), steps: ['Mehl, Zucker, Vanillezucker und Salz mischen. Kalte Backmargarine in Stückchen und Haferdrink kurz unterkneten. Nur so lange kneten, bis der Teig zusammenhält.', 'Abgedeckt mindestens 30 Minuten kühlen. Auf leicht bemehlter Fläche etwa 4 mm dick ausrollen, ausstechen und mit Abstand auf ein mit Backpapier belegtes Blech legen.', 'Im vorgeheizten Ofen bei 175 °C Ober-/Unterhitze etwa 10–12 Minuten backen, bis die Ränder leicht goldgelb sind. Auf dem Blech kurz fest werden lassen und dann vollständig auskühlen lassen.'], tip: 'Für einen einfachen Guss Puderzucker mit wenig Zitronensaft dickflüssig anrühren. Beides bei Bedarf zusätzlich auf die Liste setzen.' },
  { id: 'schoko', name: 'Schoko-Taler', subtitle: 'Für alle, die beim Kakao zuerst zugreifen.', image: '/images/illustrations/plaetzchen-schoko.webp', alt: 'Dunkle Schoko-Taler, teilweise in Schokolade getaucht, auf einem blauen Teller.', time: '10–12 Minuten', ingredients: [...base(230, 45), { id: 'kakao', name: 'Backkakao, ungesüßt', amount: 20, unit: 'g' }], steps: ['Mehl, Kakao, Zucker, Vanillezucker und Salz mischen. Kalte Backmargarine und Haferdrink kurz zu einem glatten Teig kneten. Abgedeckt mindestens 30 Minuten kühlen.', 'Etwa 30 kleine Kugeln formen, auf ein mit Backpapier belegtes Blech setzen und mit einer Gabel auf etwa 5 mm Dicke drücken.', 'Im vorgeheizten Ofen bei 175 °C Ober-/Unterhitze etwa 10–12 Minuten backen. Die Taler dürfen noch etwas weich sein; sie werden beim Abkühlen fester. Erst ausgekühlt optional in geschmolzene dunkle Schokolade tauchen.'], tip: 'Die Schokolade ist ein Extra. Beim Einkauf eine Sorte ohne Milchbestandteile auswählen und zusätzlich auf die Liste setzen.' },
  { id: 'marmelade', name: 'Marmeladen-Küsschen', subtitle: 'Ein kleiner Klecks. Eine große Freude.', image: '/images/illustrations/plaetzchen-marmelade.webp', alt: 'Goldene runde Plätzchen mit roter Himbeermarmelade in der Mitte.', time: '12–15 Minuten', ingredients: [...base(250, 30), { id: 'konfituere', name: 'Himbeerkonfitüre', amount: 80, unit: 'g' }], steps: ['Mehl, Zucker, Vanillezucker und Salz mischen. Kalte Backmargarine und Haferdrink kurz unterkneten. Abgedeckt mindestens 30 Minuten kühlen.', 'Etwa 30 Kugeln formen und mit Abstand aufs belegte Blech setzen. Mit einem Kochlöffelstiel eine Mulde eindrücken, ohne den Boden durchzustoßen. Mit wenig Konfitüre füllen.', 'Im vorgeheizten Ofen bei 175 °C Ober-/Unterhitze etwa 12–15 Minuten backen, bis die Ränder leicht Farbe bekommen. Die heiße Füllung nicht berühren; vollständig auskühlen lassen.'], tip: 'Glatte Konfitüre lässt sich besonders gut portionieren. Lieber sparsam füllen, damit sie beim Backen in der Mulde bleibt.' },
]
export function combineBakingIngredients(recipeIds: string[], batches: number): BakingIngredient[] {
  const merged = new Map<string, BakingIngredient>()
  for (const recipe of bakingRecipes.filter(recipe => recipeIds.includes(recipe.id))) {
    for (const item of recipe.ingredients) {
      const existing = merged.get(item.id)
      if (existing) existing.amount += item.amount * batches
      else merged.set(item.id, { ...item, amount: item.amount * batches })
    }
  }
  return [...merged.values()]
}
export function bakingAmount(item: BakingIngredient) {
  if (item.unit === 'Prise(n)') return `${item.amount} ${item.amount === 1 ? 'Prise' : 'Prisen'}`
  if (item.unit === 'g' && item.amount >= 1000) return `${(item.amount / 1000).toLocaleString('de-DE')} kg`
  return `${item.amount.toLocaleString('de-DE')} ${item.unit}`
}

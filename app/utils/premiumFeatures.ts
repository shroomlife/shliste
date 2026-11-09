/** Keep the native PremiumFeature copy in sync with these entry points. */
export const premiumFeatures = {
  general: { title: 'Mehr Raum für deine Ideen.', detail: 'Mit KI wird aus einer Idee schneller eine Liste oder ein Rezept. Diese Funktionen kommen mit Premium.', icon: 'i-lucide-sparkles', label: 'Für deinen Alltag', result: 'Von der Idee zum fertigen Entwurf' },
  voice: { title: 'Sag einfach, was du vorhast.', detail: 'Sprich deine Zutaten oder Rezeptidee ein. Die KI macht daraus einen übersichtlichen Entwurf, den du anpassen kannst.', icon: 'i-lucide-mic', label: 'Per Sprache', result: 'Deine Worte. Schön sortiert.' },
  photo: { title: 'Dein Fundstück darf mit.', detail: 'Fotografiere ein Rezept oder eine Zutatenliste. Die KI liest die Inhalte aus und bereitet sie zum Übernehmen vor.', icon: 'i-lucide-camera', label: 'Per Foto', result: 'Vom Foto in deine Sammlung' },
  link: { title: 'Gute Ideen bleiben bei dir.', detail: 'Teile einen Rezeptlink. Die KI bereitet die Inhalte zum Übernehmen auf — damit du sie später schnell wiederfindest.', icon: 'i-lucide-link', label: 'Per Link', result: 'Ein Link. Ein neuer Lieblingsentwurf.' },
  image: { title: 'Dein Rezept bekommt ein Gesicht.', detail: 'Lass ein passendes Bild zu deinem Rezept gestalten — im illustrierten shliste-Stil, den du von unseren Rezeptideen kennst.', icon: 'i-lucide-image', label: 'Rezeptbilder', result: 'So könnte dein Rezept aussehen' },
  editRecipe: { title: 'Dein Rezept. Deine Variante.', detail: 'Beschreibe, was du ändern möchtest. Die KI schlägt passende Anpassungen für Zutaten und Zubereitung vor.', icon: 'i-lucide-sliders-horizontal', label: 'Rezept anpassen', result: 'Dein Wunsch wird zum Vorschlag' },
  editList: { title: 'Eine Liste, die mitdenkt.', detail: 'Sag, was sich ändern soll. Die KI bereitet die Änderungen an deiner Liste vor, und du entscheidest, was du übernimmst.', icon: 'i-lucide-list-checks', label: 'Liste anpassen', result: 'Weniger tippen. Mehr vorhaben.' },
  suggestions: { title: 'Da geht noch etwas Leckeres.', detail: 'Lass dir passende Ergänzungen zu deiner Liste vorschlagen. Du wählst aus, was zu deinem Einkauf passt.', icon: 'i-lucide-lightbulb', label: 'Passende Vorschläge', result: 'Neue Ideen für deine Liste' },
  chat: { title: 'Eine gute Frage beim Kochen.', detail: 'Stelle Fragen zu deinem Rezept — etwa zu Zutaten, Alternativen oder zur Zubereitung. Die KI hilft dir beim Weiterdenken.', icon: 'i-lucide-messages-square', label: 'Rezeptfragen', result: 'Eine helfende Idee, wenn du sie brauchst' },
  explain: { title: 'Dieser Schritt wird klarer.', detail: 'Lass dir diesen Zubereitungsschritt genauer erklären, damit du weißt, worauf es beim Nachkochen ankommt.', icon: 'i-lucide-chef-hat', label: 'Schritt erklären', result: 'Mit mehr Klarheit weiterkochen' },
} as const

export type PremiumFeature = keyof typeof premiumFeatures

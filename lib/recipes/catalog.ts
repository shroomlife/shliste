import pasta from './french-onion-pasta.v1.json'
import riceSalad from './crispy-rice-salad.v1.json'
import dumplings from './kokos-limetten-dumplings.v1.json'
import cheesecake from './basque-cheesecake.v1.json'
import mousse from './seidentofu-schokomousse.v1.json'
import potatoes from './knusprige-ofenkartoffeln.v1.json'
import pancakes from './hafer-bananen-pancakes.v1.json'
import tiramisu from './joghurt-keks-tiramisu.v1.json'
import gnocchi from './baked-feta-gnocchi.v1.json'
import overnightOats from './apfel-zimt-overnight-oats.v1.json'
import greenGoddess from './green-goddess-salat.v1.json'
import mugCake from './schoko-tassenkuchen.v1.json'
import fetaCream from './feta-creme-ofentomaten.v1.json'
import bananaBread from './saftiges-bananenbrot.v1.json'
import cabbage from './spitzkohl-knoblauchcreme.v1.json'
import lemonBlueberry from './zitronen-blaubeer-kuechlein.v1.json'
import harissa from './harissa-gurkensalat.v1.json'
import quinoa from './quinoa-kichererbsen-salat.v1.json'
import brownies from './pistazien-knusper-brownies.v1.json'
import crinkle from './zitronen-vanille-crinkle-cake.v1.json'
import { validateCatalogRecipe, type RecipeIdea, type CatalogRecipe } from '../editorial'

export const pilotRecipe = validateCatalogRecipe(pasta)
export const catalogRecipes: CatalogRecipe[] = [pilotRecipe, validateCatalogRecipe(riceSalad), validateCatalogRecipe(dumplings), validateCatalogRecipe(tiramisu), validateCatalogRecipe(cheesecake), validateCatalogRecipe(pancakes), validateCatalogRecipe(potatoes), validateCatalogRecipe(mousse), validateCatalogRecipe(gnocchi), validateCatalogRecipe(overnightOats), validateCatalogRecipe(greenGoddess), validateCatalogRecipe(mugCake), validateCatalogRecipe(fetaCream), validateCatalogRecipe(bananaBread), validateCatalogRecipe(cabbage), validateCatalogRecipe(lemonBlueberry), validateCatalogRecipe(harissa), validateCatalogRecipe(quinoa), validateCatalogRecipe(brownies), validateCatalogRecipe(crinkle)]

const sources = {
  delish: ['Delish · Juni 2026', 'https://www.delish.com/cooking/recipe-ideas/g71664808/viral-recipes/'],
  goodfood: ['Good Food · Rückblick 2025', 'https://www.bbcgoodfood.com/news-trends/popular-recipes-2025'],
  lecker: ['LECKER · Food-Trends', 'https://www.lecker.de/food-trends'],
  lovefood: ['loveFOOD · August 2026', 'https://www.lovefood.com/gallerylist/572184/the-tiktok-food-trends-and-viral-recipes-actually-worth-trying'],
  creator: ['Everything Delish · Mai 2026', 'https://everythingdelish.substack.com/p/5-viral-recipes-worth-the-hype'],
} as const

function idea(id: string, title: string, emoji: string, kind: RecipeIdea['kind'], meal: RecipeIdea['meal'], description: string, source: keyof typeof sources, tags: string[] = []): RecipeIdea {
  return { id, title, emoji, kind, meal, description, source: sources[source][1], sourceName: sources[source][0], tags }
}

/** Rechercheideen sind keine veröffentlichten Rezepte; Zeiten werden nicht erfunden. */
export const recipeIdeas: RecipeIdea[] = [
  idea('french-onion-pasta', pilotRecipe.title, '🧅', 'herzhaft', 'Hauptgericht', 'Goldbraune Zwiebeln, Thymian und eine samtige Sauce. Alles aus einem Topf.', 'delish', ['Zwiebeln', 'Pasta', 'Hafercuisine', 'One Pot']),
  idea('kokos-limetten-dumplings', 'Kokos-Limetten-Dumpling-Auflauf', '🥟', 'herzhaft', 'Hauptgericht', 'Gemüse-Dumplings in Kokossauce mit frischer Limette. Ohne Ei und Fischbestandteile.', 'delish', ['Kokosmilch', 'Ofen']),
  idea('crispy-rice-salad', 'Crispy Rice Salad', '🥒', 'herzhaft', 'Salat', 'Knuspriger Reis, Gurke und Kräuter mit einem Chili-Limetten-Dressing.', 'lecker', ['Reis', 'Gurke']),
  idea('baked-feta-gnocchi', 'Baked-Feta-Gnocchi', '🍅', 'herzhaft', 'Hauptgericht', 'Eifreie Gnocchi, süße Ofentomaten und cremiger veganer Feta.', 'lecker', ['Tomaten', 'Ofen']),
  idea('green-goddess-salat', 'Green-Goddess-Salat', '🌿', 'herzhaft', 'Salat', 'Fein geschnittenes Gemüse mit einem frischen Kräuter-Tahini-Dressing.', 'delish', ['Kräuter', 'Tahini']),
  idea('harissa-gurkensalat', 'Gurkensalat mit Harissa und Dill', '🌀', 'herzhaft', 'Salat', 'Knackige Fächergurken, ein mildes Harissa-Dressing und frischer Dill.', 'delish', ['Gurke', 'Harissa']),
  idea('quinoa-kichererbsen-salat', 'Quinoa-Kichererbsen-Salat', '🍋', 'herzhaft', 'Salat', 'Gurke, Pistazien und Zitronendressing: unsere pflanzliche Idee zum viralen Quinoasalat.', 'creator', ['Quinoa', 'Kichererbsen']),
  idea('feta-creme-ofentomaten', 'Feta-Creme mit Ofentomaten', '🥣', 'herzhaft', 'Snack', 'Aufgeschlagener veganer Feta mit Sojajoghurt und warmen Tomaten. Ohne Honig.', 'creator', ['Tomaten', 'Sojajoghurt']),
  idea('knusprige-ofenkartoffeln', 'Knusprige Ofenkartoffeln', '🥔', 'herzhaft', 'Hauptgericht', 'Goldene Kartoffeln mit Rosmarin und einem cremigen Sojajoghurt-Kräuterdip.', 'lovefood', ['Kartoffeln', 'Ofen']),
  idea('spitzkohl-knoblauchcreme', 'Spitzkohl in Knoblauchcreme', '🥬', 'herzhaft', 'Hauptgericht', 'Geröstete Spitzkohl-Wedges mit Hafercuisine und würzigen Hefeflocken.', 'lecker', ['Kohl', 'Knoblauch']),
  idea('joghurt-keks-tiramisu', 'Joghurt-Keks-Tiramisu', '☕', 'suess', 'Dessert', 'Dickflüssiger Sojajoghurt, vegane Kekse, Kaffee und eine Wolke Kakao.', 'creator', ['Kaffee', 'Kekse']),
  idea('zitronen-blaubeer-kuechlein', 'Zitronen-Blaubeer-Küchlein', '🫐', 'suess', 'Dessert', 'Eierfreier Zitronenkuchen im Glas mit Blaubeerkompott und pflanzlicher Creme.', 'creator', ['Zitrone', 'Blaubeeren']),
  idea('basque-cheesecake', 'Basque Cheesecake', '🍰', 'suess', 'Dessert', 'Ein dunkler, sanft eingesunkener Deckel über Vanillecreme, dazu kühles Heidelbeerkompott.', 'goodfood', ['Frischkäse', 'Backen']),
  idea('schoko-tassenkuchen', 'Schoko-Tassenkuchen', '🍫', 'suess', 'Dessert', 'Ein kleiner Schokomoment mit Kakao und Hafermilch. Ganz ohne Ei.', 'goodfood', ['Kakao', 'Hafermilch']),
  idea('hafer-bananen-pancakes', 'Hafer-Bananen-Pancakes', '🥞', 'suess', 'Frühstück', 'Fluffige Pancakes aus Hafer, Banane und Sojamilch für einen gemütlichen Morgen.', 'goodfood', ['Hafer', 'Banane']),
  idea('apfel-zimt-overnight-oats', 'Apfel-Zimt-Overnight-Oats', '🍎', 'suess', 'Frühstück', 'Haferflocken, Hafermilch, Sojajoghurt und Apfel für den nächsten Morgen.', 'goodfood', ['Apfel', 'Hafer']),
  idea('saftiges-bananenbrot', 'Saftiges Bananenbrot', '🍌', 'suess', 'Frühstück', 'Reife Bananen, Hafermilch und Öl machen diesen beliebten Klassiker wunderbar saftig.', 'lovefood', ['Banane', 'Backen']),
  idea('zitronen-vanille-crinkle-cake', 'Kokos-Vanille-Crinkle-Cake', '🥥', 'suess', 'Dessert', 'Goldene Filofalten mit Kokos, Vanille und Kardamom nach einer bereits veganen Vorlage.', 'lovefood', ['Filoteig', 'Kokos', 'Vanille']),
  idea('pistazien-knusper-brownies', 'Pistazien-Knusper-Brownies', '💚', 'suess', 'Dessert', 'Eierfreie Brownies mit milchfreier Schokolade, Pistaziencreme und veganem Kadayif.', 'delish', ['Pistazien', 'Schokolade']),
  idea('seidentofu-schokomousse', 'Seidentofu-Schokomousse', '🍮', 'suess', 'Dessert', 'Seidentofu und dunkle, milchfreie Schokolade werden zum samtigen Löffeldessert.', 'delish', ['Tofu', 'Schokolade']),
]

export function getCatalogRecipe(id: string, version = 1, includePreview = false): CatalogRecipe | null {
  return catalogRecipes.find(recipe => (recipe.catalogId === id || recipe.slug === id) && recipe.version === version && (recipe.status === 'published' || includePreview)) ?? null
}

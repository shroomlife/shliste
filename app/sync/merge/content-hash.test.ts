/// <reference types="bun" />
/**
 * Die Prüfsumme gegen die echte Engine gehalten.
 *
 * Der Vergleich mit dem Server ist wertlos, wenn beide Seiten nicht Zeichen für
 * Zeichen dasselbe zusammensetzen. Deshalb stammen die Erwartungswerte hier
 * nicht aus diesem Code, sondern aus **Postgres 18** — derselben Fassung, die
 * in Entwicklung wie Produktion läuft, ausgeführt mit demselben SQL-Muster wie
 * `computeContentHashes` in `api.shliste.app/src/routes/sync/status.ts`:
 * `md5(string_agg(… , '' ORDER BY id))`.
 *
 * Die Testdaten sind bewusst unbequem gewählt: Ids außerhalb der Reihenfolge
 * (prüft die Sortierung), Umlaute und ein Kaufmanns-Und (prüft die
 * UTF-8-Kodierung), ein `null` neben einem gesetzten Wert (prüft COALESCE),
 * Wahrheitswerte in beiden Zuständen.
 */
import { describe, expect, test } from 'bun:test'
import type { Badge, List, ListItem, Recipe, RecipeIngredient, RecipeStep } from '../../../shared/types/domain'
import { computeContentHashes, divergentAreas, type ContentHashParts } from './content-hash'

const NOW = '2026-08-20T10:00:00.000Z'

function liste(over: Partial<List> & { id: string }): List {
  return {
    createdAt: NOW, updatedAt: NOW, deletedAt: null, fieldTimestamps: null,
    name: '', color: '#000000', secret: false, sourceUrl: null,
    ownerUserId: null, ...over,
  } as List
}

function eintrag(over: Partial<ListItem> & { id: string, listId: string }): ListItem {
  return {
    createdAt: NOW, updatedAt: NOW, deletedAt: null, fieldTimestamps: null,
    name: '', quantity: 1, checked: false, removed: false, orderIndex: 0,
    sortKey: null, createdBy: null, modifiedBy: null, ...over,
  } as ListItem
}

function rezept(over: Partial<Recipe> & { id: string }): Recipe {
  return {
    createdAt: NOW, updatedAt: NOW, deletedAt: null, fieldTimestamps: null,
    name: '', color: '#000000', sourceUrl: null, imagePath: null, ...over,
  } as Recipe
}

/** Genau die Daten, mit denen die Erwartungswerte in Postgres erzeugt wurden. */
const FIXTURE = {
  lists: [
    liste({ id: 'l2', name: 'Wocheneinkauf', color: '#E064B2', secret: false, sourceUrl: null }),
    liste({ id: 'l1', name: 'Müsli & Öl', color: '#7FD1AE', secret: true, sourceUrl: 'https://x.test/a' }),
  ],
  items: [
    eintrag({ id: 'i2', listId: 'l1', name: 'Milch', quantity: 2, checked: false, removed: false, orderIndex: 1 }),
    eintrag({ id: 'i1', listId: 'l1', name: 'Brot', quantity: 1, checked: true, removed: false, orderIndex: 0 }),
  ],
  recipes: [
    rezept({ id: 'r1', name: 'Pfannkuchen', color: '#FF8CCB', sourceUrl: null, imagePath: 'sync:abc' }),
  ],
  ingredients: [
    { id: 'g1', recipeId: 'r1', name: 'Mehl', quantity: 3, orderIndex: 0, deletedAt: null } as RecipeIngredient,
  ],
  steps: [
    { id: 's1', recipeId: 'r1', description: 'Teig rühren', orderIndex: 0, isChecked: false, deletedAt: null } as RecipeStep,
  ],
  badges: [
    {
      id: 'b1', recipeId: 'r1', recipeName: 'Pfannkuchen', recipeImagePath: null,
      recipeColor: '#FF8CCB', earnedAt: NOW, deletedAt: null,
    } as Badge,
  ],
}

/** Direkt aus Postgres 18, mit dem SQL-Muster des Servers erzeugt. */
const AUS_POSTGRES: ContentHashParts = {
  lists: '2b29e9d8e37bf94269de9cc5e685af42',
  listItems: 'f0f7fd6adcea336e61a286aa60f330f8',
  recipes: 'db0d3ce8c2667498630c590a28b04575',
  recipeIngredients: 'ce79ed15377015de2318c24bd0ff6268',
  recipeSteps: 'fee7ffd4fbf6ff23165f022fbed6a74f',
  badges: '553085af4ce56f8040ad4d754a2c0d39',
}
const GESAMT_AUS_POSTGRES = '80e912c8e838399daaebceb7faae174f'

describe('Teil-Summen gegen Postgres', () => {
  const { parts } = computeContentHashes(FIXTURE)

  for (const bereich of Object.keys(AUS_POSTGRES) as Array<keyof ContentHashParts>) {
    test(bereich, () => {
      expect(parts[bereich]).toBe(AUS_POSTGRES[bereich])
    })
  }

  test('Gesamtsumme', () => {
    expect(computeContentHashes(FIXTURE).v2).toBe(GESAMT_AUS_POSTGRES)
  })
})

describe('Filter — sie gehören zur Formel', () => {
  test('gelöschte Zeilen zählen nicht', () => {
    const mitLeiche = {
      ...FIXTURE,
      lists: [...FIXTURE.lists, liste({ id: 'l9', name: 'weg', deletedAt: NOW })],
    }
    expect(computeContentHashes(mitLeiche).parts.lists).toBe(AUS_POSTGRES.lists)
  })

  test('Einträge einer gelöschten Liste zählen nicht', () => {
    // Der Server verknüpft mit `lists` und prüft dort ebenfalls deletedAt.
    // Ohne diesen Filter wiche jedes Gerät ab, das eine Liste gelöscht hat,
    // deren Einträge lokal noch herumliegen.
    const mitWaise = {
      ...FIXTURE,
      lists: [...FIXTURE.lists, liste({ id: 'l9', name: 'weg', deletedAt: NOW })],
      items: [...FIXTURE.items, eintrag({ id: 'i9', listId: 'l9', name: 'Waise' })],
    }
    expect(computeContentHashes(mitWaise).parts.listItems).toBe(AUS_POSTGRES.listItems)
  })

  test('Zutaten eines GELÖSCHTEN Rezepts zählen weiterhin mit', () => {
    // Überrascht, ist aber der Serverstand: dessen JOIN prüft die Zugehörigkeit,
    // nicht `r."deletedAt"`. Es hier "richtiger" zu machen, ergäbe dauerhaft
    // verschiedene Summen — also ein Dauerbefund, der keiner ist.
    const mitGeloeschtemRezept = {
      ...FIXTURE,
      recipes: [rezept({ id: 'r1', name: 'Pfannkuchen', color: '#FF8CCB', imagePath: 'sync:abc', deletedAt: NOW })],
    }
    expect(computeContentHashes(mitGeloeschtemRezept).parts.recipeIngredients)
      .toBe(AUS_POSTGRES.recipeIngredients)
  })

  test('die Reihenfolge der Eingabe ist egal', () => {
    const umgedreht = { ...FIXTURE, lists: [...FIXTURE.lists].reverse() }
    expect(computeContentHashes(umgedreht).parts.lists).toBe(AUS_POSTGRES.lists)
  })

  test('ein leerer Bestand ergibt die Summe der leeren Zeichenkette', () => {
    const leer = computeContentHashes({ lists: [], items: [], recipes: [], ingredients: [], steps: [], badges: [] })
    // Postgres: md5(COALESCE(string_agg(...), '')) über null Zeilen.
    expect(leer.parts.lists).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
})

describe('Die Link-Felder gehören NICHT in die Prüfsumme', () => {
  /*
   * WARUM DAS EIN EIGENER TEST IST: Die Prüfsumme ist der einzige Vergleich,
   * der Abweichungen JENSEITS des Delta-Fensters findet. Nähme sie `url` oder
   * die Server-Spiegel auf, hätten Client und Server so lange verschiedene
   * Summen, bis die Anreicherung jeder einzelnen Zeile durch ist — und die
   * Selbstheilung liefe genau so lange im Kreis. Der Server rechnet die
   * Spalten deshalb ausdrücklich nicht mit (`status.ts` in der API), und
   * Android tut es auch nicht.
   */
  test('ein hinzugefügter Link ändert die Summe nicht', () => {
    const mitLink = {
      ...FIXTURE,
      items: FIXTURE.items.map(row =>
        row.id === 'i1' ? eintrag({ ...row, url: 'https://kochwelt.de/rezept' }) : row),
    }
    expect(computeContentHashes(mitLink).parts.listItems).toBe(AUS_POSTGRES.listItems)
    expect(computeContentHashes(mitLink).v2).toBe(computeContentHashes(FIXTURE).v2)
  })

  test('Titel, Bildpfad und Bildart ändern die Summe nicht', () => {
    const angereichert = {
      ...FIXTURE,
      items: FIXTURE.items.map(row =>
        row.id === 'i1'
          ? eintrag({
              ...row,
              url: 'https://kochwelt.de/rezept',
              linkTitle: 'Ofenkartoffeln mit Kräuterquark',
              linkImagePath: 'link:0123456789abcdef0123456789abcdef.webp',
              linkImageKind: 'preview',
            })
          : row),
    }
    expect(computeContentHashes(angereichert).parts.listItems).toBe(AUS_POSTGRES.listItems)
    expect(computeContentHashes(angereichert).v2).toBe(computeContentHashes(FIXTURE).v2)
  })
})

describe('divergentAreas', () => {
  test('benennt genau die abweichenden Bereiche', () => {
    const abweichend = { ...AUS_POSTGRES, listItems: 'X', badges: 'Y' }
    expect(divergentAreas(abweichend, AUS_POSTGRES)).toEqual(['Einträge', 'Auszeichnungen'])
  })

  test('ohne Serverteile bleibt die Liste leer', () => {
    // Der Aufrufer muss "unbekannt" schreiben können statt "nichts weicht ab".
    expect(divergentAreas(null, AUS_POSTGRES)).toEqual([])
  })
})

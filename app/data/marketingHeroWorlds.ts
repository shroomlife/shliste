// Each palette tells one complete, fictional everyday story using real app features.

export const marketingHeroWorlds = [

  {

    name: 'Freunde zum Essen', headline: 'Sechs hungrige Freunde.', punchline: 'Ein entspannter Einkauf.',
    icon: 'i-lucide-utensils',
    scene: { asset: 'friends', title: 'Noch Platz am Tisch.', note: 'Freitag, 19 Uhr.', detail: 'Pflanzliche Lasagne für alle.', alt: 'Frisch gebackene Lasagne in einer blauen Ofenform.' },

    intro: 'Freitag gibt es Lasagne mit Linsenbolognese und cremiger Hafer-Béchamel. Sam geht einkaufen. Du sprichst die drei fehlenden Zutaten auf eure gemeinsame Liste: rote Linsen, Haferdrink und Hefeflocken. Mehl und Öl habt ihr noch.',

    path: '/im-alltag/gaeste-zum-essen', link: 'Euren Abend planen',

    lists: ['Freitag mit Freunden', 'Getränke für alle', 'Für die Woche'], secret: false,

    created: 'Freitag mit Freunden', voice: 'Für die Lasagne noch rote Linsen, Haferdrink und Hefeflocken.', items: ['Rote Linsen', 'Haferdrink', 'Hefeflocken'],

    recipe: 'Lasagne für alle', image: '/images/recipes/lasagne.webp', recipeNote: 'Freitag, 19 Uhr. Alle an einem Tisch.',

    companion: 'Sam', update: 'Ihr plant den Freitag zusammen.', outcome: 'Drei Ergänzungen in eurer bestehenden Liste.',

    moments: ['Eine Freitagsliste für euch beide.', 'Eure geteilte Liste öffnen.', 'AI-Bearbeitung in der Liste wählen.', 'Die fehlenden Lasagnezutaten einsprechen.', 'Drei Ergänzungen prüfen. Der Rest bleibt.', 'Übernehmen. Alles in derselben Liste.', 'Nach dem Abgleich sieht Sam die Zutaten auch.'],

  },

  {

    name: 'Ein Morgen in der WG', headline: 'Kaffee leer.', punchline: 'Gruppenchat auch mal.',
    icon: 'i-lucide-coffee',
    scene: { asset: 'wg', title: 'Morgen wieder Kaffee.', note: 'In eurer WG-Küche.', detail: 'Jules kauft ein. Noor weiß Bescheid.', alt: 'Eine weiße Kaffeetasse auf einem hellen Leinentuch.' },

    intro: 'Eine WG, ein gemeinsamer Vorrat. Jules lädt Noor zur Einkaufsliste ein. Nach dem Annehmen ergänzt Noor den fehlenden Haferdrink. Jules sieht, von wem der Eintrag kommt, und kauft für beide ein.',

    path: '/im-alltag/wg-einkauf', link: 'Den WG-Einkauf teilen',

    lists: ['WG-Basics', 'Samstag zusammen', 'Jules’ Besorgungen'], secret: false,

    created: 'WG-Basics', voice: 'Für die WG noch Kaffee, Haferdrink und Spülmittel.', items: ['Kaffee', 'Haferdrink', 'Spülmittel'],

    recipe: 'Pizzabrötchen für die WG', image: '/images/recipes/pizzabroetchen.webp', recipeNote: 'Für Samstag: ein Blech für die WG.',

    companion: 'Noor', update: 'Jules lädt Noor zur WG-Liste ein.', outcome: 'Die gemeinsamen Vorräte sind aufgefüllt.',

    moments: ['Jules möchte die WG-Liste mit Noor teilen.', 'Noor aus den Vorschlägen einladen.', 'Später: Noor hat die Einladung angenommen.', 'Noor ergänzt Haferdrink. Jules sieht ihren Eintrag.', 'Kaffee und Haferdrink liegen im Korb.', 'Spülmittel auch. Nach dem Abgleich sieht Noor den Stand.'],

  },

  {

    name: 'Ankommen im Urlaub', headline: 'Koffer abstellen.', punchline: 'Urlaub anschalten.',
    icon: 'i-lucide-sun',
    scene: { asset: 'holiday', title: 'Erst Kaffee. Dann ans Meer.', note: 'Der erste Morgen im Urlaub.', detail: 'Frühstück ist schon besorgt.', alt: 'Ein Frühstück mit Brötchen, Hummus und Kaffee am Fenster einer Ferienwohnung.' },

    intro: 'Alex prüft die Ferienwohnung: Filtermaschine und Backofen sind da. Kaffee, Filter und Spülmittel fehlen. Ihr plant den ersten Morgen und Pizzabrötchen nach dem Strand. Eine Liste, ein Einkauf. Dann habt ihr frei.',

    path: '/im-alltag/ferienwohnung-einkauf', link: 'Entspannt ankommen',

    lists: ['Ankommen am Meer', 'Ist schon vorhanden', 'Für den Strand'], secret: false,

    created: 'Morgen auf dem Balkon', voice: 'Für morgen: Brot, Kaffee und Haferdrink.', items: ['Brot', 'Kaffee', 'Haferdrink'],

    recipe: 'Pizzabrötchen nach dem Strand', image: '/images/recipes/pizzabroetchen.webp', recipeNote: 'Brötchen, Tomatensauce, Paprika, veganer Reibegenuss.',

    companion: 'Alex', update: 'Alex hat Kaffeefilter ergänzt.', outcome: 'Frühstück, Abendessen und Küchenbasics.',

    moments: ['Erst nachsehen, was in der Ferienwohnung da ist.', 'Die Urlaubsliste öffnen: zwölf Einträge.', 'Beim Scrollen bleibt der Listenname oben dabei.', 'Spülmittel und Küchenrolle fehlen ebenfalls.', 'Küchenrolle liegt im Korb. Abhaken.', 'Auf den Listennamen tippen. Wieder oben weitermachen.'],

  },

  {

    name: 'Der erste Abend', headline: 'Zwanzig Umzugskartons.', punchline: 'Ein guter Abend.',
    icon: 'i-lucide-key-round',
    scene: { asset: 'moving', title: 'Schlüssel da. Hunger auch.', note: 'Euer erster Abend.', detail: 'Drei Basics zwischen zwanzig Kartons.', alt: 'Zwei Frauen teilen Brot und Hummus in ihrer neuen Wohnung.' },

    intro: 'Der Herd ist noch nicht angeschlossen. Hunger habt ihr trotzdem. Du legst eine Liste für den ersten Abend an: Wasser, Brötchen und Hummus. Mira bringt alles mit. Heute bleibt die Küche kalt.',

    path: '/im-alltag/umzug-erster-abend', link: 'Den ersten Abend retten',

    lists: ['Neue Wohnung', 'Küche einräumen', 'Für morgen'], secret: false,

    created: 'Erster Abend', voice: 'Für heute: Wasser, Brötchen und Hummus.', items: ['Wasser', 'Brötchen', 'Hummus'],

    recipe: 'Pizzabrötchen zum Einweihen', image: '/images/recipes/pizzabroetchen.webp', recipeNote: 'Für später, wenn die Küche steht.',

    companion: 'Mira', update: 'Mira übernimmt den Einkauf.', outcome: 'Ein Abendbrot, das keinen Herd braucht.',

    moments: ['Zwischen Kartons fehlt noch das Abendessen.', 'Eine neue Liste für den ersten Abend anlegen.', 'Ein Name, den ihr gleich wiederfindet.', 'Wasser und Brötchen kommen dazu.', 'Noch Hummus. Für heute reicht das.', 'Drei Einträge. Eure neue Liste ist bereit.'],

  },

  {

    name: 'Eine kleine Überraschung', headline: 'Pssst. Sam ahnt nichts.', punchline: 'Deine Liste schon.',
    icon: 'i-lucide-gift',
    scene: { asset: 'surprise', title: 'Das bleibt unter uns.', note: 'Für Sams Geburtstag.', detail: 'Geschenkideen hinter einem Schloss.', alt: 'Ein kleines Geschenk mit weißer Schleife und Fliederblüten.' },

    intro: 'Sam erzählt von einer Band, die bald in der Stadt spielt. Du merkst dir Konzertkarten auf deiner geheimen Ideenliste. Vor dem Geburtstag schaust du nach und hakst das Geschenk ab. Die Kuchenzutaten stehen auf einer anderen Liste.',

    path: '/funktionen/geheime-listen', link: 'Geheime Listen kennenlernen',

    lists: ['Ideen für Samstag', 'Kuchen für Sam', 'Für die Woche'], secret: true,

    created: 'Kuchen einkaufen', voice: 'Für den Kuchen: Mehl, Kakao und Haferdrink.', items: ['Mehl', 'Kakao', 'Haferdrink'],

    recipe: 'Sams Geburtstagskuchen', image: '/images/recipes/marmorkuchen.webp', recipeNote: 'Selbst gebacken schlägt Last-minute.',

    companion: '', update: 'Deine Ideen bleiben hinter dem Schloss.', outcome: 'Kuchenzutaten notiert. Überraschung bleibt.',

    moments: ['Die Liste mit dem Schloss bleibt unauffällig.', 'Die geheime Ideenliste öffnen.', 'Android bittet um eine Entsperrung.', 'Bestätigt. Jetzt werden deine Ideen sichtbar.', 'Konzertkarten sind besorgt. Abhaken.', 'Zurück zur Übersicht. Die Inhalte bleiben verborgen.'],

  },

  {

    name: 'Ein Rezept bleibt', headline: 'Omas Zettel hat Flecken.', punchline: 'Dein Rezept hat Zukunft.',
    icon: 'i-lucide-cake-slice',
    scene: { asset: 'baking', title: 'Schmeckt nach Sonntag.', note: 'Omas Marmorkuchen.', detail: 'Ein Familienrezept. Dein Kochmoment.', alt: 'Ein Stück Marmorkuchen auf einem weißen Teller neben einer Kaffeetasse.' },

    intro: 'Auf Omas Zettel fehlt die Backzeit. Ihr habt sie zusammen ergänzt und das Rezept gespeichert. Am Sonntag backst du es nach, hakst die Schritte ab und bekommst beim ersten Fertigkochen den Rezept-Badge.',

    path: '/funktionen/rezept-badges', link: 'Deine Kochmomente sammeln',

    lists: ['Sonntag wird gebacken', 'Ist schon im Vorrat', 'Für die Woche'], secret: false,

    created: 'Sonntag wird gebacken', voice: 'Für Omas Marmorkuchen fehlen noch Mehl, Haferdrink und Kakao.', items: ['Mehl', 'Haferdrink', 'Kakao'],

    recipe: 'Omas Marmorkuchen', image: '/images/recipes/marmorkuchen.webp', recipeNote: 'Ein Familienrezept. Jetzt wiederfindbar.',

    companion: '', update: 'Omas Rezept ist schon gespeichert.', outcome: 'Das Familienrezept wurde wieder gebacken.',

    moments: ['Omas Marmorkuchen gehört zum Sonntag.', 'Das passende Rezept in deiner Sammlung öffnen.', 'Der Teig ist in der Form. Schritt abhaken.', 'Nach dem Backen: Auch der letzte Schritt ist fertig.', 'Zum ersten Mal fertig: Dein Rezept bekommt einen Badge.', 'Ein Familienrezept. Jetzt mit deinem Kochmoment.'],

  },

] as const

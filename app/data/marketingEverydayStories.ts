import type { MarketingStory } from './marketingStories'

export type EverydaySceneKey = 'ferienwohnung-einkauf' | 'raclette-einkauf' | 'umzug-erster-abend'

export const everydayExpansionStories: MarketingStory[] = [
  {
    path: '/im-alltag/ferienwohnung-einkauf', animation: 'ferienwohnung-einkauf', animationStep: 1, kind: 'Alltagsbeispiel', scene: 'everyday',
    seoTitle: 'Einkaufsliste für die Ferienwohnung: Anreise & Frühstück',
    title: 'Ankommen. Auspacken. Frühstück ist schon geklärt.',
    intro: 'Noor und Lina sind schon in der Ferienwohnung. Alex kommt später. Auf ihrer gemeinsamen Einkaufsliste sammeln sie, was für den ersten Abend und das Frühstück noch fehlt.',
    coverAlt: 'Zwei Frauen kommen in einer Ferienwohnung an: Eine stellt eine kleine Frühstückstasche auf den Tisch, die andere hält einen blauen Kaffeebecher.',
    steps: [
      { title: 'Erst nachsehen, was euch erwartet', text: 'Vor der Anreise schaut ihr in die Angaben der Unterkunft: Gibt es eine Kaffeemaschine, und welche? Sind Geschirrtücher und Spülmittel vorhanden? Fragt Unklares bei der Gastgeberin nach. Auf eure Liste „Ankommen & Frühstück“ kommen anschließend nur die Dinge, die ihr selbst besorgen möchtet. Eine vorhandene Kaffeepackung braucht keinen zweiten Einkauf.' },
      { title: 'Ein Abendessen und ein Frühstück reichen fürs Erste', text: 'Für den Anreiseabend wählen Noor und Lina Pasta mit Tomatensoße. Für morgens planen sie Brot, Aufstrich, Obst und Kaffee. Das ist überschaubar, auch wenn die Fahrt länger dauert. Alex wird über die Mitgliederverwaltung eingeladen und nimmt die Einladung mit dem passenden Konto an. Danach ergänzt Alex „Haferdrink ungesüßt, 1 l“. Vor dem Losfahren prüft ihr die Öffnungszeiten des Ladens am Urlaubsort.' },
      { title: 'Eine kauft ein, alle wissen Bescheid', text: 'Lina übernimmt den Einkauf. Noor schaut vor Ort noch einmal in den Küchenschrank. Salz ist da, also entfernt sie es nach Absprache von der Einkaufsliste. Lina hakt gekaufte Dinge ab. Mit Anmeldung und Internet sehen die anderen den abgeglichenen Stand. Bei fehlendem Empfang bleiben Änderungen zunächst auf dem jeweiligen Gerät; dann stimmt ihr euch kurz ab, bevor eine zweite Person dasselbe besorgt.' },
      { title: 'Die Liste wächst mit eurem Aufenthalt', text: 'Am nächsten Morgen fällt auf, dass der Kaffee für die weiteren Tage nicht reicht. Ihr ergänzt ihn auf derselben Liste. Für spätere gemeinsame Mahlzeiten könnt ihr fehlende Zutaten aus euren gespeicherten Rezepten übernehmen. Gastgeberinnen können shliste ebenfalls für ihre eigenen Nachkäufe nutzen. Eine gemeinsame Gästeliste lohnt sich nur, wenn alle Beteiligten sie nutzen möchten und wissen, dass ein Eintrag keine bestätigte Serviceanfrage ist.' },
    ],
    tip: 'Beim Einkauf bedeutet abgehakt: besorgt. Dinge, die schon in der Unterkunft stehen, lasst ihr weg. So vermischt ihr nicht „vorhanden“, „gewünscht“ und „erledigt“.',
    miniList: { title: 'Euer Einkauf für die Ankunft', intro: 'Eine kleine Ausgangsliste für Pasta am Abend und Frühstück am nächsten Morgen. Wähle aus, was bei euch fehlt, und passe Mengen und Sorten im Text an.', items: ['Pasta', 'Tomatensoße', 'Brot oder Brötchen', 'Hummus', 'Obst fürs Frühstück', 'Kaffee passend zur Maschine', 'Haferdrink ungesüßt, 1 l', 'Spülmittel, falls nicht vorhanden'], note: 'Mengen nach Personenzahl und Aufenthalt selbst ergänzen. Ausstattung und vorhandene Vorräte vorher mit der Unterkunft klären.' },
    faq: [
      { question: 'Ist das eine vollständige Packliste für die Ferienwohnung?', answer: 'Hier geht es um Essen und kleine Küchenbesorgungen für die Ankunft. Kleidung, Reiseunterlagen und persönliche Dinge plant ihr getrennt. Bettwäsche, Handtücher und Küchenausstattung klärt ihr direkt mit der Unterkunft.' },
      { question: 'Kann die Gastgeberin auch auf die Liste?', answer: 'Ja, wenn sie eingeladen wird, die Einladung annimmt und ein Konto verwendet. Besprecht vorher, wofür die Liste gedacht ist. Für einen einzelnen Wunsch ist eine direkte Nachricht oft einfacher.' },
      { question: 'Geht das auch vom Hotel aus?', answer: 'Eine gemeinsame Einkaufsliste mit deinen Mitreisenden funktioniert auch dort. Hotelpersonal sieht die Liste nur nach Einladung und Annahme. Zimmerwünsche und dringende Anliegen gehören weiterhin an die Rezeption.' },
    ],
    related: ['/anleitungen/einkaufsliste-teilen', '/hilfe/offline-einkaufen'],
  },
  {
    path: '/im-alltag/raclette-einkauf', animation: 'raclette-einkauf', animationStep: 1, kind: 'Alltagsbeispiel', scene: 'everyday',
    seoTitle: 'Raclette gemeinsam organisieren: Minas Abend mit shliste',
    title: 'Alle haben ein Lieblingspfännchen.',
    intro: 'Mina lädt zum Raclette ein. Jo mag Pilze, Kim möchte Mais. Eine gemeinsame Einkaufsliste sammelt die Wünsche, bevor jemand im Supermarkt steht.',
    cover: { src: '/images/illustrations/plant-based-raclette.webp', srcset: '/images/illustrations/plant-based-raclette-small.webp 600w, /images/illustrations/plant-based-raclette-medium.webp 960w, /images/illustrations/plant-based-raclette.webp 1536w', width: 1536, height: 1024 },
    coverAlt: 'Ein Raclettepfännchen mit Champignons, Paprika, Mais und pflanzlichem Belag neben einer blauen Schale mit Kartoffeln. KI-generiert.',
    steps: [
      { title: 'Mit dem anfangen, was ihr wirklich esst', text: 'Mina legt „Raclette am Samstag“ an. Kartoffeln, veganer Raclettebelag und Baguette bilden in ihrem Beispiel den Anfang. Dazu kommen wenige Zutaten, auf die die Runde Lust hat. Bevor sie Mengen einträgt, klärt sie, wie viele Menschen mitessen, was sie mögen und was bereits zu Hause ist. Die Einkaufsliste hält eure Entscheidung fest; sie berechnet keine Portionen.' },
      { title: 'Die Runde ergänzt ihre Wünsche', text: 'Mina lädt Jo und Kim zur Liste ein. Nach dem Annehmen ergänzen beide ihre Wünsche: Jo schreibt „Champignons“, Kim „Mais, 1 kleine Dose“. So entsteht eine konkrete Auswahl, statt dass Mina verschiedene Nachrichten zusammensuchen muss. Sprecht besondere Anforderungen direkt miteinander ab und prüft passende Produkte selbst. shliste erkennt keine Allergene und bewertet keine Verträglichkeit.' },
      { title: 'Vor dem Einkauf einmal gemeinsam kürzen', text: 'Gewürzgurken stehen schon im Kühlschrank. Mina nimmt sie nach Absprache von der Einkaufsliste. Dann prüft sie, ob Zutaten doppelt eingetragen wurden, und ergänzt die vereinbarten Mengen. Jo kauft ein und hakt ab, was im Korb liegt. Kim sieht den neuen Stand nach dem Abgleich mit Internet. Falls mehrere Leute einkaufen, sprecht vorher ab, wer welche Dinge besorgt; die Liste vergibt keine Zuständigkeiten.' },
      { title: 'Auch an das Rundherum denken', text: 'Getränke und Servietten können auf dieselbe Einkaufsliste. Ob Gerät und Pfännchen vorhanden sind, besprecht ihr vorab. Wenn jemand etwas von zu Hause mitbringt, klärt ihr das direkt und nehmt es aus dem gemeinsamen Einkauf. So bleibt die Bedeutung des Häkchens klar. Nach dem Abend bleibt die Liste erhalten; für das nächste Mal könnt ihr eure Auswahl wieder durchsehen und anpassen.' },
    ],
    tip: 'Lieber eine kleine Auswahl, auf die sich eure Runde freut. Mitgebrachte oder bereits vorhandene Zutaten gehören nicht noch einmal auf die Liste der fehlenden Besorgungen.',
    miniList: { title: 'Was kommt in eure Pfännchen?', intro: 'Wähle eure Zutaten aus. Im Textfeld kannst du Mengen, Getränke und konkrete Produktwünsche ergänzen. Die Auswahl ist ein Ausgangspunkt, keine Mengenempfehlung.', items: ['Kartoffeln', 'veganer Raclettebelag', 'Champignons', 'Paprika', 'Mais, 1 kleine Dose', 'Gewürzgurken', 'Baguette', 'Alkoholfreie Getränke', 'Servietten'], note: 'Für vier, sechs oder zehn Personen: Vereinbart die Mengen passend zu euren Gästen. Diese Vorlage enthält bewusst keine automatische Portionsrechnung.' },
    faq: [
      { question: 'Was gehört auf eine Raclette-Einkaufsliste?', answer: 'In unserem Beispiel stehen Kartoffeln, veganer Raclettebelag, ausgewähltes Gemüse, Baguette und Getränke darauf. Entscheidend sind eure Gäste und deren Wünsche. Bereits vorhandene Zutaten streicht ihr vor dem Einkauf aus der Auswahl.' },
      { question: 'Kann ich damit Raclette für zehn Personen planen?', answer: 'Du kannst die Besorgungen für zehn Personen gemeinsam sammeln. Die Mengen legt ihr selbst fest. Die App berechnet weder Portionsgrößen noch den Bedarf aus der Zahl der Gäste.' },
      { question: 'Sehe ich, wer was mitbringt?', answer: 'Die gemeinsame Liste zeigt Einträge und ihren Erledigt-Stand. Sie ist keine automatische Mitbring-Verteilung. Vereinbart Beiträge direkt miteinander und vermeidet, dass mitgebrachte Dinge zusätzlich eingekauft werden.' },
    ],
    related: ['/im-alltag/gaeste-zum-essen', '/anleitungen/einkaufsliste-teilen'],
  },
  {
    path: '/im-alltag/umzug-erster-abend', animation: 'umzug-erster-abend', animationStep: 1, kind: 'Alltagsbeispiel', scene: 'everyday',
    seoTitle: 'Einkauf nach dem Umzug: eine Liste für den ersten Abend',
    title: 'Die Kartons können warten. Der Kaffee nicht.',
    intro: 'Lea und Aylin sitzen zwischen Umzugskartons. Für heute brauchen sie etwas zu essen, Seife und einen Plan fürs Frühstück. Die großen Projekte kommen später.',
    coverAlt: 'Zwei Frauen mit Kaffeebechern machen neben einem einzelnen Umzugskarton eine Pause in ihrer neuen Wohnung. Eine trägt ein beerenfarbenes Kopftuch.',
    steps: [
      { title: 'Nur die ersten 24 Stunden planen', text: 'Lea legt „Der erste Abend“ an. Darauf stehen Besorgungen, die heute wirklich helfen: etwas Einfaches zu essen, Frühstück für morgen, Seife, Toilettenpapier und Müllbeutel. Möbelkauf und Renovierung bleiben für später. Diese kleine Liste soll einen müden Abend leichter machen, ohne den ganzen Umzug organisieren zu müssen.' },
      { title: 'Kurz in die Tasche schauen, dann ergänzen', text: 'Aylin hat Kaffee und zwei Becher eingepackt. Die beiden prüfen gemeinsam, was griffbereit ist. Kaffee kommt deshalb nicht auf den Einkauf. Nach der Einladung und dem Annehmen ergänzt Aylin „Seife, 1 Spender“. Bei Müllbeuteln schreibt sie die passende Größe dazu. Genaue Bezeichnungen helfen Lea, im Laden die richtigen Dinge zu finden.' },
      { title: 'Eine packt aus, die andere kauft ein', text: 'Lea geht zum Supermarkt, während Aylin die Küche zugänglich macht. Lea hakt Seife und Brot ab, sobald sie im Korb liegen. Aylin sieht den Stand nach dem Abgleich mit Verbindung. Falls in der neuen Wohnung das WLAN fehlt, kann ein verfügbares Mobilfunknetz den Abgleich ermöglichen. Ohne Verbindung bleiben Änderungen zunächst lokal.' },
      { title: 'Morgen bekommt eine eigene Liste', text: 'Beim Auspacken fallen euch weitere Dinge auf: ein Geschirrtuch, Kleiderbügel oder eine Lampe. Dafür legt ihr später eine zweite Liste „Für die Wohnung“ an. Der Einkauf für den ersten Abend bleibt damit klein. Termine, Ummeldungen, Verträge und die Wohnungsübergabe organisiert ihr gesondert. Ein abgehakter Einkaufsartikel ersetzt dort keine verlässliche Planung.' },
    ],
    tip: 'Packt Dinge, die ihr schon besitzt und sofort braucht, in eine gut erreichbare Tasche. Die Einkaufsliste ist nur für das, was noch fehlt.',
    miniList: { title: 'Damit der erste Abend leichter wird', intro: 'Wähle die fehlenden Dinge aus. Streiche, was schon in der Ankunftstasche liegt, und ergänze im Text eure Mengen und Wünsche.', items: ['Brot fürs Abendessen und Frühstück', 'Hummus', 'Obst', 'Kaffee, falls noch nicht eingepackt', 'Haferdrink', 'Seife', 'Toilettenpapier', 'Müllbeutel in passender Größe', 'Spülmittel'], note: 'Eine Einkaufshilfe für die ersten Stunden. Keine vollständige Umzugscheckliste für Termine, Verträge oder Behördengänge.' },
    faq: [
      { question: 'Was sollte nach dem Umzug zuerst auf die Einkaufsliste?', answer: 'Überlegt, was euch bis morgen fehlt: Essen, Getränke und die wichtigsten Dinge für Bad und Küche. Schaut zuerst nach, was schon eingepackt und griffbereit ist. Unsere Auswahl lässt sich dafür direkt kürzen und ergänzen.' },
      { question: 'Kann jemand aus dem Freundeskreis den Einkauf übernehmen?', answer: 'Ja. Lade die Person zur Liste ein. Mit angenommenem Zugang, Anmeldung und Internet könnt ihr denselben Einkauf sehen und ergänzen. Für eine einmalige Besorgung kannst du die hier angepasste Liste auch als Text kopieren.' },
      { question: 'Ist shliste ein Umzugsplaner?', answer: 'shliste hilft euch bei konkreten Listen und gemeinsamen Besorgungen. Fristen, Termine, Verträge und die Organisation des Umzugsteams sind ein anderer Aufgabenbereich.' },
    ],
    related: ['/hilfe/offline-einkaufen', '/im-alltag/wg-einkauf'],
  },
]

import type { ArticleSceneKey } from './marketingArticleScenes'
import { everydayExpansionStories } from './marketingEverydayStories'

export interface MarketingStory { path: string, animation: ArticleSceneKey, animationStep: number, kind: string, coverAlt: string, cover?: { src: string, srcset?: string, width: number, height: number }, title: string, seoTitle?: string, intro: string, scene: string, steps: { title: string, text: string }[], tip: string, faq: { question: string, answer: string }[], related: string[], miniList?: { title: string, intro: string, items: string[], note: string } }

export const marketingStories: MarketingStory[] = [
  ...everydayExpansionStories,
  {
    path: '/im-alltag/gaeste-zum-essen',
    animation: 'gaeste-zum-essen',
    seoTitle: 'Einkauf für Gäste planen: Zutaten gemeinsam besorgen',
    animationStep: 1,
    coverAlt: 'Eine Frau stellt eine Lasagne auf den Tisch und lacht mit ihrer Freundin. Eine kleine Salatschüssel ergänzt die reduzierte Szene.',
    kind: 'Alltagsbeispiel',
    title: 'Freitag kommen Freunde. Der Einkauf steht schon.',
    intro: 'Robin plant Lasagne und Salat. Sam geht einkaufen. Auf ihrer gemeinsamen Liste steht, was für das Essen noch fehlt.',
    scene: 'recipe',
    steps: [
      {
        title: 'Erst das Essen, dann der Einkauf',
        text: 'Öffne dein gespeichertes Lasagnerezept. Zutaten und Zubereitung bleiben zusammen im Rezeptbuch. Für den Abend legst du eine Liste „Freitag: Freunde zum Essen“ an. Getränke und andere Besorgungen passen dort ebenfalls hinein.',
      },
      {
        title: 'Öl ist schon da',
        text: 'Wähle beim Übertragen nur die Zutaten aus, die fehlen. In unserem Beispiel ist Olivenöl im Schrank: Es bleibt abgewählt. Schau vorher kurz in die Küche, denn shliste kennt deinen Vorrat nicht.',
      },
      {
        title: 'Rucola kommt noch dazu',
        text: 'Lade Sam zur Liste ein. Während Sam einkauft, ergänzt Robin Rucola. Mit Anmeldung und Internet wird die Änderung abgeglichen. Sam hakt ab, was im Korb liegt; Robin kann den aktualisierten Stand sehen.',
      },
      {
        title: 'Zurück zum Rezept',
        text: 'Zu Hause öffnest du wieder das Rezept und hakst die erledigten Kochschritte ab. Die Einkaufsliste sammelt eure Besorgungen; die Anleitung bleibt beim Gericht.',
      },
    ],
    tip: 'Prüft die Rezeptmengen für eure Gäste vor dem Übertragen. Die Auswahl fehlender Zutaten ersetzt keine Portionsberechnung.',
    faq: [
      {
        question: 'Ist das eine echte Kundengeschichte?',
        answer: 'Nein. Robin und Sam sind ein durchgängiges, alltagsnahes Beispiel. Die beschriebenen Funktionen gibt es in shliste; die Animation stellt den Ablauf vereinfacht dar.',
      },
      {
        question: 'Was passiert ohne Empfang?',
        answer: 'Sam kann lokal gespeicherte Einträge abhaken. Robin sieht die Änderungen erst wieder nach dem Abgleich mit Verbindung.',
      },
    ],
    related: [
      '/anleitungen/zutaten-auf-einkaufsliste',
      '/anleitungen/einkaufsliste-teilen',
    ],
  },
  {
    path: '/im-alltag/wg-einkauf',
    animation: 'wg-einkauf',
    seoTitle: 'WG-Einkaufsliste: gemeinsam ergänzen und einkaufen',
    animationStep: 2,
    coverAlt: 'Zwei Mitbewohnerinnen, eine mit Kopftuch und eine mit kurzem Haar, packen Kaffee und Haferdrink aus einer gemeinsamen Einkaufstasche.',
    kind: 'Alltagsbeispiel',
    title: 'Drei Menschen. Eine WG-Liste.',
    intro: 'Lina findet die Kaffeedose leer, Noor steht vor dem letzten Tropfen Spülmittel. Jules geht später einkaufen. Auf der WG-Liste kommt zusammen, was alle brauchen.',
    scene: 'shared',
    steps: [
      {
        title: 'Gemeinsame Basics bekommen einen Platz',
        text: 'Lina, Noor und Jules legen eine Liste „WG-Basics“ an. Kaffee, Haferdrink, Müllbeutel und Spülmittel sind ein guter Anfang. Persönliche Besorgungen können in einer eigenen Liste bleiben.',
      },
      {
        title: 'Einladen statt Listenfotos schicken',
        text: 'Öffne die Mitgliederverwaltung der Liste und lade die anderen über ihre E-Mail-Adressen ein. Mit angenommener Einladung, Anmeldung und Verbindung könnt ihr denselben Einkauf ergänzen.',
      },
      {
        title: 'Schreib so, dass niemand raten muss',
        text: '„Müllbeutel 35 l“ ist hilfreicher als „Müllbeutel“. Bei Haferdrink ergänzt ihr „ungesüßt“ und die Menge. Diese kleinen Angaben ersparen Rückfragen am Regal.',
      },
      {
        title: 'Im Korb? Abhaken.',
        text: 'Wer einkauft, hakt die erledigten Einträge ab. Ergänzungen bleiben möglich. Wenn zwei Personen gleichzeitig ohne Netz unterwegs sind, stimmt euch kurz ab: Ein sofort gemeinsamer Stand braucht Internet.',
      },
    ],
    tip: 'Eine gemeinsame Liste verteilt keine Kosten. Sprecht deshalb untereinander ab, wer was bezahlt.',
    faq: [
      {
        question: 'Braucht jede Person ein Konto?',
        answer: 'Für die gemeinsame Nutzung ja. Eine persönliche lokale Liste kannst du zuerst ohne Anmeldung ausprobieren.',
      },
      {
        question: 'Kann ich auch allein anfangen?',
        answer: 'Ja. Lege deine Liste lokal an und nimm die gemeinsame Nutzung später dazu.',
      },
    ],
    related: [
      '/anleitungen/einkaufsliste-teilen',
      '/hilfe/offline-einkaufen',
    ],
  },
  {
    path: '/anleitungen/zutaten-auf-einkaufsliste',
    animation: 'zutaten-auf-einkaufsliste',
    seoTitle: 'Rezeptzutaten auf die Einkaufsliste übernehmen',
    animationStep: 1,
    coverAlt: 'Eine Frau legt eine Tomate zu den Nudelplatten in den Einkaufskorb. Die bereits vorhandene Ölflasche steht daneben.',
    kind: 'Anleitung',
    title: 'Aus dem Rezept direkt in den Einkauf.',
    intro: 'Du möchtest Lasagne kochen. Öl ist da, Tomaten fehlen. Wähle die fehlenden Zutaten aus und übernimm sie in die passende Einkaufsliste.',
    scene: 'recipe',
    steps: [
      {
        title: 'Das Rezept öffnen',
        text: 'Öffne ein gespeichertes Rezept mit Zutaten. Prüfe die Mengen für dein geplantes Essen. Die Übernahme verwendet die vorhandenen Angaben.',
      },
      {
        title: 'Zutaten auswählen',
        text: 'Öffne die Übernahme zur Einkaufsliste. Die Zutaten sind zunächst ausgewählt. Wähle ab, was du schon hast, zum Beispiel Salz und Olivenöl. Die Auswahl zeigt dir, wie viele Zutaten übernommen werden.',
      },
      {
        title: 'Eine Zielliste bestimmen',
        text: 'Wähle eine vorhandene Liste oder lege eine neue an. Für mehrere Gerichte kannst du dieselbe Einkaufsliste nutzen. So stehen auch Getränke und Drogerieartikel beim gleichen Einkauf.',
      },
      {
        title: 'Einmal kurz durchsehen',
        text: 'Prüfe die fertige Liste, besonders wenn du Zutaten aus mehreren Rezepten hinzugefügt hast. Schau besonders nach doppelten Einträgen und passe die Mengen bei Bedarf an.',
      },
    ],
    tip: 'Die App übernimmt deine Auswahl. Sie prüft weder den Kühlschrank noch automatisch, wie viel schon auf einer anderen Liste steht.',
    faq: [
      {
        question: 'Verschwinden die Zutaten aus dem Rezept?',
        answer: 'Nein. Die Zutaten bleiben beim Rezept; die Einkaufsliste erhält die ausgewählten Einträge.',
      },
      {
        question: 'Muss ich eine neue Liste anlegen?',
        answer: 'Nein. Du kannst auch eine vorhandene Liste ergänzen.',
      },
    ],
    related: [
      '/im-alltag/gaeste-zum-essen',
      '/anleitungen/rezept-aus-foto',
    ],
  },
  {
    path: '/anleitungen/rezept-aus-foto',
    cover: { src: '/images/illustrations/rezept-aus-foto-v2.webp', srcset: '/images/illustrations/rezept-aus-foto-v2-small.webp 600w, /images/illustrations/rezept-aus-foto-v2-medium.webp 960w, /images/illustrations/rezept-aus-foto-v2.webp 1536w', width: 1536, height: 1024 },
    animation: 'rezept-aus-foto',
    seoTitle: 'Rezept aus einem Foto speichern und prüfen',
    animationStep: 2,
    coverAlt: 'Eine ältere Frau zeigt einer jüngeren Frau eine Rezeptkarte. Sie hält ihr Smartphone bereit, vor ihnen steht ein Stück Marmorkuchen mit pflanzlicher Sahne und Früchten.',
    kind: 'Anleitung',
    title: 'Vom Rezeptfoto zum Wiederkochen.',
    intro: 'Omas Marmorkuchen steht noch auf einem Zettel. Übernimm die Angaben mit KI in dein Rezeptbuch und kontrolliere Zutaten und Schritte direkt am Original.',
    scene: 'photo',
    steps: [
      {
        title: 'Eine gut lesbare Aufnahme auswählen',
        text: 'Fotografiere das gesamte Rezept möglichst gerade und bei gutem Licht. Zutaten am Rand und die letzte Zeile der Anleitung dürfen nicht abgeschnitten sein. Nutze ein eigenes Rezeptblatt oder Material, das du verwenden darfst.',
      },
      {
        title: 'Die Foto-Erstellung öffnen',
        text: 'Öffne den Rezeptbereich und wähle die Erstellung per Foto. Die KI befindet sich noch in einer geschlossenen Testphase. Für die Nutzung brauchst du ein freigeschaltetes Konto und Internet. Wähle die Aufnahme aus und starte die Analyse.',
      },
      {
        title: 'Original und Ergebnis vergleichen',
        text: 'Öffne das erstellte Rezept. Stimmen Name, Zutaten, Mengen und Reihenfolge? Achte besonders auf Einheiten wie g und ml sowie auf schlecht lesbare Zahlen. Das Rezept kann dann schon gespeichert sein. Korrigiere falsche Angaben direkt im Rezept.',
      },
      {
        title: 'Deine Sammlung benutzbar machen',
        text: 'Korrigiere unklare Angaben am Original. Danach kannst du die benötigten Zutaten auf eine Einkaufsliste übertragen und beim Kochen die einzelnen Schritte abhaken.',
      },
    ],
    tip: 'Ein Foto ohne vollständige Anleitung wird durch KI nicht automatisch zu einem verlässlichen Rezept. Ergänze fehlende Angaben aus deiner Quelle.',
    faq: [
      {
        question: 'Erkennt shliste jede Handschrift?',
        answer: 'Das ist nicht garantiert. Gut lesbare Bilder helfen; prüfe das Ergebnis immer am Original.',
      },
      {
        question: 'Ist das Bild in der Animation ein getesteter Import?',
        answer: 'Nein. Es ist ein beschriftetes Beispiel für den Ablauf, kein aufgezeichneter KI-Abruf.',
      },
    ],
    related: [
      '/anleitungen/rezept-aus-link',
      '/anleitungen/zutaten-auf-einkaufsliste',
    ],
  },
  {
    path: '/anleitungen/rezept-aus-link',
    animation: 'rezept-aus-link',
    seoTitle: 'Rezept aus einem Link speichern und wiederfinden',
    animationStep: 2,
    coverAlt: 'Eine Frau im Rollstuhl schaut an einem zugänglichen Tisch ein Rezept auf ihrem Laptop an. Daneben stehen Pizzabrötchen.',
    kind: 'Anleitung',
    title: 'Ein guter Rezeptlink wird ein Lieblingsgericht.',
    intro: 'Die Pizzabrötchen aus dem Chat wären perfekt für den Spieleabend. Übernimm das Rezept, prüfe die Angaben und behalte den Link zum Original dabei.',
    scene: 'photo',
    steps: [
      {
        title: 'Die eigentliche Rezeptseite öffnen',
        text: 'Verwende die Adresse des einzelnen Rezepts statt einer Suchergebnis- oder Übersichtsseite. Prüfe, ob Zutaten und Zubereitung auf der Seite vollständig lesbar sind.',
      },
      {
        title: 'Im Rezeptbereich per Link erstellen',
        text: 'Wähle die Rezept-Erstellung per Link und füge die Adresse ein. Mit einem freigeschalteten Testkonto und Internet kann die KI den Inhalt auswerten. Manche Seiten lassen sich nicht abrufen; ein erfolgreicher Import von jeder Website ist nicht garantiert.',
      },
      {
        title: 'Die Übernahme kontrollieren',
        text: 'Vergleiche das erstellte Rezept mit der Fundstelle. Stimmen Mengen, Schritte und Angaben zur Zubereitung? Die Quellenadresse hilft dir, später zum Original zurückzukehren.',
      },
      {
        title: 'Bei Problemen einen anderen Weg nutzen',
        text: 'Wenn der Abruf scheitert, kannst du dein Rezept manuell anlegen oder geeignetes eigenes Bildmaterial verwenden. Einen Link lediglich als Listeneintrag zu speichern ist ein anderer Ablauf als das Erstellen eines Rezepts.',
      },
    ],
    tip: 'Übernimm nur Inhalte, die du verwenden darfst. Eine private Rezeptsammlung macht fremde Rezepte nicht zu eigenen veröffentlichten Inhalten.',
    faq: [
      {
        question: 'Kann ich den Link einfach behalten?',
        answer: 'Ja. In einer Liste kannst du eine Fundstelle als Link speichern, ohne sie von KI auslesen zu lassen.',
      },
      {
        question: 'Braucht der Import Internet?',
        answer: 'Ja. Der KI-Abruf im Web benötigt Verbindung und Anmeldung.',
      },
    ],
    related: [
      '/anleitungen/rezept-aus-foto',
      '/anleitungen/zutaten-auf-einkaufsliste',
    ],
  },
  {
    path: '/anleitungen/einkaufsliste-teilen',
    animation: 'einkaufsliste-teilen',
    seoTitle: 'Einkaufsliste teilen: einladen und gemeinsam einkaufen',
    animationStep: 2,
    coverAlt: 'Zwei Frauen reichen einander eine Einkaufstasche. Ihre Smartphones liegen auf dem Tisch.',
    kind: 'Anleitung',
    title: 'Eine Einladung. Ein gemeinsamer Einkauf.',
    intro: 'Du ergänzst zu Hause, die andere Person hakt im Laden ab. Richtet dafür eine gemeinsame Liste ein.',
    scene: 'shared',
    steps: [
      {
        title: 'Die richtige Liste auswählen',
        text: 'Melde dich an und öffne die Liste, die ihr tatsächlich gemeinsam nutzen möchtet. Eine persönliche Liste muss nicht automatisch zum Haushaltseinkauf werden.',
      },
      {
        title: 'Eine Person einladen',
        text: 'Öffne die Mitgliederverwaltung und trage die E-Mail-Adresse ein. Kontrolliere die Adresse vor dem Einladen. Du kannst auch jemanden einladen, der noch kein Konto hat.',
      },
      {
        title: 'Die Einladung annehmen',
        text: 'Die eingeladene Person meldet sich mit dem passenden Konto an und nimmt die Einladung an. Erst nach dem Annehmen könnt ihr die Liste gemeinsam nutzen.',
      },
      {
        title: 'Den gemeinsamen Stand ausprobieren',
        text: 'Ergänze einen eindeutigen Eintrag, etwa „Haferdrink ungesüßt, 2 Packungen“. Prüft mit Verbindung, ob er auf beiden Geräten erscheint. Beim Einkaufen hakt ihr ab, was erledigt ist.',
      },
    ],
    tip: 'Geteilte Listen und eine als Link weitergegebene Kopie sind nicht dasselbe. Für laufende Zusammenarbeit verwendet ihr die Mitglieder der gemeinsamen Liste.',
    faq: [
      {
        question: 'Warum sehe ich eine Änderung noch nicht?',
        answer: 'Prüft zuerst Verbindung, Konto und angenommene Einladung. Ohne Netz können lokale Änderungen noch nicht auf dem anderen Gerät erscheinen.',
      },
      {
        question: 'Kann ich geheime Listen teilen?',
        answer: 'Geheime Listen sind für den persönlichen Bereich vorgesehen. Verwende eine normale Liste für den gemeinsamen Einkauf.',
      },
    ],
    related: [
      '/im-alltag/wg-einkauf',
      '/hilfe/offline-einkaufen',
    ],
  },
  {
    path: '/anleitungen/einkaufsliste-diktieren',
    animation: 'einkaufsliste-diktieren',
    seoTitle: 'Einkaufsliste diktieren: Artikel und Mengen per Sprache',
    animationStep: 2,
    coverAlt: 'Eine Frau spricht ihre Besorgungen in ein Smartphone. Auf dem angedeuteten Tisch liegen Bananen.',
    kind: 'Anleitung',
    title: 'Sag einfach, was auf die Liste soll.',
    intro: 'Noor schaut in den Kühlschrank und sagt: „Zwei Haferdrinks, sechs Tomaten und eine Flasche Spülmittel.“ Aus dem Satz wird eine Liste, die sie vor dem Einkauf noch einmal prüft.',
    scene: 'voice',
    steps: [
      {
        title: 'Erst kurz nachsehen',
        text: 'Schau in Kühlschrank und Schrank. Nenne Artikel und Menge möglichst eindeutig: „Zwei Packungen Haferdrink ungesüßt, sechs Tomaten und eine Flasche Spülmittel.“',
      },
      {
        title: 'Eine Liste per Sprache erstellen',
        text: 'Wähle in der Listenübersicht die Erstellung per Sprache. Im Web brauchst du Anmeldung, Internet und Mikrofonzugriff. Starte die Aufnahme und sprich deine Liste ein.',
      },
      {
        title: 'Die Aufnahme beenden',
        text: 'Nach dem Beenden wird die Aufnahme analysiert. Warte auf das Ergebnis. Störgeräusche oder undeutliche Mengen können zu falschen Angaben führen.',
      },
      {
        title: 'Das Ergebnis korrigieren',
        text: 'Prüfe die erstellte Liste. Falls „sechs Tomaten“ falsch erkannt wurde, passe den Eintrag an. Ergänze vergessene Dinge anschließend direkt in der Liste.',
      },
    ],
    tip: 'Sprich Mengen zusammen mit dem Artikel. „Zwei Packungen Haferdrink“ lässt weniger offen als „Haferdrink, zwei“.',
    faq: [
      {
        question: 'Funktioniert die KI ohne Netz?',
        answer: 'Die KI-Verarbeitung im Web braucht Internet. Bereits gespeicherte Listen kannst du dagegen offline verwenden.',
      },
      {
        question: 'Kann ich später noch etwas ändern?',
        answer: 'Ja. Die erkannten Einträge lassen sich wie andere Listeneinträge bearbeiten.',
      },
    ],
    related: [
      '/im-alltag/wg-einkauf',
      '/hilfe/offline-einkaufen',
    ],
  },
  {
    path: '/hilfe/offline-einkaufen',
    animation: 'offline-einkaufen',
    seoTitle: 'Einkaufsliste offline nutzen: was ohne Internet geht',
    animationStep: 1,
    coverAlt: 'Eine Frau mit Vitiligo schaut beim Einkaufen auf ihr Smartphone und hält einen Korb mit Brot und Tomaten.',
    kind: 'Hilfe',
    title: 'Kein Empfang. Dein Einkauf geht weiter.',
    intro: 'Lea hat im Supermarkt keinen Empfang. Sie kann die gespeicherte Liste trotzdem abhaken. Zu Hause sieht Kim den neuen Stand erst nach dem nächsten Abgleich.',
    scene: 'shared',
    steps: [
      {
        title: 'Vor dem Einkauf einmal öffnen',
        text: 'Öffne die App und die Liste mit Verbindung. So kannst du prüfen, ob die benötigten Inhalte lokal vorliegen und der gemeinsame Stand aktuell ist. Ein erster Besuch der Web-App braucht Netz.',
      },
      {
        title: 'Unterwegs lokal abhaken',
        text: 'Ohne Empfang kannst du gespeicherte Listen ansehen und bearbeiten. Ein Häkchen verändert zunächst den Stand auf deinem Gerät.',
      },
      {
        title: 'Wenn ihr beide keinen Empfang habt',
        text: 'Die anderen sehen deine lokalen Änderungen erst nach einem Abgleich. Wenn ihr zu zweit in verschiedenen Funklöchern einkauft, sprecht ab, wer welche Dinge besorgt.',
      },
      {
        title: 'Mit Verbindung wieder abgleichen',
        text: 'Sobald wieder Internet verfügbar ist, kann die angemeldete App Änderungen synchronisieren. Prüfe den Sync-Status, bevor du davon ausgehst, dass alle Geräte denselben Stand haben.',
      },
    ],
    tip: 'Offline-Nutzung ersetzt keine Sicherung. Ohne Konto bleiben deine Inhalte gerätebezogen; das Löschen von Browserdaten kann lokale Inhalte entfernen.',
    faq: [
      {
        question: 'Kann ich offline ein Foto analysieren lassen?',
        answer: 'Im Web nicht. KI-Abrufe benötigen Internet und ein freigeschaltetes Testkonto. Für den späteren Start gibt es eine Warteliste.',
      },
      {
        question: 'Ist offline auch ohne Konto möglich?',
        answer: 'Bereits lokal gespeicherte Listen sind ohne Konto nutzbar. Ohne Anmeldung gibt es aber keinen Geräteabgleich.',
      },
    ],
    related: [
      '/anleitungen/einkaufsliste-teilen',
      '/im-alltag/gaeste-zum-essen',
    ],
  },
]

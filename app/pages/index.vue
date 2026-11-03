<script setup lang="ts">
// Öffentliche Startseite. Wird per routeRules gerendert und gecacht (SEO, First Paint),
// während der App-Bereich unter /app rein client-seitig läuft.
useSeoMeta({
  title: 'shliste: Einkaufslisten und Rezepte',
  description: 'Listen und Rezepte in shliste. Gemeinsam einkaufen, Rezepte speichern, mit KI aus Stimme, Foto oder Link. Browser und Android jetzt; iPhone über die Web-App, native iOS-App im Aufbau.',
  ogImage: 'https://shliste.app/og-image.png',
})

const { isSignedIn } = useAuth()

if (import.meta.client) {
  watch(isSignedIn, (signedIn) => {
    if (signedIn) void navigateTo('/app/lists', { replace: true })
  }, { immediate: true })
}

const questions = [
  { title: 'Kann ich ohne Konto anfangen?', answer: 'Ja. Listen und Rezepte legst du zunächst lokal an. Für gemeinsame Listen, den Abgleich zwischen Geräten und KI brauchst du Anmeldung und Internet.' },
  { title: 'Was funktioniert ohne Internet?', answer: 'Bereits gespeicherte Listen kannst du offline ansehen und abhaken. Änderungen werden mit anderen Geräten abgeglichen, sobald wieder eine Verbindung besteht.' },
  { title: 'Wie kommen Zutaten auf meine Einkaufsliste?', answer: 'Öffne die Zutatenübernahme im Rezept, wähle aus, was fehlt, und bestimme eine vorhandene oder neue Einkaufsliste. Die Zutaten bleiben auch beim Rezept erhalten.' },
  { title: 'Wo kann ich shliste nutzen?', answer: 'Im Browser und auf Android über Google Play. Auf dem iPhone verwendest du die Web-App. Die native iOS-App hat bereits einen eigenen Multiplattform-Build und ist noch in Entwicklung.' },
]
const guides = [
  { icon: 'i-lucide-camera', title: 'Das Rezept auf Omas Zettel.', text: 'So übernimmst du ein Rezept vom Foto und prüfst die erkannten Angaben.', to: '/anleitungen/rezept-aus-foto' },
  { icon: 'i-lucide-users', title: 'Kaffee leer. WG-Liste voll.', text: 'Gemeinsame Basics planen, ohne jeden Einkauf im Chat zu besprechen.', to: '/im-alltag/wg-einkauf' },
  { icon: 'i-lucide-link', title: 'Ein Link, den du wiederfindest.', text: 'Eine Kochidee behalten und ihre Quelle direkt beim Rezept lassen.', to: '/anleitungen/rezept-aus-link' },
]
useSchemaOrg([
  defineSoftwareApp({
    name: 'shliste',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, Android',
    description: 'Listen und Rezepte in shliste. Gemeinsame Einkaufslisten, Rezeptbuch und KI für Stimme, Foto und Links. Browser und Android verfügbar; iPhone über die Web-App.',
    url: 'https://shliste.app',
    offers: { price: 0, priceCurrency: 'EUR' },
  }),
  defineWebPage({ '@type': 'FAQPage' }),
  ...questions.map(question => defineQuestion({ name: question.title, acceptedAnswer: question.answer })),
])
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="home-story"
    >
      <section
        class="home-hero home-width"
        aria-labelledby="hero-title"
      >
        <div class="hero-copy">
          <p class="home-eyebrow">
            <span /> Für euren ganz normalen Alltag
          </p>
          <h1 id="hero-title">
            <span>Weniger merken.</span><span>Mehr zusammen</span><em>machen.</em>
          </h1>
          <p class="hero-intro">
            Vom ersten „Was fehlt noch?“ bis zum fertigen Abendessen: Listen teilen, Rezepte behalten und den Einkauf gemeinsam erledigen.
          </p>
          <div class="hero-actions">
            <NuxtLink
              to="/app/lists"
              class="home-button"
            >Meine erste Liste <UIcon name="i-lucide-arrow-up-right" /></NuxtLink><a
              href="https://play.google.com/store/apps/details?id=com.shroomlife.shliste"
              target="_blank"
              rel="noopener"
              class="home-text-link"
            >Für Android <UIcon name="i-lucide-arrow-up-right" /></a>
          </div>
          <p class="hero-start-note">
            Ohne Konto im Browser loslegen.
          </p>
          <div class="hero-detail">
            <UIcon name="i-lucide-heart-handshake" /><p>Für euren Wocheneinkauf.<br>Und wenn spontan Freunde kommen.</p>
          </div>
          <a
            href="#gemeinsam"
            class="hero-scroll"
          ><span /> Ein Freitag mit shliste <UIcon name="i-lucide-arrow-down" /></a>
        </div>
        <MarketingHeroDevice />
      </section>

      <div class="home-intro-line home-width">
        <span>Was ihr braucht, steht auf eurer Liste.</span><p>Zu Hause ergänzen. Unterwegs abhaken. Später zusammen kochen.</p>
      </div>

      <section
        id="gemeinsam"
        class="home-chapter home-width"
        aria-labelledby="shared-title"
      >
        <div class="chapter-copy">
          <p class="home-eyebrow">
            01 / Der Einkauf beginnt zu Hause
          </p><h2 id="shared-title">
            „Rucola fehlt<br>auch noch.“
          </h2><p>Sam ist schon auf dem Weg in den Laden. Du schaust in den Kühlschrank und ergänzt Rucola auf eurer gemeinsamen Liste. Der Eintrag kommt nach dem Abgleich auch bei Sam an.</p><p>Was im Korb liegt, wird abgehakt. So bleibt die kleine Ergänzung dort, wo sie gebraucht wird: beim Einkauf.</p><NuxtLink
            to="/anleitungen/einkaufsliste-teilen"
            class="home-text-link"
          >So teilt ihr eine Liste <UIcon name="i-lucide-arrow-right" /></NuxtLink><small>Gemeinsame Listen brauchen Anmeldung und Internet.</small>
        </div>
        <div class="chapter-example">
          <MarketingInlineDemo
            mode="shared"
            embedded
          />
        </div>
      </section>

      <section
        id="vom-rezept-zum-einkauf"
        class="home-chapter home-chapter--reverse home-width"
        aria-labelledby="recipe-title"
      >
        <div class="chapter-copy">
          <p class="home-eyebrow">
            02 / Freitag kommen Freunde
          </p><h2 id="recipe-title">
            Die Idee steht.<br>Der Einkauf auch.
          </h2><p>Lasagne für alle. Im Rezept stehen die Zutaten, in deiner Küche schon das Olivenöl. Wähle nur aus, was noch fehlt, und übernimm es in eure Freitagsliste.</p><p>Die Zubereitung bleibt beim Rezept. Getränke und die Zutaten für den Salat ergänzt du auf derselben Liste. So kann Sam alles in einem Einkauf mitbringen.</p><NuxtLink
            to="/im-alltag/gaeste-zum-essen"
            class="home-text-link"
          >So plant ihr den Einkauf <UIcon name="i-lucide-arrow-right" /></NuxtLink>
        </div>
        <div class="chapter-example">
          <MarketingInlineDemo
            mode="recipe"
            embedded
          />
        </div>
      </section>

      <section
        class="offline-note home-width"
        aria-labelledby="offline-title"
      >
        <div class="offline-symbol">
          <UIcon name="i-lucide-wifi-off" />
        </div><div>
          <p class="home-eyebrow">
            Zwischen zwei Supermarktregalen
          </p><h2 id="offline-title">
            Kein Netz. Die Liste ist trotzdem da.
          </h2><p>Bereits gespeicherte Einträge nachsehen und abhaken geht auch offline. Den neuen Stand sehen die anderen nach dem nächsten Abgleich mit Verbindung.</p>
        </div><NuxtLink
          to="/hilfe/offline-einkaufen"
          class="home-text-link"
        >Was offline geht <UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
      </section>

      <MarketingFoodInterlude
        id="frische-zutaten"
        motif="tomatoes"
      />

      <section
        id="listenuebersicht"
        class="home-chapter home-chapter--reverse home-width"
        aria-labelledby="overview-title"
      >
        <div class="chapter-copy">
          <p class="home-eyebrow">
            Dein Alltag hat mehr als eine Liste
          </p><h2 id="overview-title">
            Freitag, die Woche.<br>Und eine Überraschung.
          </h2><p>Deine Listen stehen nebeneinander. Du siehst, wie viele Einträge noch offen sind und wo jemand etwas ergänzt hat. Sobald du etwas abhakst, zeigt die Karte euren Fortschritt.</p><p>Die WG kauft gemeinsam ein. Deine Geburtstagsideen bekommen eine eigene Liste mit Schloss. So findest du wieder, was zu welchem Anlass gehört.</p><NuxtLink
            to="/funktionen/geheime-listen"
            class="home-text-link"
          >Die Überraschung für dich behalten <UIcon name="i-lucide-arrow-right" /></NuxtLink>
        </div>
        <div class="chapter-example">
          <MarketingFeatureDemo mode="overview" />
        </div>
      </section>

      <section
        id="weniger-tippen"
        class="home-chapter home-width"
        aria-labelledby="voice-title"
      >
        <div class="chapter-copy">
          <p class="home-eyebrow">
            03 / Kurz nachsehen, was fehlt
          </p><h2 id="voice-title">
            Sag einfach,<br>was du brauchst.
          </h2><p>„Zwei Haferdrinks, Bananen und Kaffee.“ Sprich deine Besorgungen ein, solange du noch vor dem Kühlschrank stehst. shliste macht daraus mit KI einzelne Einträge.</p><p>Danach schaust du kurz über Artikel und Mengen. Falls etwas falsch erkannt wurde, korrigierst du den Eintrag vor dem Einkauf.</p><NuxtLink
            to="/anleitungen/einkaufsliste-diktieren"
            class="home-text-link"
          >Eine Liste diktieren <UIcon name="i-lucide-arrow-right" /></NuxtLink><small>Für Sprache, Foto und KI brauchst du Anmeldung und Internet.</small>
        </div>
        <div class="chapter-example">
          <MarketingInlineDemo
            mode="voice"
            embedded
          />
        </div>
      </section>

      <section
        id="rezeptbilder"
        class="home-chapter home-chapter--reverse home-width"
        aria-labelledby="picture-title"
      >
        <div class="chapter-copy">
          <p class="home-eyebrow">
            04 / Das kochen wir wieder
          </p><h2 id="picture-title">
            Die Lasagne<br>kochen wir wieder.
          </h2><p>Du kannst zu deiner Lasagne mit KI ein Bild erstellen lassen. So findest du das Rezept in deiner Sammlung leichter wieder. Zutaten und Kochschritte sind gleich dabei.</p><p>Du kannst Rezepte selbst anlegen oder Angaben aus einem Foto oder Link übernehmen. Prüfe importierte Inhalte am Original. Ein Bild ist ein schönes Extra; dein Rezept funktioniert auch ohne.</p><NuxtLink
            to="/rezepte"
            class="home-text-link"
          >Dein Rezeptbuch entdecken <UIcon name="i-lucide-arrow-right" /></NuxtLink>
        </div>
        <div class="chapter-example">
          <MarketingInlineDemo
            mode="photo"
            embedded
          />
        </div>
      </section>

      <MarketingFoodInterlude
        id="zeit-zum-essen"
        motif="lasagne"
      />

      <section
        id="rezept-badges"
        class="home-chapter home-width"
        aria-labelledby="badge-title"
      >
        <div class="chapter-copy">
          <p class="home-eyebrow">
            Das hast du gekocht
          </p><h2 id="badge-title">
            Letzter Schritt.<br>Kleiner Glücksmoment.
          </h2><p>Die Lasagne ist fertig. Du hakst den letzten Kochschritt ab und shliste feiert mit dir. Beim ersten Mal bekommt das Rezept einen goldenen Badge mit Bild und Datum.</p><p>Beim nächsten Kochen gibt es wieder Konfetti. Deine Auszeichnung findest du in deiner Badge-Sammlung wieder.</p><NuxtLink
            to="/funktionen/rezept-badges"
            class="home-text-link"
          >So verdienst du einen Badge <UIcon name="i-lucide-arrow-right" /></NuxtLink>
        </div>
        <div class="chapter-example">
          <MarketingFeatureDemo mode="badge" />
        </div>
      </section>

      <section
        id="geheime-listen"
        class="home-chapter home-chapter--reverse home-width"
        aria-labelledby="secret-title"
      >
        <div class="chapter-copy">
          <p class="home-eyebrow">
            Für Sams Geburtstag
          </p><h2 id="secret-title">
            Manches darf<br>eine Überraschung bleiben.
          </h2><p>Konzertkarten, Lieblingsschokolade, eine Karte. Als geheime Liste bleiben die Einträge hinter einer zusätzlichen Entsperrung. Auf Android bestätigst du mit Biometrie oder deiner Displaysperre.</p><p>Die Vorschau zeigt den Fingerabdruck-Ablauf auf Android. Im Browser bleiben geheime Listen derzeit gesperrt. Die Entsperrung über dein Gerät ist dort noch in Entwicklung.</p><NuxtLink
            to="/funktionen/geheime-listen"
            class="home-text-link"
          >Geheime Listen kennenlernen <UIcon name="i-lucide-arrow-right" /></NuxtLink><small>Der Listenname bleibt in der Übersicht sichtbar. Die Sperre schützt das Öffnen der Liste auf deinem Gerät.</small>
        </div>
        <div class="chapter-example">
          <MarketingFeatureDemo mode="secret" />
        </div>
      </section>

      <section
        id="alltag"
        class="home-guides home-width"
        aria-labelledby="guides-title"
      >
        <div class="guides-heading">
          <div>
            <p class="home-eyebrow">
              Was steht bei dir an?
            </p><h2 id="guides-title">
              Was möchtest du<br>ausprobieren?
            </h2>
          </div><NuxtLink
            to="/im-alltag"
            class="home-text-link"
          >Alle Beispiele & Anleitungen <UIcon name="i-lucide-arrow-right" /></NuxtLink>
        </div><div class="guide-grid">
          <NuxtLink
            v-for="guide in guides"
            :key="guide.to"
            :to="guide.to"
            class="guide-card"
          ><UIcon :name="guide.icon" /><h3>{{ guide.title }}</h3><p>{{ guide.text }}</p><span>Beispiel entdecken <UIcon name="i-lucide-arrow-up-right" /></span></NuxtLink>
        </div>
      </section>

      <section
        id="plattformen"
        class="home-platforms home-width"
        aria-labelledby="platform-title"
      >
        <div>
          <p class="home-eyebrow">
            Im Browser und auf Android
          </p><h2 id="platform-title">
            Fang da an,<br>wo du gerade bist.
          </h2><p>Im Browser direkt loslegen oder die Android-App nutzen. Auf dem iPhone ist shliste als Web-App dabei; die native iOS-App entsteht bereits im Multiplattform-Build.</p>
        </div><div class="platform-links">
          <NuxtLink to="/app/lists"><UIcon name="i-lucide-globe" /><span><strong>Im Browser starten</strong><small>Ohne Installation · auch auf dem iPhone</small></span><UIcon name="i-lucide-arrow-up-right" /></NuxtLink><a
            href="https://play.google.com/store/apps/details?id=com.shroomlife.shliste"
            target="_blank"
            rel="noopener"
          ><UIcon name="i-lucide-smartphone" /><span><strong>shliste für Android</strong><small>Mit den Farben deines Geräts</small></span><UIcon name="i-lucide-arrow-up-right" /></a>
        </div>
      </section>

      <section
        id="auf-allen-geraeten"
        class="home-devices home-width"
        aria-labelledby="devices-title"
      >
        <div class="devices-copy">
          <p class="home-eyebrow">
            Jeder auf seinem Gerät
          </p><h2 id="devices-title">
            Du am Laptop.<br>Sam schon im Laden.
          </h2><p>Robin ergänzt Rucola im Browser. Sam sieht den Eintrag auf Android und hakt ihn beim Einkaufen ab. Zu Hause sieht Robin sofort, was schon besorgt ist.</p><p>Ihr braucht dafür eine geteilte Liste, Anmeldung und Internet. Daneben zeigen wir euch einen ersten Blick auf unsere native iOS-App: die Listenübersicht aus dem Multiplattform-Build.</p>
        </div><MarketingDevicesDemo />
      </section>

      <section
        class="home-faq home-width"
        aria-labelledby="questions-title"
      >
        <div>
          <p class="home-eyebrow">
            Gut zu wissen
          </p><h2 id="questions-title">
            Einfach anfangen.
          </h2><NuxtLink
            to="/so-funktionierts"
            class="home-text-link"
          >Die ausführliche Tour <UIcon name="i-lucide-arrow-right" /></NuxtLink>
        </div><div>
          <details
            v-for="question in questions"
            :key="question.title"
          >
            <summary>{{ question.title }}<UIcon name="i-lucide-plus" /></summary><p>{{ question.answer }}</p>
          </details>
        </div>
      </section>
      <section class="home-closing home-width">
        <span class="home-eyebrow">Bereit für den nächsten Einkauf?</span><h2>Was fehlt noch<br>für einen guten Abend?</h2><NuxtLink
          to="/app/lists"
          class="home-button"
        >Schreib’s auf deine Liste <UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
      </section>
    </main>
  </MarketingChrome>
</template>

<style scoped>
.home-story{--home-accent:var(--demo-accent);--home-ink:var(--md-on-background);color:var(--home-ink);overflow:clip}.home-width{width:calc(100% - 2 * var(--marketing-gutter));max-width:var(--marketing-content);margin-inline:auto}.home-eyebrow{display:flex;align-items:center;gap:8px;font-size:0.8125rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--home-accent);margin:0 0 20px}.home-eyebrow>span{width:6px;height:6px;border-radius:50%;background:currentColor}.home-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);align-items:center;gap:64px;padding:62px 0 64px}.hero-copy{padding-bottom:12px}.hero-copy h1{font-size:clamp(3rem,5.2vw,4.25rem);font-weight:900;line-height:.99;letter-spacing:-.05em;margin:0}.hero-copy h1>span{display:block;white-space:nowrap}.hero-copy h1 em{font-style:normal;color:var(--home-accent)}.hero-intro{font-size:1.375rem;line-height:1.5;max-width:30rem;margin:26px 0;color:var(--md-on-surface-variant)}.hero-actions{display:flex;align-items:center;gap:26px;flex-wrap:wrap}.home-button{display:inline-flex;align-items:center;justify-content:center;gap:17px;background:var(--home-accent);color:white;border-radius:30px;padding:15px 23px;min-height:52px;font-size:1.125rem;font-weight:700;text-decoration:none;transition:background .2s,transform .2s}.home-button:hover{background:#883066;transform:translateY(-2px)}.home-button .iconify{width:20px;height:20px}.home-text-link{display:inline-flex;align-items:center;gap:10px;min-height:44px;font-size:1.062rem;font-weight:700;color:var(--home-accent);text-decoration:none}.home-text-link:hover{text-decoration:underline;text-underline-offset:5px}.home-text-link .iconify{width:19px;height:19px;flex-shrink:0}.hero-start-note{margin-top:12px;font-size:0.875rem;color:var(--md-on-surface-variant)}.hero-detail{display:flex;align-items:center;gap:13px;margin-top:30px;color:var(--md-on-surface-variant)}.hero-detail>.iconify{width:28px;height:28px;color:var(--home-accent)}.hero-detail p{font-size:1rem;line-height:1.4;margin:0}.hero-scroll{display:inline-flex;align-items:center;gap:10px;font-size:0.875rem;color:var(--md-on-surface-variant);margin-top:34px}.hero-scroll>span{width:28px;height:1px;background:color-mix(in srgb,var(--demo-accent) 31%,transparent)}.hero-scroll .iconify{width:15px;height:15px}.home-intro-line{display:flex;justify-content:space-between;gap:20px;padding:25px 0;border-top:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent);border-bottom:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent)}.home-intro-line>span{font-weight:700;font-size:1.125rem}.home-intro-line>p{font-size:1.062rem;color:var(--md-on-surface-variant);margin:0}.home-chapter{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);align-items:center;gap:64px;padding-block:90px;scroll-margin-top:110px}.home-chapter+.home-chapter{border-top:1px solid color-mix(in srgb,var(--demo-accent) 7%,transparent)}.home-chapter--reverse{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr)}.home-chapter--reverse .chapter-copy{grid-column:2;grid-row:1}.home-chapter--reverse .chapter-example{grid-column:1;grid-row:1}.chapter-copy{max-width:32rem;min-width:0}.chapter-copy h2,.guides-heading h2,.home-platforms h2,.home-faq h2{font-size:clamp(2.3rem,3.8vw,3.55rem);font-weight:800;letter-spacing:-.035em;line-height:1.04;margin:0 0 23px}.chapter-copy>p:not(.home-eyebrow){font-size:1.188rem;line-height:1.65;color:var(--md-on-surface-variant);margin:0 0 17px}.chapter-copy .home-text-link{margin-top:5px}.chapter-copy>small{display:block;font-size:0.8125rem;line-height:1.5;color:var(--md-on-surface-variant);margin-top:12px;max-width:320px}.chapter-example{min-width:0}.offline-note{display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:25px;padding:30px 36px;background:#eff3e8;border-radius:24px;color:#30412b}.offline-symbol{display:grid;place-items:center;width:58px;height:58px;background:#e0e8d5;border-radius:50%}.offline-symbol .iconify{width:27px;height:27px}.offline-note .home-eyebrow{font-size:0.6875rem;color:#536b45;margin-bottom:7px}.offline-note h2{font-size:1.562rem;font-weight:800;line-height:1.2;margin:0}.offline-note p:not(.home-eyebrow){font-size:1.062rem;line-height:1.5;margin:8px 0 0;max-width:590px;color:#53604b}.offline-note .home-text-link{color:#486239;font-size:1rem}.home-guides{padding:50px 0 80px;border-top:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent)}.guides-heading{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:30px}.guides-heading h2{margin-bottom:0;font-size:2.5rem}.guide-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.guide-card{display:block;padding:27px;border-radius:20px;border:1px solid color-mix(in srgb,var(--demo-accent) 15%,transparent);background:var(--md-surface);transition:translate .25s}.guide-card:hover{translate:0 -4px}.guide-card>.iconify{width:25px;height:25px;color:var(--home-accent)}.guide-card h3{font-size:1.562rem;font-weight:800;line-height:1.15;margin:28px 0 12px}.guide-card p{font-size:1.062rem;line-height:1.5;color:var(--md-on-surface-variant);margin:0 0 22px}.guide-card>span{display:flex;align-items:center;gap:8px;font-size:0.9375rem;font-weight:700;color:var(--home-accent)}.guide-card>span .iconify{width:17px;height:17px}.home-platforms{display:grid;grid-template-columns:1fr 1fr;gap:80px;padding-block:55px 80px;scroll-margin-top:110px}.home-platforms p:not(.home-eyebrow){font-size:1.188rem;line-height:1.6;color:var(--md-on-surface-variant);max-width:440px}.platform-links{align-self:center;display:grid;gap:15px}.platform-links>a{display:flex;align-items:center;gap:18px;padding:24px;border:1px solid color-mix(in srgb,var(--demo-accent) 15%,transparent);border-radius:20px;background:var(--md-surface)}.platform-links>a>.iconify{width:25px;height:25px;color:var(--home-accent);flex-shrink:0}.platform-links>a>.iconify:last-child{margin-left:auto;width:20px}.platform-links strong{display:block;font-size:1.438rem;line-height:1.2}.platform-links small{display:block;font-size:0.875rem;color:var(--md-on-surface-variant);margin-top:5px}.home-faq{display:grid;grid-template-columns:.8fr 1.2fr;gap:70px;padding:65px 0 80px;border-top:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent)}.home-faq h2{font-size:2.438rem}.home-faq details{border-bottom:1px solid color-mix(in srgb,var(--demo-accent) 13%,transparent)}.home-faq summary{display:flex;align-items:center;justify-content:space-between;gap:18px;cursor:pointer;list-style:none;font-weight:700;font-size:1.25rem;padding:21px 0}.home-faq summary::-webkit-details-marker{display:none}.home-faq summary .iconify{width:18px;height:18px;flex-shrink:0;color:var(--home-accent)}.home-faq details[open] summary .iconify{rotate:45deg}.home-faq details p{font-size:1.125rem;line-height:1.6;color:var(--md-on-surface-variant);margin:0 0 22px}.home-closing{padding:65px 0 80px;text-align:center}.home-closing .home-eyebrow{justify-content:center}.home-closing h2{font-size:clamp(2.5rem,5vw,4rem);line-height:1.05;font-weight:900;letter-spacing:-.035em;margin:0 0 28px}.home-story a:focus-visible,.home-faq summary:focus-visible{outline:2px solid var(--home-accent);outline-offset:5px}
@media(max-width:1100px){.home-hero{gap:35px}.home-chapter{gap:35px;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr)}.home-chapter--reverse{grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr)}.chapter-copy>p:not(.home-eyebrow){font-size:1.125rem}.offline-note{grid-template-columns:52px 1fr}.offline-note>.home-text-link{grid-column:2}.home-platforms{gap:45px}}
@media(max-width:820px){.home-hero{grid-template-columns:1fr;gap:30px;padding:40px 0 45px}.hero-copy{max-width:560px;margin:auto;width:100%}.hero-copy h1{font-size:clamp(2.4rem,8.4vw,4.25rem)}.hero-intro{font-size:1.312rem;max-width:490px}.hero-detail{display:none}.hero-scroll{margin-top:22px}.home-intro-line{flex-direction:column;gap:4px;padding:20px 0}.home-intro-line>p{font-size:1rem}.home-chapter,.home-chapter--reverse{grid-template-columns:1fr;gap:25px;padding-block:50px}.home-chapter--reverse .chapter-copy,.home-chapter--reverse .chapter-example{grid-column:auto;grid-row:auto}.chapter-copy{max-width:570px}.chapter-copy h2{font-size:2.688rem}.chapter-copy .home-eyebrow{margin-bottom:15px}.chapter-example{width:100%;max-width:640px;margin:auto}.offline-note{padding:25px;gap:15px;grid-template-columns:1fr}.offline-note>.home-text-link{grid-column:1}.offline-symbol{width:45px;height:45px}.offline-symbol .iconify{width:22px;height:22px}.guides-heading{align-items:start;flex-direction:column;gap:12px}.guides-heading h2{font-size:2.125rem}.guide-grid{grid-template-columns:1fr}.guide-card{padding:24px}.guide-card h3{margin-top:18px}.home-guides{padding-block:40px}.home-platforms{grid-template-columns:1fr;gap:25px;padding-block:40px}.home-platforms h2{font-size:2.438rem}.home-faq{grid-template-columns:1fr;gap:20px;padding-block:40px}.home-faq h2{margin-bottom:10px}.home-faq summary{font-size:1.188rem}.home-closing{padding-block:45px 60px}}
@media(prefers-reduced-motion:reduce){.home-button,.guide-card{transition:none}.home-button:hover,.guide-card:hover{transform:none;translate:none}}
.home-devices{padding-block:20px 80px;scroll-margin-top:110px}.devices-copy{max-width:46rem;margin-bottom:32px}.devices-copy h2{font-size:clamp(2.3rem,3.8vw,3.55rem);font-weight:800;line-height:1.05;letter-spacing:-.035em;margin:0 0 20px}.devices-copy>p:not(.home-eyebrow){font-size:1.188rem;line-height:1.6;color:var(--md-on-surface-variant);margin:0 0 12px}@media(max-width:820px){.home-devices{padding-bottom:50px}.devices-copy>p:not(.home-eyebrow){font-size:1.125rem}}
.home-hero>.hero-device{max-width:600px;justify-self:center}.home-story h2{overflow-wrap:break-word}
@media(min-width:1920px){.chapter-copy>small{max-width:26rem}.home-hero{gap:4rem}.home-hero>.hero-device{zoom:1.2}}
</style>

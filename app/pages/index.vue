<script setup lang="ts">
// Öffentliche Startseite. Wird per routeRules gerendert und gecacht (SEO, First Paint),
// während der App-Bereich unter /app rein client-seitig läuft.
useSeoMeta({
  title: 'shliste ~ Deine smarte Einkaufsliste',
  description: 'Weniger merken, mehr zusammen machen: Einkaufslisten teilen, Rezepte sammeln und Links in Einträge verwandeln. shliste im Browser und für Android.',
})

// Eingeloggt hat die Landing nichts mehr zu sagen: Das Logo zeigt auf die
// Listen, und wer hier ankommt, wird direkt dorthin gebracht. Beides nur
// client-seitig wirksam: Die Seite wird serverseitig gerendert, und der Client startet
// ebenso ausgeloggt wie der Server — kein Hydration-Mismatch. Die Session
// kommt danach asynchron, deshalb ein Watcher statt einer einmaligen Prüfung;
// `immediate` fängt den Fall ab, dass sie beim Aufruf schon geladen ist.
// Den serverseitigen Teil übernimmt die Nitro-Middleware.
const { isSignedIn } = useAuth()

if (import.meta.client) {
  watch(isSignedIn, (signedIn) => {
    if (signedIn) void navigateTo('/app/lists', { replace: true })
  }, { immediate: true })
}

const moments = [
  { number: '01', icon: 'i-lucide-users', title: '„Bringst du noch Milch mit?“', text: 'Eine Liste für euren Haushalt. Ergänzt, was fehlt, und hakt beim Einkaufen ab. Geteilte Listen halten euch auf demselben Stand.', to: '/gemeinsam-einkaufen', link: 'Gemeinsam einkaufen' },
  { number: '02', icon: 'i-lucide-chef-hat', title: 'Heute kochen. Vorher planen.', text: 'Rezepte aufheben und ihre Zutaten zur Einkaufsliste hinzufügen. So bleibt die Idee fürs Abendessen dort, wo du sie wiederfindest.', to: '/rezepte', link: 'Das Rezeptbuch entdecken' },
  { number: '03', icon: 'i-lucide-link', title: 'Ein guter Link darf bleiben.', text: 'Eine Fundstelle direkt auf der Liste speichern. Oder mit AI Einträge auslesen, prüfen und einer vorhandenen oder neuen Liste hinzufügen.', to: '/so-funktionierts', link: 'So funktioniert shliste' },
]
const recipeIdeas = [
  { image: '/images/recipes/lasagne.webp', title: 'Vegane Lasagne mit Béchamelsoße', occasion: 'Zeit fürs Lieblingsessen', text: 'Eine Idee fürs gemeinsame Abendessen. Zutaten sammeln, den Einkauf planen und beim Kochen Schritt für Schritt vorgehen.' },
  { image: '/images/recipes/pizzabroetchen.webp', title: 'Vegane Pizzabrötchen', occasion: 'Etwas zum Teilen', text: 'Für den nächsten Besuch oder einen gemütlichen Abend: Behalte das Rezept und die Besorgungen dafür zusammen im Blick.' },
  { image: '/images/recipes/marmorkuchen.webp', title: 'Veganer Marmorkuchen', occasion: 'Ein Stück Wochenende', text: 'Lieblingsrezepte zum Wiederbacken aufheben. So suchst du beim nächsten Mal nicht wieder nach derselben Fundstelle.' },
]
const questions = [
  { title: 'Kann ich ohne Konto anfangen?', answer: 'Ja. Du kannst Listen und Rezepte zunächst lokal in deinem Browser anlegen. Für geteilte Listen und den Abgleich zwischen deinen Geräten meldest du dich an. Ohne Anmeldung gibt es keine Serverkopie deiner lokalen Inhalte.' },
  { title: 'Was funktioniert ohne Internet?', answer: 'Bereits lokal gespeicherte Listen kannst du weiterhin ansehen und bearbeiten. Für den ersten Aufruf, den Abgleich mit anderen Geräten und AI-Funktionen brauchst du eine Verbindung. Andere Personen sehen deine Änderungen erst nach dem Abgleich.' },
  { title: 'Was passiert mit einem eingefügten Link?', answer: 'Du wählst, ob du nur die Adresse auf deiner Liste speichern oder mit AI Einträge aus dem Inhalt übernehmen möchtest. Die Vorschläge prüfst du und wählst eine vorhandene oder neue Liste als Ziel. Das Einfügen allein startet keinen Abruf.' },
  { title: 'Kann ich Rezepte und Einkaufslisten verbinden?', answer: 'Ja. Ein Rezept hält Zutaten und Zubereitung zusammen. Die Zutaten kannst du in eine Einkaufsliste übernehmen und dort mit deinen übrigen Besorgungen ergänzen. Prüfe vor dem Einkauf, was bereits im Vorrat steht.' },
  { title: 'Browser oder Android – muss ich mich entscheiden?', answer: 'Du kannst shliste im Browser nutzen oder die Android-App installieren. Mit Anmeldung und Internetverbindung lassen sich deine Inhalte zwischen den Geräten abgleichen. Ein lokal angelegter Bestand ohne Konto bleibt zunächst auf dem jeweiligen Gerät.' },
]
</script>

<template>
  <div class="landing min-h-dvh">
    <header class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
      <NuxtLink
        :to="isSignedIn ? '/app/lists' : '/'"
        aria-label="shliste Startseite"
      >
        <img
          src="/images/brand/wordmark.svg"
          alt="shliste"
          width="152"
          height="40"
          class="h-8 w-auto sm:h-9"
        >
      </NuxtLink>
      <nav
        aria-label="Hauptnavigation"
        class="flex shrink-0 items-center gap-6"
      >
        <NuxtLink
          to="/rezepte"
          class="hidden text-sm font-semibold hover:underline lg:inline"
        >Rezepte</NuxtLink>
        <NuxtLink
          to="/gemeinsam-einkaufen"
          class="hidden text-sm font-semibold hover:underline lg:inline"
        >Gemeinsam einkaufen</NuxtLink>
        <NuxtLink
          to="/so-funktionierts"
          class="hidden text-sm font-semibold hover:underline lg:inline"
        >So funktioniert’s</NuxtLink>
        <UButton
          to="/app/lists"
          size="lg"
          class="rounded-full font-bold whitespace-nowrap"
        >
          App öffnen <UIcon
            name="i-lucide-arrow-up-right"
            class="size-4"
          />
        </UButton>
      </nav>
    </header>
    <nav
      aria-label="shliste entdecken"
      class="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-1 px-5 text-sm font-semibold sm:px-8 lg:hidden"
    >
      <NuxtLink
        to="/rezepte"
        class="inline-flex min-h-11 items-center hover:underline"
      >Rezepte</NuxtLink>
      <NuxtLink
        to="/gemeinsam-einkaufen"
        class="inline-flex min-h-11 items-center hover:underline"
      >Gemeinsam einkaufen</NuxtLink>
      <NuxtLink
        to="/so-funktionierts"
        class="inline-flex min-h-11 items-center hover:underline"
      >So funktioniert’s</NuxtLink>
    </nav>

    <main>
      <section
        class="hero relative mx-auto grid max-w-7xl items-center gap-12 overflow-hidden px-5 pt-9 pb-14 sm:px-8 sm:pt-16 sm:pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6"
        aria-labelledby="hero-title"
      >
        <div class="relative z-10">
          <p class="eyebrow mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold tracking-wide">
            <UIcon
              name="i-lucide-sprout"
              class="size-4"
            /> Kleine Listen. Mehr Platz im Kopf.
          </p>
          <h1
            id="hero-title"
            class="max-w-3xl text-[clamp(3rem,6.6vw,5.8rem)] leading-[0.99] font-black tracking-[-0.055em]"
          >
            Weniger merken.<br><span class="accent">Mehr zusammen<br class="hidden sm:block"> machen.</span>
          </h1>
          <p class="muted mt-7 max-w-lg text-lg leading-relaxed sm:text-xl">
            Der Einkauf fürs Wochenende. Das Rezept für heute Abend.
            Der Link, den du behalten willst. Alles findet seinen Platz in shliste.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              to="/app/lists"
              size="xl"
              class="rounded-full px-6 font-bold"
            >
              Im Browser starten <UIcon
                name="i-lucide-arrow-right"
                class="size-5"
              />
            </UButton>
            <UButton
              to="https://play.google.com/store/apps/details?id=com.shroomlife.shliste"
              target="_blank"
              rel="noopener"
              size="xl"
              variant="outline"
              class="rounded-full px-6 font-bold"
            >
              Für Android
            </UButton>
          </div>
          <p class="muted mt-4 text-sm">
            Im Browser direkt loslegen. Ohne Installation.
          </p>
          <div class="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
            <a
              href="#alltag"
              class="inline-flex min-h-11 items-center gap-2 hover:underline"
            ><UIcon
              name="i-lucide-list-checks"
              class="accent size-4"
            /> Listen teilen</a>
            <a
              href="#rezepte"
              class="inline-flex min-h-11 items-center gap-2 hover:underline"
            ><UIcon
              name="i-lucide-book-open"
              class="accent size-4"
            /> Rezepte entdecken</a>
            <a
              href="#links"
              class="inline-flex min-h-11 items-center gap-2 hover:underline"
            ><UIcon
              name="i-lucide-link"
              class="accent size-4"
            /> Links behalten</a>
          </div>
        </div>
        <figure class="hero-visual relative flex flex-col items-center px-7 pt-5 pb-2 lg:pt-0">
          <div
            class="hero-orbit absolute inset-x-0 top-[12%] bottom-[12%] rounded-[50%]"
            aria-hidden="true"
          />
          <div class="phone relative w-full max-w-[290px] rotate-2 overflow-hidden rounded-[2rem] border-[7px] sm:max-w-[320px]">
            <img
              src="/images/screenshots/list.png"
              alt="Die echte shliste Web-App mit einer Einkaufsliste aus Beispieldaten, offenen und erledigten Einträgen."
              width="390"
              height="844"
              fetchpriority="high"
              class="block h-auto w-full"
            >
          </div>
          <figcaption class="muted relative mt-6 text-center text-xs">
            Ein Blick in die Web-App · Beispieldaten
          </figcaption>
        </figure>
      </section>

      <section
        id="alltag"
        class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
        aria-labelledby="moments-title"
      >
        <div class="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="accent text-xs font-bold tracking-[0.16em] uppercase">
              Mitten im Leben
            </p>
            <h2
              id="moments-title"
              class="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl"
            >
              Für alles, was noch auf die Liste muss.
            </h2>
          </div>
          <p class="muted max-w-xs leading-relaxed">
            Von der ersten Idee bis zum letzten Häkchen.
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <article
            v-for="moment in moments"
            :key="moment.number"
            class="moment rounded-[1.5rem] p-6 sm:p-8"
          >
            <div class="flex items-center justify-between">
              <UIcon
                :name="moment.icon"
                class="accent size-7"
              />
              <span class="muted text-xs font-semibold">{{ moment.number }}</span>
            </div>
            <h3 class="mt-8 text-xl font-bold">
              {{ moment.title }}
            </h3>
            <p class="muted mt-3 leading-relaxed">
              {{ moment.text }}
            </p>
            <NuxtLink
              :to="moment.to"
              class="accent mt-5 inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
            >{{ moment.link }} <UIcon
              name="i-lucide-arrow-right"
              class="size-4"
            /></NuxtLink>
          </article>
        </div>
      </section>

      <section
        class="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-2"
        aria-label="So sieht shliste aus"
      >
        <article
          id="rezepte"
          class="showcase recipe-showcase grid scroll-mt-6 items-center gap-8 overflow-hidden rounded-[2rem] px-6 pt-8 sm:px-10 sm:pt-10 lg:col-span-2 lg:grid-cols-[1fr_0.9fr]"
        >
          <div class="lg:pb-10">
            <p class="text-xs font-bold tracking-[0.14em] uppercase">
              Dein eigenes Rezeptbuch
            </p>
            <h2 class="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Deine Lieblingsrezepte.<br>Bereit zum Nachkochen.
            </h2>
            <p class="mt-5 max-w-md text-lg leading-relaxed">
              Das schnelle Abendessen. Der Kuchen vom letzten Geburtstag.
              Bewahre deine Rezepte mit Zutaten und Zubereitung an einem Ort auf.
            </p>
            <ol class="mt-7 flex max-w-md flex-col gap-5">
              <li class="flex gap-3">
                <UIcon
                  name="i-lucide-book-open"
                  class="mt-1 size-5 shrink-0"
                />
                <div><strong>Wiederfinden statt suchen.</strong><br>Deine Sammlung ist dort, wo du auch deinen Einkauf planst.</div>
              </li>
              <li class="flex gap-3">
                <UIcon
                  name="i-lucide-list-checks"
                  class="mt-1 size-5 shrink-0"
                />
                <div><strong>Schritt für Schritt kochen.</strong><br>Hake ab, was fertig ist, und behalte den nächsten Schritt im Blick.</div>
              </li>
              <li class="flex gap-3">
                <UIcon
                  name="i-lucide-shopping-basket"
                  class="mt-1 size-5 shrink-0"
                />
                <div><strong>Zutaten direkt übernehmen.</strong><br>Was du einkaufen möchtest, wandert aus dem Rezept auf deine Liste.</div>
              </li>
            </ol>
            <UButton
              to="/rezepte"
              size="xl"
              class="mt-8 rounded-full px-6 font-bold"
            >
              Rezepte entdecken
            </UButton>
          </div>
          <figure class="flex flex-col items-center">
            <img
              src="/images/recipes/lasagne.webp"
              alt="Rezeptillustration: vegane Lasagne mit Béchamelsoße, Tomaten und frischem Basilikum."
              width="1200"
              height="600"
              loading="lazy"
              class="showcase-shot block h-auto w-full rounded-[1.25rem]"
            >
            <figcaption class="py-4 text-xs">
              Vegane Lasagne mit Béchamelsoße · Illustration aus shliste
            </figcaption>
          </figure>
        </article>
        <article
          id="links"
          class="showcase link-showcase grid scroll-mt-6 items-center gap-8 overflow-hidden rounded-[2rem] px-6 pt-8 sm:px-10 sm:pt-10 lg:col-span-2 lg:grid-cols-[1fr_0.9fr]"
        >
          <div class="lg:pb-10">
            <p class="text-xs font-bold tracking-[0.14em] uppercase">
              Aus einem Link wird mehr
            </p>
            <h2 class="mt-3 max-w-md text-3xl font-extrabold tracking-tight sm:text-4xl">
              Gefunden.<br>Geprüft. Hinzugefügt.
            </h2>
            <p class="mt-4 max-w-md text-lg leading-relaxed">
              Du entscheidest: nur den Link behalten oder Einträge daraus übernehmen. Die AI-Auswahl prüfst du vor dem Speichern.
            </p>
            <ol class="mt-7 flex max-w-md flex-col gap-5">
              <li class="flex gap-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold">1</span>
                <div><strong>Link einfügen.</strong><br>Die Eingabeleiste erkennt deine Adresse und bietet dir die passenden Möglichkeiten an.</div>
              </li>
              <li class="flex gap-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold">2</span>
                <div><strong>Selbst entscheiden.</strong><br>Behalte die Fundstelle als Link. Oder lass dir Einträge aus dem Inhalt vorschlagen.</div>
              </li>
              <li class="flex gap-3">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold">3</span>
                <div><strong>Auswählen und hinzufügen.</strong><br>Prüfe die Vorschläge und ergänze eine vorhandene Liste oder starte eine neue.</div>
              </li>
            </ol>
            <UButton
              to="/app/lists"
              size="xl"
              class="mt-8 rounded-full px-6 font-bold"
            >
              Meine Listen öffnen
            </UButton>
          </div>
          <figure class="flex flex-col items-center">
            <img
              src="/images/screenshots/links.png"
              alt="Link-Auswahl der echten shliste Web-App: Link in der Liste speichern oder Einträge daraus übernehmen."
              width="390"
              height="844"
              loading="lazy"
              class="showcase-shot block h-auto w-full max-w-[270px] rounded-t-[1.25rem]"
            >
            <figcaption class="py-4 text-xs">
              Link-Auswahl · AI benötigt Anmeldung und Internet
            </figcaption>
          </figure>
        </article>
      </section>

      <section
        class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
        aria-labelledby="recipe-ideas-title"
      >
        <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="accent text-xs font-bold tracking-[0.16em] uppercase">
              Lust auf etwas Gutes?
            </p>
            <h2
              id="recipe-ideas-title"
              class="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Herzhaft. Süß. Wiederkochenswert.
            </h2>
          </div>
          <NuxtLink
            to="/rezepte"
            class="accent inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
          >
            Mehr über dein Rezeptbuch <UIcon
              name="i-lucide-arrow-right"
              class="size-4"
            />
          </NuxtLink>
        </div>
        <div class="grid gap-5 md:grid-cols-3">
          <article
            v-for="idea in recipeIdeas"
            :key="idea.title"
            class="moment overflow-hidden rounded-[1.5rem]"
          >
            <img
              :src="idea.image"
              :alt="`Rezeptillustration: ${idea.title}`"
              width="1200"
              height="600"
              loading="lazy"
              class="block h-auto w-full"
            >
            <div class="p-6">
              <p class="accent text-xs font-bold tracking-wide uppercase">
                {{ idea.occasion }}
              </p>
              <h3 class="mt-3 text-xl font-bold">
                {{ idea.title }}
              </h3>
              <p class="muted mt-3 leading-relaxed">
                {{ idea.text }}
              </p>
            </div>
          </article>
        </div>
        <p class="muted mt-4 text-sm">
          Einblicke in eine shliste-Rezeptsammlung · Rezeptillustrationen
        </p>
      </section>

      <section
        class="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]"
        aria-labelledby="details-title"
      >
        <div>
          <p class="accent text-xs font-bold tracking-[0.16em] uppercase">
            Einfach im Alltag
          </p>
          <h2
            id="details-title"
            class="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl"
          >
            Deine Liste kommt mit.
          </h2>
        </div>
        <div class="grid gap-7 sm:grid-cols-2">
          <div>
            <UIcon
              name="i-lucide-cloud-off"
              class="accent size-6"
            />
            <h3 class="mt-3 text-lg font-bold">
              Abhaken, auch ohne Empfang
            </h3>
            <p class="muted mt-2 leading-relaxed">
              Gespeicherte Listen kannst du auch offline bearbeiten. Für den Abgleich mit anderen Geräten brauchst du wieder eine Verbindung.
            </p>
          </div>
          <div>
            <UIcon
              name="i-lucide-panels-top-left"
              class="accent size-6"
            />
            <h3 class="mt-3 text-lg font-bold">
              Browser oder Android
            </h3>
            <p class="muted mt-2 leading-relaxed">
              Am großen Bildschirm planen, unterwegs abhaken. Mit Anmeldung nutzt du den Abgleich zwischen deinen Geräten.
            </p>
          </div>
        </div>
      </section>

      <section
        class="mx-auto grid max-w-7xl gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]"
        aria-labelledby="questions-title"
      >
        <div>
          <p class="accent text-xs font-bold tracking-[0.16em] uppercase">
            Gut zu wissen
          </p>
          <h2
            id="questions-title"
            class="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Einfach anfangen.<br>Mit einem guten Gefühl.
          </h2>
          <p class="muted mt-5 max-w-sm leading-relaxed">
            Die wichtigsten Antworten für deinen Einstieg. Eine ausführliche Tour findest du auf unserer Seite zur Nutzung.
          </p>
          <NuxtLink
            to="/so-funktionierts"
            class="accent mt-4 inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
          >So funktioniert shliste <UIcon
            name="i-lucide-arrow-right"
            class="size-4"
          /></NuxtLink>
        </div>
        <div class="space-y-3">
          <details
            v-for="question in questions"
            :key="question.title"
            class="moment rounded-2xl px-5"
          >
            <summary class="cursor-pointer py-5 pr-3 font-bold">
              {{ question.title }}
            </summary>
            <p class="muted pb-5 leading-relaxed">
              {{ question.answer }}
            </p>
          </details>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div class="closing rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-16">
          <UIcon
            name="i-lucide-check-check"
            class="mb-4 size-9"
          />
          <h2 class="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Was steht bei dir als Nächstes an?
          </h2>
          <p class="mx-auto mt-4 max-w-lg text-lg">
            Fang mit einer Liste an. Der Rest darf aus dem Kopf.
          </p>
          <UButton
            to="/app/lists"
            size="xl"
            color="neutral"
            class="mt-7 rounded-full px-7 font-bold"
          >
            shliste öffnen <UIcon
              name="i-lucide-arrow-right"
              class="size-5"
            />
          </UButton>
        </div>
      </section>
    </main>

    <footer class="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p class="muted text-sm">
        shliste · Für die kleinen und großen Besorgungen.
      </p>
      <nav
        aria-label="Rechtliches"
        class="flex gap-6 text-sm"
      >
        <NuxtLink
          to="/imprint"
          class="hover:underline"
        >Impressum</NuxtLink>
        <NuxtLink
          to="/privacy"
          class="hover:underline"
        >Datenschutz</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<style scoped>
.landing { background: var(--md-background); color: var(--md-on-background); }
.accent { color: var(--md-primary); }
.landing { --marketing-text-accent: #A6387D; }
:global(.dark) .landing { --marketing-text-accent: var(--md-primary); }
p.accent, a.accent { color: var(--marketing-text-accent); }
.muted { color: var(--md-on-surface-variant); }
.eyebrow, .moment { background: var(--md-surface-container); }
.eyebrow { color: var(--marketing-text-accent); }
.hero-orbit { background: var(--md-primary-container); transform: rotate(-12deg); }
.phone { border-color: var(--md-surface-high); background: var(--md-surface); box-shadow: 0 22px 55px color-mix(in srgb, var(--md-primary) 16%, transparent); }
.recipe-showcase { background: var(--md-primary-container); color: var(--md-on-primary-container); }
.link-showcase { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
.showcase-shot { box-shadow: 0 10px 35px rgb(0 0 0 / 10%); }
.closing { background: var(--md-primary); color: var(--md-on-primary); }
.hero-visual { animation: arrive 650ms ease-out both; }
@keyframes arrive {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-visual { animation: none; }
}
</style>

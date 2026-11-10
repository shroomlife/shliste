<script setup lang="ts">
defineProps<{ extraItems: string[] }>()
defineEmits<{ addExtra: [item: string] }>()
const feeling = ref(0)
const doughHelp = [
  { label: 'Klebt an den Händen', icon: 'i-lucide-snowflake', title: 'Der Teig braucht eine Pause.', text: 'Warm gewordener Teig lässt sich schlechter lösen. Flach drücken, abdecken und wieder kühl stellen. Erst danach prüfen, ob wirklich Mehl fehlt.' },
  { label: 'Bricht beim Rollen', icon: 'i-lucide-droplets', title: 'Erst die Temperatur prüfen.', text: 'Sehr kalten Teig kurz liegen lassen und vorsichtig zusammendrücken. Bleibt er trocken und krümelig, Haferdrink teelöffelweise einarbeiten. Nach jeder kleinen Zugabe prüfen.' },
  { label: 'Lässt sich gut formen', icon: 'i-lucide-circle-check', title: 'Genau so darf er bleiben.', text: 'Nur eine Portion bearbeiten, den Rest abgedeckt kühl halten. Teigreste kurz zusammennehmen, statt sie immer wieder lange zu kneten.' },
]
const extras = ['Backpapier', 'Puderzucker', 'Zitrone']
const art = '/images/editorial/weihnachtsplaetzchen/v1/'
</script>

<template>
  <div class="baking-guide">
    <section
      id="vorbereitung"
      class="guide-band"
    >
      <div class="mkt-content guide-split">
        <div>
          <p class="mkt-label">
            Teiggefühl · Erst fühlen, dann formen
          </p><h2>Dein Teig sagt dir,<br>was er braucht.</h2><p class="guide-intro">
            Ein guter Backnachmittag beginnt mit einer kleinen Pause. Nicht mit einer immer größeren Mehlwolke.
          </p><fieldset>
            <legend>Wie fühlt sich dein Teig an?</legend><button
              v-for="(item, index) in doughHelp"
              :key="item.label"
              type="button"
              :aria-pressed="feeling === index"
              @click="feeling = index"
            >
              <UIcon :name="item.icon" /><span>{{ item.label }}</span>
            </button>
          </fieldset><div
            class="dough-answer"
            aria-live="polite"
          >
            <h3>{{ doughHelp[feeling]!.title }}</h3><p>{{ doughHelp[feeling]!.text }}</p>
          </div>
        </div>
        <figure class="guide-art tilted">
          <img
            :src="`${art}step-2.webp`"
            alt="Flach gedrückter heller Teig und Kakaoteig in wiederverwendbaren Dosen zum Kühlen."
            width="1536"
            height="1024"
            loading="lazy"
          ><MarketingAiLabel /><figcaption><UIcon name="i-lucide-snowflake" /> Flache Scheibe. Gleichmäßige Pause.</figcaption>
        </figure>
      </div>
    </section>

    <section
      id="ausrollen"
      class="mkt-content guide-chapter"
    >
      <div class="guide-heading">
        <p class="mkt-label">
          Ausrollen · Weniger Mehl, mehr Gefühl
        </p><h2>Einmal gleichmäßig.<br>Ein ganzes Blech entspannter.</h2><p>Für unsere Vanille-Ausstechplätzchen sind etwa vier Millimeter ein guter Start. Gleichmäßige Dicke zählt mehr als perfekte Sternspitzen.</p>
      </div>
      <div class="guide-split rolling">
        <figure class="guide-art">
          <img
            :src="`${art}step-3.webp`"
            alt="Ausrollleisten neben einer gleichmäßig dünnen Teigplatte; ein Stern wird mit einer Palette angehoben."
            width="1536"
            height="1024"
            loading="lazy"
          ><MarketingAiLabel />
        </figure><ol class="technique-steps">
          <li><span class="step-dot">1</span><div><h3>Die Rolle bekommt eine Führung.</h3><p>Lebensmittelgeeignete Ausrollleisten neben den Teig legen. Die Rolle liegt zum Schluss auf beiden Leisten auf. So bleibt die Mitte nicht viel dicker als der Rand.</p></div></li><li><span class="step-dot">2</span><div><h3>Von der Mitte nach außen.</h3><p>Mit leichtem Druck rollen und den Teig zwischendurch lösen. Zwischen zwei Lagen Backpapier braucht es kaum zusätzliches Mehl. Papier vorsichtig abziehen.</p></div></li><li><span class="step-dot">3</span><div><h3>Drücken. Heben. Weitermachen.</h3><p>Formen dicht nebeneinander ansetzen, gerade herunterdrücken und hochheben. Filigrane Stücke mit einer dünnen Palette tragen. Weiche Formen vor dem Umsetzen noch einmal kühlen.</p></div></li>
        </ol>
      </div>
      <NuxtLink
        class="guide-link"
        to="/rezepte/weihnachtsplaetzchen?variante=vanille#varianten"
      ><UIcon name="i-lucide-cookie" /><span>Zum Ausstechteig mit bebilderter Anleitung</span></NuxtLink>
    </section>

    <section
      id="ausstechformen"
      class="forms-band"
    >
      <div class="mkt-content guide-chapter">
        <div class="guide-heading">
          <p class="mkt-label">
            Formenfreude · Die Dose darf ein bisschen verrückt werden
          </p><h2>Dieses Jahr landet<br>eine Rakete neben dem Stern.</h2><p>Vom Lama bis zum Faultier, vom Dino bis zur Raumfahrt: Ausstecher gibt es weit über die Klassiker hinaus. Sucht euch ein kleines Thema aus, das zu eurer Runde passt.</p>
        </div><figure class="guide-art forms-art">
          <img
            src="/images/illustrations/plaetzchen-ausstechformen.webp"
            alt="Ausstechformen und passende Kekse als Rakete, Mond, Stern, Lama und Dinosaurier auf hellem Backpapier."
            width="1536"
            height="1024"
            loading="lazy"
          ><MarketingAiLabel /><figcaption>Eine kleine Formen-Sammlung als Inspiration. Keine Produktabbildung.</figcaption>
        </figure><div class="guide-cards">
          <article><UIcon name="i-lucide-orbit" /><h3>Eine Dose voller Geschichten.</h3><p>Stern, Mond und Rakete ergeben eine kleine Galaxie. Mit vorhandenen Formen anfangen; ein Kreis wird durch Dekoration zum Planeten.</p></article><article><UIcon name="i-lucide-shapes" /><h3>Große Konturen sind geduldiger.</h3><p>Breite Motive lassen sich leichter heben. Sehr dünne Beine, Antennen oder Spitzen brechen schneller und werden im Ofen früher dunkel.</p></article><article><UIcon name="i-lucide-recycle" /><h3>Leihen ist auch eine Backzutat.</h3><p>Fragt in eurer Runde nach Formen, bevor alle dieselben kaufen. Für die Küche geeignete, gut zu reinigende Ausstecher wählen; Pflegehinweise beachten.</p></article>
        </div>
      </div>
    </section>

    <section
      id="backpunkt"
      class="mkt-content guide-chapter guide-split"
    >
      <figure class="guide-art oven-art">
        <img
          :src="`${art}step-4.webp`"
          alt="Frisch gebackene Sterne und Herzen mit hellen Zentren und goldgelben Rändern."
          width="1536"
          height="1024"
          loading="lazy"
        ><MarketingAiLabel /><figcaption><UIcon name="i-lucide-sun" /> Ein goldener Rand genügt.</figcaption>
      </figure><div>
        <p class="mkt-label">
          Backpunkt · Schau aufs Blech, nicht nur auf die Uhr
        </p><h2>Ein guter Backpunkt<br>ist ein kleiner Moment.</h2><p class="guide-intro">
          Unsere hellen Plätzchen sollen am Rand Farbe bekommen. Du musst nicht warten, bis der ganze Stern braun ist.
        </p><div class="oven-notes">
          <article><h3>Vor dem Backen</h3><p>Ähnlich große und dicke Stücke auf ein Blech legen. Kleine Monde und große Dinos lieber getrennt backen.</p></article><article><h3>Im Ofen</h3><p>Mit wenigen Plätzchen starten und früh kontrollieren. Bei Kakao hilft die Farbe weniger; an die Anleitung halten und die Oberfläche beobachten.</p></article><article><h3>Nach dem Backen</h3><p>Warme Plätzchen sind noch empfindlich. Kurz auf dem Blech fest werden lassen, dann aufs Gitter. Das nächste Blech erst abgekühlt belegen.</p></article>
        </div><NuxtLink
          class="guide-link"
          to="/rezepte/weihnachtsplaetzchen#varianten"
        ><UIcon name="i-lucide-timer" /><span>Backzeiten für eure Sorte ansehen</span></NuxtLink>
      </div>
    </section>

    <section
      id="verschenken"
      class="finish-band"
    >
      <div class="mkt-content guide-chapter">
        <div class="guide-split">
          <div>
            <p class="mkt-label">
              Verzieren · Der schönste letzte Handgriff
            </p><h2>Ein paar Linien.<br>Ganz viel Persönlichkeit.</h2><p class="guide-intro">
              Erst auskühlen, dann verzieren. Ein Löffel Zitronenguss, kleine Punkte oder ein halber Schoko-Mantel reichen für eine Dose, die nach euch aussieht.
            </p><p>Für feine Linien den Guss dickflüssig anrühren und zunächst auf einem Probekeks testen. Zu flüssig? Etwas Puderzucker dazu. Zu fest? Tropfenweise Zitronensaft. Glasur vor dem Stapeln trocknen lassen.</p><div class="gift-note">
              <UIcon name="i-lucide-gift" /><p>Vorhandene Dosen oder saubere, trockene Gläser nutzen. Sorten getrennt verpacken, Zutaten und Backdatum dazuschreiben. Feuchte Füllungen lieber zeitnah verschenken.</p>
            </div>
          </div><figure class="guide-art tilted">
            <img
              :src="`${art}step-5.webp`"
              alt="Hände mit unterschiedlichen Hauttönen legen verzierte, abgekühlte Plätzchen in eine wiederverwendbare Keksdose."
              width="1536"
              height="1024"
              loading="lazy"
            ><MarketingAiLabel />
          </figure>
        </div><div class="extras-strip">
          <div><h3>Die Deko darf mit auf die Liste.</h3><p>Erst Vorräte prüfen. Ergänze nur, was euch fehlt.</p></div><div class="extras-buttons">
            <button
              v-for="item in extras"
              :key="item"
              type="button"
              :disabled="extraItems.includes(item)"
              @click="$emit('addExtra', item)"
            >
              <UIcon :name="extraItems.includes(item) ? 'i-lucide-check' : 'i-lucide-plus'" /><span>{{ item }}{{ extraItems.includes(item) ? ' ergänzt' : '' }}</span>
            </button>
          </div><a
            class="guide-link"
            href="#backplan"
          ><UIcon name="i-lucide-list-checks" /><span>Einkaufsliste ansehen und in shliste übernehmen</span></a>
        </div>
      </div>
    </section>
    <div class="mkt-content guide-sources">
      <details>
        <summary>Hintergrund zu unseren Backtipps <UIcon name="i-lucide-book-open" /></summary><p>
          Eigenständig formulierte Hinweise, recherchiert anhand der <a
            href="https://www.oetker.de/inspiration/tipps-tricks/t/die-besten-plaetzchen-so-gelingts-ganz-einfach"
            target="_blank"
            rel="noopener noreferrer"
          >Plätzchen-Grundlagen von Dr. Oetker</a> und der <a
            href="https://www.kuchentratsch.com/blogs/backtipps/weihnachts-plaetzchen"
            target="_blank"
            rel="noopener noreferrer"
          >Ausrolltipps von Kuchentratsch</a>. Ungewöhnliche Motive sind unter anderem bei Birkmann und in Weltall-Ausstechsets erhältlich. Unsere Bilder zeigen eigene gestalterische Ideen.
        </p>
      </details>
    </div>
  </div>
</template>

<style scoped>
.guide-art.oven-art :deep(.ai-label){top:auto;bottom:70px;right:16px}
.baking-guide{--guide-line:color-mix(in srgb,var(--demo-accent) 20%,transparent)}.baking-guide section[id]{scroll-margin-top:110px}.baking-guide h2{font-size:clamp(2rem,3.4vw,3.25rem);font-weight:850;letter-spacing:-.035em;line-height:1.08;text-wrap:balance}.baking-guide h3{font-size:1.3rem;font-weight:800;line-height:1.25}.baking-guide p{line-height:1.75}.guide-band,.finish-band{background:color-mix(in srgb,var(--demo-soft) 55%,var(--md-background));padding-block:65px}.guide-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:55px;align-items:center}.guide-intro{font-size:1.13rem;margin-block:24px}.guide-art{position:relative;border-radius:28px;overflow:hidden;background:var(--demo-soft)}.guide-art img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}.guide-art :deep(.ai-label){position:absolute;right:12px;top:12px}.guide-art figcaption{padding:17px 20px;display:flex;align-items:center;justify-content:center;gap:10px;line-height:1.45;font-size:.9rem}.tilted{transform:rotate(1.5deg);box-shadow:0 18px 45px color-mix(in srgb,var(--demo-accent) 10%,transparent)}fieldset{padding:0;border:0;display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}legend{font-weight:750;margin-bottom:12px}button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:11px 15px;border-radius:16px;border:1px solid var(--guide-line);background:var(--md-surface);font-weight:700;cursor:pointer;line-height:1.3}button .iconify{flex:0 0 20px}button>span{padding-top:.12em}button[aria-pressed=true]{background:var(--demo-accent);color:white}.dough-answer{margin-top:18px;background:var(--md-surface);padding:24px;border-radius:20px;min-height:175px}.dough-answer p{margin-top:10px}.guide-chapter{padding-block:70px}.guide-heading{max-width:790px;margin-bottom:32px}.guide-heading>p:last-child{font-size:1.1rem;margin-top:22px}.technique-steps{display:grid;gap:28px;padding:0;list-style:none}.technique-steps li{display:flex;gap:16px}.step-dot{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:50%;background:var(--demo-soft);font-weight:800;color:var(--demo-accent)}.technique-steps p{margin-top:8px}.guide-link{display:inline-flex;align-items:center;gap:10px;min-height:48px;margin-top:22px;font-weight:750;color:var(--demo-accent);line-height:1.45}.guide-link .iconify{flex:0 0 22px}.forms-band{background:color-mix(in srgb,var(--demo-soft) 28%,var(--md-background))}.forms-art{max-width:1000px;margin-inline:auto}.forms-art img{aspect-ratio:3/2}.guide-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:28px}.guide-cards article{padding:26px;border-radius:24px;background:var(--md-surface);border:1px solid var(--guide-line)}.guide-cards .iconify{font-size:30px;color:var(--demo-accent);margin-bottom:16px}.guide-cards p{margin-top:12px}.oven-art{border-radius:40% 40% 24px 24px}.oven-art img{aspect-ratio:1/1}.oven-notes{display:grid;gap:20px}.oven-notes article{border-left:3px solid var(--demo-soft);padding-left:18px}.oven-notes p{margin-top:6px}.finish-band{padding-block:0}.gift-note{display:flex;gap:14px;margin-top:24px;padding:20px;background:var(--md-surface);border-radius:20px}.gift-note .iconify{flex:0 0 25px;color:var(--demo-accent)}.extras-strip{margin-top:40px;padding:28px;border-radius:24px;background:var(--md-surface)}.extras-buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.extras-strip p{margin-top:7px}.extras-strip button:disabled{cursor:default;background:var(--demo-soft);color:var(--demo-accent)}.guide-sources{padding-block:24px 55px;font-size:.85rem;color:var(--md-on-surface-variant)}.guide-sources summary{display:flex;align-items:center;gap:10px;cursor:pointer;min-height:44px}.guide-sources p{max-width:900px;margin-top:12px}.guide-sources a{text-decoration:underline;text-underline-offset:3px}.baking-guide :is(a,button,input,summary):focus-visible{outline:3px solid var(--demo-accent);outline-offset:4px}@media(max-width:900px){.guide-split{gap:30px}.guide-cards{gap:14px}.guide-cards article{padding:20px}}@media(max-width:750px){.guide-split,.guide-cards{grid-template-columns:minmax(0,1fr)}.guide-art.tilted{transform:none}.guide-chapter{padding-block:45px}.guide-band{padding-block:45px}.dough-answer{min-height:0}.oven-art{max-width:520px}.extras-strip{padding:22px}.guide-cards{gap:16px}.guide-sources{padding-bottom:35px}.guide-link{align-items:flex-start}.guide-link .iconify{margin-top:3px}}
</style>

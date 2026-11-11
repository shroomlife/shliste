<script setup lang="ts">
defineProps<{ extraItems: string[] }>()
const emit = defineEmits<{ addExtra: [item: string] }>()
const extras = ['Brokkoli', 'Servietten', 'Kräuter für den Dip']
const benefits = [
  { icon: 'i-lucide-heart-handshake', title: 'Gastgeben und mitessen.', text: 'Vieles lässt sich vor dem Klingeln schneiden und bereitstellen. Danach sitzt du mit am Tisch, statt jeden Gang aus der Küche zu bringen.' },
  { icon: 'i-lucide-palette', title: 'Jedes Pfännchen ist persönlich.', text: 'Eine überschaubare Auswahl ergibt viele Kombinationen. Mild oder würzig, Kartoffel oder Gemüse: Jede Person stellt sich ihre Runde selbst zusammen.' },
  { icon: 'i-lucide-messages-square', title: 'Zeit zwischen den Bissen.', text: 'Während ein Pfännchen brutzelt, bleibt Raum zum Erzählen. Plant den Abend ohne engen Zeitplan und stellt Brot und Dips für den Anfang bereit.' },
]
const troubleshooting = [
  { title: 'Zu viel Wasser?', text: 'Mais und eingelegte Zutaten gut abtropfen lassen. Gemüse nach dem Waschen trocknen. Tomaten sparsam einsetzen und das Pfännchen flach belegen.' },
  { title: 'Oben goldbraun, unten noch fest?', text: 'Kartoffeln und festes Gemüse vorgaren. Dünne, ähnlich große Stücke garen gleichmäßiger als dicke Würfel. Die heiße Oberfläche ersetzt keine Vorbereitung.' },
  { title: 'Der Belag schmilzt nicht richtig?', text: 'Eine zum Überbacken geeignete Sorte wählen und vorher ein Testpfännchen machen. Dünn auflegen; die Hinweise auf der Packung und am Gerät beachten.' },
]
</script>

<template>
  <div class="hosting-guide">
    <section
      id="raclette-party"
      class="party mkt-content"
    >
      <header class="chapter-heading">
        <p class="mkt-label">
          Mehr als ein Essen · Euer Abend zusammen
        </p>
        <h2>Die beste Zutat?<br>Dass du mit am Tisch sitzt.</h2>
        <p>Raclette passt zu einer Party, die sich wie ein langer Abend mit Lieblingsmenschen anfühlen darf. Alle kombinieren selbst, die Vorbereitung lässt sich teilen – und niemand muss für jede neue Runde aufstehen.</p>
      </header>
      <figure class="party-art">
        <img
          src="/images/illustrations/raclette-guide-party.webp"
          alt="Eine vielfältige Runde unterschiedlichen Alters und unterschiedlicher Körperformen, darunter eine Person im Rollstuhl, genießt gemeinsam Raclette."
          width="1536"
          height="1024"
          loading="lazy"
          decoding="async"
        >
        <MarketingAiLabel />
        <figcaption><UIcon name="i-lucide-heart" /><span>Ein Tisch. Viele Lieblingskombinationen.</span></figcaption>
      </figure>
      <div class="benefits">
        <article
          v-for="benefit in benefits"
          :key="benefit.title"
        >
          <UIcon :name="benefit.icon" /><h3>{{ benefit.title }}</h3><p>{{ benefit.text }}</p>
        </article>
      </div>
      <div class="host-note">
        <UIcon name="i-lucide-armchair" /><p><strong>Gemütlich braucht Platz.</strong> Alle sollten ihre Pfännchen erreichen, ohne über die heiße Platte greifen zu müssen. Lasst Wege und Beinfreiheit offen. Stimmt Wünsche und Unverträglichkeiten vorher ab; getrennte Schälchen allein verhindern keinen Kontakt über gemeinsame Utensilien.</p>
      </div>
      <a
        class="guide-link"
        href="#einkaufsliste"
      ><UIcon name="i-lucide-users" /><span>Eure Runde im Mengenplaner auswählen</span></a>
    </section>

    <section
      id="raclette-vorbereiten"
      class="prep-band"
    >
      <div class="mkt-content prep-layout">
        <div class="prep-picture">
          <figure>
            <img
              src="/images/illustrations/raclette-guide-prep.webp"
              alt="Vorbereitete Kartoffelscheiben, Brokkoli, abgetropfter Mais und geschnittenes Gemüse in blauen Schälchen neben Vorratsdosen."
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            ><MarketingAiLabel />
          </figure>
          <div class="prep-caption">
            <UIcon name="i-lucide-check-check" /><span>Vorgaren. Trocknen. Kühl bereithalten.</span>
          </div>
        </div>
        <div>
          <p class="mkt-label">
            Bevor die Gäste klingeln
          </p><h2>Ein bisschen Vorbereitung.<br>Viel mehr Feierabend.</h2>
          <p class="intro">
            Nicht alles muss im Pfännchen von roh zu fertig werden. Eine kleine Vorbereitung macht die erste Runde entspannter.
          </p>
          <ol class="prep-steps">
            <li><strong>Kartoffeln und festes Gemüse vorgaren.</strong><p>Kartoffeln gar kochen und in Scheiben schneiden. Brokkoli, Blumenkohl oder Möhren bissfest vorgaren. So wartet ihr am Tisch nicht auf harte Stücke.</p></li>
            <li><strong>Klein schneiden, gut abtropfen lassen.</strong><p>Paprika, Pilze und Räuchertofu in kleine Stücke vorbereiten. Mais und Eingelegtes abtropfen lassen. Für jede Schale einen eigenen Servierlöffel bereitlegen.</p></li>
            <li><strong>In kleinen Portionen nachlegen.</strong><p>Empfindliche Zutaten und Dips bis zum Essen abgedeckt kühlen. Erst kleine Schalen auf den Tisch stellen und bei Bedarf aus dem Kühlschrank nachfüllen.</p></li>
          </ol>
          <div class="extra-picker">
            <p><strong>Fehlt euch davon noch etwas?</strong><br>Nur bei Bedarf zur Einkaufsliste ergänzen:</p><div>
              <button
                v-for="item in extras"
                :key="item"
                type="button"
                :disabled="extraItems.includes(item)"
                @click="emit('addExtra', item)"
              >
                <UIcon :name="extraItems.includes(item) ? 'i-lucide-check' : 'i-lucide-list-plus'" /><span>{{ item }}{{ extraItems.includes(item) ? ' ergänzt' : '' }}</span>
              </button>
            </div><p class="small">
              Die Ergänzungen stehen oben im Planer und werden mit in shliste übernommen.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      id="raclette-pfaennchen"
      class="pan-section mkt-content"
    >
      <div class="pan-intro">
        <div>
          <p class="mkt-label">
            Kleine Kniffe, bessere Pfännchen
          </p><h2>Weniger stapeln.<br>Mehr goldene Ränder.</h2><p class="intro">
            Lieber eine dünne Lage und danach noch eine Runde. Gemüse und Kartoffeln bleiben erkennbar, der Belag liegt nah an der Wärme – und ihr könnt neue Kombinationen ausprobieren.
          </p><p class="small">
            Wie schnell ein Pfännchen fertig ist, hängt vom Gerät, seiner Temperatur und der Füllung ab. Eine feste Minutenzahl passt deshalb nicht für jeden Tisch.
          </p>
        </div>
        <figure class="pan-picture">
          <div class="pan-art">
            <img
              src="/images/illustrations/raclette-guide-pfaennchen.webp"
              alt="Ein flach belegtes Raclettepfännchen mit Kartoffeln, Pilzen und Paprika unter einer goldenen Schmelzschicht auf einer hitzefesten Unterlage."
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            ><MarketingAiLabel />
          </div><figcaption><UIcon name="i-lucide-layers-2" /><span>Eine gute Schicht statt eines hohen Bergs.</span></figcaption>
        </figure>
      </div>
      <div class="fix-grid">
        <article
          v-for="tip in troubleshooting"
          :key="tip.title"
        >
          <UIcon name="i-lucide-chef-hat" /><h3>{{ tip.title }}</h3><p>{{ tip.text }}</p>
        </article>
      </div>
      <aside class="device-note">
        <UIcon name="i-lucide-plug-zap" /><div>
          <h3>Das Gerät bekommt seinen eigenen Platz.</h3><p>Stabil und auf einer hitzefesten Unterlage aufstellen, Abstand zu Deko und Stoffen halten und das Kabel aus Laufwegen führen. Keine Mehrfachsteckdosen hintereinander schalten. Vorheizen und Reinigen richten sich nach der Anleitung; vor dem Reinigen ausschalten, Stecker ziehen und abkühlen lassen.</p><a
            href="https://www.test.de/Brandschutz-fuer-zu-Hause-4635183-0/"
            rel="noopener noreferrer"
            target="_blank"
          >Hinweise der Stiftung Warentest<UIcon name="i-lucide-book-open" /></a>
        </div>
      </aside>
    </section>

    <section
      id="raclette-reste"
      class="leftovers-band"
    >
      <div class="mkt-content leftovers-layout">
        <div>
          <p class="mkt-label">
            Auch morgen noch eine gute Idee
          </p><h2>Der Abend endet.<br>Die Ideen müssen nicht.</h2><p class="intro">
            Schon beim Einkaufen an den nächsten Tag denken: Eine kleine Reserve im Kühlschrank ist leichter weiterzuverwenden als ein übervoller Tisch. Mit shliste streicht ihr vorhandene Zutaten, bevor ihr Neues kauft.
          </p><a
            class="guide-link"
            href="#einkaufsliste"
          ><UIcon name="i-lucide-refrigerator" /><span>Vorräte prüfen und Einkauf anpassen</span></a>
        </div><div class="leftover-cards">
          <article><UIcon name="i-lucide-cooking-pot" /><div><h3>Kartoffeln und Gemüse werden zur Pfanne.</h3><p>Gut gekühlte, noch einwandfreie Reste mit frischen Kräutern kombinieren und gründlich erhitzen. Auch eine kleine Ofenform ist eine Idee für den nächsten Tag.</p></div></article><article><UIcon name="i-lucide-sandwich" /><div><h3>Brot bekommt eine zweite Runde.</h3><p>Übriges Baguette passt als knusprige Beilage zu Suppe oder als Croûtons zum Salat. Fehlende Ergänzungen kommen auf eure nächste Einkaufsliste.</p></div></article><article><UIcon name="i-lucide-snowflake" /><div><h3>Erst gut aufbewahren, dann weiterplanen.</h3><p>Reste zeitnah abkühlen und abgedeckt kühl stellen. Was lange ungekühlt auf dem Tisch stand, ist keine gute Reserve. Verpackungsangaben beachten und bei zweifelhafter Lagerung nichts für später aufheben.</p></div></article>
        </div>
      </div>
    </section>

    <aside class="guide-sources mkt-content">
      <UIcon name="i-lucide-book-open" /><p>
        Zum Nachlesen: <a
          href="https://verbraucherfenster.hessen.de/ernaehrung/essen-trinken/raclette-in-die-pfaennchen-fertig-los"
          target="_blank"
          rel="noopener noreferrer"
        >Raclette-Tipps beim VerbraucherFenster Hessen</a>, <a
          href="https://www.tuvsud.com/de-de/presse-und-medien/2023/dezember/von-klassisch-bis-vegan-tipps-fuer-das-festliche-raclette"
          target="_blank"
          rel="noopener noreferrer"
        >Lebensmittelhinweise des TÜV SÜD</a> und <a
          href="https://www.bzfe.de/kueche-und-alltag/kochen/reste-verwerten"
          target="_blank"
          rel="noopener noreferrer"
        >Reste verwerten beim BZfE</a>. Die Kombinationen und Planungsideen sind unsere redaktionellen Vorschläge.
      </p>
    </aside>
  </div>
</template>

<style scoped>
.hosting-guide{--guide-line:color-mix(in srgb,var(--demo-accent) 18%,transparent)}
.hosting-guide section[id]{scroll-margin-top:110px}.hosting-guide h2{font-size:clamp(2rem,3.4vw,3.2rem);font-weight:850;line-height:1.1;letter-spacing:-.035em;text-wrap:balance}.hosting-guide h3{font-size:1.35rem;font-weight:800;line-height:1.2}.hosting-guide p{line-height:1.7}.chapter-heading{max-width:790px;margin-bottom:32px}.chapter-heading>p:last-child,.intro{font-size:1.12rem;margin-top:22px}.party{padding-block:45px 70px}.party-art{position:relative;border-radius:30px;overflow:hidden}.party-art img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;object-position:center}.party-art :deep(.ai-label){position:absolute;right:16px;top:16px}.party-art figcaption{position:absolute;bottom:20px;left:20px;display:flex;align-items:center;gap:10px;max-width:calc(100% - 40px);background:var(--md-surface);padding:12px 18px;border-radius:18px;font-size:.9rem}.benefits{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:-1px 24px 0;padding-top:24px}.benefits article{padding:25px;background:var(--demo-soft);border-radius:24px}.benefits .iconify,.fix-grid .iconify{width:26px;height:26px;color:var(--demo-accent);margin-bottom:14px}.benefits h3,.fix-grid h3{margin-bottom:12px}.host-note{display:flex;gap:16px;padding:24px 0 12px;margin-top:16px}.host-note>.iconify{flex:0 0 26px;width:26px;height:26px;color:var(--demo-accent)}.guide-link{display:inline-flex;align-items:center;gap:12px;min-height:48px;color:var(--demo-accent);font-weight:750;line-height:1.4}.guide-link .iconify{flex:0 0 22px;width:22px;height:22px}.prep-band{background:var(--demo-soft);padding-block:65px}.prep-layout{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:60px}.prep-picture{min-width:0;transform:rotate(-1.5deg)}.prep-picture figure{position:relative;border:9px solid var(--md-surface);border-radius:28px;overflow:hidden}.prep-picture img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover}.prep-picture :deep(.ai-label){position:absolute;right:12px;bottom:12px}.prep-caption{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--md-surface);border-radius:18px;margin:-4px 22px 0;padding:18px;box-shadow:0 15px 30px -24px var(--demo-accent);font-weight:700;line-height:1.3}.prep-caption .iconify{flex:0 0 24px;color:var(--demo-accent)}.prep-steps{list-style:decimal;padding-left:22px;margin-top:24px}.prep-steps li{padding-left:7px;margin-top:20px}.prep-steps strong{font-size:1.1rem}.prep-steps p{margin-top:6px}.extra-picker{padding:22px;background:var(--md-surface);border-radius:22px;margin-top:26px}.extra-picker>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.extra-picker button{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;min-height:44px;max-width:100%;border:1px solid var(--guide-line);border-radius:22px;color:var(--demo-accent);font-weight:700;cursor:pointer}.extra-picker button:disabled{cursor:default;background:var(--demo-soft)}.extra-picker .iconify{flex:0 0 18px;width:18px;height:18px}.small{font-size:.85rem;color:var(--md-on-surface-variant);margin-top:14px}.pan-section{padding-block:75px}.pan-intro{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:65px}.pan-picture{position:relative;padding-bottom:20px}.pan-picture img{width:100%;height:auto;border-radius:40% 30% 35% 20%;aspect-ratio:1/1;object-fit:cover}.pan-art{position:relative}.pan-art :deep(.ai-label){position:absolute;right:30px;bottom:46px}.pan-picture figcaption{position:relative;margin:-28px 25px 0;display:flex;align-items:center;gap:10px;background:var(--demo-soft);padding:18px 22px;border-radius:20px;transform:rotate(2deg);font-weight:700;line-height:1.3}.pan-picture figcaption .iconify{flex:0 0 24px;color:var(--demo-accent)}.fix-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:30px}.fix-grid article{padding:26px;border:1px solid var(--guide-line);border-radius:24px}.device-note{display:flex;align-items:flex-start;gap:20px;padding:26px;background:var(--demo-soft);border-radius:22px;margin-top:28px}.device-note>.iconify{width:28px;height:28px;flex:0 0 28px;color:var(--demo-accent)}.device-note p{margin-top:10px}.device-note a{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--demo-accent);text-decoration:underline;text-underline-offset:4px}.leftovers-band{padding-block:60px;background:color-mix(in srgb,var(--demo-soft) 50%,var(--md-background))}.leftovers-layout{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}.leftover-cards{display:grid;gap:15px}.leftover-cards article{display:flex;gap:18px;padding:24px;background:var(--md-surface);border-radius:20px}.leftover-cards .iconify{flex:0 0 25px;width:25px;height:25px;color:var(--demo-accent)}.leftover-cards p{margin-top:10px}.guide-sources{display:flex;gap:12px;padding-block:25px 45px;font-size:.82rem;color:var(--md-on-surface-variant)}.guide-sources>.iconify{flex:0 0 20px;width:20px;height:20px;margin-top:4px}.guide-sources a{text-decoration:underline;text-underline-offset:3px}.hosting-guide :is(a,button):focus-visible{outline:3px solid var(--demo-accent);outline-offset:4px}
@media(max-width:900px){.prep-layout,.pan-intro,.leftovers-layout{gap:30px}.benefits{margin-inline:0}.benefits article,.fix-grid article{padding:20px}}
@media(max-width:750px){.benefits,.prep-layout,.pan-intro,.fix-grid,.leftovers-layout{grid-template-columns:1fr}.party{padding-block:35px 45px}.party-art img{aspect-ratio:3/2}.party-art figcaption{position:relative;left:auto;bottom:auto;max-width:none;border-radius:0;padding:16px}.prep-picture{transform:none;max-width:540px;margin:auto}.prep-picture img{aspect-ratio:3/2}.prep-band,.leftovers-band{padding-block:40px}.pan-section{padding-block:45px}.pan-picture{max-width:520px;margin:auto}.device-note{padding:20px}.device-note a{font-size:.9rem}.chapter-heading>p:last-child,.intro{font-size:1.05rem}.guide-sources{padding-bottom:25px}}
</style>

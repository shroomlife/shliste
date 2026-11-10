<script setup lang="ts">
import { racletteIngredients, racletteAmount } from '~/data/raclette'
import { createImportedList } from '~/db/repositories'

useThemeWorldSchema('raclette')

useSeoMeta({ title: 'Raclette Einkaufsliste für 4, 6 oder 8 Personen', description: 'Plane euren Racletteabend: Einkaufsliste mit anpassbaren Mengen, Pfännchenideen und Vorbereitung. Übernimm eure Auswahl direkt in shliste.', ogImage: 'https://shliste.app/images/illustrations/plant-based-raclette.webp', ogImageWidth: 1536, ogImageHeight: 1024, ogImageAlt: 'Raclettepfännchen mit Pilzen, Paprika und Mais neben Kartoffeln in einer blauen Schale.' })
useHead({ link: [{ rel: 'canonical', href: 'https://shliste.app/themenwelten/raclette' }] })
const guests = ref(4)
const guestScene = computed(() => ({
  src: guests.value === 2 ? '/images/illustrations/raclette-for-two.png' : `/images/illustrations/raclette-for-${guests.value}.webp`,
  caption: `Euer Abend. ${({ 2: 'Zu zweit.', 4: 'Zu viert.', 6: 'Zu sechst.', 8: 'Zu acht.', 10: 'Zu zehnt.', 12: 'Zu zwölft.' } as Record<number, string>)[guests.value]}`,
  alt: `${guests.value} Menschen genießen gemeinsam Raclette an einem gedeckten Tisch mit buntem Gemüse und blauen Keramikschalen.`,
}))
const selected = ref(racletteIngredients.map(item => item.id))
const extras = ref('')
const busy = ref(false)
const message = ref('')
const importedId = ref<string | null>(null)
watch([guests, selected, extras], () => {
  importedId.value = null
  message.value = ''
}, { deep: true })
const groups = ['Die Basis', 'Für die Pfännchen', 'Dazu auf den Tisch']
const items = computed(() => [...racletteIngredients.filter(item => selected.value.includes(item.id)).map(item => `${racletteAmount(item.grams, guests.value)} ${item.name}`), ...extras.value.split('\n').map(item => item.trim()).filter(Boolean)])
const ideas = [
  { number: '01', title: 'Das gemütliche', text: 'Kartoffel · Champignon · Kräuterdip', tip: 'Gegarte Kartoffeln in dünne Scheiben schneiden. Mit Pilzen belegen und Raclette-Scheiben darübergeben.', icon: 'i-lucide-leaf' },
  { number: '02', title: 'Das bunte', text: 'Paprika · Mais · Räuchertofu', tip: 'Paprika klein schneiden, Mais gut abtropfen lassen und Tofu fein würfeln. Lieber flach als randvoll belegen.', icon: 'i-lucide-sun' },
  { number: '03', title: 'Das süße Finale', text: 'Birne · Zimt · dunkle Schokolade', tip: 'Birne dünn aufschneiden und mit etwas Zimt erwärmen. Schokolade ohne Milch dazugeben. Extra-Zutaten in eurer Einkaufsliste ergänzen.', icon: 'i-lucide-sparkles' },
]
async function copy() {
  try {
    await navigator.clipboard.writeText(items.value.join('\n'))
    message.value = 'Deine Einkaufsliste ist kopiert.'
  }
  catch { message.value = 'Kopieren ist gerade nicht möglich. Bitte verwende „In shliste übernehmen“.' }
}
async function openList() {
  if (busy.value || !items.value.length) return
  busy.value = true
  message.value = ''
  try {
    if (!importedId.value) {
      const list = await createImportedList({ name: `Raclette für ${guests.value}`, sourceUrl: 'https://shliste.app/themenwelten/raclette', items: items.value.map(name => ({ name, quantity: 1 })) })
      importedId.value = list.id
    }
    await navigateTo(`/app/lists/${importedId.value}`)
  }
  catch { message.value = importedId.value ? 'Deine Liste ist gespeichert. Das Öffnen hat nicht geklappt – versuche es bitte noch einmal.' : 'Die Liste konnte nicht gespeichert werden. Du kannst deine Auswahl kopieren und es erneut versuchen.' }
  finally { busy.value = false }
}
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="raclette"
    >
      <div class="mkt-content">
        <nav
          class="crumb"
          aria-label="Brotkrumennavigation"
        >
          <NuxtLink to="/themenwelten">Themenwelten</NuxtLink><span aria-hidden="true">/</span><span>Raclette</span>
        </nav>
        <header class="hero">
          <div class="hero-copy">
            <p class="mkt-label">
              Euer Abend. Eure Lieblingspfännchen.
            </p><h1>Alle an einem Tisch.<br><em>Alles auf einer Liste.</em></h1><p class="lead">
              Du kümmerst dich um den schönen Abend. shliste hilft euch, an den Einkauf zu denken. Mit einer Raclette-Einkaufsliste, die zu eurer Runde passt.
            </p><a
              href="#einkaufsliste"
              class="button"
            ><span class="button-label">Eure Einkaufsliste zusammenstellen</span><UIcon name="i-lucide-list-plus" /></a><p class="micro">
              Für Weihnachten, Silvester und lange Winterabende.
            </p>
          </div><figure>
            <ThemeWorldMotion
              theme="raclette"
              poster="/images/illustrations/plant-based-raclette.webp"
              alt="Goldenes Raclettepfännchen mit Pilzen, Paprika und Mais neben Kartoffeln in einer blauen Schale."
              eager
            /><MarketingAiLabel /><figcaption><UIcon name="i-lucide-heart" /><span>Noch eine Runde? Der Abend gehört euch.</span></figcaption>
          </figure>
        </header>
        <div class="route-strip">
          <span><b><span>01</span></b> Eure Runde planen</span><span><b><span>02</span></b> Fehlendes auf die Liste</span><span><b><span>03</span></b> Zusammen einkaufen</span>
        </div>
      </div>
      <section
        id="einkaufsliste"
        class="planner-section"
      >
        <div class="mkt-content planner">
          <div class="planner-copy">
            <p class="mkt-label">
              01 · Vom Plan zur Einkaufsliste
            </p><h2>Wie viele Pfännchen<br>stehen heute am Tisch?</h2><p>Wähle eure Gästezahl. Nimm heraus, was schon da ist, und ergänze eure Wünsche. shliste übernimmt danach genau diese Auswahl.</p><div
              class="guest-scene has-scene"
            >
              <div
                class="guest-scene-art"
              >
                <img
                  :src="guestScene.src"
                  :alt="guestScene.alt"
                  width="1536"
                  height="1024"
                  decoding="async"
                >
                <MarketingAiLabel />
              </div>
              <div class="guest-scene-controls">
                <p
                  class="guest-scene-caption"
                >
                  {{ guestScene.caption }}
                </p>
                <fieldset class="guest-picker">
                  <legend>Für wie viele Personen?</legend><button
                    v-for="count in [2, 4, 6, 8, 10, 12]"
                    :key="count"
                    :aria-pressed="guests === count"
                    @click="guests = count"
                  >
                    <span>{{ count }}</span>
                  </button>
                </fieldset>
              </div>
            </div><p class="note">
              Die Mengen sind ein Startpunkt für Erwachsene mit normalem Appetit, keine feste Portionsregel. Passe sie an eure Runde und weitere Speisen an. Diese Planung rechnet hier auf der Website; die App übernimmt die fertigen Mengen.
            </p>
            <div class="pantry-tip">
              <UIcon name="i-lucide-refrigerator" /><div><strong>Erst in den Kühlschrank schauen.</strong><p>Gewürzgurken schon da? Häkchen raus. So landet nur auf der Liste, was wirklich fehlt.</p></div>
            </div><label
              for="raclette-extras"
              class="extra-label"
            >Was fehlt euch außerdem?</label><textarea
              id="raclette-extras"
              v-model="extras"
              rows="3"
              placeholder="Zum Beispiel Getränke, Birnen, Servietten …&#10;Ein Eintrag pro Zeile"
            />
          </div>
          <div class="shopping-card">
            <div class="list-title">
              <UIcon name="i-lucide-shopping-basket" /><div><small>Eure Einkaufsliste</small><h3>Raclette für {{ guests }}</h3></div><span>{{ items.length }} Einträge</span>
            </div><fieldset
              v-for="group in groups"
              :key="group"
              class="ingredients"
            >
              <legend>{{ group }}</legend><label
                v-for="item in racletteIngredients.filter(entry => entry.group === group)"
                :key="item.id"
                :class="{ omitted: !selected.includes(item.id) }"
              ><input
                v-model="selected"
                type="checkbox"
                :value="item.id"
              ><span>{{ item.name }}</span><strong>{{ racletteAmount(item.grams, guests) }}</strong></label>
            </fieldset><p
              v-if="extras.trim()"
              class="extras-preview"
            >
              Zusätzlich: {{ extras.split('\n').filter(Boolean).join(' · ') }}
            </p><button
              class="button import"
              :disabled="busy || !items.length"
              @click="openList"
            >
              <UIcon name="i-lucide-list-plus" /><span class="button-label">{{ busy ? 'Deine Liste wird angelegt …' : importedId ? 'Angelegte Liste öffnen' : 'In shliste übernehmen' }}</span>
            </button><button
              class="copy"
              :disabled="!items.length"
              @click="copy"
            >
              <span class="button-label">Oder als Text kopieren</span>
            </button><p class="note">
              Legt eine neue Liste in diesem Browser an. Ohne Konto starten; zum gemeinsamen Bearbeiten anmelden und die Liste teilen. Deine Auswahl hier wird beim Neuladen zurückgesetzt.
            </p><p
              role="status"
              class="status"
            >
              {{ message }}
            </p>
          </div>
        </div>
      </section>
      <section class="mkt-content together">
        <div>
          <p class="mkt-label">
            02 · Aus deiner Liste wird eure Liste
          </p><h2>„Ich bringe noch<br>Mais mit.“<br><em>Steht schon drauf.</em></h2><p>Teile eure Liste in shliste. Alle ergänzen ihre Wünsche. Beim Einkaufen hakt ihr ab, was im Korb liegt – so sehen die anderen, was noch fehlt.</p><ol><li>Liste übernehmen und in shliste öffnen.</li><li>Anmelden und die anderen zur Liste einladen.</li><li>Gemeinsam ergänzen und beim Einkauf abhaken.</li></ol><NuxtLink
            to="/anleitungen/einkaufsliste-teilen"
            class="text-link"
          ><span>Das Teilen Schritt für Schritt ansehen</span><UIcon name="i-lucide-users" /></NuxtLink><p class="note">
            Gemeinsame Änderungen brauchen Anmeldung und Internet. Bereits gespeicherte Listen bleiben offline nutzbar; der Abgleich folgt mit Verbindung.
          </p>
          <NuxtLink
            to="/im-alltag/raclette-einkauf"
            class="text-link"
          ><span>Wie Mina und ihre Runde den Einkauf abstimmen</span><UIcon name="i-lucide-book-open" /></NuxtLink>
        </div><MarketingEverydayScene
          story-key="raclette-einkauf"
          moment="together"
        />
      </section>
      <section class="mkt-content ideas">
        <p class="mkt-label">
          03 · Kleine Pfännchen, große Vorfreude
        </p><h2>Eine Basis. Jeder hat sein Lieblingspfännchen.</h2><p>Die ersten beiden Ideen passen zu deiner Liste. Für das süße Finale ergänzt ihr nur noch eure Lieblingszutaten.</p><div class="idea-grid">
          <article
            v-for="idea in ideas"
            :key="idea.number"
          >
            <div class="idea-top">
              <span>{{ idea.number }}</span><UIcon :name="idea.icon" />
            </div><h3>{{ idea.title }}</h3><strong>{{ idea.text }}</strong><p>{{ idea.tip }}</p>
          </article>
        </div><p class="note">
          Beim Einkauf die Zutaten der Raclette-Scheiben, des Brots, der Dips und der Schokolade prüfen. Für den Belag eine ausdrücklich zum Schmelzen geeignete Sorte wählen und vor dem Abend ein Pfännchen testen.
        </p><NuxtLink
          to="/rezeptideen"
          class="text-link"
        ><span>Noch mehr Ideen für eure Küche</span><UIcon name="i-lucide-book-open" /></NuxtLink>
      </section>
      <RacletteHostingGuide
        :extra-items="extras.split('\n').map(item => item.trim())"
        @add-extra="item => { extras = [...extras.split('\n').filter(Boolean), item].join('\n') }"
      />
      <section class="mkt-content preparation">
        <div>
          <p class="mkt-label">
            Damit du mit am Tisch sitzt
          </p><h2>Ein bisschen vorbereiten.<br>Ganz viel Abend haben.</h2><p>Weihnachten mit der Familie oder Silvester im Freundeskreis: Klärt vorher, wer mitisst, welche Zutaten alle mögen und ob jemand etwas nicht verträgt.</p>
        </div><ol><li><span>Am Vortag</span><h3>Gemeinsam kurz durchgehen.</h3><p>Vorräte prüfen, Liste teilen und Besorgungen absprechen. Gerät, Pfännchen und Sitzplätze zählen.</p></li><li><span>Vor dem Klingeln</span><h3>Alles in kleine Schälchen.</h3><p>Kartoffeln garen, Gemüse schneiden und Mais abtropfen lassen. Dips bis zum Essen kühlen. Gerät nach Herstellerangaben aufstellen.</p></li><li><span>Wenn alle da sind</span><h3>Weniger stapeln. Mehr genießen.</h3><p>Pfännchen nicht überfüllen, Schälchen nach Bedarf nachfüllen und die nächste Kombination einfach gemeinsam erfinden.</p></li><li><span>Am nächsten Tag</span><h3>Aus Resten wird ein neuer Plan.</h3><p>Übrig gebliebene Zutaten zeitnah kühl lagern. Kartoffeln und Gemüse passen in eine Pfanne; fehlende Zutaten ergänzt ihr in shliste.</p></li></ol>
      </section>
      <section class="mkt-content faq">
        <p class="mkt-label">
          Noch kurz geklärt
        </p><h2>Fragen vor dem ersten Pfännchen.</h2><details><summary>Was gehört auf eine Raclette-Einkaufsliste?</summary><p>Kartoffeln, schmelzfähige Raclette-Scheiben, Gemüse, Brot und Dips bilden hier die Basis. Dazu kommen eure Getränke und bei Bedarf Zubehör. Oben könnt ihr alles für eure Runde anpassen.</p></details><details><summary>Wie plane ich Raclette für 4, 6 oder 8 Personen?</summary><p>Wähle oben die Personenanzahl. Die Mengen in dieser Beispielplanung ändern sich mit. Prüfe anschließend Appetit, Beilagen und Vorräte, bevor du die Liste übernimmst.</p></details><details><summary>Kann ich direkt mit der Liste einkaufen?</summary><p>Ja. „In shliste übernehmen“ legt eine echte Einkaufsliste in deinem Browser an und öffnet sie. Dort kannst du Einträge ändern, ergänzen und abhaken. Mit Konto und Internet lässt sie sich gemeinsam nutzen.</p></details><details><summary>Wie hilft shliste bei der Vorbereitung?</summary><p>shliste sammelt eure Besorgungen an einem Ort. Ihr ergänzt Wünsche, teilt die Liste und hakt Einkäufe ab. Wer etwas mitbringt, sprecht ihr miteinander ab.</p></details>
      </section>
      <div class="mkt-content closing">
        <UIcon name="i-lucide-heart" /><h2>Der schönste Teil steht<br>auf keiner Liste.</h2><p>Aber alles davor könnt ihr gemeinsam abhaken.</p><a
          href="#einkaufsliste"
          class="button"
        ><span class="button-label">Euren Racletteabend planen</span><UIcon name="i-lucide-cooking-pot" /></a>
      </div>
      <div class="mkt-content baking-crosslink">
        <NuxtLink
          class="text-link"
          to="/themenwelten/plaetzchen-backen"
        ><UIcon name="i-lucide-cookie" /><span>Vor dem Racletteabend: gemeinsam Plätzchen backen</span></NuxtLink>
      </div>
      <MarketingWaitlistSection />
    </main>
  </MarketingChrome>
</template>

<style scoped>
.raclette{--theme-line:color-mix(in srgb,var(--demo-accent) 16%,transparent)}.crumb{display:flex;gap:12px;font-size:.875rem;padding-top:26px;color:var(--md-on-surface-variant)}.crumb a{text-decoration:underline;text-underline-offset:4px}.hero{display:grid;grid-template-columns:1fr 1fr;gap:45px;align-items:center;padding:48px 0}.hero h1{font-size:clamp(2.8rem,4.4vw,4.5rem);font-weight:900;letter-spacing:-.05em;line-height:1.06}.raclette em{font-style:normal;color:var(--demo-accent)}.lead{font-size:1.2rem;line-height:1.7;margin:25px 0}.button{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--demo-accent);color:white;padding:16px 23px;border-radius:30px;font-weight:750;min-height:52px;cursor:pointer;text-align:center}.micro{font-size:.85rem;margin-top:16px;color:var(--md-on-surface-variant)}.hero figure{position:relative;transform:rotate(2deg);padding:10px 10px 0;border-radius:28px;background:var(--demo-soft)}.hero :deep(.theme-motion){border-radius:20px;width:100%;height:390px;object-fit:cover}.hero figcaption{display:flex;justify-content:center;align-items:center;gap:8px;padding:17px 6px;font-size:.9rem}.hero :deep(.ai-label){position:absolute;right:20px;bottom:65px}.route-strip{display:flex;justify-content:space-between;gap:20px;padding:20px 0 35px}.route-strip>span{display:flex;align-items:center;gap:12px;font-weight:650}.route-strip b{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--demo-soft);color:var(--demo-accent);font-size:.8rem}.planner-section{background:color-mix(in srgb,var(--demo-soft) 45%,var(--md-background));padding:70px 0;scroll-margin-top:90px}.planner{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:start}.raclette h2{font-size:clamp(2rem,3.4vw,3.2rem);line-height:1.12;letter-spacing:-.035em;font-weight:850}.planner-copy>p:not(.mkt-label),.together>div>p:not(.mkt-label):not(.note),.preparation>div>p:not(.mkt-label){font-size:1.125rem;line-height:1.75;margin-block:22px}.guest-picker{border:0;padding:0;margin:30px 0 20px;display:flex;gap:8px;flex-wrap:wrap}.guest-picker legend{font-size:1rem;font-weight:750;margin-bottom:13px}.guest-picker button{width:51px;height:49px;border:1px solid var(--theme-line);border-radius:15px;background:var(--md-surface);font-weight:750;cursor:pointer}.guest-picker button[aria-pressed=true]{background:var(--demo-accent);color:white}.raclette .note{font-size:.83rem!important;line-height:1.65!important;color:var(--md-on-surface-variant);margin:16px 0!important}.pantry-tip{display:flex;gap:17px;padding:23px;background:var(--md-surface);border-radius:20px;margin-top:30px}.pantry-tip>.iconify{width:28px;height:28px;flex-shrink:0;color:var(--demo-accent)}.pantry-tip p{margin-top:8px;line-height:1.6;font-size:.95rem}.extra-label{display:block;font-weight:750;margin:25px 0 10px}.planner textarea{width:100%;padding:16px;border:1px solid var(--theme-line);border-radius:16px;background:var(--md-surface);resize:vertical;font:inherit}.shopping-card{padding:30px;border:1px solid var(--theme-line);background:var(--md-surface);border-radius:28px;box-shadow:0 18px 60px -35px var(--demo-accent)}.list-title{display:flex;gap:14px;align-items:center;padding-bottom:22px;border-bottom:1px solid var(--theme-line)}.list-title>.iconify{width:28px;height:28px;color:var(--demo-accent)}.list-title small{font-size:.75rem;color:var(--md-on-surface-variant)}.list-title h3{font-size:1.5rem;font-weight:800}.list-title>span:not(.iconify){font-size:.75rem;margin-left:auto}.ingredients{border:0;padding:0;margin:22px 0}.ingredients legend{font-weight:750;color:var(--demo-accent);font-size:.85rem;margin-bottom:8px}.ingredients label{display:grid;grid-template-columns:20px 1fr auto;gap:11px;align-items:center;min-height:52px;cursor:pointer;border-bottom:1px solid var(--theme-line);font-size:.95rem}.ingredients input{appearance:auto;accent-color:var(--demo-accent);width:18px;height:18px}.ingredients strong{font-size:.85rem;white-space:nowrap}.ingredients .omitted span{text-decoration:line-through;opacity:.55}.import{width:100%}.copy{display:block;margin:10px auto 0;min-height:44px;text-decoration:underline;text-underline-offset:4px;cursor:pointer;color:var(--demo-accent)}button:disabled{opacity:.5;cursor:default}.status{font-size:.9rem;color:var(--demo-accent)}.extras-preview{font-size:.9rem;margin-bottom:20px;overflow-wrap:anywhere}.together{display:grid;grid-template-columns:.9fr 1.1fr;gap:60px;padding-block:80px;align-items:center}.together ol{list-style:decimal;padding-left:22px;line-height:1.8;margin-bottom:22px}.text-link{display:inline-block;font-weight:750;color:var(--demo-accent);padding-block:10px}.ideas{padding-block:25px 65px}.ideas>p:not(.mkt-label){max-width:780px;margin-block:20px;line-height:1.7}.idea-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:30px}.idea-grid article{border-radius:24px;background:var(--demo-soft);padding:28px}.idea-top{display:flex;justify-content:space-between;align-items:center;color:var(--demo-accent)}.idea-top span{font-size:.85rem;font-weight:800}.idea-top .iconify{width:30px;height:30px}.idea-grid h3{font-size:1.6rem;font-weight:800;margin:25px 0 12px}.idea-grid strong{font-size:.9rem}.idea-grid p{font-size:.98rem;line-height:1.7;margin-top:16px}.preparation{display:grid;grid-template-columns:1fr 1fr;gap:70px;border-top:1px solid var(--theme-line);padding-block:60px}.preparation ol{list-style:none;padding:0}.preparation li{border-left:2px solid var(--theme-line);padding:0 0 32px 27px}.preparation li>span{font-size:.8rem;color:var(--demo-accent);font-weight:750}.preparation h3{font-size:1.25rem;font-weight:800;margin:7px 0}.preparation li p{line-height:1.7}.faq{max-width:850px;padding-block:20px 60px}.faq h2{margin-bottom:25px}.faq details{border-bottom:1px solid var(--theme-line);padding-block:20px}.faq summary{font-weight:750;cursor:pointer;font-size:1.1rem}.faq details p{line-height:1.75;margin-top:15px}.closing{text-align:center;background:var(--demo-soft);border-radius:30px;padding:50px 20px;margin-bottom:65px}.closing>.iconify{width:32px;height:32px;color:var(--demo-accent);margin-bottom:20px}.closing p{margin:20px 0 25px;font-size:1.1rem}.raclette :is(a,button,input,textarea,summary):focus-visible{outline:3px solid var(--demo-accent);outline-offset:4px}@media(max-width:1000px){.planner,.together,.preparation{gap:30px}.hero{gap:25px}.hero :deep(.theme-motion){height:350px}.shopping-card{padding:22px}.idea-grid article{padding:22px}}@media(max-width:800px){.hero,.planner,.together,.preparation{grid-template-columns:1fr}.hero{padding-top:30px}.hero figure{transform:none}.hero :deep(.theme-motion){height:auto;max-height:430px}.route-strip{flex-wrap:wrap;gap:14px}.route-strip>span{font-size:.9rem}.planner-section{padding-block:45px}.together{padding-block:55px}.idea-grid{grid-template-columns:1fr}.idea-grid article{padding:25px}.idea-grid h3{margin-top:15px}.preparation{padding-block:40px}.list-title>span:not(.iconify){font-size:.7rem}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
/* Zain's generous descender space needs optical centering inside compact controls. */
.button{max-width:100%;font-size:1rem;line-height:1.25;padding:16px 22px;min-height:54px;transition:background-color .18s,box-shadow .18s}.button-label{display:block;min-width:0;transform:translateY(.08em)}.button>.iconify{width:20px;height:20px;flex:0 0 20px}.copy{display:flex;justify-content:center;align-items:center;line-height:1.25;padding:10px 12px}.hero figcaption{line-height:1.4;min-height:56px}.hero figcaption>.iconify{width:18px;height:18px;flex:0 0 18px}.hero figcaption>span{display:block;transform:translateY(.08em)}.route-strip>span{min-width:0;line-height:1.35}.route-strip b{flex:0 0 34px;line-height:1}.route-strip b>span{display:block;font-family:Arial,sans-serif;font-size:12px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}.guest-picker{display:grid;grid-template-columns:repeat(6,minmax(44px,1fr));gap:8px;max-width:360px}.guest-picker button{display:grid;place-items:center;width:100%;height:50px;line-height:1;padding:0;font-size:1.0625rem;transition:background-color .18s,border-color .18s}.guest-picker button>span{display:block;transform:translateY(.122em)}.planner>*,.together>*{min-width:0}.together :deep(.everyday-scene){grid-column:auto;margin:0}.ingredients label{grid-template-columns:20px minmax(0,1fr) auto;padding-block:9px;line-height:1.4}.ingredients label>span{min-width:0;overflow-wrap:break-word;hyphens:auto}.ingredients strong{font-variant-numeric:tabular-nums}.list-title>div{min-width:0}.list-title>.iconify{flex-shrink:0}.list-title>span:not(.iconify){flex-shrink:0;white-space:nowrap}.status:not(:empty){margin-top:14px;line-height:1.5}.hero h1,.raclette h2{text-wrap:balance}.faq summary{line-height:1.4;padding-right:10px}
@supports(text-box-trim:trim-both){.button-label,.hero figcaption>span,.guest-picker button>span{text-box-trim:trim-both;text-box-edge:cap alphabetic;transform:none}}
@media(hover:hover){.button:hover{background:color-mix(in srgb,var(--demo-accent) 90%,black);box-shadow:0 6px 18px -12px var(--demo-accent)}.guest-picker button:not([aria-pressed=true]):hover{border-color:var(--demo-accent);background:var(--demo-soft)}}
@media(max-width:1000px){.together{grid-template-columns:minmax(0,1fr);align-items:start}.together>div{max-width:700px}}
@media(max-width:420px){.guest-picker{grid-template-columns:repeat(3,minmax(44px,1fr));max-width:290px}.hero .button,.closing .button{width:100%}.shopping-card{padding:20px}.hero h1{font-size:clamp(2.5rem,10.5vw,2.8rem)}}
@media(prefers-reduced-motion:reduce){.button,.guest-picker button{transition:none}}
.together{align-items:start}.together :deep(.mini-scene-narration){min-height:86px;padding-block:18px}
.guest-scene{margin-block:28px 20px}.guest-scene-art{position:relative;margin-inline:-12px;transform:rotate(-1.5deg);border-radius:42px 42px 24px 24px;overflow:hidden;box-shadow:0 18px 40px -30px var(--demo-accent)}
.guest-scene-art img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}.guest-scene-art :deep(.ai-label){position:absolute;right:14px;bottom:48px}
.guest-scene-controls{position:relative}.guest-scene .guest-picker{margin:0}.has-scene .guest-scene-controls{margin:-36px 18px 0;padding:20px 24px 24px;border:1px solid var(--theme-line);border-radius:24px;background:var(--md-surface);box-shadow:0 12px 32px -24px var(--demo-accent)}
.guest-scene-caption{font-size:1.45rem;font-weight:800;line-height:1.2;margin-bottom:16px;color:var(--demo-accent)}.has-scene .guest-picker{max-width:none}.has-scene .guest-picker legend{font-size:.9rem;margin-bottom:10px}.has-scene .guest-picker button{border-radius:50%;aspect-ratio:1;height:auto;min-height:44px;max-width:54px}
@media(max-width:420px){.guest-scene-art{margin-inline:0;border-radius:28px}.has-scene .guest-scene-controls{margin:-22px 8px 0;padding:18px}.has-scene .guest-picker{grid-template-columns:repeat(3,minmax(44px,1fr));max-width:none}.has-scene .guest-picker button{max-width:none;border-radius:14px;aspect-ratio:auto;height:44px}.guest-scene-caption{font-size:1.3rem}}
.text-link{display:inline-flex;align-items:center;gap:10px}.text-link>.iconify{width:20px;height:20px;flex:0 0 20px}.baking-crosslink{padding-bottom:40px;text-align:center}
</style>

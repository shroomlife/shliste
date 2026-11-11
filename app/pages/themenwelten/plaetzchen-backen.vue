<script setup lang="ts">
import { bakingRecipes, combineBakingIngredients, bakingAmount } from '~/data/christmasBaking'
import { createImportedList } from '~/db/repositories'

useThemeWorldSchema('baking')

useSeoMeta({ title: 'Plätzchen backen: Rezepte & gemeinsame Einkaufsliste', description: 'Plant eure Weihnachtsbäckerei: drei Plätzchenvarianten, automatisch gebündelte Zutaten, bebilderte Backtipps und eine gemeinsame Einkaufsliste in shliste.', ogImage: 'https://shliste.app/images/illustrations/plaetzchen-backen.webp', ogImageWidth: 1536, ogImageHeight: 1024, ogImageAlt: 'Eine vielfältige Runde backt gemeinsam Weihnachtsplätzchen.' })
useHead({ link: [{ rel: 'canonical', href: 'https://shliste.app/themenwelten/plaetzchen-backen' }] })
const chosen = ref(['vanille', 'schoko', 'marmelade'])
const batches = ref(1)
const pantry = ref<string[]>([])
const extras = ref('')
const busy = ref(false)
const status = ref('')
const imported = ref<string | null>(null)
const ingredients = computed(() => combineBakingIngredients(chosen.value, batches.value))
const extraLines = computed(() => extras.value.split('\n').map(line => line.trim()).filter(Boolean))
const shopping = computed(() => [...ingredients.value.filter(item => !pantry.value.includes(item.id)).map(item => `${bakingAmount(item)} ${item.name}`), ...extraLines.value])
const cookieCount = computed(() => chosen.value.length * batches.value * 30)
watch([chosen, batches, pantry, extras], () => {
  imported.value = null
  status.value = ''
}, { deep: true })
async function openList() {
  if (busy.value || !shopping.value.length) return
  busy.value = true
  status.value = ''
  try {
    if (!imported.value) {
      const list = await createImportedList({ name: 'Unsere Weihnachtsbäckerei', sourceUrl: 'https://shliste.app/themenwelten/plaetzchen-backen', items: shopping.value.map(name => ({ name, quantity: 1 })) })
      imported.value = list.id
    }
    await navigateTo(`/app/lists/${imported.value}`)
  }
  catch { status.value = imported.value ? 'Die Liste ist gespeichert. Bitte versuche noch einmal, sie zu öffnen.' : 'Die Liste konnte nicht gespeichert werden. Du kannst sie als Text kopieren.' }
  finally { busy.value = false }
}
async function copyList() {
  try {
    await navigator.clipboard.writeText(shopping.value.join('\n'))
    status.value = 'Eure Einkaufsliste ist kopiert.'
  }
  catch { status.value = 'Kopieren ist gerade nicht möglich. Bitte nutze „In shliste übernehmen“.' }
}
const faq = [
  { q: 'Was brauche ich zum Plätzchenbacken?', a: 'Für diese drei Sorten bilden Mehl, Backmargarine ohne Milchbestandteile, Zucker, Vanillezucker, Haferdrink und Salz die Basis. Kakao und Konfitüre kommen je nach Auswahl dazu. Prüfe außerdem Backbleche, Backpapier, Waage, Nudelholz, Ausstechformen und Dosen. Zubehör lässt sich im Feld für eigene Ergänzungen auf die Liste setzen.' },
  { q: 'Welche Margarine eignet sich für den Teig?', a: 'Nimm feste Backmargarine aus Raps- oder Sonnenblumenöl mit etwa 80 Prozent Fett. Halbfettprodukte enthalten mehr Wasser und verändern den Teig. Die genaue Menge findest du in der jeweils ausgewählten Rezeptvariante.' },
  { q: 'Wie viele Plätzchen ergeben die Rezepte?', a: 'Eine Portion pro Sorte ergibt ungefähr 30 kleine Plätzchen. Alle drei Sorten zusammen ergeben etwa 90 Stück. Größe, Dicke und Ausstechform verändern die tatsächliche Menge. Die Auswahl im Planer vervielfacht die Zutaten; die Anleitungen unten beschreiben jeweils eine Portion.' },
  { q: 'Bei welcher Temperatur und wie lange backe ich Plätzchen?', a: 'Diese Rezepte verwenden 175 °C Ober-/Unterhitze im vorgeheizten Ofen. Sterne und Schoko-Taler brauchen ungefähr 10–12 Minuten, Marmeladen-Küsschen 12–15 Minuten. Backe ein Blech nach dem anderen auf mittlerer Schiene. Ofen und Teigdicke beeinflussen die Zeit; das erste Blech früh kontrollieren.' },
  { q: 'Kann ich den Teig vorbereiten?', a: 'Du kannst die Teige am Vortag zubereiten und gut abgedeckt im Kühlschrank aufbewahren. Sehr festen Teig vor dem Formen kurz geschmeidig werden lassen. Rohes Mehl und rohen Teig nicht naschen; genossen wird nach dem Backen und Abkühlen.' },
  { q: 'Wie hilft shliste beim gemeinsamen Backen?', a: 'Wähle eure Sorten und Mengen, streiche vorhandene Zutaten und übernimm die Einkaufsliste. Zum Teilen meldet ihr euch in shliste an und ladet die anderen zur Liste ein. Alle können fehlende Dinge ergänzen und Gekauftes abhaken. Wer welche Zutat besorgt, sprecht ihr miteinander ab.' },
]
</script>

<template>
  <MarketingChrome>
    <main
      id="inhalt"
      class="baking"
    >
      <div class="mkt-content">
        <nav
          class="crumb"
          aria-label="Brotkrumennavigation"
        >
          <NuxtLink to="/themenwelten">Themenwelten</NuxtLink><span>/</span><span>Weihnachtsbäckerei</span>
        </nav>
        <header class="hero">
          <div>
            <p class="mkt-label">
              Plätzchen backen. Gemeinsam vorbereitet.
            </p><h1>Mehl an den Händen.<br><em>Weniger im Kopf.</em></h1><p class="lead">
              Drei Lieblingssorten. Eine gemeinsame Einkaufsliste. Plant euren Backnachmittag mit shliste – damit ihr später nur noch entscheiden müsst, wer den ersten Stern bekommt.
            </p><a
              class="button"
              href="#backplan"
            ><span>Euren Backnachmittag planen</span><UIcon name="i-lucide-cookie" /></a><p class="small">
              Für die Adventszeit, volle Keksdosen und kleine Geschenke.
            </p>
          </div>
          <figure class="hero-art">
            <ThemeWorldMotion
              theme="baking"
              poster="/images/illustrations/plaetzchen-backen.webp"
              alt="Eine vielfältige Runde aus drei Erwachsenen und einem Kind backt gemeinsam Plätzchen in einer gemütlichen Küche."
              eager
            /><MarketingAiLabel /><figcaption><UIcon name="i-lucide-heart" /><span>Die schönsten Zutaten bringt ihr selbst mit.</span></figcaption>
          </figure>
        </header>
        <nav
          class="section-nav"
          aria-label="Auf dieser Seite"
        >
          <a href="#backplan"><UIcon name="i-lucide-list-checks" /><span>Einkauf planen</span></a><a href="#rezepte"><UIcon name="i-lucide-cookie" /><span>Drei Sorten backen</span></a><a href="#vorbereitung"><UIcon name="i-lucide-chef-hat" /><span>Backtipps entdecken</span></a><a href="#verschenken"><UIcon name="i-lucide-gift" /><span>Freude teilen</span></a>
        </nav>
      </div>

      <section
        id="backplan"
        class="planner-band"
      >
        <div class="mkt-content planner">
          <div>
            <p class="mkt-label">
              01 · Eure Weihnachtsbäckerei beginnt hier
            </p><h2>Was kommt in<br>eure Keksdose?</h2><p class="intro">
              Wählt eure Sorten. shliste zählt gemeinsame Zutaten zusammen: Mehl steht einmal auf der Liste, auch wenn ihr drei Sorten backt.
            </p>
            <fieldset class="recipe-picker">
              <legend>Eure Plätzchensorten</legend><label
                v-for="recipe in bakingRecipes"
                :key="recipe.id"
                :class="{ selected: chosen.includes(recipe.id) }"
              ><input
                v-model="chosen"
                type="checkbox"
                :value="recipe.id"
              ><img
                :src="recipe.image"
                :alt="recipe.alt"
                width="1536"
                height="1024"
                loading="lazy"
              ><span><strong>{{ recipe.name }}</strong><small>Ca. 30 Stück je Portion</small></span><UIcon :name="chosen.includes(recipe.id) ? 'i-lucide-circle-check' : 'i-lucide-circle-plus'" /></label>
            </fieldset>
            <fieldset class="batch-picker">
              <legend>Wie viel möchtet ihr backen?</legend><button
                v-for="count in [1, 2, 3]"
                :key="count"
                :aria-pressed="batches === count"
                @click="batches = count"
              >
                <span>{{ count }} {{ count === 1 ? 'Portion' : 'Portionen' }} je Sorte</span>
              </button>
            </fieldset>
            <p
              class="yield"
              aria-live="polite"
            >
              <UIcon name="i-lucide-cookie" /><span>{{ chosen.length ? `Das ergibt ungefähr ${cookieCount} kleine Plätzchen.` : 'Wählt mindestens eine Sorte für euren Backplan.' }}</span>
            </p>
            <p class="small">
              Die Stückzahl hängt von Größe und Dicke ab. Der Planer rechnet hier auf der Website; die App übernimmt die fertigen Mengen.
            </p>
            <label
              class="extra-label"
              for="baking-extras"
            >Was fehlt euch außerdem?</label><textarea
              id="baking-extras"
              v-model="extras"
              rows="3"
              placeholder="Zum Beispiel Backpapier, Puderzucker, Zitrone, dunkle Schokolade ohne Milch …&#10;Ein Eintrag pro Zeile"
            />
          </div>
          <div class="shopping-card">
            <div class="card-title">
              <UIcon name="i-lucide-shopping-basket" /><div><small>Euer gemeinsamer Einkauf</small><h3>Die Weihnachtsbäckerei</h3></div>
            </div><div class="list-explainer">
              <UIcon name="i-lucide-package-check" /><p>Schon im Schrank? Häkchen setzen.<br><strong>Nur Fehlendes kommt in die App.</strong></p>
            </div>
            <div
              v-if="ingredients.length"
              class="ingredient-list"
            >
              <label
                v-for="item in ingredients"
                :key="item.id"
                :class="{ stocked: pantry.includes(item.id) }"
              ><input
                v-model="pantry"
                type="checkbox"
                :value="item.id"
                :aria-label="`${item.name} bereits vorhanden`"
              ><span>{{ item.name }}</span><strong>{{ bakingAmount(item) }}</strong></label>
            </div><p
              v-else
              class="empty"
            >
              Eure Zutaten erscheinen hier, sobald ihr eine Sorte auswählt.
            </p>
            <div
              v-if="extraLines.length"
              class="extras-preview"
            >
              <strong>Eure Ergänzungen</strong><ul>
                <li
                  v-for="(line, index) in extraLines"
                  :key="index"
                >
                  {{ line }}
                </li>
              </ul>
            </div>
            <p
              class="list-count"
              aria-live="polite"
            >
              {{ shopping.length }} {{ shopping.length === 1 ? 'Eintrag' : 'Einträge' }} für eure Liste
            </p><button
              class="button import"
              :disabled="busy || !shopping.length"
              @click="openList"
            >
              <UIcon name="i-lucide-list-plus" /><span>{{ busy ? 'Eure Liste wird angelegt …' : imported ? 'Angelegte Liste öffnen' : 'In shliste übernehmen' }}</span>
            </button><button
              class="copy"
              :disabled="!shopping.length"
              @click="copyList"
            >
              <UIcon name="i-lucide-copy" /><span>Als Text kopieren</span>
            </button><p
              role="status"
              class="small"
            >
              {{ status }}
            </p><p class="small">
              Erstellt eine neue Liste in diesem Browser. Ohne Konto starten; zum gemeinsamen Bearbeiten anmelden und teilen. Die Auswahl auf dieser Seite wird beim Neuladen zurückgesetzt.
            </p>
          </div>
        </div>
      </section>

      <section class="mkt-content app-story">
        <div>
          <p class="mkt-label">
            02 · Aus einem Plan wird euer Nachmittag
          </p><h2>„Mehl bringe ich mit.“<br><em>Gut, dass alle es sehen.</em></h2><p class="intro">
            Eine Person plant, eine schaut in den Vorratsschrank, eine geht einkaufen. Eure gemeinsame Liste hält fest, was noch fehlt – bis das letzte Päckchen im Korb liegt.
          </p><NuxtLink
            class="text-link"
            to="/anleitungen/einkaufsliste-teilen"
          ><span>So teilt ihr eure Einkaufsliste</span><UIcon name="i-lucide-users" /></NuxtLink><p class="small">
            Gemeinsame Änderungen brauchen Anmeldung und Internet. Gespeicherte Listen bleiben offline nutzbar; der Abgleich folgt mit Verbindung.
          </p>
        </div><ol class="app-steps">
          <li><UIcon name="i-lucide-list-plus" /><div><h3>Plan übernehmen</h3><p>Eure ausgewählten Zutaten landen als bearbeitbare Einträge in einer neuen shliste-Liste.</p></div></li><li><UIcon name="i-lucide-users" /><div><h3>Zusammen ergänzen</h3><p>Anmelden, die Liste teilen und Wünsche ergänzen. Vielleicht fehlt noch der Kakao für die Backpause?</p></div></li><li><UIcon name="i-lucide-check-check" /><div><h3>Beim Einkauf abhaken</h3><p>Gekauftes abhaken. So sehen die anderen, was noch offen ist. Die Aufgaben verteilt ihr im Gespräch.</p></div></li>
        </ol>
      </section>

      <section
        id="rezepte"
        class="mkt-content recipes"
      >
        <p class="mkt-label">
          03 · Drei Sorten, viele Lieblingsmomente
        </p><h2>Ein Blech voller Vorfreude.</h2><p class="intro">
          Drei Varianten unseres Rezepts Weihnachtsplätzchen. Jede Portion ergibt ungefähr 30 kleine Stücke. Im Rezept wählst du deine Sorte und bekommst die passende bebilderte Anleitung; hier plant ihr den gemeinsamen Einkauf.
        </p><div class="recipe-grid">
          <article
            v-for="recipe in bakingRecipes"
            :id="`rezept-${recipe.id}`"
            :key="recipe.id"
          >
            <figure>
              <img
                :src="recipe.image"
                :alt="recipe.alt"
                width="1536"
                height="1024"
                loading="lazy"
              ><MarketingAiLabel />
            </figure><div class="recipe-body">
              <p class="mkt-label">
                175 °C Ober-/Unterhitze · {{ recipe.time }}
              </p><h3>{{ recipe.name }}</h3><p>{{ recipe.subtitle }}</p><NuxtLink
                class="text-link"
                :to="`/rezepte/weihnachtsplaetzchen?variante=${recipe.id}#varianten`"
              ><UIcon name="i-lucide-book-open" /><span>Diese Variante Schritt für Schritt backen</span></NuxtLink>
            </div>
          </article>
        </div><p class="small">
          Backzeiten sind Richtwerte: Ofen, Größe und Teigdicke machen einen Unterschied. Das erste Blech früh kontrollieren. Bei bröseligem Teig Haferdrink teelöffelweise ergänzen; klebrigen Teig erneut kühlen. Optionaler Guss, Schokolade und Dekor sind nicht automatisch in der Einkaufsliste enthalten.
        </p>
      </section>

      <ChristmasBakingGuide
        :extra-items="extraLines"
        @add-extra="item => { extras = [...extraLines, item].join('\n') }"
      />

      <section class="mkt-content faq">
        <p class="mkt-label">
          Noch kurz geklärt
        </p><h2>Vor dem ersten Blech.</h2><details
          v-for="item in faq"
          :key="item.q"
        >
          <summary>{{ item.q }}<UIcon name="i-lucide-chevron-down" /></summary><p>{{ item.a }}</p>
        </details>
      </section>
      <section class="mkt-content closing">
        <UIcon name="i-lucide-cookie" /><h2>Die Küche wird voll.<br>Der Kopf darf frei bleiben.</h2><p>Stellt eure Sorten zusammen. Den Einkauf nehmt ihr mit.</p><a
          href="#backplan"
          class="button"
        ><span>Eure Backliste zusammenstellen</span><UIcon name="i-lucide-list-checks" /></a><NuxtLink
          class="text-link"
          to="/themenwelten/raclette"
        ><span>Und am Abend? Gemeinsam Raclette.</span><UIcon name="i-lucide-cooking-pot" /></NuxtLink>
      </section>
      <MarketingWaitlistSection />
    </main>
  </MarketingChrome>
</template>

<style scoped>
.baking{--line:color-mix(in srgb,var(--demo-accent) 18%,transparent)}.crumb{display:flex;flex-wrap:wrap;gap:12px;padding-top:26px;font-size:.875rem;color:var(--md-on-surface-variant)}.crumb a{display:inline-block;padding-block:4px;margin-block:-4px;text-decoration:underline;text-underline-offset:4px}.hero{display:grid;grid-template-columns:1fr 1.08fr;gap:48px;align-items:center;padding-block:50px}.baking h1{font-size:clamp(2.8rem,4.6vw,4.6rem);line-height:1.04;font-weight:900;letter-spacing:-.045em}.baking h2{font-size:clamp(2rem,3.4vw,3.2rem);line-height:1.1;letter-spacing:-.03em;font-weight:850}.baking h1,.baking h2{text-wrap:balance}.baking em{font-style:normal;color:var(--demo-accent)}.lead{font-size:1.2rem;line-height:1.7;margin-block:25px}.intro{font-size:1.1rem;line-height:1.75;margin-block:22px;max-width:780px}.small{font-size:.85rem;color:var(--md-on-surface-variant);line-height:1.65;margin-top:16px}.button{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:54px;padding:15px 24px;max-width:100%;border-radius:30px;background:var(--demo-accent);color:white;font-weight:750;line-height:1.3;text-align:center;cursor:pointer}.button>span,.text-link>span,.copy>span{padding-top:.16em}.button>.iconify,.text-link>.iconify,.copy>.iconify{flex:0 0 20px;width:20px;height:20px}.hero-art{position:relative;padding:10px 10px 0;background:var(--demo-soft);border-radius:35px;transform:rotate(1.5deg)}.hero-art :deep(.theme-motion){width:100%;height:auto;border-radius:27px;aspect-ratio:3/2;object-fit:cover}.hero-art :deep(.ai-label){position:absolute;bottom:70px;right:20px}.hero-art figcaption{display:flex;align-items:center;justify-content:center;gap:10px;min-height:58px;padding:12px;font-size:.9rem;line-height:1.3}.hero-art figcaption .iconify{flex-shrink:0}.section-nav{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:16px 0 35px}.section-nav a{display:flex;align-items:center;gap:10px;min-height:44px;font-weight:700}.section-nav .iconify{color:var(--demo-accent);width:22px;height:22px;flex-shrink:0}.planner-band{background:color-mix(in srgb,var(--demo-soft) 45%,var(--md-background));padding-block:70px}.planner{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}.planner>*{min-width:0}fieldset{border:0;padding:0}legend{font-weight:750;margin-bottom:14px}.recipe-picker{display:grid;gap:10px;margin-top:28px}.recipe-picker label{display:flex;align-items:center;gap:16px;padding:10px 16px 10px 10px;border:1px solid var(--line);border-radius:20px;background:var(--md-surface);cursor:pointer;position:relative}.recipe-picker label.selected{border-color:var(--demo-accent);background:color-mix(in srgb,var(--demo-soft) 30%,var(--md-surface))}.recipe-picker input{position:absolute;opacity:0;width:1px;height:1px}.recipe-picker label:has(input:focus-visible){outline:3px solid var(--demo-accent);outline-offset:3px}.recipe-picker img{width:86px;height:70px;object-fit:cover;border-radius:12px}.recipe-picker strong{display:block;font-size:1.12rem;line-height:1.3}.recipe-picker small{font-size:.82rem;color:var(--md-on-surface-variant)}.recipe-picker label>.iconify{margin-left:auto;flex:0 0 24px;color:var(--demo-accent)}.batch-picker{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:28px}.batch-picker button{border:1px solid var(--line);border-radius:16px;padding:12px 8px;min-height:52px;font-weight:700;line-height:1.25;cursor:pointer;background:var(--md-surface)}.batch-picker button span{display:block;padding-top:.16em}.batch-picker button[aria-pressed=true]{background:var(--demo-accent);color:white}.yield{display:flex;align-items:center;gap:10px;margin-top:20px;font-weight:750}.yield .iconify{color:var(--demo-accent);flex-shrink:0}.extra-label{display:block;font-weight:750;margin:26px 0 10px}textarea{width:100%;padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--md-surface);resize:vertical;line-height:1.5}.shopping-card{padding:30px;background:var(--md-surface);border:1px solid var(--line);border-radius:28px;box-shadow:0 18px 60px -38px var(--demo-accent)}.card-title{display:flex;align-items:center;gap:15px}.card-title>.iconify{width:30px;height:30px;color:var(--demo-accent);flex-shrink:0}.card-title small{font-size:.8rem;color:var(--md-on-surface-variant)}.card-title h3{font-size:1.6rem;font-weight:800;line-height:1.2}.list-explainer{display:flex;gap:12px;align-items:center;margin-block:24px;padding:16px;border-radius:16px;background:var(--demo-soft);line-height:1.5;font-size:.9rem}.list-explainer .iconify{flex:0 0 23px;color:var(--demo-accent)}.ingredient-list label{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:12px;align-items:center;padding-block:14px;border-bottom:1px solid var(--line);cursor:pointer;line-height:1.35}.ingredient-list input{appearance:auto;accent-color:var(--demo-accent);width:18px;height:18px}.ingredient-list strong{font-size:.88rem;white-space:nowrap}.ingredient-list .stocked span{text-decoration:line-through;opacity:.55}.ingredient-list span{overflow-wrap:break-word;hyphens:auto}.extras-preview{margin-top:20px;overflow-wrap:anywhere}.extras-preview ul{padding-left:20px;list-style:disc}.empty{padding-block:30px;line-height:1.6}.list-count{font-size:.85rem;margin:22px 0 12px;color:var(--md-on-surface-variant)}.import{width:100%}button:disabled{opacity:.5;cursor:default}.copy{display:flex;align-items:center;justify-content:center;gap:10px;min-height:44px;margin:10px auto 0;color:var(--demo-accent);text-decoration:underline;text-underline-offset:4px;cursor:pointer}.app-story{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center;padding-block:80px}.text-link{display:inline-flex;align-items:center;gap:10px;color:var(--demo-accent);font-weight:750;min-height:44px;line-height:1.4}.app-steps{display:grid;gap:18px;list-style:none;padding:0}.app-steps li{display:flex;gap:18px;background:var(--demo-soft);padding:24px;border-radius:22px}.app-steps li>.iconify{width:30px;height:30px;flex:0 0 30px;color:var(--demo-accent)}.app-steps h3{font-weight:800;font-size:1.3rem}.app-steps p{margin-top:6px;line-height:1.65}.recipes{padding-block:20px 70px}.recipe-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:30px;align-items:start}.recipe-grid article{border:1px solid var(--line);border-radius:26px;overflow:hidden;background:var(--md-surface)}.recipe-grid figure{position:relative}.recipe-grid img{width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}.recipe-grid :deep(.ai-label){position:absolute;right:10px;bottom:10px}.recipe-body{padding:24px}.recipe-body .mkt-label{font-size:.68rem;letter-spacing:.07em}.recipe-body h3{font-size:1.65rem;font-weight:800;line-height:1.15;margin-block:12px}.recipe-body>p:not(.mkt-label){line-height:1.6}.recipe-body details{margin-top:20px;border-top:1px solid var(--line);padding-top:16px}.baking summary{display:flex;justify-content:space-between;align-items:center;gap:12px;list-style:none;cursor:pointer;font-weight:750;line-height:1.4;min-height:44px}.baking summary::-webkit-details-marker{display:none}.baking summary .iconify{flex:0 0 20px;color:var(--demo-accent)}.baking details[open]>summary .iconify{transform:rotate(180deg)}.recipe-body h4{font-weight:750;margin-top:18px}.recipe-body ul{list-style:disc;padding-left:18px;margin-block:12px;line-height:1.7;font-size:.92rem}.recipe-body ol{list-style:decimal;padding-left:20px;line-height:1.7;font-size:.95rem}.recipe-body ol li{margin-top:16px}.recipe-tip{padding:14px;background:var(--demo-soft);border-radius:14px;margin-top:18px;line-height:1.6;font-size:.9rem}.preparation-band{background:var(--demo-soft);padding-block:65px}.preparation{display:grid;grid-template-columns:1fr 1fr;gap:70px}.equipment{display:flex;gap:16px;line-height:1.7;padding:24px;background:var(--md-surface);border-radius:22px;margin-top:30px}.equipment>.iconify{width:28px;height:28px;flex:0 0 28px;color:var(--demo-accent)}.timeline{list-style:none;padding:0}.timeline li{border-left:2px solid var(--line);padding:0 0 28px 25px}.timeline li:last-child{padding-bottom:0}.timeline span{font-size:.85rem;color:var(--demo-accent);font-weight:750}.timeline h3{font-weight:800;font-size:1.3rem;margin-block:7px}.timeline p{line-height:1.7}.gifting{padding-block:70px}.gift-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:30px}.gift-grid article{padding:28px;border:1px solid var(--line);border-radius:24px}.gift-grid .iconify{width:30px;height:30px;color:var(--demo-accent)}.gift-grid h3{font-weight:800;font-size:1.4rem;margin-block:18px 12px}.gift-grid p{line-height:1.7;margin-bottom:18px}.gift-grid strong{color:var(--demo-accent);font-size:.95rem}.faq{max-width:850px;padding-block:10px 70px}.faq h2{margin-bottom:25px}.faq details{padding-block:16px;border-bottom:1px solid var(--line)}.faq summary{font-size:1.1rem}.faq details p{line-height:1.75;margin:12px 0}.closing{text-align:center;background:var(--demo-soft);padding:50px 24px;border-radius:30px;margin-bottom:65px}.closing>.iconify{width:36px;height:36px;color:var(--demo-accent);margin-bottom:20px}.closing p{font-size:1.1rem;margin:22px 0}.closing .text-link{display:flex;justify-content:center;margin-top:22px}.baking section[id]{scroll-margin-top:100px}.baking :is(a,button,input,textarea,summary):focus-visible{outline:3px solid var(--demo-accent);outline-offset:4px}@media(hover:hover){.button:not(:disabled):hover{background:color-mix(in srgb,var(--demo-accent) 90%,black)}}
@media(max-width:1050px){.hero,.planner,.app-story,.preparation{gap:32px}.recipe-grid{gap:14px}.recipe-body{padding:18px}.shopping-card{padding:24px}.gift-grid{gap:16px}.gift-grid article{padding:22px}}
@media(max-width:800px){.hero,.planner,.app-story,.preparation{grid-template-columns:minmax(0,1fr)}.hero{padding-top:32px}.hero-art{transform:none}.planner-band,.preparation-band{padding-block:45px}.recipe-grid,.gift-grid{grid-template-columns:1fr}.recipe-grid article{display:grid;grid-template-columns:.85fr 1fr}.recipe-grid figure{align-self:start}.app-story,.gifting{padding-block:50px}.section-nav{display:grid;grid-template-columns:1fr 1fr}.baking h1{font-size:clamp(2.7rem,7vw,4rem)}}
@media(max-width:480px){.recipe-grid article{display:block}.recipe-body{padding:22px}.shopping-card{padding:20px}.card-title h3{font-size:1.4rem}.recipe-picker img{width:65px;height:65px}.recipe-picker label{gap:10px;padding-right:12px}.recipe-picker strong{font-size:1rem}.batch-picker button{font-size:.9rem}.hero .button,.closing .button{width:100%}@media(max-width:420px){.closing{padding-inline:16px}.closing .button{padding-inline:16px;font-size:.95rem}}.section-nav{gap:8px;font-size:.9rem}.hero-art figcaption{font-size:.85rem}.baking h1{font-size:2.8rem}.lead{font-size:1.12rem}}
</style>

<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'
import { articleScenes, type ArticleSceneKey } from '~/data/marketingArticleScenes'

const props = defineProps<{ storyKey: ArticleSceneKey }>()
const ready = ref(false)
onMounted(() => {
  ready.value = true
})
const scene = computed(() => articleScenes[props.storyKey])
const { root, phase, paused, reduced, running, choose } = useMarketingPlayback(4, step => props.storyKey === 'rezept-badges' && step === 2 ? 6000 : 4400)
const { style, next } = useMarketingDemoPalette()
watch(phase, (value, before) => {
  if (value === 0 && before === 3 && running.value) next()
})
watch(() => props.storyKey, () => {
  phase.value = 0
  paused.value = false
})
function item(name: string, checked = false, quantity = 1): ListItem {
  return { id: name, listId: 'article-preview', name, quantity, checked, removed: false, orderIndex: 0, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: '2026-11-03T12:00:00.000Z', updatedAt: '2026-11-03T12:00:00.000Z', deletedAt: null, fieldTimestamps: null }
}
const isOffline = computed(() => phase.value === 1 || phase.value === 2)
</script>

<template>
  <figure
    ref="root"
    class="article-scene"
    :class="{ 'is-still': !running }"
    :style="style"
    :data-story="storyKey"
    :data-phase="phase"
  >
    <div class="scene-heading">
      <div><span>{{ scene.label }}</span><h3>{{ scene.title }}</h3></div><button
        type="button"
        :disabled="reduced"
        :aria-label="paused ? 'Geschichte fortsetzen' : 'Geschichte pausieren'"
        @click="paused = !paused"
      >
        <UIcon :name="paused || reduced ? 'i-lucide-play' : 'i-lucide-pause'" />
      </button>
    </div>
    <div
      class="article-stage"
      aria-hidden="true"
      inert
    >
      <template v-if="storyKey === 'gaeste-zum-essen'">
        <div class="story-prop dinner-prop">
          <div class="clock-note">
            <UIcon name="i-lucide-clock-3" />{{ ['17:00', '17:10', '18:00', '19:30'][phase] }} · Freitag
          </div><div class="recipe-photo">
            <img
              src="/images/recipes/lasagne.webp"
              alt=""
              width="600"
              height="400"
              loading="lazy"
            ><span>{{ phase === 3 ? 'Alle sitzen am Tisch.' : 'Heute gibt es Lasagne.' }}</span>
          </div><div
            class="pantry-note"
            :class="{ highlighted: phase === 1 }"
          >
            <UIcon name="i-lucide-check" /><div><b>Olivenöl ist schon da.</b><small>Robin hat im Schrank nachgesehen.</small></div>
          </div><div class="dinner-timeline">
            <span :class="{ complete: phase > 0 }">Planen</span><i /><span :class="{ complete: phase > 1 }">Einkaufen</span><i /><span :class="{ complete: phase > 2 }">Kochen</span>
          </div>
        </div>
        <MarketingScenePhone
          :title="phase === 3 ? 'Lasagne für alle' : 'Freitag: Freunde zum Essen'"
          :detail="phase === 3 ? 'recipe' : 'list'"
          :input="phase < 3"
          shared
        >
          <template v-if="phase < 3">
            <p class="screen-label">
              {{ phase === 0 ? 'Robins neue Liste' : phase === 1 ? 'Aus dem Rezept übernommen' : 'Sam hat eingekauft' }}
            </p><div class="scene-rows">
              <ListItemRow
                v-if="phase > 0"
                :item="item('Lasagneblätter', phase === 2)"
              /><ListItemRow
                v-if="phase > 0"
                :item="item('Tomaten', phase === 2)"
              /><div
                v-if="phase === 0"
                class="quiet-empty"
              >
                <UIcon name="i-lucide-shopping-basket" /><span>Platz für euren Abend.</span>
              </div>
            </div>
          </template><template v-else>
            <img
              class="screen-recipe"
              src="/images/recipes/lasagne.webp"
              alt=""
              width="600"
              height="400"
              loading="lazy"
            ><div class="cook-line">
              <UIcon name="i-lucide-check" />Lasagne schichten
            </div><div class="cook-line">
              <UIcon name="i-lucide-check" />Goldbraun backen
            </div><p class="small-note">
              Jetzt wird gegessen.
            </p>
          </template>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'wg-einkauf'">
        <div class="story-prop wg-prop">
          <div class="wg-portrait">
            <img
              src="/images/illustrations/wg-einkauf-small.webp"
              alt=""
              width="600"
              height="400"
              loading="lazy"
            ><small><MarketingAiLabel compact /></small>
          </div><div
            v-for="(person, i) in ['Lina', 'Noor', 'Jules']"
            :key="person"
            class="person-note"
            :class="{ speaking: phase === i || phase === 3 }"
          >
            <b class="optical-center">{{ person[0] }}</b><div><strong>{{ person }}</strong><span>{{ i === 0 ? 'Die Kaffeedose ist leer.' : i === 1 ? 'Spülmittel brauchen wir auch.' : phase === 3 ? 'Alles da. Bis gleich!' : 'Ich gehe nachher einkaufen.' }}</span></div><UIcon
              v-if="phase === 3"
              name="i-lucide-check"
            />
          </div>
        </div>
        <MarketingScenePhone
          title="WG-Basics"
          input
          shared
        >
          <p class="screen-label">
            Lina, Noor &amp; Jules
          </p><div class="scene-rows">
            <ListItemRow :item="item('Kaffee', phase >= 2)" /><div class="row-reserve">
              <Transition name="story-row">
                <ListItemRow
                  v-if="phase > 0"
                  :item="item('Spülmittel', phase === 3)"
                  :just-changed="phase === 1"
                  changed-by="Noor"
                />
              </Transition>
            </div><ListItemRow :item="item('Haferdrink ungesüßt', phase === 3, 2)" />
          </div><div class="screen-progress">
            <i :style="{ width: `${phase === 3 ? 100 : phase === 2 ? 33 : 0}%` }" />
          </div><p class="small-note">
            {{ phase === 3 ? 'Für morgen ist gesorgt.' : phase === 2 ? 'Ein Teil ist schon im Korb.' : 'Jede Ergänzung hat ihren Platz.' }}
          </p>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'zutaten-auf-einkaufsliste'">
        <div class="story-prop ingredient-prop">
          <img
            class="prop-recipe"
            src="/images/recipes/lasagne.webp"
            alt=""
            width="600"
            height="400"
            loading="lazy"
          ><div class="selection-sheet">
            <span class="sheet-grip" /><h4>Zutaten zur Liste</h4><p>Lasagne für alle</p><div
              v-for="(name, i) in ['Lasagneblätter', 'Tomaten', 'Olivenöl']"
              :key="name"
              class="ingredient-choice"
              :class="{ excluded: i === 2 && phase > 0 }"
            >
              <UIcon :name="i === 2 && phase > 0 ? 'i-lucide-square' : 'i-lucide-square-check-big'" /><span>{{ name }}</span><small v-if="i === 2 && phase > 0">schon da</small>
            </div><div class="selection-count">
              {{ phase ? 2 : 3 }} Zutaten ausgewählt
            </div><p
              class="source-kept"
              :class="{ 'kept-visible': phase === 3 }"
            >
              <UIcon name="i-lucide-book-open" /> Alle drei bleiben im Rezept.
            </p>
          </div>
        </div>
        <MarketingScenePhone
          title="Wocheneinkauf"
          input
        >
          <p class="screen-label">
            {{ phase < 2 ? 'Deine vorhandene Liste' : 'Zutaten hinzugefügt' }}
          </p><div class="scene-rows">
            <ListItemRow :item="item('Kaffee')" /><div class="row-reserve">
              <Transition name="story-row">
                <ListItemRow
                  v-if="phase >= 2"
                  :item="item('Lasagneblätter')"
                />
              </Transition>
            </div><div class="row-reserve">
              <Transition name="story-row">
                <ListItemRow
                  v-if="phase >= 2"
                  :item="item('Tomaten')"
                />
              </Transition>
            </div>
          </div><div
            class="transfer-receipt"
            :class="{ visible: phase >= 2 }"
          >
            <UIcon name="i-lucide-check" />2 Zutaten übernommen
          </div>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'rezept-aus-foto'">
        <div class="story-prop photo-prop">
          <span class="prop-kicker">Das Original zum Vergleichen</span><div class="recipe-paper">
            <span class="paper-clip" /><h4>Omas<br>Marmorkuchen</h4><span class="handwritten">Für einen guten Sonntag</span><div class="paper-rule" /><p><b :class="{ marked: phase === 2 }">250 g Mehl</b><br>200 g Zucker<br>250 ml Haferdrink</p><p class="paper-directions">
              Hell und dunkel schichten.<br>Mit einer Gabel marmorieren.
            </p><span class="paper-footer">Fiktiver Rezeptauszug</span><div
              v-if="phase === 1"
              class="paper-scan"
            />
          </div><div
            class="photo-corners"
            :class="{ scanning: phase === 1 }"
          >
            <i
              v-for="n in 4"
              :key="n"
            />
          </div>
        </div>
        <MarketingScenePhone
          title="Omas Marmorkuchen"
          detail="recipe"
        >
          <div
            v-if="phase < 2"
            class="import-wait"
          >
            <UIcon :name="phase === 0 ? 'i-lucide-camera' : 'i-lucide-sparkles'" /><strong>{{ phase === 0 ? 'Rezept per Foto' : 'Foto wird ausgewertet' }}</strong><span>{{ phase === 0 ? 'Das ganze Blatt auswählen' : 'Zutaten und Schritte übernehmen' }}</span><div
              v-if="phase === 1"
              class="processing-dots"
            >
              <i /><i /><i />
            </div>
          </div><template v-else>
            <img
              class="screen-recipe"
              src="/images/recipes/marmorkuchen.webp"
              alt=""
              width="600"
              height="400"
              loading="lazy"
            ><div
              class="correction-line"
              :class="{ corrected: phase === 3 }"
            >
              <span>Mehl</span><b>{{ phase === 2 ? '25 g' : '250 g' }}</b><UIcon :name="phase === 2 ? 'i-lucide-pencil' : 'i-lucide-check'" />
            </div><div class="recipe-text-line">
              200 g Zucker
            </div><div class="recipe-text-line">
              250 ml Haferdrink
            </div><p class="check-original">
              {{ phase === 2 ? 'Am Blatt prüfen: Hier fehlt eine Null.' : 'Die Menge stimmt jetzt mit dem Blatt überein.' }}
            </p>
          </template>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'rezept-aus-link'">
        <div class="story-prop link-prop">
          <div class="source-browser">
            <div class="source-address">
              <UIcon name="i-lucide-lock-keyhole" />rezepte.example.org
            </div><img
              src="/images/recipes/pizzabroetchen.webp"
              alt=""
              width="600"
              height="400"
              loading="lazy"
            ><div class="source-page">
              <span>Fiktive Rezeptseite</span><h4>Pizzabrötchen<br>für den Spieleabend</h4><p>Teig füllen. Brötchen formen.<br><b :class="{ marked: phase === 2 }">Bei 200 °C backen.</b></p>
            </div>
          </div><div
            class="copied-link"
            :class="{ highlighted: phase === 1 }"
          >
            <UIcon name="i-lucide-link" /><span>…/pizzabroetchen</span><UIcon name="i-lucide-copy" />
          </div>
        </div>
        <MarketingScenePhone
          title="Pizzabrötchen"
          detail="recipe"
        >
          <div
            v-if="phase < 2"
            class="import-wait"
          >
            <UIcon :name="phase === 0 ? 'i-lucide-link' : 'i-lucide-sparkles'" /><strong>{{ phase === 0 ? 'Rezept per Link' : 'Rezept wird erstellt' }}</strong><div class="url-field">
              rezepte.example.org/<br>pizzabroetchen
            </div>
          </div><template v-else>
            <img
              class="screen-recipe"
              src="/images/recipes/pizzabroetchen.webp"
              alt=""
              width="600"
              height="400"
              loading="lazy"
            ><div
              class="source-pill"
              :class="{ highlighted: phase === 3 }"
            >
              <UIcon name="i-lucide-external-link" /> Zur Website
            </div><div class="cook-line">
              <b>1</b>Teig füllen und formen.
            </div><div class="cook-line">
              <b>2</b>Bei 200 °C backen.
            </div><p class="small-note">
              {{ phase === 2 ? 'Mit dem Original vergleichen.' : 'Die Fundstelle bleibt erreichbar.' }}
            </p>
          </template>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'einkaufsliste-teilen'">
        <div class="story-prop invitation-prop">
          <span class="prop-kicker">Alex’ Seite der Geschichte</span><div class="invitation-card">
            <div class="invitation-seal">
              <UIcon :name="phase >= 2 ? 'i-lucide-users' : 'i-lucide-mail'" />
            </div><h4>{{ phase >= 2 ? 'Du bist dabei, Alex.' : 'Mina lädt dich ein.' }}</h4><p>Unser Wochenende</p><span class="example-email">alex@example.org</span><div
              class="invitation-state"
              :class="{ accepted: phase >= 2 }"
            >
              {{ phase === 0 ? 'Einladung vorbereiten' : phase === 1 ? 'Einladung noch offen' : 'Einladung angenommen' }}
            </div><div
              class="invite-result"
              :class="{ visible: phase === 3 }"
            >
              <UIcon name="i-lucide-check-check" /><span>2 × Haferdrink<br><small>Auch auf Alex’ Liste</small></span>
            </div>
          </div><p class="prop-footnote">
            Zugang zur Liste gibt es nach dem Annehmen.
          </p>
        </div>
        <MarketingScenePhone
          :title="phase === 3 ? 'Unser Wochenende' : 'Gemeinsam nutzen'"
          detail="list"
          :input="phase === 3"
          shared
        >
          <template v-if="phase < 3">
            <div class="member-line">
              <b class="optical-center">M</b><div><strong>Mina</strong><small>Eigentümerin</small></div><UIcon name="i-lucide-check" />
            </div><div
              class="member-line"
              :class="{ 'member-pending': phase < 2 }"
            >
              <b class="optical-center">A</b><div><strong>Alex</strong><small>{{ phase < 2 ? 'Einladung ausstehend' : 'Mitglied' }}</small></div><UIcon :name="phase < 2 ? 'i-lucide-clock-3' : 'i-lucide-check'" />
            </div><div class="email-field">
              alex@example.org
            </div><p class="small-note">
              {{ phase === 0 ? 'Adresse vor dem Einladen prüfen.' : phase === 1 ? 'Alex meldet sich mit diesem Konto an.' : 'Ihr könnt jetzt gemeinsam loslegen.' }}
            </p>
          </template><template v-else>
            <p class="screen-label">
              Mina &amp; Alex
            </p><ListItemRow :item="item('Haferdrink ungesüßt', false, 2)" /><div class="shared-confirm">
              <UIcon name="i-lucide-users" />Bei euch beiden angekommen.
            </div>
          </template>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'einkaufsliste-diktieren'">
        <div class="story-prop dictation-prop">
          <span class="prop-kicker">Noor schaut in den Kühlschrank</span><div
            class="dictation-orb"
            :class="{ recording: phase === 0 }"
          >
            <UIcon :name="phase === 0 ? 'i-lucide-mic' : 'i-lucide-audio-lines'" />
          </div><blockquote>„<span>Zwei Haferdrinks,</span><span :class="{ marked: phase === 2 }">sechs Tomaten</span><span>und eine Flasche Spülmittel.“</span></blockquote><div
            class="speech-wave"
            :class="{ recording: phase === 0 }"
          >
            <i
              v-for="n in 17"
              :key="n"
              :style="{ '--bar': `${8 + n * 13 % 29}px`, '--delay': `${n * -90}ms` }"
            />
          </div><p class="prop-footnote">
            {{ phase === 0 ? 'Artikel und Menge zusammen sagen.' : phase === 1 ? 'Aufnahme beendet. Ergebnis abwarten.' : 'Gesagtes und Erkanntes vergleichen.' }}
          </p>
        </div>
        <MarketingScenePhone
          title="Für morgen"
          :input="phase > 0"
        >
          <div
            v-if="phase === 0"
            class="import-wait"
          >
            <UIcon name="i-lucide-mic" /><strong>Liste per Sprache</strong><span>Noors Einkauf entsteht.</span>
          </div><div
            v-else
            class="scene-rows"
          >
            <ListItemRow :item="item('Haferdrink', false, 2)" /><div
              class="quantity-focus"
              :class="{ correcting: phase === 2, corrected: phase === 3 }"
            >
              <ListItemRow :item="item('Tomaten', false, phase === 3 ? 6 : 2)" />
            </div><ListItemRow :item="item('Spülmittel')" />
          </div><p
            v-if="phase > 0"
            class="check-original"
          >
            {{ phase === 1 ? 'Einmal über Artikel und Mengen schauen.' : phase === 2 ? 'Zwei? Noor wollte sechs Tomaten.' : 'Auf sechs korrigiert. Jetzt passt es.' }}
          </p>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'offline-einkaufen'">
        <div class="story-prop offline-prop">
          <div
            class="connection-note"
            :class="{ disconnected: isOffline }"
          >
            <UIcon :name="isOffline ? 'i-lucide-wifi-off' : 'i-lucide-wifi'" /><strong>{{ isOffline ? 'Lea hat keinen Empfang.' : 'Lea ist verbunden.' }}</strong>
          </div><div class="other-device">
            <div class="other-device-title">
              <UIcon name="i-lucide-monitor" /><span>Kim · zu Hause</span>
            </div><h4 class="list-name">
              Für heute Abend
            </h4><ListItemRow
              :item="item('Brot', phase === 3)"
              :just-changed="phase === 3"
              changed-by="Lea"
            /><ListItemRow :item="item('Tomaten')" /><div class="waiting-note">
              <UIcon :name="phase === 3 ? 'i-lucide-check-check' : 'i-lucide-clock-3'" />{{ phase === 3 ? 'Leas Häkchen ist angekommen.' : 'Brot ist hier noch offen.' }}
            </div>
          </div><div
            class="connection-track"
            :class="{ disconnected: isOffline }"
          >
            <i /><span>{{ isOffline ? 'Kein Abgleich ohne Verbindung' : phase === 3 ? 'Abgleich abgeschlossen' : 'Gemeinsamer Stand' }}</span><i />
          </div>
        </div>
        <MarketingScenePhone
          title="Für heute Abend"
          input
          shared
          :offline="isOffline"
        >
          <p class="screen-label">
            Lea · im Supermarkt
          </p><div
            class="offline-banner"
            :class="{ visible: isOffline }"
          >
            <UIcon name="i-lucide-wifi-off" />Offline · Änderungen bleiben lokal
          </div><div class="scene-rows">
            <ListItemRow :item="item('Brot', phase > 0)" /><ListItemRow :item="item('Tomaten')" />
          </div><div class="local-stamp">
            <UIcon :name="phase === 3 ? 'i-lucide-cloud-check' : 'i-lucide-smartphone'" />{{ phase === 0 ? 'Liste auf dem Handy gespeichert' : phase < 3 ? 'Brot auf diesem Gerät abgehakt' : 'Mit Kim abgeglichen' }}
          </div>
        </MarketingScenePhone>
      </template>

      <template v-else-if="storyKey === 'rezept-badges'">
        <div class="story-prop baking-prop">
          <img
            class="baking-photo"
            src="/images/recipes/marmorkuchen.webp"
            alt=""
            width="600"
            height="400"
            loading="lazy"
          ><span class="prop-kicker">Sonntag, 16:00 Uhr</span><h4>Das erste Stück<br>ist für dich.</h4><p>Ein Rezept, das du jetzt auch selbst gebacken hast.</p><div
            class="badge-keepsake"
            :class="{ earned: phase >= 2 }"
          >
            <RecipeBadgeSeal
              v-if="phase >= 2"
              style="--seal-size: 27px"
            /><UIcon
              v-else
              name="i-lucide-award"
            /><span>{{ phase >= 2 ? 'Dein erster Marmorkuchen-Badge' : 'Noch ein Schritt bis zum Badge' }}</span>
          </div>
        </div>
        <MarketingScenePhone
          :title="phase < 3 ? 'Omas Marmorkuchen' : 'Deine Badges'"
          :detail="phase < 3 ? 'recipe' : 'profile'"
        >
          <template v-if="phase < 2">
            <div class="cook-line">
              <UIcon name="i-lucide-check" />Teig marmorieren.
            </div><div class="cook-line">
              <UIcon :name="phase === 1 ? 'i-lucide-check' : 'i-lucide-square'" />Backen und abkühlen lassen.
            </div><img
              class="screen-recipe cake-result"
              src="/images/recipes/marmorkuchen.webp"
              alt=""
              width="600"
              height="400"
              loading="lazy"
            >
          </template><MarketingBadgeMoment
            v-else
            name="Omas Marmorkuchen"
            image="/images/recipes/marmorkuchen.webp"
            date="01.11.2026"
            :collection="phase === 3"
          />
        </MarketingScenePhone>
      </template>

      <template v-else>
        <div class="story-prop gift-prop">
          <div class="gift-envelope">
            <UIcon name="i-lucide-ticket" /><span>Für Samstag.</span><i />
          </div><h4>Der Name verrät nichts.</h4><p>Die Liste heißt „Für Samstag“. Ihre Einträge bleiben hinter der Entsperrung.</p><div class="privacy-note">
            <UIcon name="i-lucide-eye" />Der Listenname bleibt sichtbar.
          </div>
        </div>
        <MarketingScenePhone
          :title="phase === 0 ? '' : phase === 3 ? 'Für Samstag' : ''"
          :detail="phase === 0 ? 'overview' : phase === 3 ? 'list' : 'locked'"
          :input="phase === 3"
        >
          <MarketingSecretListCard
            v-if="phase === 0"
            name="Für Samstag"
          /><div
            v-else-if="phase < 3"
            class="secret-gate"
          >
            <UIcon
              :name="phase === 1 ? 'i-lucide-lock-keyhole' : 'i-lucide-fingerprint'"
              :class="{ 'finger-pulse': phase === 2 }"
            /><h4>Geheime Liste</h4><p>{{ phase === 1 ? 'Die Einträge bleiben gesperrt.' : 'Mit Biometrie oder Displaysperre bestätigen.' }}</p>
          </div><div
            v-else
            class="scene-rows"
          >
            <ListItemRow :item="item('Konzertkarten', false, 2)" /><ListItemRow :item="item('Geburtstagskarte')" /><div class="unlocked-note">
              <UIcon name="i-lucide-shield-check" />Bestätigt. Die Liste ist geöffnet.
            </div>
          </div>
        </MarketingScenePhone>
      </template>
    </div>
    <div class="scene-narration">
      <UIcon :name="scene.icon" /><p>{{ scene.captions[phase] }}</p>
    </div>
    <div
      class="story-controls"
      aria-label="Schritt dieser Geschichte wählen"
    >
      <button
        v-for="(step, i) in scene.steps"
        :key="step"
        type="button"
        :disabled="!ready"
        :aria-label="step"
        :aria-pressed="phase === i"
        @click="choose(i)"
      >
        <span class="step-number optical-center">{{ i + 1 }}</span><span>{{ step }}</span>
      </button>
    </div>
    <figcaption>Beispieldaten</figcaption>
  </figure>
</template>

<style scoped>
.article-scene{container-type:inline-size;margin:28px 0 8px;border:1px solid color-mix(in srgb,var(--demo-accent) 15%,transparent);border-radius:28px;background:var(--demo-canvas);color:var(--md-on-surface);overflow:hidden}.scene-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:24px 26px 0}.scene-heading>div>span{font-size:13px;color:var(--demo-accent)}.scene-heading h3{font-size:25px;line-height:1.2;font-weight:800;margin:5px 0 0}.scene-heading button{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:50%;background:var(--md-surface);color:var(--demo-accent);cursor:pointer}.scene-heading button>.iconify{width:20px;height:20px}.scene-heading button:disabled{opacity:.5;cursor:default}
.article-stage{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:24px;padding:30px 24px;position:relative}.story-prop{min-width:0;position:relative}.story-prop h4{font-size:27px;font-weight:800;line-height:1.12;margin:0}.story-prop p{font-size:18px;line-height:1.5;margin:12px 0}.prop-kicker{display:block;font-size:13px;color:var(--demo-accent);margin-bottom:18px}.story-prop .prop-footnote{font-size:14px;line-height:1.4;color:var(--md-on-surface-variant);margin:18px 6px 0}.scene-rows{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-content:start;min-height:128px}.row-reserve{height:60px}.scene-rows :deep(button){line-height:1.15}.screen-label{font-size:13px;line-height:1.4;color:var(--md-on-surface-variant);margin:0 0 16px}.small-note{font-size:14px;line-height:1.4;color:var(--md-on-surface-variant);margin:16px 0 0}.quiet-empty{display:flex;align-items:center;justify-content:center;gap:10px;min-height:128px;font-size:17px;color:var(--md-on-surface-variant)}.quiet-empty>.iconify{width:24px;height:24px}.screen-recipe{width:100%;height:120px;object-fit:cover;border-radius:12px;margin-bottom:12px}.cook-line{display:flex;align-items:center;gap:10px;font-size:18px;line-height:1.3;padding:10px 0}.cook-line>.iconify{width:21px;height:21px;flex-shrink:0;color:var(--md-primary)}.cook-line>b{font-size:18px;font-weight:700;color:var(--md-primary);min-width:18px}.screen-progress{height:4px;border-radius:4px;overflow:hidden;background:var(--demo-soft);margin-top:20px}.screen-progress i{display:block;height:100%;background:var(--md-primary);transition:width .8s cubic-bezier(.2,0,0,1)}
.clock-note{display:flex;align-items:center;gap:7px;font-size:18px;color:var(--demo-accent);margin:0 0 18px}.clock-note>.iconify{width:20px;height:20px}.recipe-photo{position:relative;transform:rotate(-3deg);border:8px solid var(--md-surface);border-bottom-width:42px;border-radius:18px;box-shadow:0 14px 30px -18px #5c364455}.recipe-photo img{width:100%;height:180px;object-fit:cover;border-radius:10px}.recipe-photo>span{position:absolute;bottom:-33px;left:7px;font-size:18px;font-weight:700}.pantry-note{display:flex;align-items:center;gap:10px;border-radius:14px;background:var(--md-surface);padding:15px;margin:28px 0 0;transition:box-shadow .6s,transform .6s}.pantry-note>.iconify{width:24px;height:24px;color:var(--md-check-content);flex-shrink:0}.pantry-note b{font-size:19px}.pantry-note small{display:block;font-size:13px;line-height:1.3}.highlighted{box-shadow:0 0 0 3px var(--md-primary);transform:translateY(-3px)}.dinner-timeline{display:flex;align-items:center;gap:7px;margin-top:26px;font-size:14px}.dinner-timeline i{height:1px;flex:1;background:var(--demo-accent);opacity:.3}.dinner-timeline span{opacity:.5}.dinner-timeline .complete{opacity:1;color:var(--demo-accent);font-weight:700}
.wg-portrait{height:auto;aspect-ratio:3/2;overflow:hidden;border-radius:20px;position:relative;margin-bottom:22px}.wg-portrait img{width:100%;height:100%;object-fit:cover}.wg-portrait small{position:absolute;bottom:7px;right:8px;font-size:10px}.person-note{display:flex;align-items:center;gap:10px;padding:13px 10px;border-radius:16px;opacity:.55;transition:opacity .6s,background .6s,transform .6s}.person-note.speaking{background:var(--md-surface);opacity:1;transform:translateX(4px)}.person-note>b,.member-line>b{display:grid;place-items:center;flex-shrink:0;width:38px;height:38px;border-radius:50%;background:var(--demo-soft);color:var(--demo-accent);font-size:20px}.person-note:nth-child(3)>b{background:#deebd6;color:#476645}.person-note:nth-child(4)>b{background:#e3dff4;color:#6c5896}.person-note strong{font-size:18px}.person-note span{display:block;font-size:14px;line-height:1.3}.person-note>.iconify{margin-left:auto;width:18px;height:18px;color:var(--md-check-content);flex-shrink:0}
.prop-recipe{width:100%;height:145px;object-fit:cover;border-radius:20px 20px 0 0}.selection-sheet{position:relative;background:var(--md-surface);border-radius:20px;padding:12px 16px 18px;margin-top:-15px;box-shadow:0 12px 30px -22px #43293c66}.sheet-grip{display:block;width:30px;height:4px;border-radius:3px;background:var(--md-on-surface-variant);opacity:.3;margin:0 auto 17px}.selection-sheet h4{font-size:23px}.selection-sheet>p{font-size:15px;margin:4px 0 14px}.ingredient-choice{display:flex;align-items:center;gap:9px;min-height:44px;font-size:19px;transition:opacity .5s}.ingredient-choice>.iconify{width:22px;height:22px;color:var(--md-primary);flex-shrink:0}.ingredient-choice small{font-size:11px;line-height:1.1;margin-left:auto}.ingredient-choice.excluded{opacity:.5}.selection-count{background:var(--md-primary);color:var(--md-on-primary);border-radius:10px;padding:9px 12px;text-align:center;font-size:18px;font-weight:700;margin-top:14px}.selection-sheet>.source-kept{display:flex;gap:6px;align-items:center;font-size:13px;margin-bottom:0}.source-kept>.iconify{width:17px;height:17px}.transfer-receipt{display:flex;align-items:center;gap:7px;font-size:16px;padding-top:18px;color:var(--md-check-content);opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s}.transfer-receipt.visible{opacity:1;transform:none}.transfer-receipt>.iconify{width:18px;height:18px}
.photo-prop{padding:16px 7px}.recipe-paper{position:relative;padding:28px 22px 20px;background:#fff9e9;color:#4f403a;border:1px solid #deceb6;border-radius:4px 4px 18px 4px;transform:rotate(-4deg);box-shadow:0 12px 24px -16px #4c302b66;overflow:hidden}.recipe-paper h4{font-family:Georgia,serif;font-size:26px;font-weight:400;line-height:1.12}.handwritten{font-family:Georgia,serif;font-style:italic;font-size:12px;display:block;margin-top:12px}.paper-rule{height:1px;background:#bc9c7d80;margin:18px 0}.recipe-paper p{font-size:19px;line-height:1.65;margin:0}.recipe-paper .paper-directions{font-size:15px;line-height:1.6;margin-top:17px}.paper-footer{display:block;font-size:10px;color:#806d5c;margin-top:22px}.paper-clip{display:block;position:absolute;right:25px;top:-9px;width:13px;height:41px;border:2px solid #ab9a8b;border-radius:9px;rotate:8deg}.marked{background:#ffde9b;padding-inline:3px;border-radius:3px;box-shadow:0 3px 0 #edb55755}.paper-scan{position:absolute;inset:0;background:linear-gradient(transparent 35%,#bc4e9433 50%,transparent 65%);animation:paper-scan 2.5s ease-in-out infinite}.photo-corners{position:absolute;inset:47px 0 -3px;pointer-events:none;opacity:0;transition:opacity .5s}.photo-corners.scanning{opacity:1}.photo-corners i{position:absolute;width:25px;height:25px;border:3px solid var(--md-primary)}.photo-corners i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0}.photo-corners i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0}.photo-corners i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0}.photo-corners i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0}.import-wait{min-height:230px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:12px}.import-wait>.iconify{width:42px;height:42px;color:var(--md-primary)}.import-wait>strong{font-size:22px;line-height:1.2}.import-wait>span{font-size:15px;line-height:1.4;color:var(--md-on-surface-variant)}.processing-dots{display:flex;gap:7px;padding:12px}.processing-dots>i{width:7px;height:7px;border-radius:50%;background:var(--md-primary);animation:processing 1.3s ease-in-out infinite}.processing-dots>i:nth-child(2){animation-delay:.2s}.processing-dots>i:nth-child(3){animation-delay:.4s}.correction-line{display:flex;align-items:center;gap:8px;background:#fff0d6;border:1px solid #e7b765;border-radius:10px;padding:10px;font-size:20px}.correction-line>b{margin-left:auto}.correction-line>.iconify{width:19px;height:19px}.correction-line.corrected{background:var(--md-check-surface);border-color:var(--md-check-content)}.recipe-text-line{padding:8px 10px;font-size:19px}.check-original{font-size:15px;line-height:1.4;color:var(--md-on-surface-variant);margin:15px 0 0;min-height:42px}
.source-browser{border:1px solid color-mix(in srgb,var(--demo-accent) 20%,transparent);border-radius:18px;overflow:hidden;background:var(--md-surface);box-shadow:0 12px 26px -20px #5b354466}.source-address{display:flex;align-items:center;gap:6px;background:var(--demo-soft);font-size:12px;padding:12px}.source-address>.iconify{width:13px;height:13px}.source-browser>img{width:100%;height:150px;object-fit:cover}.source-page{padding:18px}.source-page>span{font-size:11px;color:var(--md-on-surface-variant)}.source-page h4{font-size:23px;margin-top:8px}.source-page p{font-size:16px;line-height:1.6}.copied-link{display:flex;align-items:center;gap:8px;background:var(--md-surface);border-radius:11px;padding:12px;margin-top:16px;transition:transform .5s,box-shadow .5s;font-size:16px}.copied-link>.iconify{width:18px;height:18px;flex-shrink:0;color:var(--md-primary)}.copied-link>.iconify:last-child{margin-left:auto}.url-field{font-size:15px;line-height:1.4;background:var(--md-surface-container);padding:12px;border-radius:8px;width:100%;overflow-wrap:anywhere}.source-pill{display:flex;align-items:center;justify-content:center;gap:7px;background:var(--demo-soft);border-radius:14px;padding:7px 10px;font-size:15px;margin:8px 0 14px;transition:box-shadow .5s,transform .5s}.source-pill>.iconify{width:16px;height:16px}
.invitation-card{background:var(--md-surface);padding:25px 20px;border-radius:23px;border:1px solid var(--demo-soft);text-align:center;box-shadow:0 15px 30px -24px #57314666;rotate:-2deg}.invitation-seal{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:var(--demo-soft);color:var(--demo-accent);margin:0 auto 20px}.invitation-seal>.iconify{width:28px;height:28px}.invitation-card h4{font-size:25px}.invitation-card p{font-size:19px;margin:12px 0 4px}.example-email{font-size:13px;color:var(--md-on-surface-variant)}.invitation-state{padding:11px;border-radius:12px;background:#fff0d6;color:#795126;font-size:17px;margin-top:22px}.invitation-state.accepted{background:var(--md-check-surface);color:var(--md-check-content)}.invite-result{display:flex;gap:8px;align-items:center;justify-content:center;text-align:left;margin-top:20px;min-height:50px;opacity:0;transition:opacity .5s}.invite-result.visible{opacity:1}.invite-result>.iconify{width:23px;height:23px;color:var(--md-check-content)}.invite-result span{font-size:20px;line-height:1.2}.invite-result small{font-size:13px}.member-line{display:flex;gap:10px;align-items:center;padding:12px 0}.member-line>div{flex:1}.member-line strong{font-size:20px}.member-line small{display:block;font-size:13px;color:var(--md-on-surface-variant)}.member-line>.iconify{width:19px;height:19px;color:var(--md-check-content)}.member-pending>.iconify{color:#a17838}.email-field{border:1px solid var(--md-outline-variant);padding:12px;border-radius:8px;margin-top:20px;font-size:17px}.shared-confirm{display:flex;gap:8px;align-items:center;color:var(--md-check-content);font-size:17px;margin-top:40px}.shared-confirm>.iconify{width:24px;height:24px;flex-shrink:0}
.dictation-prop{text-align:center}.dictation-orb{display:grid;place-items:center;width:88px;height:88px;border-radius:50%;background:var(--md-primary);color:white;margin:20px auto 30px;box-shadow:0 0 0 14px color-mix(in srgb,var(--md-primary) 8%,transparent)}.dictation-orb>.iconify{width:34px;height:34px}.dictation-orb.recording{animation:mic-breathe 2s ease-in-out infinite}.dictation-prop blockquote{font-size:27px;line-height:1.25;font-weight:700;margin:0}.dictation-prop blockquote span{display:block;margin:9px auto;width:fit-content;max-width:100%}.speech-wave{height:45px;display:flex;align-items:center;justify-content:center;gap:4px;margin-top:22px}.speech-wave i{width:4px;height:8px;border-radius:3px;background:var(--md-primary);opacity:.45}.speech-wave.recording i{height:var(--bar);animation:speech-wave .8s var(--delay) ease-in-out infinite alternate;opacity:1}.quantity-focus{border-radius:10px;transition:box-shadow .4s}.quantity-focus.correcting{box-shadow:0 0 0 2px #dda84d}.quantity-focus.corrected{box-shadow:0 0 0 2px var(--md-check-content)}
.connection-note{display:flex;align-items:center;gap:9px;font-size:19px;line-height:1.3;margin:0 0 24px;color:var(--md-check-content)}.connection-note>.iconify{width:26px;height:26px;flex-shrink:0}.connection-note.disconnected{color:#9a682c}.other-device{border:5px solid #e2dce0;background:var(--md-surface);border-radius:17px;overflow:hidden;padding:0 10px 14px;box-shadow:0 14px 25px -20px #45334566}.other-device-title{display:flex;align-items:center;gap:8px;font-size:13px;background:var(--demo-soft);margin:0 -10px 16px;padding:12px}.other-device-title>.iconify{width:18px;height:18px}.other-device h4{font-size:23px;margin:0 0 16px}.other-device :deep(.min-h-15){height:60px;min-height:60px;margin-bottom:8px}.other-device :deep(.text-\[1\.25rem\]){font-size:18px}.other-device :deep(.text-\[0\.875rem\]){font-size:12px}.waiting-note{display:flex;align-items:center;gap:6px;font-size:13px;min-height:35px;color:var(--md-on-surface-variant)}.waiting-note>.iconify{width:16px;height:16px;flex-shrink:0}.connection-track{display:flex;align-items:center;gap:8px;margin-top:26px;text-align:center;color:var(--md-check-content);font-size:13px;line-height:1.3}.connection-track>i{flex:1;height:2px;background:currentColor}.connection-track.disconnected{color:#9a682c}.connection-track.disconnected>i{height:0;border-top:2px dashed currentColor;background:none}.offline-banner{display:flex;align-items:center;gap:5px;font-size:12px;line-height:1.2;padding:8px;border-radius:8px;background:#fff0d6;color:#795126;margin-bottom:14px;opacity:0;transition:opacity .4s;min-height:40px}.offline-banner.visible{opacity:1}.offline-banner>.iconify{width:16px;height:16px;flex-shrink:0}.local-stamp{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--md-on-surface-variant);line-height:1.3;margin-top:20px}.local-stamp>.iconify{width:20px;height:20px;flex-shrink:0}
.baking-photo{width:100%;height:185px;object-fit:cover;border-radius:50% 50% 20px 20px;margin-bottom:24px}.baking-prop .prop-kicker{margin-bottom:10px}.baking-prop>p{font-size:17px}.badge-keepsake{display:flex;gap:9px;align-items:center;padding-top:16px;color:var(--md-on-surface-variant);font-size:16px}.badge-keepsake>.iconify{width:27px;height:27px;flex-shrink:0}.badge-keepsake.earned{color:#9a711e}.cake-result{margin-top:22px}
.gift-envelope{height:200px;position:relative;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;background:var(--md-surface);border:1px solid var(--demo-soft);border-radius:12px;rotate:-5deg;box-shadow:0 14px 25px -18px #49324b55;margin-bottom:35px;overflow:hidden}.gift-envelope>.iconify{width:58px;height:58px;color:var(--md-primary)}.gift-envelope>span{font-size:28px;font-weight:700}.gift-envelope>i{position:absolute;bottom:-120px;width:260px;height:190px;rotate:35deg;background:var(--demo-soft);opacity:.6}.gift-prop p{font-size:18px}.privacy-note{display:flex;align-items:center;gap:8px;font-size:14px;margin-top:23px;color:var(--md-on-surface-variant)}.privacy-note>.iconify{width:20px;height:20px;flex-shrink:0}.secret-overview-card{padding:20px 16px;border-radius:20px;background:linear-gradient(var(--demo-soft),var(--md-surface-container))}.secret-overview-card>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.secret-overview-card h4{font-size:26px;font-weight:700}.secret-overview-card .iconify{width:24px;height:24px;color:var(--md-primary)}.secret-overview-card>small{display:block;font-size:14px;margin-top:12px;color:var(--md-on-surface-variant)}.secret-gate{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;text-align:center}.secret-gate>.iconify{width:56px;height:56px;color:var(--md-primary);margin-bottom:24px}.secret-gate h4{font-size:25px;font-weight:700;margin:0}.secret-gate p{font-size:18px;line-height:1.4;margin-top:12px}.finger-pulse{animation:mic-breathe 2s ease-in-out infinite}.unlocked-note{display:flex;align-items:center;gap:6px;color:var(--md-check-content);font-size:15px;line-height:1.4;margin-top:18px}.unlocked-note>.iconify{width:23px;height:23px;flex-shrink:0}
.scene-narration{display:flex;align-items:flex-start;gap:11px;padding:21px 26px;background:var(--md-surface);min-height:108px}.scene-narration>.iconify{width:23px;height:23px;flex-shrink:0;color:var(--md-primary);margin-top:3px}.scene-narration p{font-size:19px;line-height:1.5;margin:0}.story-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:18px 16px 8px}.story-controls button{display:flex;align-items:center;flex-direction:column;gap:8px;padding:6px 3px;min-width:0;cursor:pointer;border-radius:14px;font-size:13px;line-height:1.25;text-align:center}.step-number{display:grid;place-items:center;width:38px;height:38px;flex-shrink:0;border-radius:50%;background:var(--md-surface);color:var(--demo-accent);font-size:18px;font-weight:700;line-height:1}.story-controls button[aria-pressed=true]>.step-number{background:var(--md-primary);color:var(--md-on-primary)}.story-controls button[aria-pressed=true]{font-weight:700}.article-scene button:focus-visible{outline:2px solid var(--md-primary);outline-offset:2px}.article-scene figcaption{font-size:12px;line-height:1.5;color:var(--md-on-surface-variant);padding:12px 24px 23px;margin:0}.story-row-enter-active,.story-row-leave-active{transition:transform .5s cubic-bezier(.2,0,0,1),opacity .4s}.story-row-enter-from{opacity:0;transform:translateY(12px)}.story-row-leave-to{opacity:0;transform:translateY(-6px)}.is-still :deep(*){animation-play-state:paused!important}
@keyframes paper-scan{from{translate:0 -60%}to{translate:0 60%}}@keyframes processing{50%{opacity:.3;transform:translateY(-4px)}}@keyframes mic-breathe{50%{transform:scale(1.04)}}@keyframes speech-wave{to{height:6px}}
@container(max-width:580px){.article-stage{grid-template-columns:minmax(0,1fr);gap:30px;padding:24px 18px}.story-prop{width:100%;max-width:330px;margin:auto}.scene-heading{padding:20px 18px 0}.scene-heading h3{font-size:23px}.scene-narration{padding:18px;min-height:135px}.scene-narration p{font-size:18px}.story-controls{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:14px}.story-controls button{flex-direction:row;text-align:left;font-size:14px;gap:10px;padding:5px}.article-scene figcaption{padding:10px 18px 20px}.recipe-photo img,.baking-photo{height:170px}.wg-portrait{height:auto;aspect-ratio:3/2}.dictation-prop blockquote{font-size:25px}.photo-prop{max-width:285px}.offline-prop{max-width:330px}.story-prop h4{font-size:25px}}
@container(max-width:340px){.article-stage{padding-inline:12px}.scene-heading h3{font-size:21px}.story-controls{padding-inline:10px}.step-number{width:36px;height:36px}.story-controls button{font-size:13px;gap:7px}.scene-narration p{font-size:17px}.scene-heading{padding-inline:15px}.ingredient-choice{font-size:18px}.dictation-prop blockquote{font-size:23px}}
@media(prefers-reduced-motion:reduce){.article-scene :deep(*){animation:none!important;transition:none!important}}
</style>

<style scoped>
.article-stage{min-height:692px}.scene-narration{min-height:116px}.selection-sheet{min-height:290px}.source-kept{visibility:hidden}.source-kept.kept-visible{visibility:visible}.story-controls button>span:last-child{min-width:0;overflow-wrap:anywhere;hyphens:auto}
@container(max-width:580px){.article-stage{grid-template-rows:minmax(330px,auto) 632px;align-items:center;min-height:1040px}.scene-narration{min-height:160px}}
@container(max-width:340px){.scene-narration{min-height:192px}}
</style>

<style scoped>
@container(min-width:740px) { .article-stage { zoom:1.15; } }
@container(min-width:1000px) { .article-stage { zoom:1.4; } }
@container(min-width:1400px) { .article-stage { zoom:1.65; } }
.article-scene h4.list-name { font: var(--demo-list-heading); }
</style>

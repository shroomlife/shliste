<template>
  <section
    id="plattformen"
    class="get-started"
    aria-labelledby="platform-title"
  >
    <div class="mkt-content">
      <div class="platform-intro">
        <div>
          <p class="platform-eyebrow">
            Deine Liste. Auf deinem Gerät.
          </p><h2 id="platform-title">
            Dein nächster Einkauf<br>beginnt hier.
          </h2>
        </div>
        <p>Am Laptop kurz planen. Im Laden auf dem Handy nachsehen. Öffne shliste direkt im Browser oder hol dir die Android-App.</p>
      </div>
      <div class="platform-options">
        <NuxtLink
          to="/app/lists"
          class="platform-option platform-option--browser"
          data-analytics-event="open_app"
          data-analytics-location="get_started"
          aria-labelledby="browser-option-title browser-option-cta"
          aria-describedby="browser-option-description"
        >
          <div class="platform-option-top"><span class="platform-symbol"><UIcon name="i-lucide-globe" /></span><span class="platform-kind">Laptop · Tablet · Smartphone</span></div>
          <h3 id="browser-option-title">Direkt im Browser.</h3>
          <p id="browser-option-description">Öffnen, aufschreiben, loslegen. Für deine erste Liste brauchst du weder eine Installation noch ein Konto.</p>
          <ul><li><UIcon name="i-lucide-check" />Ohne Installation starten</li><li><UIcon name="i-lucide-check" />Auch auf iPhone und iPad</li></ul>
          <span
            id="browser-option-cta"
            class="platform-action"
          ><span>Jetzt im Browser starten</span><span class="platform-arrow"><UIcon name="i-lucide-arrow-right" /></span></span>
        </NuxtLink>
        <a
          href="https://play.google.com/store/apps/details?id=com.shroomlife.shliste"
          target="_blank"
          rel="noopener"
          class="platform-option platform-option--android"
          aria-labelledby="android-option-title android-option-cta"
          aria-describedby="android-option-description android-option-target"
        >
          <div class="platform-option-top"><span class="platform-symbol"><UIcon name="i-lucide-smartphone" /></span><span class="platform-kind">Für dein Android-Handy</span></div>
          <h3 id="android-option-title">Deine Android-App.</h3>
          <p id="android-option-description">shliste ist beim nächsten Einkauf dabei. Mit den Farben deines Geräts und deinen gespeicherten Listen auch ohne Netz.</p>
          <ul><li><UIcon name="i-lucide-check" />Passt sich deinen Gerätefarben an</li><li><UIcon name="i-lucide-check" />Listen und Rezepte an einem Ort</li></ul>
          <span
            id="android-option-cta"
            class="platform-action"
          ><span>Bei Google Play ansehen</span><span class="platform-arrow"><UIcon name="i-lucide-arrow-up-right" /></span></span>
          <span
            id="android-option-target"
            class="sr-only"
          >Öffnet Google Play in einem neuen Tab.</span>
        </a>
      </div>
      <div class="platform-follow-up">
        <p>Zusammen einkaufen? Mit einem Konto und Internet teilt ihr eure Liste und gleicht Änderungen ab.</p><NuxtLink to="/anleitungen/einkaufsliste-teilen">So teilt ihr eine Liste <UIcon name="i-lucide-arrow-right" /></NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.get-started{padding-block:clamp(4rem,7vw,7rem);margin-block:2rem 4rem;border-block:1px solid color-mix(in srgb,var(--demo-accent) 16%,transparent);background:color-mix(in srgb,var(--demo-soft) 24%,var(--md-background));color:var(--md-on-surface);scroll-margin-top:6rem}
.platform-intro{display:grid;grid-template-columns:1.15fr 1fr;gap:4rem;align-items:end;margin-bottom:3.5rem}.platform-eyebrow{font-size:.8125rem;line-height:1.4;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--demo-accent);margin:0 0 1.2rem}.platform-intro h2{font-size:clamp(2.5rem,4.1vw,3.75rem);font-weight:850;line-height:1.06;letter-spacing:-.035em;margin:0;text-wrap:balance}.platform-intro>p{font-size:1.3rem;line-height:1.6;color:var(--md-on-surface-variant);margin:0 0 .2rem;max-width:29rem;justify-self:end}
.platform-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem}.platform-option{display:flex;flex-direction:column;min-width:0;padding:clamp(1.75rem,3vw,3rem);border-radius:1.75rem;border:1px solid color-mix(in srgb,var(--demo-accent) 20%,transparent);background:var(--md-surface);color:inherit;text-decoration:none;box-shadow:0 1.5rem 3rem -2.5rem color-mix(in srgb,var(--demo-accent) 22%,transparent);transition:background-color .22s,border-color .22s,box-shadow .22s}
.platform-option--android{background:color-mix(in srgb,var(--demo-soft) 37%,var(--md-surface))}.platform-option-top{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;margin-bottom:2.25rem}.platform-symbol{display:grid;place-items:center;width:5.5rem;height:5.5rem;flex-shrink:0;border-radius:1.5rem;background:var(--demo-soft);color:var(--demo-accent)}.platform-symbol>.iconify{width:3.15rem;height:3.15rem}.platform-kind{max-width:12rem;font-size:1rem;line-height:1.45;color:var(--md-on-surface-variant);text-align:right}
.platform-option h3{font-size:clamp(2rem,2.5vw,2.5rem);line-height:1.12;font-weight:800;letter-spacing:-.025em;margin:0 0 1rem}.platform-option>p{font-size:1.188rem;line-height:1.65;color:var(--md-on-surface-variant);max-width:30rem;margin:0 0 1.5rem}.platform-option ul{list-style:none;padding:0;margin:0 0 2.5rem;display:grid;gap:.65rem;font-size:1.0625rem;line-height:1.45}.platform-option li{display:flex;align-items:baseline;gap:.6rem}.platform-option li>.iconify{align-self:center;width:1.25rem;height:1.25rem;flex-shrink:0;color:var(--demo-accent)}
.platform-action{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:1.25rem;min-height:3.75rem;padding-top:1.5rem;border-top:1px solid color-mix(in srgb,var(--demo-accent) 18%,transparent);color:var(--demo-accent);font-size:1.25rem;line-height:1.3;font-weight:750}.platform-arrow{display:grid;place-items:center;width:3.25rem;height:3.25rem;flex-shrink:0;border-radius:50%;background:var(--demo-accent);color:var(--md-on-primary)}.platform-arrow>.iconify{width:1.5rem;height:1.5rem;transition:transform .22s}.platform-option:hover{border-color:var(--demo-accent);box-shadow:0 1.5rem 3rem -2rem color-mix(in srgb,var(--demo-accent) 25%,transparent)}.platform-option:hover .platform-action>span:first-child{text-decoration:underline;text-underline-offset:.25em}.platform-option:hover .platform-arrow>.iconify{transform:translateX(2px)}.platform-option--android:hover .platform-arrow>.iconify{transform:translate(2px,-2px)}
.platform-follow-up{display:flex;align-items:center;justify-content:space-between;gap:2rem;margin-top:2.5rem;padding-inline:.25rem}.platform-follow-up>p{font-size:1.0625rem;line-height:1.6;margin:0;max-width:44rem;color:var(--md-on-surface-variant)}.platform-follow-up>a{display:inline-flex;align-items:center;gap:.7rem;min-height:3rem;flex-shrink:0;font-size:1.0625rem;font-weight:700;color:var(--demo-accent)}.platform-follow-up .iconify{width:1.25rem;height:1.25rem;flex-shrink:0}.platform-follow-up>a:hover{text-decoration:underline;text-underline-offset:5px}.get-started a:focus-visible{outline:3px solid var(--demo-accent);outline-offset:6px}
@media(max-width:1000px){.platform-intro{gap:2rem}.platform-options{gap:1.5rem}.platform-option-top{flex-direction:column;align-items:flex-start;gap:1rem}.platform-kind{text-align:left;max-width:none}.platform-follow-up{align-items:flex-start;flex-direction:column;gap:.5rem}}
@media(max-width:700px){.get-started{margin-block:1rem 3rem;padding-block:3.5rem}.platform-intro{grid-template-columns:1fr;gap:1.5rem;margin-bottom:2rem}.platform-intro h2{font-size:clamp(2.2rem,7vw,3rem)}.platform-intro>p{justify-self:start;font-size:1.125rem}.platform-options{grid-template-columns:1fr}.platform-option{border-radius:1.5rem}.platform-option-top{flex-direction:row;align-items:center;margin-bottom:1.75rem}.platform-symbol{width:4.75rem;height:4.75rem;border-radius:1.25rem}.platform-symbol>.iconify{width:2.75rem;height:2.75rem}.platform-kind{text-align:right;max-width:10rem;font-size:.938rem}.platform-option h3{font-size:2rem}.platform-option>p{font-size:1.125rem}.platform-action{font-size:1.125rem;gap:.75rem}.platform-arrow{width:3rem;height:3rem}.platform-option ul{margin-bottom:2rem}}
@media(max-width:380px){.platform-option{padding:1.35rem}.platform-option-top{gap:.75rem}.platform-symbol{width:4rem;height:4rem}.platform-symbol>.iconify{width:2.5rem;height:2.5rem}.platform-kind{font-size:.875rem}.platform-option h3{font-size:1.85rem}.platform-action{font-size:1.0625rem}.platform-arrow{width:2.75rem;height:2.75rem}.platform-option ul{font-size:1rem}}
@media(prefers-reduced-motion:reduce){.platform-option,.platform-arrow>.iconify{transition:none}.platform-option:hover .platform-arrow>.iconify{transform:none}}
</style>

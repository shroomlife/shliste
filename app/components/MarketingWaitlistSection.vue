<script setup lang="ts">
import MarketingMysticAura from './MarketingMysticAura.vue'
</script>

<template>
  <section
    id="premium-ausblick"
    class="waitlist-invite"
    aria-labelledby="waitlist-invite-title"
  >
    <MarketingMysticAura dark />
    <div class="mkt-content invite-inner">
      <div class="invite-copy">
        <PremiumComingSoonBadge
          variant="invite"
          class="invite-label"
        />
        <h2 id="waitlist-invite-title">
          Da kommt noch<br>etwas Gutes.
        </h2>
        <p>Deinen Einkauf einsprechen. Rezepte vom Foto mitnehmen. Lieblingsgerichten ein Bild geben. Unsere KI-Helfer bekommen gerade den letzten Feinschliff.</p>
      </div>
      <div class="invite-action">
        <div
          class="invite-art"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-mails" /><span class="invite-heart"><UIcon name="i-lucide-heart" /></span>
        </div>
        <p>Ein kleiner Platz auf der Liste.<br>Eine Nachricht, wenn es losgeht.</p>
        <NuxtLink
          to="/warteliste"
          class="invite-link"
        ><span>Zum Start Bescheid bekommen</span><UIcon name="i-lucide-arrow-right" /></NuxtLink>
        <span class="invite-note">Mit deiner E-Mail. Ohne Konto. Ganz unverbindlich.</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.waitlist-invite{scroll-margin-top:6rem;position:relative;isolation:isolate;overflow:hidden;margin-block:clamp(2rem,5vw,4rem);padding-block:clamp(2.5rem,5vw,4rem);background:#382432;color:#fff5fc;border-block:1px solid #624455}
.waitlist-invite::before{content:'';position:absolute;z-index:-1;width:32rem;height:32rem;right:-12rem;top:-15rem;border:1px solid #e7b6d530;border-radius:50%;box-shadow:0 0 0 4rem #e7b6d508,0 0 0 8rem #e7b6d505;pointer-events:none}
.invite-inner{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:center;gap:clamp(2rem,6vw,6rem)}
.invite-label{margin:0 0 1.25rem}
.invite-copy h2{font-size:clamp(2.25rem,3.8vw,3.5rem);font-weight:850;letter-spacing:-.035em;line-height:1.06;margin:0 0 1rem;text-wrap:balance}
.invite-copy>p:last-child{margin:0;max-width:32rem;font-size:1rem;line-height:1.65;color:#e7d5e1}
.invite-action{display:flex;flex-direction:column;align-items:flex-start;gap:1rem;min-width:0;padding-left:clamp(0rem,2vw,2rem);border-left:1px solid #efd1e526}
.invite-art{position:relative;display:grid;place-items:center;width:3.5rem;height:3.5rem;background:#ffffff0d;border:1px solid #efd1e533;border-radius:1rem;color:#efd1e5;transform:rotate(-6deg)}
.invite-art>.iconify{width:2rem;height:2rem}.invite-heart{position:absolute;right:-.4rem;bottom:-.1rem;display:grid;place-items:center;width:1.4rem;height:1.4rem;border-radius:50%;background:#eac3de;color:#382432}.invite-heart>.iconify{width:.8rem;height:.8rem}
.invite-action>p{font-size:1.125rem;font-weight:600;line-height:1.5;margin:0}
.invite-link{display:flex;align-items:center;justify-content:center;gap:.75rem;max-width:100%;min-height:3.25rem;padding:.875rem 1.25rem;border-radius:999px;background:#f6dced;color:#382432;font-size:.9375rem;font-weight:750;line-height:1.4;text-decoration:none;text-align:center;transition:background .18s,box-shadow .18s}
.invite-link>.iconify{width:1.125rem;height:1.125rem;flex:none;transition:transform .18s}.invite-link:hover{background:#fff5fc;box-shadow:0 0 0 5px #f6dced0d}.invite-link:hover>.iconify{transform:translateX(3px)}.invite-link:focus-visible{outline:3px solid #f6dced;outline-offset:5px}.invite-note{font-size:.75rem;line-height:1.5;color:#d9c3d2}
@media(max-width:700px){.invite-inner{grid-template-columns:1fr;gap:1.75rem}.invite-action{padding:1.5rem 0 0;border-left:0;border-top:1px solid #efd1e526}.invite-art{display:none}.invite-link{width:100%}}
@media(prefers-reduced-motion:reduce){.invite-link,.invite-link>.iconify{transition:none}.invite-link:hover>.iconify{transform:none}}
@media print{.waitlist-invite{display:none}}
</style>

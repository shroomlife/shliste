<script setup lang="ts">
defineProps<{ name?: string, earnedDate?: string, imageUrl?: string | null, titleId?: string, replay?: boolean, compact?: boolean }>()
</script>

<template>
  <div
    class="badge-earned__plate"
    :class="{ replay, compact, 'award-plate': !replay && !compact }"
  >
    <div class="badge-earned__art">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        alt=""
      >
      <UIcon
        v-else
        name="i-lucide-chef-hat"
        mode="svg"
        class="mx-auto size-16"
      />
      <svg
        v-if="!replay && !compact"
        class="badge-steam"
        viewBox="0 0 120 80"
        aria-hidden="true"
      >
        <path
          v-for="x in [32, 60, 88]"
          :key="x"
          :d="`M ${x} 70 c -14 -15 12 -22 0 -38 q -8 -12 1 -22`"
        />
      </svg>
    </div>
    <RecipeBadgeSeal class="celebration-seal" />
    <span
      v-if="!compact"
      class="badge-edition"
    >{{ replay ? 'Dein Abzeichen' : 'Badge verdient!' }}</span>
    <p
      :id="titleId"
      class="badge-earned__name text-[1.75rem] leading-tight font-extrabold"
    >
      {{ name }}
    </p>
    <p
      v-if="!compact"
      class="badge-earned__date"
    >
      Verdient am {{ earnedDate }}
    </p>
  </div>
</template>

<style scoped>
.badge-edition { display: block; margin: .15rem auto .6rem; font-size: .7rem; line-height: 1.3; font-weight: 700; text-transform: uppercase; letter-spacing: .18em; color: #e6c39d; }
.badge-earned__plate {
  width: 100%; position: relative; isolation: isolate; overflow: hidden;
  padding: .48rem .48rem 2rem; border: 1px solid #d8b68c; border-radius: .9rem .9rem 1.65rem 1.65rem;
  color: #fff2da; background: radial-gradient(ellipse at top right, #79455b, transparent 66%), #3d2539;
  box-shadow: inset 0 0 0 3px #3d2539, inset 0 0 0 4px #987453, 0 8px 24px #180d243d;
}
.badge-earned__plate::after {
  content: ''; position: absolute; left: 15%; right: 15%; bottom: .8rem; height: 4px;
  background: linear-gradient(90deg, transparent,#edcea0,transparent);
  clip-path: polygon(0 50%,44% 35%,50% 0,56% 35%,100% 50%,56% 65%,50% 100%,44% 65%);
}
.badge-earned__art { position: relative; overflow: hidden; border-radius: .55rem .55rem .18rem .18rem; background: #301f2a; color: #edcca2; }
.badge-earned__art img { display: block; width: 100%; height: auto; max-height: 44dvh; object-fit: contain; }
.celebration-seal { --seal-size: 4.6rem; margin: -2.1rem auto .15rem; }
.badge-earned__name { font: 600 clamp(1.6rem,5vw,2.15rem)/1.1 Georgia,serif; overflow-wrap: anywhere; padding: 0 .75rem; letter-spacing: -.025em; }
.badge-earned__date { color: #f1d6b4; margin-top: .6rem; font-size: .94rem; }
.badge-steam { position: absolute; height: 65%; left: 50%; bottom: 25%; transform: translateX(-50%); pointer-events: none; }
.badge-steam path { fill: none; stroke: #fff8e9; stroke-width: 3; stroke-linecap: round; opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .badge-steam path { animation: warm-wisp 1.65s ease-out; }
  .badge-steam path:nth-child(2) { animation-delay: 220ms; }
  .badge-steam path:nth-child(3) { animation-delay: 520ms; }
}
@media (prefers-reduced-motion: no-preference) {
  .award-plate .badge-earned__art::after {
    content: ''; position: absolute; inset: -28% -18%; pointer-events: none; opacity: 0;
    background: conic-gradient(from 139deg at 15% 0%, transparent, #ffe5ae52 13deg, transparent 30deg),
      conic-gradient(from 195deg at 89% 0%, transparent, #f6c79b60 14deg, transparent 35deg);
    animation: pass-lights 5.9s ease-in-out both;
  }
  .award-plate .badge-earned__art { animation: assemble-art 850ms 120ms cubic-bezier(.18,.8,.21,1) both; }
  .award-plate .badge-edition { animation: assemble-label 500ms 850ms ease-out both; }
  .award-plate .badge-earned__name { animation: assemble-label 650ms 1000ms cubic-bezier(.18,.8,.21,1) both; }
  .award-plate .badge-earned__date { animation: assemble-label 550ms 1250ms ease-out both; }
  .award-plate .celebration-seal { animation: strike-medal 1.05s .55s cubic-bezier(.17,.74,.29,1) both; }
  .award-plate .celebration-seal::before {
    content: ''; position: absolute; inset: 7%; border-radius: 50%; pointer-events: none;
    box-shadow: 0 0 0 1px #fff1b9, 0 0 12px 3px #ffcf8e80;
    animation: medal-echo 1.55s 1.04s ease-out 2 both;
  }
  .award-plate .badge-steam path { animation-iteration-count: 2; }
}
@keyframes assemble-art { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes assemble-label { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }
@keyframes strike-medal {
  0% { opacity: 0; transform: translateY(12px) scale(.60) rotate(-13deg); }
  55% { opacity: 1; transform: translateY(-2px) scale(1.14) rotate(3deg); }
  82% { transform: scale(.97) rotate(-1deg); }
  100% { opacity: 1; transform: none; }
}
@keyframes medal-echo {
  0% { opacity: 0; transform: scale(.9); } 14% { opacity: .76; }
  100% { opacity: 0; transform: scale(1.9); }
}
@keyframes pass-lights {
  0% { opacity: 0; transform: translateX(-6%) rotate(-4deg); }
  14%,55% { opacity: 1; } 80% { opacity: .5; }
  100% { opacity: 0; transform: translateX(6%) rotate(4deg); }
}
@keyframes warm-wisp { 0% { transform: translateY(15px); } 35% { opacity: .8; } 100% { opacity: 0; transform: translate(3px,-12px); } }

.badge-earned__plate { text-align: center; }
.compact { padding-bottom: 1.1rem; }
.compact .celebration-seal { --seal-size: 2.4rem; margin-top: -1.2rem; }
.compact .badge-earned__name { font-size: 1.05rem; }
</style>

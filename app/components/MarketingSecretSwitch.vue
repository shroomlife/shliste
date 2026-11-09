<script setup lang="ts">
// Android ListCreateSheet: Material 3 switch with a lock icon in both states.
// This is a non-interactive illustration inside the inert marketing phone.
withDefaults(defineProps<{ checked?: boolean }>(), { checked: false })
</script>

<template>
  <span
    class="native-secret-switch"
    :class="{ 'is-checked': checked }"
    role="img"
    :aria-label="checked ? 'Geheime Liste eingeschaltet' : 'Geheime Liste ausgeschaltet'"
  >
    <span class="native-secret-thumb">
      <span
        v-if="checked"
        class="private-lock"
      />
      <svg
        v-else
        viewBox="0 0 256 256"
        aria-hidden="true"
      ><path
        fill="currentColor"
        d="M208,80L96,80L96,56a32,32 0,0 1,32 -32c15.37,0 29.2,11 32.16,25.59a8,8 0,0 0,15.68 -3.18C171.32,24.15 151.2,8 128,8a48.05,48.05 0,0 0,-48 48v24L48,80a16,16 0,0 0,-16 16v112a16,16 0,0 0,16 16h160a16,16 0,0 0,16 -16L224,96a16,16 0,0 0,-16 -16m0,128L48,208L48,96h160zM140,152a12,12 0,1 1,-12 -12a12,12 0,0 1,12 12"
      /></svg>
    </span>
  </span>
</template>

<style scoped>
.native-secret-switch{position:relative;display:block;flex:0 0 52px;width:52px;height:32px;border:2px solid var(--md-on-surface-variant);border-radius:18px;background:var(--md-surface-container);box-sizing:border-box;transition:background-color .5s,border-color .5s}
.native-secret-thumb{position:absolute;top:2px;left:2px;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--md-on-surface-variant);color:var(--md-surface-container);transition:transform .35s cubic-bezier(.2,0,0,1),background-color .5s,color .5s}
.native-secret-thumb>svg,.private-lock{display:block;width:16px;height:16px}
.private-lock{background:currentColor;mask:url('/images/brand/android-lock-private.svg') center/contain no-repeat}
.native-secret-switch.is-checked{background:var(--md-primary);border-color:var(--md-primary)}
.is-checked .native-secret-thumb{transform:translateX(20px);background:var(--md-on-primary);color:var(--md-primary)}
@media(prefers-reduced-motion:reduce){.native-secret-switch,.native-secret-thumb{transition:none}}
</style>

<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'
import type { marketingHeroWorlds } from '~/data/marketingHeroWorlds'

// MemberSheet.kt supplies the sheet anatomy and invitation states. ListItemRow
// supplies the real PWA row, including its foreign-change attribution and flash.
const props = defineProps<{ world: typeof marketingHeroWorlds[number], moment: number, time: number }>()
const showMembers = computed(() => props.moment === 1 || props.moment === 2)
const pending = computed(() => props.moment === 1 && props.time >= 5200)
const accepted = computed(() => props.moment >= 2)
const names = computed(() => props.moment >= 3 ? ['Kaffee', 'Haferdrink', 'Spülmittel'] : ['Kaffee', 'Spülmittel'])
const checked = (index: number) => props.moment >= 5 || (props.moment >= 4 && index < 2)
function item(name: string, index: number): ListItem {
  return { id: `wg-${name}`, listId: 'hero-wg', name, checked: checked(index), quantity: 1, removed: false, orderIndex: index, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: name === 'Haferdrink' ? 'demo-noor' : 'demo-jules', modifiedBy: name === 'Haferdrink' ? 'demo-noor' : 'demo-jules', createdAt: '', updatedAt: '', deletedAt: null, fieldTimestamps: null }
}
</script>

<template>
  <div
    class="sharing-scene"
    :data-step="moment"
    aria-hidden="true"
    inert
  >
    <MarketingNativeListViewport
      :title="world.lists[0]"
      :count="names.length"
      :shared="accepted"
      shareable
      :progress="0"
    >
      <TransitionGroup name="wg-item">
        <div
          v-for="(name, index) in names"
          :key="name"
          class="sharing-row"
          :class="{ 'sharing-row--attributed': name === 'Haferdrink' }"
        >
          <ListItemRow
            :item="item(name, index)"
            :changed-by="name === 'Haferdrink' ? 'Noor' : null"
            :just-changed="name === 'Haferdrink' && moment === 3"
          />
          <small
            v-if="name === 'Haferdrink'"
            class="native-attribution"
          >von Noor</small>
        </div>
      </TransitionGroup>
    </MarketingNativeListViewport>
    <div class="sharing-summary">
      <UIcon :name="moment >= 5 ? 'i-lucide-check-check' : moment === 3 ? 'i-lucide-users' : 'i-lucide-list-checks'" /><span>{{ moment >= 5 ? 'Alles besorgt. Bis gleich, Noor!' : moment === 4 ? '2 von 3 besorgt' : moment === 3 ? 'Noor hat Haferdrink ergänzt.' : 'Gemeinsame Vorräte für eure WG' }}</span>
    </div>

    <Transition name="members-sheet">
      <div
        v-if="showMembers"
        class="members-overlay"
      >
        <div class="members-sheet">
          <i class="members-handle" />
          <h3>Mitglieder</h3>
          <p class="members-description">
            Alle Mitglieder sehen die Liste live und können Einträge ändern.
          </p>
          <div class="member-row">
            <span class="member-avatar">J</span><strong>Jules (Du)</strong><small class="member-role">Besitzer</small>
          </div>
          <Transition name="member-arrival">
            <div
              v-if="pending || accepted"
              class="member-row member-row--noor"
            >
              <span class="member-avatar member-avatar--noor">N</span>
              <span class="member-name"><strong>Noor</strong><small v-if="pending">Wartet auf Bestätigung</small></span>
              <small
                v-if="pending"
                class="member-role member-role--pending"
              >Eingeladen</small><UIcon
                v-else
                name="i-lucide-user-minus"
                class="member-remove"
              />
            </div>
          </Transition>

          <template v-if="!accepted">
            <div class="invite-heading">
              <UIcon name="i-lucide-user-plus" /><strong>Person einladen</strong><UIcon name="i-lucide-chevron-up" />
            </div>
            <div
              v-if="!pending"
              class="contact-suggestion"
            >
              <small>Vorschläge</small><div><span class="member-avatar member-avatar--noor">N</span><strong>Noor</strong><span class="contact-action">Einladen</span></div>
            </div>
            <div class="email-placeholder">
              <span>E-Mail-Adresse</span>
            </div>
            <span class="invite-button invite-button--disabled">Einladen</span>
          </template>
          <p
            v-else
            class="accepted-caption"
          >
            <UIcon name="i-lucide-check-check" /><span>Später: Noor hat die Einladung angenommen.</span>
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.sharing-scene{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;background:var(--md-surface)}
.members-sheet h3{font-size:25px;line-height:1.15;font-weight:800;margin:0 0 6px}
.sharing-row{position:relative;flex-shrink:0}
.sharing-row :deep(.list-item-row>button.state-layer){min-height:52px;padding:8px 12px}
.sharing-row :deep(.text-\[0\.875rem\]){font-size:12px;line-height:17px}
.sharing-row--attributed :deep(.list-item-row),.sharing-row--attributed :deep(.list-item-row>button.state-layer){height:64px;min-height:64px}
.sharing-row--attributed :deep(.state-layer>span){padding-bottom:17px}
.sharing-row--attributed :deep(.text-\[0\.875rem\].font-bold){display:none}
.native-attribution{position:absolute;left:12px;bottom:10px;font-size:12px;line-height:17px;color:var(--md-on-surface-variant);pointer-events:none}
.sharing-summary{display:flex;align-items:center;gap:8px;min-height:44px;margin:12px;padding:11px 12px;border-radius:10px;background:var(--md-secondary-container);font-size:13px;line-height:20px;flex-shrink:0}
.sharing-summary>.iconify{width:20px;height:20px;flex-shrink:0}
.members-overlay{position:absolute;inset:0;display:flex;align-items:flex-end;background:#23192729;z-index:2}
.members-sheet{width:100%;height:min(100%,480px);max-height:100%;overflow:auto;background:var(--md-surface-container);border-radius:24px 24px 0 0;padding:12px 16px 18px;box-shadow:0 -10px 30px #23192712}
.members-handle{display:block;width:30px;height:4px;border-radius:4px;background:var(--md-outline-variant);margin:0 auto 15px}
.members-description{margin:0 0 10px;font-size:13px;line-height:17px;color:var(--md-on-surface-variant)}
.member-row{display:flex;align-items:center;gap:9px;min-height:48px;border-bottom:1px solid var(--md-outline-variant);padding:5px 0}
.member-avatar{display:grid;place-items:center;width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:var(--md-secondary-container);color:var(--md-primary);font-size:18px;font-weight:700;line-height:1}
.member-avatar--noor{background:var(--md-primary-container);color:var(--md-on-primary-container)}
.member-row>strong,.member-name{flex:1;min-width:0}.member-row strong,.contact-suggestion strong{font-size:18px;line-height:22px;font-weight:600}
.member-name>strong,.member-name>small{display:block}.member-name>small{font-size:11px;line-height:15px;color:var(--md-on-surface-variant)}
.member-role{padding:4px 7px;border-radius:20px;background:var(--md-secondary-container);font-size:11px;line-height:16px;white-space:nowrap}
.member-role--pending{background:var(--md-tertiary-container,var(--md-secondary-container))}
.member-remove{width:20px;height:20px;margin:0 6px;color:var(--md-on-surface-variant)}
.invite-heading{display:flex;align-items:center;gap:8px;font-size:16px;line-height:20px;margin:15px 0 9px;color:var(--md-primary)}
.invite-heading .iconify{width:20px;height:20px;flex-shrink:0}.invite-heading>strong{flex:1;font-weight:700}
.contact-suggestion>small{font-size:11px;line-height:15px;color:var(--md-on-surface-variant)}
.contact-suggestion>div{display:flex;align-items:center;gap:9px;min-height:42px;margin-bottom:8px}.contact-suggestion strong{flex:1}.contact-action{font-size:14px;font-weight:700;color:var(--md-primary)}
.email-placeholder{display:flex;align-items:center;min-height:44px;padding:10px 12px;border:1px solid var(--md-outline);border-radius:5px;font-size:16px;line-height:20px;color:var(--md-on-surface-variant)}
.invite-button{display:grid;place-items:center;min-height:40px;margin-top:10px;border-radius:24px;font-size:16px;line-height:20px;font-weight:700;background:var(--md-primary);color:var(--md-on-primary)}
.invite-button--disabled{background:color-mix(in srgb,var(--md-on-surface) 12%,transparent);color:color-mix(in srgb,var(--md-on-surface) 38%,transparent)}
.accepted-caption{display:flex;align-items:center;gap:8px;margin:18px 0 0;padding:12px;background:var(--md-secondary-container);border-radius:12px;font-size:14px;line-height:19px}.accepted-caption>.iconify{width:22px;height:22px;flex-shrink:0;color:var(--md-primary)}
.members-sheet-enter-active,.members-sheet-leave-active{transition:opacity .4s}.members-sheet-enter-active .members-sheet,.members-sheet-leave-active .members-sheet{transition:transform .6s cubic-bezier(.22,1,.36,1)}
.members-sheet-enter-from,.members-sheet-leave-to{opacity:0}.members-sheet-enter-from .members-sheet,.members-sheet-leave-to .members-sheet{transform:translateY(100%)}
.member-arrival-enter-active,.wg-item-enter-active{transition:opacity .5s,transform .65s cubic-bezier(.22,1,.36,1)}.member-arrival-enter-from,.wg-item-enter-from{opacity:0;transform:translateY(12px)}.wg-item-move{transition:transform .6s cubic-bezier(.22,1,.36,1)}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

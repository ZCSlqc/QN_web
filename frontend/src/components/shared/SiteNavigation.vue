<template>
      <header class="nav-bar" :class="{ scrolled: light }">
        <div class="nav-brand">
          <a class="nav-logo" :href="sectionHref('home')" @click.prevent="navigateTo('home')">LOVE</a>
          <div class="nav-account-actions">
            <PrivateMailbox v-if="navigationMailbox" :scrolled="light" @unavailable="hideMailbox" />
            <AccountMenu v-if="currentProfile?.username" />
            <router-link v-if="navigationAdmin" to="/admin" class="admin-nav-link" @click="mobileNavOpen = false">管理</router-link>
          </div>
        </div>
        <nav class="nav-links">
          <a :href="sectionHref('home')" @click.prevent="navigateTo('home')">爱的首页</a>
          <a :href="sectionHref('story')" @click.prevent="navigateTo('story')">爱的故事</a>
          <a :href="sectionHref('album')" @click.prevent="navigateTo('album')">爱的相册</a>
          <router-link v-if="canVisitPage('/journey', navigationAdmin)" to="/journey" class="journey-nav-link">爱的旅程</router-link>
          <router-link v-if="canVisitPage('/pet', navigationAdmin)" to="/pet" class="pet-nav-link">爱的小窝</router-link>
          <router-link v-if="canVisitPage('/wedding', navigationAdmin)" to="/wedding">爱的婚礼</router-link>
        </nav>
        <button class="nav-toggle" aria-label="切换导航菜单" :aria-expanded="mobileNavOpen" @click="mobileNavOpen = !mobileNavOpen">
          <span></span><span></span><span></span>
        </button>
      </header>
      <div v-if="mobileNavOpen" class="mobile-menu glass-card">
        <a :href="sectionHref('home')" @click.prevent="navigateTo('home'); mobileNavOpen = false">爱的首页</a>
        <a :href="sectionHref('story')" @click.prevent="navigateTo('story'); mobileNavOpen = false">爱的故事</a>
        <a :href="sectionHref('album')" @click.prevent="navigateTo('album'); mobileNavOpen = false">爱的相册</a>
        <router-link v-if="canVisitPage('/journey', navigationAdmin)" to="/journey" @click="mobileNavOpen = false" class="journey-mobile-link">爱的旅程</router-link>
        <router-link v-if="canVisitPage('/pet', navigationAdmin)" to="/pet" @click="mobileNavOpen = false">爱的小窝</router-link>
        <router-link v-if="canVisitPage('/wedding', navigationAdmin)" to="/wedding" @click="mobileNavOpen = false">爱的婚礼</router-link>
      </div>

</template>
<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PrivateMailbox from '../../features/mailbox/PrivateMailbox.vue'
import AccountMenu from '../../features/auth/AccountMenu.vue'
import { canVisitPage, currentProfile } from '../../features/auth/pageAccess'
import { homeSectionHref as sectionHref, navigateHomeSection } from '../../utils/homeNavigation'
defineProps({ light: Boolean, isAdmin: Boolean, hasMailbox: Boolean, currentUsername: String })
const emit = defineEmits(['mailbox-unavailable'])
const mailboxUnavailable = ref(false)
const navigationAdmin = computed(() => currentProfile.value?.is_admin === true)
const navigationMailbox = computed(() => currentProfile.value?.has_mailbox === true && !mailboxUnavailable.value)
function hideMailbox() { mailboxUnavailable.value = true; emit('mailbox-unavailable') }
watch(() => currentProfile.value?.username, () => { mailboxUnavailable.value = false })
const route = useRoute()
const router = useRouter()
const mobileNavOpen = ref(false)
watch(() => route.fullPath, () => { mobileNavOpen.value = false })
function navigateTo(id) {
  mobileNavOpen.value = false
  return navigateHomeSection(router, id)
}
</script>
<style scoped>
.nav-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 48px;
  gap: 24px;
  transition: background var(--transition-smooth), box-shadow var(--transition-smooth);
}
.nav-bar.scrolled {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.nav-logo { font-family: var(--font-display); font-size: 24px; color: #fff; letter-spacing: 3px; transition: color var(--transition-smooth); }
.nav-brand { display: flex; align-items: center; gap: 12px; color: #fff; }
.nav-brand { flex-shrink: 0; }
.nav-account-actions { display: flex; align-items: center; gap: 12px; min-height: 32px; }
.nav-account-actions .admin-nav-link { font-size: 13px; white-space: nowrap; padding: 7px 0; color: inherit; }
.nav-bar.scrolled .nav-brand { color: var(--color-rose-dark); }
.nav-bar.scrolled .nav-logo { color: var(--color-rose); }
.nav-links { display: flex; gap: 28px; }
.nav-links a { font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 1px; transition: color var(--transition-fast); white-space: nowrap; }
.nav-links a:hover, .nav-links .admin-nav-link:hover, .nav-links .journey-nav-link:hover { color: #fff; }
.admin-nav-link { color: var(--color-gold); }
.journey-nav-link { font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 1px; transition: color var(--transition-fast); }
.nav-bar.scrolled .nav-links a { color: var(--color-text-light); }
.nav-bar.scrolled .nav-links a:hover, .nav-bar.scrolled .admin-nav-link:hover, .nav-bar.scrolled .journey-nav-link:hover { color: var(--color-rose); }
.nav-bar.scrolled .admin-nav-link { color: var(--color-gold); }
.nav-bar.scrolled .journey-nav-link { color: var(--color-text-light); }
.nav-toggle { display: none; flex-direction: column; gap: 5px; background: none; padding: 4px; }
.nav-toggle span { width: 24px; height: 2px; background: #fff; border-radius: 1px; transition: all var(--transition-fast); }
.nav-bar.scrolled .nav-toggle span { background: var(--color-text); }

.mobile-menu { display: none; position: fixed; top: 64px; left: 16px; right: 16px; z-index: 999; padding: 20px; background: var(--color-surface-solid); }
.mobile-menu a { display: block; padding: 12px 0; text-align: center; font-size: 16px; color: var(--color-text); border-bottom: 1px solid #f0e8ea; }
.mobile-menu a:last-child { border: none; }


@media (max-width: 1000px) {
  .nav-links { display: none; }
  .nav-toggle { display: flex; }
  .mobile-menu { display: block; }
  .nav-bar { padding: 14px 20px; }
}
@media (max-width: 360px) {
  .nav-bar { padding: 14px 12px; gap: 12px; }
  .nav-brand, .nav-account-actions { gap: 8px; }
}
</style>

import { ref, readonly } from 'vue'

const allowedPages = ref([])
const profile = ref(null)
export const currentProfile = readonly(profile)
let profileToken = null, updatedAt = 0
export function recentProfile() {
  return profileToken === localStorage.getItem('token') && Date.now() - updatedAt < 30000 ? profile.value : null
}
export function setPageAccess(value) {
  allowedPages.value = Array.isArray(value?.allowed_pages) ? value.allowed_pages : []
  profile.value = value || null
  profileToken = localStorage.getItem('token'); updatedAt = Date.now()
}
export function canVisitPage(path, isAdmin = false) {
  return isAdmin === true || allowedPages.value.includes(path)
}
window.addEventListener('auth-expired', () => setPageAccess(null))
window.addEventListener('profile-updated', () => { updatedAt = 0 })

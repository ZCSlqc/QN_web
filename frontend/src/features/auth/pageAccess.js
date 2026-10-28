import { ref, readonly } from 'vue'

const allowedPages = ref([])
const profile = ref(null)
export const currentProfile = readonly(profile)
export function setPageAccess(value) {
  allowedPages.value = Array.isArray(value?.allowed_pages) ? value.allowed_pages : []
  profile.value = value || null
}
export function canVisitPage(path, isAdmin = false) {
  return isAdmin === true || allowedPages.value.includes(path)
}
window.addEventListener('auth-expired', () => setPageAccess(null))

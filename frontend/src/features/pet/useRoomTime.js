import { ref, onMounted, onUnmounted } from 'vue'

export function useRoomTime() {
  const night = ref(false)
  let timer
  function update() {
    const hour = new Date(Date.now() + 8 * 3600000).getUTCHours()
    night.value = hour >= 18 || hour < 6
    clearTimeout(timer)
    timer = setTimeout(update, 60000 - Date.now() % 60000)
  }
  onMounted(() => { update(); document.addEventListener('visibilitychange', update) })
  onUnmounted(() => { clearTimeout(timer); document.removeEventListener('visibilitychange', update) })
  return { night }
}

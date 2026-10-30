import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export const isCatAway = action => ['leaving-room', 'bathroom', 'returning-room'].includes(action)

export function useCatMoments({ scene, action, walk, reset, say, feeding }) {
  const moment = ref('')
  const away = computed(() => isCatAway(action.value))
  const emotion = computed(() => action.value === 'pet' ? 'heart' : away.value || action.value === 'sleep' ? '' : moment.value)
  let moodTimer, moodEnd, tripTimer, observer, visible = false, disposed = false
  let remaining = 180000 + Math.random() * 120000, deadline = 0
  function clearMood() { clearTimeout(moodTimer); clearTimeout(moodEnd); moment.value = '' }
  function show(icon, duration) {
    clearMood()
    if (!visible || document.hidden || away.value || action.value === 'sleep') return
    moment.value = icon
    moodEnd = setTimeout(() => { moment.value = '' }, duration)
  }
  function idleMood() {
    clearMood()
    if (!visible || document.hidden || action.value !== 'idle' || walk.walking.value) return
    moodTimer = setTimeout(() => show('stars', 5000 + Math.random() * 3000), 9000 + Math.random() * 3000)
  }
  function pause() {
    clearMood(); clearTimeout(tripTimer)
    if (deadline) remaining = Math.max(0, deadline - Date.now())
    deadline = 0
  }
  function schedule() {
    clearTimeout(tripTimer)
    if (disposed || !visible || document.hidden || ['leaving-room', 'returning-room'].includes(action.value)) return
    deadline = Date.now() + remaining
    tripTimer = setTimeout(action.value === 'bathroom' ? comeBack : leaveRoom, remaining)
  }
  function leaveRoom() {
    deadline = 0
    if (action.value !== 'idle' || feeding.value) { remaining = 8000; schedule(); return }
    clearMood(); reset(); action.value = 'leaving-room'; say('出去一下，马上回来。')
    const width = scene.value?.clientWidth || 1000
    const edge = 102 + Math.min(360, width * .9) / width * 50
    walk.go(edge, () => {
      if (action.value !== 'leaving-room') return
      action.value = 'bathroom'; remaining = 8000 + Math.random() * 4000; schedule()
    })
  }
  function comeBack() {
    deadline = 0; action.value = 'returning-room'
    walk.go(65, () => {
      if (action.value !== 'returning-room') return
      reset(); say('回来啦，还是家里舒服。')
      remaining = 180000 + Math.random() * 120000; schedule()
    })
  }
  watch(action, value => {
    clearMood()
    if (value === 'idle') idleMood()
    else if (value === 'approaching-water') show('idea', 1400)
  })
  watch(walk.preparing, preparing => { if (preparing && action.value === 'idle') show('idea', 1400) })
  watch(walk.walking, moving => { if (!moving && action.value === 'idle') idleMood(); else if (moving && moment.value === 'stars') clearMood() })
  function visibility() { if (document.hidden) pause(); else { schedule(); idleMood() } }
  onMounted(() => {
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .2
      if (!visible) pause()
      else { schedule(); idleMood() }
    }, { threshold: .2 })
    if (scene.value) observer.observe(scene.value)
    document.addEventListener('visibilitychange', visibility)
  })
  onUnmounted(() => { disposed = true; pause(); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility) })
  return { away, emotion }
}

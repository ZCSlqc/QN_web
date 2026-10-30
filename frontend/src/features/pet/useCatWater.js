import { watch, onMounted, onUnmounted } from 'vue'

export function useCatWater({ scene, action, pose, walk, reset, say, feeding }) {
  let drankThisCycle = false
  let idleTimer, drinkTimer, observer, visible = false, disposed = false
  function clear() { clearTimeout(idleTimer); clearTimeout(drinkTimer) }
  function schedule() {
    clearTimeout(idleTimer)
    if (!disposed && visible && !document.hidden && !drankThisCycle && action.value === 'idle') idleTimer = setTimeout(drink, 30000 + Math.random() * 15000)
  }
  function drink() {
    if (action.value !== 'idle' || feeding.value || !visible || document.hidden) { schedule(); return }
    drankThisCycle = true
    reset(); walk.stop(); action.value = 'approaching-water'; say('走，喝口水去。', false)
    const bowl = scene.value?.querySelector('.water-bowl')
    const room = scene.value?.getBoundingClientRect(), box = bowl?.getBoundingClientRect()
    const target = room && box ? (box.x + box.width / 2 - room.x + Math.min(360, room.width * .9) * .13) / room.width * 100 : 28
    walk.go(target, () => {
      if (action.value !== 'approaching-water') return
      action.value = 'drinking'; pose.value = 3; say('咕嘟咕嘟，喝水也要认真。', false)
      drinkTimer = setTimeout(() => { if (action.value === 'drinking') { reset(); say('喝好啦，继续巡视。', false) } }, 4500)
    })
  }
  function suspend() {
    clear()
    if (['approaching-water', 'drinking'].includes(action.value)) { walk.stop(); reset() }
  }
  function visibility() { if (document.hidden) suspend(); else schedule() }
  watch(action, value => {
    clearTimeout(idleTimer)
    if (value === 'sleep') drankThisCycle = false
    if (value !== 'drinking') clearTimeout(drinkTimer)
    if (value === 'idle') schedule()
  })
  onMounted(() => {
    observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .2; if (visible) schedule(); else suspend() }, { threshold: .2 })
    if (scene.value) observer.observe(scene.value)
    document.addEventListener('visibilitychange', visibility)
  })
  onUnmounted(() => { disposed = true; clear(); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility) })
}

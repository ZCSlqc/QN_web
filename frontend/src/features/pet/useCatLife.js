import { isCatAway } from './useCatMoments'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// One state machine and clock for both artwork styles.
export function useCatLife({ scene, action, pose, walk, reset, react, moveToy, feeding, eating, say }) {
  const activeToy = ref('teaser'), hand = ref({ visible: false, x: 0, y: 0 })
  const mouse = ref({ x: 65, left: false }), visible = ref(false)
  const sleeping = computed(() => action.value === 'sleep')
  const busy = computed(() => feeding.value || eating.value || isCatAway(action.value) || action.value === 'approaching-food')
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let phase = '', remaining = 0, deadline = 0
  let napTimer, wakeTimer, mouseTimer, endTimer, observer, disposed = false
  function clearToys() { clearTimeout(mouseTimer); clearTimeout(endTimer) }
  function wake() { const wasSleeping = sleeping.value; clearTimeout(wakeTimer); clearToys(); walk.stop(); reset(); hand.value.visible = false; if (wasSleeping) say('睡醒啦，伸个懒腰。') }
  function nap() {
    if (busy.value) return
    wake(); action.value = 'going-home'; say('有点困，回窝眯一会儿。')
    const room = scene.value, home = room?.querySelector('.cat-home')
    const target = room && home ? (home.offsetLeft + home.offsetWidth / 2) / room.clientWidth * 100 : 80
    walk.go(target, () => { action.value = 'sleep'; pose.value = 1 })
  }
  function pauseRoutine() {
    if (deadline) remaining = Math.max(0, deadline - Date.now())
    deadline = 0; clearTimeout(napTimer); clearTimeout(wakeTimer)
  }
  function scheduleNap() {
    const watering = ['approaching-water', 'drinking'].includes(action.value)
    const next = sleeping.value ? 'sleep' : action.value === 'idle' || watering ? 'idle' : ''
    if (phase !== next) { phase = next; remaining = 60000 + Math.random() * 30000; deadline = 0 }
    if (watering) { pauseRoutine(); return }
    clearTimeout(napTimer); clearTimeout(wakeTimer)
    if (disposed || !visible.value || document.hidden || !phase) return
    if (deadline) remaining = Math.max(0, deadline - Date.now())
    deadline = Date.now() + remaining
    if (phase === 'idle') napTimer = setTimeout(nap, remaining)
    else wakeTimer = setTimeout(wake, remaining)
  }
  function chase() {
    if (action.value !== 'play' || activeToy.value !== 'mouse' || document.hidden || !visible.value) return
    const next = mouse.value.x > 50 ? 38 + Math.random() * 7 : 55 + Math.random() * 7
    mouse.value = { x: next, left: next < mouse.value.x }
    pose.value = 0
    say(['别跑！', '停下来！', '让我逮住你！'][Math.floor(Math.random() * 3)], false)
    walk.go(next, () => {
      if (action.value !== 'play') return
      pose.value = 2
      say(['吃我一掌！', '抓到啦！', '看我的猫猫拳！'][Math.floor(Math.random() * 3)], false)
      if (!motion.matches) mouseTimer = setTimeout(chase, 1100 + Math.random() * 500)
    })
  }
  function playWith(toy) {
    if (busy.value) return
    if (action.value === 'play' && activeToy.value === toy) { wake(); return }
    wake(); activeToy.value = toy; hand.value.visible = false
    if (toy === 'mouse') {
      action.value = 'play'; chase()
      endTimer = setTimeout(wake, 12000)
    } else react('play', window.matchMedia('(pointer: coarse)').matches)
  }
  function pointerMove(event) {
    if (event.target.closest('.weather-control, .scene-tools, .room-topline')) { leave(); return }
    if (activeToy.value === 'teaser') moveToy(event)
    const box = scene.value?.getBoundingClientRect()
    const cat = scene.value?.querySelector('.cat-wrap')?.getBoundingClientRect()
    if (!box || !cat) return
    const near = event.clientX > cat.left + cat.width * .18 && event.clientX < cat.right - cat.width * .18 && event.clientY > cat.top + cat.height * .2 && event.clientY < cat.bottom - cat.height * .08
    hand.value = { visible: event.pointerType !== 'touch' && near && !busy.value && !sleeping.value && action.value !== 'play' && action.value !== 'going-home', x: event.clientX - box.left, y: event.clientY - box.top }
  }
  function leave() { hand.value.visible = false }
  function suspend() {
    leave(); clearToys(); pauseRoutine()
    if (action.value === 'play') wake()
  }
  function visibilityChanged() { if (document.hidden) suspend(); else scheduleNap() }
  watch(action, (value, previous) => {
    scheduleNap()
    if (value !== 'play') clearToys()
    if (previous === 'play' && value === 'idle') walk.stop()
    if (value !== 'idle' && value !== 'pet') leave()
  })
  watch(walk.walking, moving => { if (moving && action.value === 'idle') say(['巡视一下我的地盘。', '走两步，看看窗外。', '这边也闻一闻。'][Math.floor(Math.random() * 3)], false) })
  onMounted(() => {
    observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting; if (!visible.value) suspend(); else scheduleNap() }, { threshold: .2 })
    if (scene.value) observer.observe(scene.value)
    document.addEventListener('visibilitychange', visibilityChanged)
    motion.addEventListener('change', suspend)
  })
  onUnmounted(() => { disposed = true; suspend(); observer?.disconnect(); document.removeEventListener('visibilitychange', visibilityChanged); motion.removeEventListener('change', suspend) })
  return { activeToy, hand, mouse, sleeping, wake, playWith, pointerMove, leave }
}

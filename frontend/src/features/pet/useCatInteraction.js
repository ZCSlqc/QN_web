import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useCatInteraction() {
  const scene = ref(null), action = ref('idle'), pose = ref(0), speech = ref(''), bubbleVisible = ref(false)
  const toyPoint = ref({ x: 65, y: 68 })
  const stroking = ref(false)
  const eating = computed(() => ['treat', 'kibble', 'can'].includes(action.value))
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let actionTimers = [], bubbleTimer, idleTimer, observer, inView = false, disposed = false
  let lastToyMove = 0
  let petLine = 0, playLine = 0, stroke = null, lastSaid = -Infinity
  const petLines = ['呼噜噜，再摸一下。', '嗯，这里刚刚好。', '今天也很喜欢你。', '这只手，可以留下。', '耳朵旁边也要摸摸。']
  const playLines = ['看见了！这次一定抓得到。', '先看看，再伸爪。', '让我试一下。']
  function clearAction() { actionTimers.forEach(clearTimeout); actionTimers = []; clearTimeout(idleTimer) }
  function later(callback, delay) { actionTimers.push(setTimeout(() => { if (!disposed) callback() }, delay)) }
  function say(text, force = true) {
    if (!force && Date.now() - lastSaid < 3200) return
    lastSaid = Date.now()
    clearTimeout(bubbleTimer); speech.value = text; bubbleVisible.value = true
    bubbleTimer = setTimeout(() => { bubbleVisible.value = false }, 3000)
  }
  function scheduleIdle() {
    clearTimeout(idleTimer)
    if (disposed || !inView || document.hidden || motion.matches || action.value !== 'idle') return
    idleTimer = setTimeout(() => {
      if (action.value !== 'idle' || document.hidden) return
      pose.value = 1
      later(() => { pose.value = 0; scheduleIdle() }, 420)
    }, 10000 + Math.random() * 6000)
  }
  function finish() { action.value = 'idle'; pose.value = 0; scheduleIdle() }
  function interact(kind) {
    if (eating.value || action.value === kind) return
    revealScene()
    clearAction(); action.value = kind
    if (kind === 'pet') {
      pose.value = 1; say(petLines[petLine++ % petLines.length])
      later(finish, 2400)
    } else {
      pose.value = 0; say(playLines[playLine++ % playLines.length])
      later(() => { pose.value = 2 }, 650)
      later(() => { pose.value = 0 }, 2400)
      const settle = () => { if (Date.now() - lastToyMove < 1500) later(settle, 1500); else finish() }
      later(settle, 4300)
    }
  }
  function feedReaction(food, replayed) {
    revealScene()
    clearAction(); action.value = food; pose.value = 0
    say(replayed ? '刚才那份收到啦，没有再拿一份哦。' : ({ treat: '舔舔，还有最后一口。', kibble: '这顿吃得很认真。', can: '罐罐！谢谢你。' })[food])
    const duration = ({ treat: 4000, kibble: 7000, can: 10000 })[food] || 4000
    later(() => { pose.value = 3 }, 450)
    if (duration >= 7000) later(() => say(food === 'can' ? '这口好香，慢慢吃。' : '咔嚓咔嚓，认真干饭。', false), 4500)
    later(() => { pose.value = 1 }, 450 + duration - 600)
    later(() => { finish(); say(['吃饱啦，舔舔嘴。', '谢谢你，肚子暖暖的。'][Math.floor(Math.random() * 2)]) }, 450 + duration)
  }
  function reset() {
    clearAction(); clearTimeout(bubbleTimer); bubbleVisible.value = false; stroke = null; stroking.value = false; finish()
  }
  function revealScene() {
    const box = scene.value?.getBoundingClientRect()
    if (box && (box.bottom < 160 || box.top > window.innerHeight - 160)) {
      scene.value.scrollIntoView({ block: 'center', behavior: motion.matches ? 'auto' : 'smooth' })
    }
  }
  function moveToy(event) {
    if (action.value !== 'play' || !scene.value) return
    lastToyMove = Date.now()
    const box = scene.value.getBoundingClientRect()
    toyPoint.value = { x: Math.max(0, Math.min(100, (event.clientX - box.left) / box.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - box.top) / box.height * 100)) }
  }
  function startStroke(event) { stroking.value = true; stroke = { x: event.clientX, y: event.clientY } }
  function moveStroke(event) {
    if (stroke && Math.hypot(event.clientX - stroke.x, event.clientY - stroke.y) > 12) { interact('pet'); stroke = null }
  }
  function stopStroke() { stroke = null; stroking.value = false }
  function visibility() {
    if (document.hidden) { clearAction(); clearTimeout(bubbleTimer); if (!['sleep', 'going-home', 'approaching-food', 'leaving-room', 'bathroom', 'returning-room'].includes(action.value)) { action.value = 'idle'; pose.value = 0 }; bubbleVisible.value = false; stopStroke() }
    else scheduleIdle()
  }
  onMounted(() => {
    observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; scheduleIdle() })
    if (scene.value) observer.observe(scene.value)
    document.addEventListener('visibilitychange', visibility)
    motion.addEventListener('change', visibility)
  })
  onUnmounted(() => {
    disposed = true; clearAction(); clearTimeout(bubbleTimer); observer?.disconnect()
    document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', visibility)
  })
  return { scene, action, pose, speech, bubbleVisible, eating, toyPoint, stroking, say, interact, feedReaction, reset, moveToy, startStroke, moveStroke, stopStroke }
}

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// Both visual styles use these same coordinates, timing and gait frame index.
export function useCatWalk(scene, styleName, action) {
  const x = ref(50), walking = ref(false), facing = ref(1), frame = ref(0), preparing = ref(false)
  const homeStart = ref(50), homeTarget = ref(80)
  const ready = ref({ realistic: false, illustrated: false })
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let raf = 0, idleTimer, turnTimer, resizeObserver, observer, visible = false, disposed = false
  let destination = 50, lastTime = 0, frameTime = 0, arrival = null, sequence = 0
  const spriteStyle = computed(() => {
    const distance = Math.abs(homeTarget.value - homeStart.value)
    const progress = action.value === 'going-home' ? Math.min(1, Math.abs(x.value - homeStart.value) / Math.max(distance, .1)) : 0
    return { left: `${x.value}%`, '--home-progress': progress }
  })
  function bounds() {
    if (['leaving-room', 'bathroom', 'returning-room'].includes(action.value)) return [-25, 150]
    const width = scene.value?.clientWidth || 1000
    const sprite = action.value === 'going-home' ? 86 : Math.min(360, width * (width < 768 ? 0.9 : 1))
    const margin = Math.min(45, (sprite / 2 + 12) / width * 100)
    return [margin, 100 - margin]
  }
  function clamp(value) { const [min, max] = bounds(); return Math.max(min, Math.min(max, value)) }
  function cancel() {
    sequence++; cancelAnimationFrame(raf); clearTimeout(idleTimer); clearTimeout(turnTimer)
    walking.value = false; preparing.value = false; lastTime = 0; arrival = null
  }
  function pause() {
    cancelAnimationFrame(raf); clearTimeout(idleTimer); clearTimeout(turnTimer)
    walking.value = false; preparing.value = false; lastTime = 0
  }
  function resume() {
    if (arrival) { const callback = arrival; go(destination, callback, true) }
    else rest()
  }
  function rest() {
    clearTimeout(idleTimer)
    if (disposed || !visible || document.hidden || motion.matches || action.value !== 'idle' || walking.value || preparing.value || !ready.value[styleName.value]) return
    idleTimer = setTimeout(() => {
      const [min, max] = bounds()
      const step = (130 + Math.random() * 100) / (scene.value?.clientWidth || 1000) * 100
      const target = x.value < 50 ? Math.min(max, x.value + step) : Math.max(min, x.value - step)
      go(target)
    }, 15000 + Math.random() * 15000)
  }
  function arrive() {
    walking.value = false; preparing.value = false; frame.value = 0
    const callback = arrival; arrival = null
    if (callback) callback()
    else rest()
  }
  function tick(time) {
    if (disposed || !visible || document.hidden) { pause(); return }
    if (!lastTime) lastTime = time
    const dt = Math.min(time - lastTime, 60); lastTime = time
    if (!ready.value[styleName.value]) { raf = requestAnimationFrame(tick); return }
    frameTime += dt
    frame.value = Math.floor(frameTime / 160) % 4
    const distance = destination - x.value
    const width = scene.value?.clientWidth || 1000
    const stride = 65 / width * 100 * dt / 1000
    if (Math.abs(distance) <= stride) { x.value = destination; arrive(); return }
    x.value += Math.sign(distance) * stride
    raf = requestAnimationFrame(tick)
  }
  function go(target, callback = null, resuming = false) {
    cancel(); destination = clamp(target); arrival = callback
    if (action.value === 'going-home' && !resuming) { homeStart.value = x.value; homeTarget.value = destination }
    if (Math.abs(destination - x.value) < 0.5) { arrive(); return }
    if (motion.matches || !visible || !ready.value[styleName.value]) {
      // No sliding seated sprite when motion/assets are unavailable.
      if (callback) { x.value = destination; arrive() }
      return
    }
    if (action.value === 'going-home' && Math.abs(x.value - homeStart.value) < .5) homeStart.value = x.value
    const direction = destination > x.value ? 1 : -1
    preparing.value = true
    const version = sequence
    turnTimer = setTimeout(() => {
      if (version !== sequence || disposed) return
      facing.value = direction; preparing.value = false; walking.value = true
      frameTime = 0; lastTime = 0; frame.value = 0
      raf = requestAnimationFrame(tick)
    }, 280)
  }
  function floorClick(event) {
    if (action.value !== 'idle' || event.target.closest('button,a,input,select')) return
    const rect = scene.value?.getBoundingClientRect()
    if (!rect || event.clientY < rect.top + rect.height * 0.64) return
    go((event.clientX - rect.left) / rect.width * 100)
  }
  function resized() {
    x.value = clamp(x.value); destination = clamp(destination)
  }
  function visibilityChanged() {
    if (document.hidden || motion.matches) pause()
    else resume()
  }
  watch(action, value => { if (value === 'idle') rest(); else clearTimeout(idleTimer) })
  const loadingStyles = new Set()
  watch(styleName, style => {
    if (!loadingStyles.has(style) && !ready.value[style]) {
      loadingStyles.add(style)
      Promise.all(Array.from({ length: 4 }, (_, i) => {
        const img = new Image(); img.src = `/pets/liuyi/${style}/walk-${i}.webp`; return img.decode()
      })).then(() => { if (!disposed) { ready.value[style] = true; rest() } }, () => {}).finally(() => loadingStyles.delete(style))
    }
  }, { immediate: true })
  onMounted(() => {
    observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) pause(); else resume() }, { threshold: 0.2 })
    if (scene.value) observer.observe(scene.value)
    resizeObserver = new ResizeObserver(resized)
    if (scene.value) resizeObserver.observe(scene.value)
    document.addEventListener('visibilitychange', visibilityChanged)
    motion.addEventListener('change', visibilityChanged)
  })
  onUnmounted(() => {
    disposed = true; cancel(); observer?.disconnect(); resizeObserver?.disconnect()
    document.removeEventListener('visibilitychange', visibilityChanged); motion.removeEventListener('change', visibilityChanged)
  })
  return { x, walking, preparing, facing, frame, ready, spriteStyle, go, stop: cancel, rest, floorClick }
}

import { onMounted, onUnmounted, watch } from 'vue'

// Touch gestures own only the cat or the explicitly selected teaser mode.
export function useTouchCat({ scene, action, activeToy, busy, pet, hand, moveToy }) {
  let gesture = null, lastTouch = -Infinity
  const teasing = () => action.value === 'play' && activeToy.value === 'teaser'
  function update(event) {
    if (!gesture || event.pointerId !== gesture.id) return
    if (gesture.kind === 'teaser') moveToy(event)
    else {
      const box = scene.value?.getBoundingClientRect()
      if (box) hand.value = { visible: true, x: Math.max(0, Math.min(box.width, event.clientX - box.left)), y: Math.max(0, Math.min(box.height, event.clientY - box.top - 22)) }
    }
    if (event.cancelable) event.preventDefault()
  }
  function start(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary || gesture || busy.value) return
    if (event.target.closest('.scene-tools, .room-topline, .weather-control, .sleeping-cat')) return
    const kind = teasing() ? 'teaser' : event.target.closest('.cat-touch') ? 'pet' : null
    if (!kind) return
    lastTouch = Date.now()
    if (kind === 'pet') pet()
    gesture = { id: event.pointerId, kind, element: scene.value }
    scene.value?.setPointerCapture(event.pointerId)
    update(event)
  }
  function end(event) {
    if (!gesture || (event && event.pointerId !== gesture.id)) return
    const previous = gesture; gesture = null; lastTouch = Date.now()
    hand.value = { ...hand.value, visible: false }
    if (previous.element?.hasPointerCapture(previous.id)) previous.element.releasePointerCapture(previous.id)
  }
  function move(event) { if (event.pointerType === 'touch') update(event) }
  const ignoreClick = () => Date.now() - lastTouch < 700
  watch(action, value => {
    if (!gesture) return
    if (gesture.kind === 'pet' && value === 'idle' && !document.hidden && !busy.value) { pet(); return }
    if (gesture.kind === 'teaser' ? value !== 'play' : value !== 'pet') end()
  })
  function visibility() { if (document.hidden) end() }
  onMounted(() => document.addEventListener('visibilitychange', visibility))
  onUnmounted(() => { document.removeEventListener('visibilitychange', visibility); end() })
  return { start, move, end, ignoreClick, active: () => !!gesture }
}

<template>
  <div ref="root" class="album-corner" role="group" aria-label="更多相册照片"
    @pointerenter="onPointerEnter" @pointerleave="hovered = false; sync()"
    @focusin="focused = true; sync()" @focusout="onFocusOut">
    <div class="corner-grid" :class="{ 'single-photo': slots.length === 1, 'two-photos': slots.length === 2 }">
      <button v-for="(slot, index) in slots" :key="index" type="button" class="corner-slot"
        :aria-label="`预览轮播第${index + 1}格照片`" @click="previewSlot(slot, $event)">
        <img v-for="(src, layer) in slot.layers" :key="layer" :src="src || undefined" alt=""
          :class="{ 'is-front': slot.front === layer, 'is-incoming': slot.incoming === layer }"
          loading="lazy" decoding="async" @transitionend="finishTransition(slot, layer, $event)" />
      </button>
    </div>
    <span class="corner-caption">更多回忆 <span>+{{ images.length }}</span></span>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({ images: { type: Array, required: true }, paused: Boolean })
const emit = defineEmits(['preview'])
const root = ref(null)
const slots = ref(Array.from({ length: Math.min(4, props.images.length) }, (_, index) => ({
  layers: [props.images[index], ''], front: 0, incoming: null, current: index, next: index,
})))
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
let timer, observer, frame1, frame2
let visible = false
let hovered = false
let focused = false
let disposed = false
let generation = 0
let nextSlot = 0
let nextImage = slots.value.length
const loaded = new Map()

function previewSlot(slot, event) {
  const incoming = event.currentTarget.querySelector('.is-incoming')
  const imageIndex = incoming && Number(getComputedStyle(incoming).opacity) >= 0.5 ? slot.next : slot.current
  emit('preview', imageIndex)
}
function onFocusOut(event) {
  if (!root.value?.contains(event.relatedTarget)) { focused = false; sync() }
}

function canRotate() {
  return !disposed && visible && !hovered && !focused && !props.paused && !document.hidden && !motion.matches && props.images.length > slots.value.length
}
function preload(src) {
  if (!loaded.has(src)) {
    const image = new Image()
    image.src = src
    let timeout
    const decoded = Promise.race([
      image.decode().then(() => true, () => false),
      new Promise(resolve => { timeout = setTimeout(() => resolve(false), 10000) }),
    ]).then(ok => { clearTimeout(timeout); if (!ok) loaded.delete(src); return ok })
    loaded.set(src, decoded)
  }
  return loaded.get(src)
}
function finishTransition(slot, layer, event) {
  if (event.propertyName !== 'opacity' || slot.incoming !== layer) return
  slot.front = layer
  slot.current = slot.next
  slot.incoming = null
}
async function advance(version) {
  if (!canRotate() || version !== generation) return
  const slot = slots.value[nextSlot]
  if (slot.incoming !== null) { schedule(version); return }
  const occupied = new Set(slots.value.flatMap(item => [item.current, item.next]))
  let candidate = nextImage % props.images.length
  for (let tries = 0; tries < props.images.length && occupied.has(candidate); tries++) candidate = (candidate + 1) % props.images.length
  if (occupied.has(candidate)) { schedule(version); return }
  const ready = await preload(props.images[candidate])
  if (version !== generation || !canRotate()) return
  nextImage = (candidate + 1) % props.images.length
  if (!ready) { schedule(version); return }
  const back = 1 - slot.front
  slot.layers[back] = props.images[candidate]
  await nextTick()
  // Keep the outgoing image opaque until the decoded incoming image fully covers it.
  frame1 = requestAnimationFrame(() => {
    frame2 = requestAnimationFrame(() => {
      if (version !== generation || !canRotate()) return
      slot.next = candidate
      slot.incoming = back
      nextSlot = (nextSlot + 1) % slots.value.length
      schedule(version)
    })
  })
}
function schedule(version, delay = 2600) {
  timer = setTimeout(() => { void advance(version) }, delay)
}
function sync() {
  clearTimeout(timer)
  cancelAnimationFrame(frame1)
  cancelAnimationFrame(frame2)
  generation++
  if (canRotate()) schedule(generation, 3200)
}
function onPointerEnter(event) {
  if (event.pointerType === 'mouse') { hovered = true; sync() }
}
watch(() => props.paused, sync)
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: 0.15 })
  observer.observe(root.value)
  document.addEventListener('visibilitychange', sync)
  motion.addEventListener('change', sync)
})
onUnmounted(() => {
  disposed = true
  sync()
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
  motion.removeEventListener('change', sync)
})
</script>

<style scoped>
.album-corner { position: relative; display: block; width: 100%; height: 100%; padding: 0; border-radius: var(--radius-md); background: transparent; }
.corner-grid { display: grid; width: 100%; height: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 4px; }
.corner-grid.single-photo { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.corner-grid.two-photos { grid-template-rows: 1fr; }
.corner-slot { position: relative; display: block; min-width: 0; min-height: 0; padding: 0; border-radius: 10px; overflow: hidden; background: var(--color-cream-dark); }
.corner-slot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; z-index: 0; transition: none; }
.corner-slot img.is-front { opacity: 1; z-index: 1; }
.corner-slot img.is-incoming { opacity: 1; z-index: 2; transition: opacity 1.2s cubic-bezier(.4, 0, .2, 1); }
.corner-caption { position: absolute; right: 10px; bottom: 10px; z-index: 3; display: flex; gap: 8px; align-items: center; padding: 7px 11px; border: 1px solid rgba(255,255,255,.28); border-radius: 20px; background: rgba(43,31,35,.54); color: #fff; backdrop-filter: blur(8px); font-size: 12px; letter-spacing: .5px; pointer-events: none; }
.corner-caption > span { opacity: .8; }
.corner-slot:focus-visible { outline: 2px solid var(--color-rose-dark); outline-offset: 1px; z-index: 4; }
@media (max-width: 480px) { .corner-caption { right: 5px; bottom: 5px; padding: 5px 8px; gap: 4px; font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .corner-slot img.is-incoming { transition-duration: .01ms; } }
</style>

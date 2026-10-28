<template>
  <section ref="root" class="blessing-carousel" aria-label="朋友们的祝福"
    @pointerenter="onPointerEnter" @pointerleave="hovering = false; schedule()"
    @focusin="focused = true; schedule()" @focusout="onFocusOut">
    <p v-if="loading" class="blessing-state" role="status">正在收集大家的祝福…</p>
    <p v-else-if="error" class="blessing-state" role="alert">祝福暂时未能加载 <button @click="$emit('retry')">重试</button></p>
    <p v-else-if="!items.length" class="blessing-state">还没有祝福，来做第一个留言的人吧 💌</p>
    <template v-else>
      <div class="blessing-stage" :style="{ height: `${cardHeight}px` }">
        <Transition name="blessing-rise" @after-enter="measure">
          <blockquote :key="index" ref="card" class="blessing-card">
            <p>「{{ active.content }}」</p>
            <footer>—— {{ active.author || '一位朋友' }}</footer>
          </blockquote>
        </Transition>
      </div>
      <div v-if="items.length > 1" class="blessing-controls">
        <button aria-label="上一条祝福" @click="step(-1)">‹</button>
        <span>{{ index + 1 }} / {{ items.length }}</span>
        <button aria-label="下一条祝福" @click="step(1)">›</button>
        <button :aria-pressed="paused" class="pause-control" @click="paused = !paused; schedule()">{{ paused ? '继续播放' : '暂停播放' }}</button>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
const props = defineProps({ items: { type: Array, default: () => [] }, loading: Boolean, error: Boolean })
defineEmits(['retry'])
const root = ref(null)
const card = ref(null)
const index = ref(0)
const cardHeight = ref(110)
const paused = ref(false)
const active = computed(() => props.items[index.value] || {})
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
let timer, observer, resizeObserver
let inView = false, hovering = false, focused = false, disposed = false
function measure() {
  if (card.value) cardHeight.value = Math.ceil(card.value.getBoundingClientRect().height)
}
function schedule(delay = 5000) {
  clearTimeout(timer)
  if (disposed || !inView || hovering || focused || paused.value || document.hidden || motion.matches || props.loading || props.error || props.items.length < 2) return
  timer = setTimeout(() => { step(1) }, delay)
}
async function step(direction) {
  clearTimeout(timer)
  if (!props.items.length) return
  index.value = (index.value + direction + props.items.length) % props.items.length
  await nextTick()
  if (disposed) return
  measure()
  // 350ms for the transition, then a full 5s of readable, stationary text.
  schedule(5350)
}
function onPointerEnter(event) { if (event.pointerType === 'mouse') { hovering = true; schedule() } }
function onFocusOut(event) { if (!root.value?.contains(event.relatedTarget)) { focused = false; schedule() } }
function onVisibilityChange() { schedule() }
watch(() => [props.items, props.loading, props.error], async () => {
  index.value = 0
  await nextTick()
  if (!disposed) { measure(); schedule() }
})
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; schedule() }, { threshold: 0.25 })
  observer.observe(root.value)
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(root.value)
  document.addEventListener('visibilitychange', onVisibilityChange)
  motion.addEventListener('change', onVisibilityChange)
  measure()
})
onUnmounted(() => {
  disposed = true; clearTimeout(timer); observer?.disconnect(); resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  motion.removeEventListener('change', onVisibilityChange)
})
</script>

<style scoped>
.blessing-carousel { max-width: 640px; margin: 0 auto 44px; padding: 0 24px; }
.blessing-stage { position: relative; overflow: hidden; min-height: 100px; transition: height .35s ease; mask-image: linear-gradient(to bottom, transparent, #000 16px, #000 calc(100% - 16px), transparent); -webkit-mask-image: linear-gradient(to bottom, transparent, #000 16px, #000 calc(100% - 16px), transparent); }
.blessing-card { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 20px 0; }
.blessing-card p { font-family: var(--font-literary); font-size: 16px; line-height: 1.9; color: var(--color-text); text-align: center; white-space: pre-wrap; overflow-wrap: anywhere; }
.blessing-card footer { margin-top: 12px; text-align: right; font-size: 12px; color: var(--color-rose-dark); }
.blessing-state { padding: 18px 0; font-size: 14px; color: var(--color-text-light); text-align: center; }
.blessing-controls { display: flex; align-items: center; justify-content: center; gap: 8px; padding-top: 8px; color: var(--color-text-light); font-size: 12px; }
.blessing-controls button, .blessing-state button { min-width: 32px; min-height: 32px; padding: 4px 8px; background: transparent; color: var(--color-rose-dark); border-radius: 16px; }
.blessing-controls button:hover { background: var(--color-rose-soft); }
.blessing-controls > button:not(.pause-control) { font-size: 22px; }
.pause-control { margin-left: 8px; font-size: 12px; }
.blessing-rise-enter-active, .blessing-rise-leave-active { transition: opacity .35s ease, transform .35s ease; }
.blessing-rise-enter-from { opacity: 0; transform: translateY(16px); }
.blessing-rise-leave-to { opacity: 0; transform: translateY(-16px); }
@media (max-width: 480px) { .blessing-carousel { padding: 0 16px; } .blessing-card p { font-size: 14px; } }
@media (prefers-reduced-motion: reduce) { .blessing-stage, .blessing-rise-enter-active, .blessing-rise-leave-active { transition: none; } }
</style>

<template>
  <Teleport to="body">
    <div v-if="arrivalNotice" class="food-reward-notice" role="status">已放入小窝</div>
    <div v-if="reward" ref="token" class="food-reward-flight" :class="{ 'reward-reduced': reduced, 'message-flight': reward.kind }" :data-stage="reward.kind || 'food'" role="status" aria-live="polite">
      <img v-if="reward.kind" :src="`/feedback/${reward.kind}-sent.png`" class="message-flight-icon" alt="" />
      <template v-else><FoodIcon :kind="reward.food" /><strong>+{{ reward.amount }}</strong></template><span>{{ label }}</span>
    </div>
  </Teleport>
</template>
<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import FoodIcon from './FoodIcon.vue'
const reward = ref(null), token = ref(null), reduced = ref(false)
const arrivalNotice = ref(false)
const label = computed(() => reward.value?.kind ? (reward.value.kind === 'letter' ? '信已寄给ta' : '祝福送到啦') : reduced.value ? '已放入小窝' : ({ treat: '猫条', kibble: '猫粮', can: '猫罐头' })[reward.value?.food])
const queue = new Map()
const deliveries = []
let timer, animation, disposed = false, playing = false, quietSince = 0, highlighted, generation = 0
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
function visible(el) { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' }
function modalOpen() { return [...document.querySelectorAll('.el-overlay, [role="dialog"]')].some(visible) }
function receive(event) {
  const { food, amount } = event.detail
  queue.set(food, (queue.get(food) || 0) + amount)
  quietSince = 0; schedule()
}
function delivered(event) { deliveries.push(event.detail); quietSince = 0; schedule() }
function schedule() { if (playing) return; clearTimeout(timer); if (!disposed) timer = setTimeout(check, 100) }
function check() {
  if (playing || (!queue.size && !deliveries.length)) return
  if (document.hidden || modalOpen()) { quietSince = 0; schedule(); return }
  if (!quietSince) quietSince = Date.now()
  if (Date.now() - quietSince < 350) { schedule(); return }
  void play()
}
async function play() {
  const current = generation
  playing = true
  if (deliveries.length) reward.value = deliveries.shift()
  else { const [food, amount] = queue.entries().next().value; queue.delete(food); reward.value = { food, amount } }
  const isDelivery = !!reward.value.kind
  reduced.value = motion.matches
  await nextTick()
  if (disposed || current !== generation || !token.value) return
  const target = isDelivery
    ? [...document.querySelectorAll(reward.value.kind === 'letter' ? '.mailbox-trigger' : '.nav-logo')].find(visible) || [...document.querySelectorAll('.nav-logo')].find(visible)
    : [...document.querySelectorAll('a[href="/cat"]')].find(visible) || [...document.querySelectorAll('.nav-toggle')].find(visible)
  const startX = innerWidth / 2, startY = innerHeight / 2
  const box = target?.getBoundingClientRect()
  const dx = box ? box.x + box.width / 2 - startX : 0, dy = box ? box.y + box.height / 2 - startY : 0
  const base = 'translate(-50%, -50%)'
  animation = token.value.animate(reduced.value || !box ? [
    { opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 },
  ] : [
    { transform: `${base} scale(.8)`, opacity: 0 },
    { transform: `${base} scale(1)`, opacity: 1, offset: .15 },
    { transform: `${base} scale(1)`, opacity: 1, offset: .43 },
    { transform: `${base} translate(${dx * .4}px, ${dy * .7 - 35}px) scale(.7)`, opacity: 1, offset: .7 },
    { transform: `${base} translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0 },
  ], { duration: 1400, easing: 'ease-in-out', fill: 'forwards' })
  try { await animation.finished } catch { /* unmounted / canceled */ }
  if (disposed || current !== generation) return
  reward.value = null
  arrivalNotice.value = !isDelivery && !!target?.classList.contains('nav-toggle')
  if (target) { highlighted = target; target.classList.add('pet-reward-arrived') }
  timer = setTimeout(() => {
    highlighted?.classList.remove('pet-reward-arrived'); highlighted = null
    arrivalNotice.value = false
    playing = false; quietSince = 0; schedule()
  }, 600)
}
function clear() { generation++; queue.clear(); deliveries.length = 0; animation?.cancel(); clearTimeout(timer); reward.value = null; arrivalNotice.value = false; playing = false; highlighted?.classList.remove('pet-reward-arrived') }
onMounted(() => { window.addEventListener('pet-food-earned', receive); window.addEventListener('message-delivered', delivered); window.addEventListener('auth-expired', clear) })
onUnmounted(() => { disposed = true; clear(); window.removeEventListener('pet-food-earned', receive); window.removeEventListener('message-delivered', delivered); window.removeEventListener('auth-expired', clear) })
</script>
<style>
.food-reward-flight { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 5000; pointer-events: none; display: grid; grid-template-columns: 64px auto; align-items: center; gap: 5px 8px; color: #895344; filter: drop-shadow(0 4px 10px #fff9f1); }
.food-reward-flight .pet-food-icon { width: 64px; height: 64px; }
.food-reward-flight.message-flight { grid-template-columns: 1fr; justify-items: center; }
.message-flight-icon { width: 96px; height: 72px; object-fit: contain; }
.food-reward-flight strong { font: 600 24px Georgia, serif; }
.food-reward-flight > span { grid-column: 1 / -1; text-align: center; font-size: 13px; }
.pet-reward-arrived { filter: drop-shadow(0 0 7px #efb2a4); }
.food-reward-flight.reward-reduced { padding: 10px 18px; border-radius: 16px; background: #fff8ef; }
.food-reward-notice { position: fixed; right: 18px; top: 76px; z-index: 5000; pointer-events: none; background: #fff8ef; color: #895344; border-radius: 12px; padding: 8px 12px; font-size: 13px; }
</style>

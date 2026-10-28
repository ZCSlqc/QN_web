<template>
  <div class="feeding-props" aria-hidden="true">
    <div class="food-on-floor" :class="{ 'is-can': action === 'can' }">
      <Transition name="food-arrival">
        <img v-if="ready.has(floorSource) && !failed.has(floorSource)" :key="floorSource" :src="floorSource" class="scene-food-image" alt="" @error="failed.add(floorSource)" />
        <div v-else class="bowl-fallback"><span>六一</span></div>
      </Transition>
    </div>
    <Transition name="food-arrival">
      <img v-if="action === 'treat' && ready.has(paths.treat) && !failed.has(paths.treat)" :src="paths.treat" alt="" class="scene-treat" @error="failed.add(paths.treat)" />
    </Transition>
  </div>
</template>
<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
const props = defineProps({ action: { type: String, default: 'idle' } })
const paths = { empty: '/pets/liuyi/food/bowl-empty.webp', full: '/pets/liuyi/food/bowl-full.webp', can: '/pets/liuyi/food/can-open.webp', treat: '/pets/liuyi/food/treat-open.webp' }
const ready = ref(new Set()), failed = ref(new Set())
const floorSource = computed(() => props.action === 'kibble' ? paths.full : props.action === 'can' ? paths.can : paths.empty)
let disposed = false
const pending = new Set()
watch([floorSource, () => props.action], ([floor, action]) => {
  for (const path of action === 'treat' ? [floor, paths.treat] : [floor]) {
    if (pending.has(path) || ready.value.has(path)) continue
    pending.add(path)
    const image = new Image(); image.src = path
    image.decode().then(() => { if (!disposed) { ready.value.add(path); failed.value.delete(path) } }, () => { if (!disposed) failed.value.add(path) }).finally(() => pending.delete(path))
  }
}, { immediate: true })
onUnmounted(() => { disposed = true })
</script>
<style scoped>
.feeding-props { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
.food-on-floor { position: absolute; width: 116px; height: 80px; left: calc(50% - 58px); bottom: 74px; }
.scene-food-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: center bottom; }
.food-on-floor.is-can { width: 86px; height: 95px; left: calc(50% - 43px); bottom: 78px; }
.scene-treat { position: absolute; width: 56px; height: 95px; left: calc(50% - 28px); bottom: 90px; object-fit: contain; transform: rotate(-35deg); transform-origin: center bottom; }
.food-arrival-enter-active, .food-arrival-leave-active { transition: opacity .22s ease; }
.food-arrival-enter-from, .food-arrival-leave-to { opacity: 0; }
.bowl-fallback { position: absolute; left: 20px; right: 20px; bottom: 0; height: 35px; border-radius: 8px 8px 30px 30px; background: #bd8c7a; border-top: 8px solid #e6b9a2; text-align: center; }
.bowl-fallback span { color: #fff6e8; font-size: 10px; }
@media (max-width: 768px) {
  .food-on-floor { width: 90px; height: 62px; left: calc(50% - 45px); bottom: 59px; }
  .food-on-floor.is-can { width: 70px; height: 78px; left: calc(50% - 35px); bottom: 62px; }
  .scene-treat { width: 45px; height: 78px; left: calc(50% - 22.5px); bottom: 72px; }
}
@media (prefers-reduced-motion: reduce) { .food-arrival-enter-active, .food-arrival-leave-active { transition: none; } }
</style>

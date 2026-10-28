<template>
  <div class="cat-sprite" :data-pose="pose" :data-walking="walking" :aria-label="label" role="img">
    <img v-if="failed || !loaded" :src="failed ? fallback : source" alt="" class="cat-fallback" />
    <Transition name="cat-pose" :css="!walking">
      <img v-if="loaded && !failed" :key="frameSource" class="cat-frame" :src="frameSource" alt="" />
    </Transition>
  </div>
</template>
<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
const props = defineProps({ styleName: String, pose: Number, walking: Boolean, walkFrame: { type: Number, default: 0 } })
const loaded = ref(false), failed = ref(false)
const frameSource = ref('')
const decoded = new Map()
let version = 0
const source = computed(() => props.walking ? `/pets/liuyi/${props.styleName}/walk-${props.walkFrame}.webp` : `/pets/liuyi/${props.styleName}/pose-${props.pose}.webp`)
const fallback = computed(() => `/pets/liuyi/${props.styleName}/portrait.webp`)
const label = computed(() => `六一${props.styleName === 'realistic' ? '写实' : '插画'}形象 · ${props.walking ? '走路' : ['安静坐着', '眯眼', '伸爪', '低头进食'][props.pose] || '安静坐着'}`)
watch(source, async url => {
  const current = ++version; failed.value = false
  try { await preload(url); if (current === version) { frameSource.value = url; loaded.value = true } }
  catch { if (current === version) failed.value = true }
}, { immediate: true })
function preload(url) {
  if (!decoded.has(url)) { const img = new Image(); img.src = url; decoded.set(url, img.decode().catch(error => { decoded.delete(url); throw error })) }
  return decoded.get(url)
}
onUnmounted(() => { version++ })
</script>
<style scoped>
.cat-sprite { position: relative; width: 100%; height: 100%; }
.cat-frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.cat-fallback { width: 100%; height: 100%; object-fit: contain; object-position: center bottom; }
.cat-pose-enter-active, .cat-pose-leave-active { transition: opacity .18s ease; }
.cat-pose-enter-from, .cat-pose-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .cat-pose-enter-active, .cat-pose-leave-active { transition: none; } }
</style>

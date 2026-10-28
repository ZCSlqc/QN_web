<template>
  <span ref="frame" class="photo-frame">
    <img v-if="blobUrl" :src="blobUrl" :alt="alt" decoding="async" />
    <span v-else class="photo-placeholder">{{ failed ? '照片暂未加载' : '照片加载中…' }}</span>
  </span>
</template>
<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { privatePhoto } from './privatePhotoCache'
const props = defineProps({ src: String, alt: { type: String, default: '' } })
const blobUrl = ref(''), failed = ref(false)
const frame = ref(null), visible = ref(false)
let controller, observer
watch([() => props.src, visible], async ([src, inView]) => {
  controller?.abort()
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
  blobUrl.value = ''; failed.value = false
  if (!src || !inView) return
  const pending = new AbortController(); controller = pending
  try {
    const data = await privatePhoto(src, pending.signal)
    if (!pending.signal.aborted) blobUrl.value = URL.createObjectURL(data)
  } catch { if (!pending.signal.aborted) failed.value = true }
}, { immediate: true })
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { visible.value = true; observer.disconnect() }
  }, { rootMargin: '200px' })
  if (frame.value) observer.observe(frame.value)
})
onUnmounted(() => { observer?.disconnect(); controller?.abort(); if (blobUrl.value) URL.revokeObjectURL(blobUrl.value) })
</script>
<style scoped>
img { width: 100%; height: 100%; object-fit: cover; }
.photo-frame { display: block; width: 100%; height: 100%; }
.photo-placeholder { display: grid; place-items: center; height: 100%; min-height: 100px; background: #fbf1f4; color: var(--color-text-light); font-size: 12px; }
</style>

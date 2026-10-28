<template>
  <img v-if="blobUrl" :src="blobUrl" :alt="alt" decoding="async" />
  <span v-else class="photo-placeholder">{{ failed ? '照片暂未加载' : '照片加载中…' }}</span>
</template>
<script setup>
import { ref, watch, onUnmounted } from 'vue'
import request from '../../utils/request'
const props = defineProps({ src: String, alt: { type: String, default: '' } })
const blobUrl = ref(''), failed = ref(false)
let controller
watch(() => props.src, async src => {
  controller?.abort()
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
  blobUrl.value = ''; failed.value = false
  if (!src) return
  const pending = new AbortController(); controller = pending
  try {
    const { data } = await request.get(src.replace(/^\/api/, ''), { responseType: 'blob', signal: pending.signal })
    if (!pending.signal.aborted) blobUrl.value = URL.createObjectURL(data)
  } catch { if (!pending.signal.aborted) failed.value = true }
}, { immediate: true })
onUnmounted(() => { controller?.abort(); if (blobUrl.value) URL.revokeObjectURL(blobUrl.value) })
</script>
<style scoped>
img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { display: grid; place-items: center; height: 100%; min-height: 100px; background: #fbf1f4; color: var(--color-text-light); font-size: 12px; }
</style>

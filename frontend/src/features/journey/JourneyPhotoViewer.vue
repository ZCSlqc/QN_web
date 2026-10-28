<template>
  <ElImageViewer :url-list="urls" :initial-index="initialIndex" :z-index="22000" :teleported="true" @switch="select" @close="$emit('close')" />
  <Teleport to="body"><div v-if="loading || error" class="viewer-status" role="status">
    <span v-if="loading">正在加载照片…</span>
    <button v-else @click="select(current)">加载失败，点击重试</button>
  </div></Teleport>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElImageViewer } from 'element-plus'
import { privatePhoto } from './privatePhotoCache'
const props = defineProps({ photos: Array, initialIndex: Number })
defineEmits(['close'])
const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/%3E'
const urls = ref(props.photos.map(() => placeholder)), current = ref(props.initialIndex), loading = ref(true), error = ref(false)
const pending = new Map(), controller = new AbortController()
let selection = 0
async function fetchPhoto(index) {
  if (index >= props.photos.length) return
  if (urls.value[index] !== placeholder) return
  if (!pending.has(index)) {
    const photo = props.photos[index]
    pending.set(index, privatePhoto(photo.display_url || photo.url, controller.signal).then(data => {
      if (!controller.signal.aborted) urls.value[index] = URL.createObjectURL(data)
    }).finally(() => pending.delete(index)))
  }
  return pending.get(index)
}
async function select(index) {
  const version = ++selection; current.value = index; loading.value = true; error.value = false
  try {
    await fetchPhoto(index)
    if (version === selection && !controller.signal.aborted) {
      loading.value = false
      // Only one adjacent image is prefetched after the current one has finished.
      if (!navigator.connection?.saveData) void fetchPhoto(index + 1).catch(() => {})
    }
  } catch { if (version === selection && !controller.signal.aborted) { loading.value = false; error.value = true } }
}
onMounted(() => select(props.initialIndex))
onUnmounted(() => { selection++; controller.abort(); urls.value.filter(url => url !== placeholder).forEach(URL.revokeObjectURL) })
</script>
<style scoped>
.viewer-status { position: fixed; z-index: 22001; top: 70px; left: 50%; transform: translateX(-50%); color: #fff; background: rgba(0,0,0,.6); padding: 10px 18px; border-radius: 20px; font-size: 14px; }
button { color: inherit; background: transparent; }
</style>

<template>
  <AppDialog :model-value="true" title="旅行回忆" width="800px" :busy="busy" @update:model-value="!$event && $emit('close')">
    <div class="memory">
      <header><div><p class="eyebrow">OUR JOURNEY</p><h2>{{ record.name.join('、') }}</h2><p>{{ date(record.departure_date) }} — {{ date(record.return_date) }}</p></div><button :disabled="busy" aria-label="关闭回忆" @click="$emit('close')">✕</button></header>
      <label v-if="related.length > 1" class="memory-switch">其他旅行回忆<select :value="record.id" :disabled="busy" @change="$emit('view', related.find(item => String(item.id) === $event.target.value))"><option v-for="item in related" :key="item.id" :value="item.id">{{ date(item.departure_date) }} · {{ item.name.join('、') }}</option></select></label>
      <section class="memory-photos" aria-label="旅程照片">
        <div class="photo-heading"><h3>这一程的照片 <small v-if="photos.length">{{ photos.length }} 张</small></h3><label v-if="isAdmin" class="upload-label" :class="{ disabled: busy }">添加照片<input type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="busy" @change="chooseFiles" /></label></div>
        <p v-if="loading" role="status">正在翻开照片…</p>
        <p v-else-if="loadError" role="alert">照片暂时未能加载 <button @click="loadPhotos">重试</button></p>
        <p v-else-if="!photos.length" class="muted">{{ isAdmin ? '把这一程的照片留在这里吧。' : '这一程的照片还在整理中。' }}</p>
        <div v-if="photos.length" class="photo-grid">
          <figure v-for="(photo, index) in photos" :key="photo.id">
            <button class="photo-preview" :disabled="busy" :aria-label="`放大第${index + 1}张照片`" @click="viewPhotos(index)"><JourneyPhoto :src="photo.thumbnail_url" :alt="photo.caption || '旅程照片'" /></button>
            <figcaption v-if="photo.caption">{{ photo.caption }}</figcaption>
            <div v-if="isAdmin" class="photo-actions"><button :disabled="busy" @click="editCaption(photo)">照片说明</button><button :disabled="busy" @click="deletePhoto(photo)">删除</button></div>
          </figure>
        </div>
        <ul v-if="queue.length" class="upload-queue"><li v-for="item in queue" :key="item.key"><span>{{ item.file.name }}</span><span>{{ item.status }}</span><button v-if="item.status === '上传失败'" :disabled="busy" @click="upload([item])">重试</button></li></ul>
        <p v-if="isAdmin" class="muted">支持多选 JPG、PNG、WebP，每张不超过 15MB。</p>
      </section>
      <dl class="memory-details">
        <template v-if="record.checkin_points"><dt>打卡点（景点 / 地区）</dt><dd>{{ record.checkin_points }}</dd></template>
        <template v-if="record.event"><dt>大事件</dt><dd>{{ record.event }}</dd></template>
        <template v-if="record.notes"><dt>旅途感想</dt><dd>{{ record.notes }}</dd></template>
        <template v-if="record.planning_reason"><dt>当时想去的原因</dt><dd>{{ record.planning_reason }}</dd></template>
      </dl>
      <footer v-if="isAdmin"><button :disabled="busy" @click="$emit('plan', record)">预定旅程</button><button :disabled="busy" @click="$emit('new', record)">再次到访</button><button class="primary" :disabled="busy" @click="$emit('edit', record)">编辑旅程</button></footer>
    </div>
    <ElImageViewer v-if="viewerUrls.length" :url-list="viewerUrls" :initial-index="viewerIndex" :z-index="22000" :teleported="true" @close="closeViewer" />
  </AppDialog>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, ElImageViewer } from 'element-plus'
import AppDialog from '../../components/shared/AppDialog.vue'
import JourneyPhoto from './JourneyPhoto.vue'
import request from '../../utils/request'
const props = defineProps({ record: { type: Object, required: true }, isAdmin: Boolean, related: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'edit', 'new', 'plan', 'view', 'photos-updated'])
const photos = ref([]), queue = ref([]), loading = ref(true), loadError = ref(false), working = ref(false)
const viewerUrls = ref([]), viewerIndex = ref(0)
const busy = computed(() => working.value || viewerUrls.value.length > 0)
const controller = new AbortController()
const endpoint = `/journeys/${props.record.id}/photos`
const date = value => value ? value.replaceAll('-', '/') : '日期待补充'
async function loadPhotos() {
  loading.value = true; loadError.value = false
  try { const { data } = await request.get(endpoint, { signal: controller.signal }); photos.value = data.data }
  catch { if (!controller.signal.aborted) loadError.value = true }
  finally { loading.value = false }
}
function chooseFiles(event) {
  const items = [...event.target.files].map(file => ({ file, key: crypto.randomUUID(), status: file.size > 15 * 1024 * 1024 ? '超过15MB' : '等待上传' }))
  queue.value.push(...items); event.target.value = ''
  void upload(queue.value.slice(-items.length).filter(item => item.status === '等待上传'))
}
async function upload(items) {
  if (busy.value || !items.length) return
  working.value = true
  for (const item of items) {
    if (controller.signal.aborted) break
    item.status = '上传中…'
    const body = new FormData(); body.append('file', item.file); body.append('request_key', item.key)
    try { await request.post(endpoint, body, { signal: controller.signal }); item.status = '已上传' }
    catch { item.status = '上传失败' }
  }
  if (!controller.signal.aborted) { await loadPhotos(); emit('photos-updated') }
  working.value = false
}
async function deletePhoto(photo) {
  if (busy.value) return
  working.value = true
  try {
    await ElMessageBox.confirm('删除这张旅程照片？', '删除照片', { confirmButtonText: '删除', cancelButtonText: '取消' })
    await request.delete(`${endpoint}/${photo.id}`, { signal: controller.signal })
    await loadPhotos(); emit('photos-updated')
  } catch (error) { if (error !== 'cancel' && error !== 'close' && !controller.signal.aborted) ElMessage.error('删除失败，请重试') }
  finally { working.value = false }
}
async function editCaption(photo) {
  if (busy.value) return
  working.value = true
  try {
    const { value } = await ElMessageBox.prompt('为照片留一句说明（最多100字）', '照片说明', { inputValue: photo.caption, inputValidator: value => !value || value.length <= 100 || '最多100字', confirmButtonText: '保存', cancelButtonText: '取消' })
    const body = new FormData(); body.append('caption', value || '')
    await request.put(`${endpoint}/${photo.id}`, body, { signal: controller.signal }); await loadPhotos(); emit('photos-updated')
  } catch (error) { if (error !== 'cancel' && error !== 'close' && !controller.signal.aborted) ElMessage.error('保存失败，请重试') }
  finally { working.value = false }
}
async function viewPhotos(index) {
  if (busy.value) return
  working.value = true
  try {
    const results = await Promise.all(photos.value.map(photo => request.get(photo.url.replace(/^\/api/, ''), { responseType: 'blob', signal: controller.signal })))
    if (!controller.signal.aborted) { viewerIndex.value = index; viewerUrls.value = results.map(result => URL.createObjectURL(result.data)) }
  } catch { if (!controller.signal.aborted) ElMessage.error('大图加载失败，请重试') }
  finally { working.value = false }
}
function closeViewer() { viewerUrls.value.forEach(URL.revokeObjectURL); viewerUrls.value = [] }
onMounted(loadPhotos)
onUnmounted(() => { controller.abort(); closeViewer() })
</script>
<style scoped>
.memory { padding: 28px; color: var(--color-text); }
header, .photo-heading, footer, .photo-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
header { align-items: flex-start; margin-bottom: 28px; }
header h2 { font-family: var(--font-display); font-size: 26px; margin: 8px 0; }
header p, .muted { color: var(--color-text-light); font-size: 13px; line-height: 1.8; }
.eyebrow { letter-spacing: 3px; }
.memory-switch { display: block; font-size: 13px; margin-bottom: 20px; color: var(--color-text-light); }
.memory-switch select { display: block; width: 100%; margin-top: 8px; padding: 10px; border: 1px solid var(--color-rose-light); border-radius: 10px; background: white; }
button, .upload-label { padding: 8px 14px; border-radius: 16px; background: var(--color-rose-soft); color: var(--color-rose-dark); cursor: pointer; }
.photo-heading h3 { font-size: 17px; font-weight: 500; }
.photo-heading small { font-size: 12px; color: var(--color-text-light); }
.upload-label { position: relative; font-size: 13px; white-space: nowrap; }
.upload-label input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
.disabled { opacity: .5; }
.photo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 18px 0; }
figure { margin: 0; min-width: 0; }
.photo-preview { width: 100%; aspect-ratio: 4 / 3; padding: 0; overflow: hidden; border-radius: 12px; }
figcaption { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; margin: 8px 0; }
.photo-actions button { font-size: 12px; padding: 5px 8px; }
.memory-details dt { color: var(--color-rose-dark); font-size: 14px; margin: 24px 0 8px; }
.memory-details dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.9; }
footer { justify-content: flex-end; flex-wrap: wrap; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1e6e9; }
.primary { background: var(--color-rose-dark); color: #fff; }
.upload-queue { list-style: none; font-size: 12px; margin: 12px 0; }
.upload-queue li { display: flex; gap: 10px; padding: 5px 0; overflow-wrap: anywhere; }
@media (max-width: 600px) { .memory { padding: 20px; } .photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
</style>

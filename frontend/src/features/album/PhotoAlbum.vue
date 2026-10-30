<template>
  <div class="uploaded-album">
    <div v-if="isAdmin" class="upload-toolbar">
      <p>把新的回忆，放进我们的相册。</p>
      <div class="album-actions">
        <button v-if="canEdit" class="upload-primary" :disabled="loading || deleting !== null" @click="showUpload = true">＋ 上传照片</button>
        <button class="upload-secondary" :aria-pressed="editing" :disabled="uploading || deleting !== null" @click="toggleEditing">{{ editing ? '完成' : '编辑' }}</button>
      </div>
    </div>
    <p v-if="loading" class="album-status" role="status">正在读取相册…</p>
    <p v-else-if="loadError" class="album-status" role="alert">
      相册暂时未能加载 <button class="upload-secondary" @click="fetchPhotos">重试</button>
    </p>
    <p v-if="!loading && !loadError && !photos.length" class="album-status">相册还是空的，下一张回忆等你放进来。</p>
    <div v-if="canEdit && photos.length" class="album-edit-grid">
      <article v-for="photo in orderedPhotos" :key="photo.id" class="editable-photo">
        <button class="photo-preview" :aria-label="`预览${photo.caption || '照片'}`" @click="previewPhoto(photo)">
          <img :src="photo.thumbnail_url" :alt="photo.caption || '我们的回忆'" loading="lazy" decoding="async" />
        </button>
        <div class="photo-info">
          <p>{{ photo.caption || '我们的回忆' }}</p>
          <button class="photo-delete" :disabled="deleting !== null || uploading" :aria-label="`删除照片 ${photo.id}`" @click="deletePhoto(photo)">删除</button>
        </div>
      </article>
    </div>
    <div v-else-if="photos.length" class="album-grid" :class="{ compact: orderedPhotos.length < 8 }">
      <button v-for="(photo, index) in gridPhotos" :key="photo.id" class="album-photo" :class="{ 'grid-tall': index === 0, 'keep-whole': index === 0 && photo.height <= photo.width }"
        :aria-label="`预览${photo.caption || '照片 ' + (index + 1)}`" @click="previewPhoto(photo)">
        <img :src="photo.thumbnail_url" :alt="photo.caption || '我们的回忆'" loading="lazy" decoding="async" />
      </button>
      <AlbumCorner v-if="cornerPhotos.length" :key="cornerPhotos.map(photo => photo.id).join('-')" class="grid-corner"
        :images="cornerPhotos.map(photo => photo.thumbnail_url)" :paused="previewVisible" @preview="index => previewPhoto(cornerPhotos[index])" />
    </div>
    <ElImageViewer v-if="previewVisible" :url-list="orderedPhotos.map(photo => photo.display_url || photo.url)" :initial-index="previewIndex"
      hide-on-click-modal @close="previewVisible = false" />

    <AppDialog v-model="showUpload" title="上传照片" :busy="uploading">
      <div class="upload-dialog" :class="{ dragging }" @dragover.prevent="dragging = !uploading && canEdit" @dragleave="leaveDrop" @drop.prevent.stop="onDrop">
        <header><h3>上传新的回忆</h3><button class="upload-close" aria-label="关闭上传窗口" :disabled="uploading" @click="showUpload = false">✕</button></header>
        <p class="upload-hint">可将图片拖入此窗口。支持 JPG、PNG、WebP，每张最多 15MB，一次最多 10 张。</p>
        <input ref="fileInput" class="file-input" type="file" multiple accept="image/jpeg,image/png,image/webp" :disabled="uploading" aria-label="选择照片" @change="onSelect" />
        <button class="drop-zone" :class="{ dragging }" :disabled="uploading" @click="fileInput?.click()"
          >
          <span aria-hidden="true">＋</span><strong>选择照片</strong><small>也可以把照片拖到这里</small>
        </button>
        <div v-if="queue.length" class="upload-queue">
          <article v-for="(item, index) in queue" :key="item.key" class="queue-item">
            <img :src="item.preview" alt="待上传照片预览" />
            <div class="queue-details">
              <p>{{ item.file.name }}</p>
              <small v-if="item.status === 'done'" class="upload-success">已加入相册</small>
              <small v-else-if="item.error" class="upload-error" role="alert">{{ item.error }}</small>
              <small v-else>{{ item.status === 'uploading' ? (item.progress === 100 ? '正在生成缩略图…' : `上传中 ${item.progress}%`) : `${(item.file.size / 1024 / 1024).toFixed(1)} MB` }}</small>
              <progress v-if="item.status === 'uploading'" :value="item.progress" max="100" aria-label="照片上传进度"></progress>
            </div>
            <button v-if="!uploading && item.status !== 'done'" class="upload-close" :aria-label="`移除${item.file.name}`" @click="removeFile(index)">✕</button>
          </article>
        </div>
        <label for="photo-caption" class="caption-label">照片描述（选填）</label>
        <input id="photo-caption" v-model="caption" maxlength="100" :disabled="uploading" placeholder="记录这一刻的心情…" class="caption-input" />
        <p v-if="summary" class="upload-summary" role="status">{{ summary }}</p>
        <footer>
          <button class="upload-secondary" :disabled="uploading" @click="showUpload = false">{{ (queue.length || summary) && pendingCount === 0 ? '完成' : '取消' }}</button>
          <button class="upload-primary" :disabled="uploading || !pendingCount || !isAdmin" @click="uploadFiles">{{ uploading ? '正在上传…' : `上传${pendingCount ? ` ${pendingCount} 张` : ''}` }}</button>
        </footer>
      </div>
    </AppDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, ElImageViewer } from 'element-plus'
import request from '../../utils/request'
import AppDialog from '../../components/shared/AppDialog.vue'
import AlbumCorner from './AlbumCorner.vue'

const props = defineProps({ isAdmin: Boolean })
const editing = ref(false)
const canEdit = computed(() => props.isAdmin && editing.value)
const photos = ref([])
const orderedPhotos = computed(() => {
  const result = [...photos.value]
  const portrait = result.findIndex(photo => photo.height > photo.width)
  if (portrait > 0) result.unshift(result.splice(portrait, 1)[0])
  return result
})
const gridPhotos = computed(() => orderedPhotos.value.slice(0, orderedPhotos.value.length <= 8 ? 8 : 7))
const cornerPhotos = computed(() => orderedPhotos.value.length > 8 ? orderedPhotos.value.slice(7) : [])
function previewPhoto(photo) {
  previewIndex.value = orderedPhotos.value.findIndex(item => item.id === photo.id)
  previewVisible.value = true
}
const loading = ref(true)
const loadError = ref(false)
const deleting = ref(null)
const previewVisible = ref(false)
const previewIndex = ref(0)
const showUpload = ref(false)
const fileInput = ref(null)
const queue = ref([])
const caption = ref('')
const uploading = ref(false)
const dragging = ref(false)
const summary = ref('')
const pendingCount = computed(() => queue.value.filter(item => item.status !== 'done').length)
const controller = new AbortController()
let disposed = false
let nextKey = 0

function toggleEditing() {
  if (!props.isAdmin || uploading.value || deleting.value !== null) return
  editing.value = !editing.value
  if (!editing.value) showUpload.value = false
}

async function fetchPhotos() {
  loading.value = true; loadError.value = false
  try {
    const res = await request.get('/photos', { signal: controller.signal })
    if (!disposed) photos.value = res.data.data
  } catch { if (!disposed) loadError.value = true }
  finally { if (!disposed) loading.value = false }
}
function selectFiles(files) {
  if (uploading.value || !canEdit.value) return
  summary.value = ''
  for (const file of files) {
    if (queue.value.length >= 10) { ElMessage.warning('一次最多选择10张照片'); break }
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) { ElMessage.warning(`${file.name}：请选择 JPG、PNG 或 WebP 图片`); continue }
    if (file.size > 15 * 1024 * 1024 || file.size === 0) { ElMessage.warning(`${file.name}：文件不能为空或超过15MB`); continue }
    if (queue.value.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) continue
    queue.value.push({ requestKey: Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''), key: ++nextKey, file, preview: URL.createObjectURL(file), progress: 0, status: 'pending', error: '' })
  }
}
function onSelect(event) { selectFiles(Array.from(event.target.files || [])); event.target.value = '' }
function leaveDrop(event) { if (!event.currentTarget.contains(event.relatedTarget)) dragging.value = false }
function onDrop(event) { dragging.value = false; selectFiles(Array.from(event.dataTransfer.files || [])) }
function removeFile(index) { URL.revokeObjectURL(queue.value[index].preview); queue.value.splice(index, 1) }
function resetQueue() {
  queue.value.forEach(item => URL.revokeObjectURL(item.preview))
  queue.value = []; caption.value = ''; summary.value = ''; dragging.value = false
}
watch(showUpload, open => { if (!open && !uploading.value) resetQueue() })
watch(() => props.isAdmin, isAdmin => {
  if (!isAdmin) {
    editing.value = false
    if (!uploading.value) showUpload.value = false
  }
})

async function uploadFiles() {
  if (uploading.value || !pendingCount.value || !canEdit.value) return
  uploading.value = true; summary.value = ''
  for (const item of queue.value) {
    if (disposed || !props.isAdmin) break
    if (item.status === 'done') continue
    item.status = 'uploading'; item.error = ''; item.progress = 0
    const body = new FormData()
    body.append('file', item.file)
    body.append('request_key', item.requestKey)
    body.append('caption', caption.value.trim())
    try {
      const res = await request.post('/photos', body, {
        signal: controller.signal, timeout: 120000,
        onUploadProgress(event) { if (!disposed && event.total) item.progress = Math.min(100, Math.round(event.loaded / event.total * 100)) },
      })
      if (disposed) return
      item.status = 'done'; item.progress = 100
      photos.value = [res.data.data, ...photos.value]
      loadError.value = false
    } catch (error) {
      if (disposed) return
      item.status = 'failed'
      item.error = typeof error.response?.data?.detail === 'string' ? error.response.data.detail
        : error.response?.status === 413 ? '照片过大，请选择15MB以内的图片'
        : '上传失败，请重试；若网络中断，请先检查相册是否已收到照片'
    }
  }
  uploading.value = false
  if (!props.isAdmin) { showUpload.value = false; return }
  const completed = queue.value.filter(item => item.status === 'done').length
  summary.value = `已上传 ${completed} 张${pendingCount.value ? `，还有 ${pendingCount.value} 张未完成，可重试或移除。` : '，照片已加入相册。'}`
  const completedKeys = new Set(queue.value.filter(item => item.status === 'done').map(item => item.key))
  setTimeout(() => {
    if (disposed) return
    queue.value = queue.value.filter(item => {
      if (completedKeys.has(item.key)) { URL.revokeObjectURL(item.preview); return false }
      return true
    })
  }, 2000)
}
async function deletePhoto(photo) {
  if (deleting.value !== null || uploading.value || !canEdit.value) return
  deleting.value = photo.id
  try {
    await ElMessageBox.confirm('删除会清理这张照片及其预览文件，确定移除吗？', '删除照片', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    await request.delete(`/photos/${photo.id}`, { signal: controller.signal })
    if (!disposed) photos.value = photos.value.filter(item => item.id !== photo.id)
  } catch (error) {
    if (!disposed && error !== 'cancel' && error !== 'close') ElMessage.error(error.response?.data?.detail || '删除失败，请稍后重试')
  } finally { deleting.value = null }
}
onMounted(fetchPhotos)
onUnmounted(() => { disposed = true; controller.abort(); resetQueue() })
</script>

<style scoped>
.upload-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.album-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.upload-toolbar p, .upload-hint, .album-status { font-size: 14px; color: var(--color-text-light); }
.album-status { text-align: center; padding: 16px; }
.upload-primary, .upload-secondary { border-radius: 24px; padding: 10px 20px; font-size: 14px; }
.upload-primary { background: var(--color-rose-dark); color: #fff; }
.upload-secondary { background: var(--color-rose-soft); color: var(--color-rose-dark); }
.album-edit-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-bottom: 28px; }
.editable-photo { border: 1px solid var(--color-rose-light); border-radius: 16px; overflow: hidden; background: #fff; }
.photo-preview { display: block; width: 100%; background: var(--color-cream); }
.photo-preview img { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.photo-info { padding: 12px; display: flex; align-items: center; gap: 8px; }
.photo-info p { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 14px; }
.photo-delete, .upload-close { background: none; color: var(--color-text-light); padding: 8px; flex-shrink: 0; }
.photo-delete:hover { color: var(--color-rose-dark); }
.upload-dialog { padding: 24px; }
.upload-dialog.dragging { box-shadow: inset 0 0 0 2px var(--color-rose); background: var(--color-rose-soft); }
.upload-dialog header, .upload-dialog footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.upload-dialog h3 { font-size: 20px; }
.upload-hint { line-height: 1.7; margin: 12px 0 16px; }
.file-input { display: none; }
.drop-zone { width: 100%; padding: 22px; background: var(--color-rose-soft); border: 1px dashed var(--color-rose); border-radius: 14px; color: var(--color-rose-dark); display: flex; align-items: center; flex-direction: column; gap: 6px; }
.drop-zone.dragging { background: var(--color-rose-light); }
.drop-zone > span { font-size: 28px; }
.drop-zone small { color: var(--color-text-light); }
.upload-queue { max-height: 260px; overflow-y: auto; margin-top: 16px; }
.queue-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0e8ea; }
.queue-item > img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
.queue-details { flex: 1; min-width: 0; }
.queue-details p { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-details small { display: block; font-size: 12px; overflow-wrap: anywhere; }
.queue-details progress { width: 100%; height: 6px; accent-color: var(--color-rose); }
.upload-success { color: #417557; }
.upload-error { color: #ad324b; }
.caption-label { display: block; font-size: 14px; margin: 18px 0 8px; }
.caption-input { width: 100%; padding: 12px; border: 1px solid var(--color-rose-light); border-radius: 10px; font-size: 16px; }
.upload-summary { margin-top: 16px; font-size: 13px; color: var(--color-text-light); }
.upload-dialog footer { justify-content: flex-end; margin-top: 24px; }
@media (max-width: 600px) {
  .album-edit-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .upload-toolbar { align-items: flex-start; flex-direction: column; }
  .upload-dialog { padding: 20px; }
  .photo-info { flex-wrap: wrap; padding: 8px; }
}
</style>

<style scoped>
.album-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: 280px; gap: 12px; }
.album-photo { position: relative; display: block; padding: 0; overflow: hidden; border-radius: 16px; background: var(--color-cream); }
.album-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s; }
.album-photo:hover img { transform: scale(1.025); }
.album-photo.grid-tall { grid-row: span 2; }
.album-photo.grid-tall img { object-position: center 35%; }
.album-photo.keep-whole img { object-fit: contain; }
.grid-corner { grid-column: 3; }
@media (max-width: 768px) {
  .album-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: auto; gap: 8px; }
  .album-photo { aspect-ratio: 1; }
  .album-photo.grid-tall { grid-column: 1 / -1; grid-row: auto; aspect-ratio: 3 / 4; }
  .grid-corner { grid-column: auto; aspect-ratio: 1; height: auto; }
}
</style>

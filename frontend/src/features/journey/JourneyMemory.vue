<template>
  <AppDialog :model-value="true" title="旅行回忆" width="800px" :busy="busy" @update:model-value="!$event && $emit('close')">
    <div class="memory">
      <header><div><p class="eyebrow">OUR JOURNEY</p><h2>{{ record.name.join('、') }}</h2><p>{{ date(record.departure_date) }} — {{ date(record.return_date) }}</p></div><button :disabled="busy" aria-label="关闭回忆" @click="$emit('close')">✕</button></header>
      <label v-if="related.length > 1" class="memory-switch">其他旅行回忆<select :value="record.id" :disabled="busy" @change="$emit('view', related.find(item => String(item.id) === $event.target.value))"><option v-for="item in related" :key="item.id" :value="item.id">{{ date(item.departure_date) }} · {{ item.name.join('、') }}</option></select></label>
      <section class="memory-photos" :class="{ dragging }" aria-label="旅程照片" @dragover.prevent="dragging = isAdmin && !busy" @dragleave="leaveDrop" @drop.prevent.stop="dropFiles">
        <div class="photo-heading"><h3>这一程的照片 <small v-if="photos.length">{{ photos.length }} 张</small></h3><label v-if="isAdmin" class="upload-label" :class="{ disabled: busy }">添加照片<input ref="uploadInput" type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="busy" @change="chooseFiles" /></label></div>
        <div v-if="uploadErrors.length" class="upload-error-summary" role="alert"><strong>照片未能上传</strong><p v-for="item in uploadErrors" :key="item.key">{{ item.file.name }}：{{ item.error }}</p></div>
        <p v-if="isAdmin && photos.length > 1" class="sort-hint" role="status">{{ working ? '正在保存…' : '拖动排序，手机长按 · 自动保存' }}</p>
        <p v-if="undoPhotos" class="sort-hint">顺序已保存 <button :disabled="busy" @click="undoOrder">撤销</button></p>
        <p v-if="loading" role="status">正在翻开照片…</p>
        <p v-else-if="loadError" role="alert">照片暂时未能加载 <button @click="loadPhotos">重试</button></p>
        <p v-else-if="!photos.length" class="muted">{{ isAdmin ? '把这一程的照片留在这里吧。' : '这一程的照片还在整理中。' }}</p>
        <div v-if="photos.length" class="photo-grid">
          <figure v-for="(photo, index) in photos" :key="photo.id" :data-photo-id="photo.id" :class="{ 'sort-active': isAdmin && photos.length > 1, 'sort-dragging': dragId === photo.id }" :draggable="false" @dragstart="startDrag($event, photo.id)" @dragover.prevent.stop @drop.prevent.stop="dropOrder(photo.id)" @dragend="dragId = null" @pointerdown="touchSortStart($event, photo.id)" @pointermove="touchSortMove" @pointerup="finishSort" @pointercancel="cancelGesture">
            <button class="photo-preview" :disabled="working || (!sorting && busy)" :aria-label="`放大第${index + 1}张照片`" @click="previewClick(index)"><JourneyPhoto :src="photo.small_url || photo.thumbnail_url" :alt="photo.caption || '旅程照片'" /></button>
            <figcaption v-if="photo.caption">{{ photo.caption }}</figcaption>
            <details v-if="isAdmin" class="photo-menu" @pointerdown.stop>
              <summary :aria-label="`照片${index + 1}的操作`">⋯</summary>
              <div><button :disabled="busy" @click="photoMenuAction($event, () => editCaption(photo))">编辑说明</button><button v-if="index > 0" :disabled="busy" @click="photoMenuAction($event, () => makeCover(index))">设为封面</button><button :disabled="busy" @click="photoMenuAction($event, () => deletePhoto(photo))">删除照片</button></div>
            </details>
          </figure>
        </div>
        <ul v-if="queue.length" class="upload-queue"><li v-for="item in queue" :key="item.key"><span>{{ item.file.name }}</span><span>{{ item.status }}</span><span v-if="item.error" class="upload-error" role="alert">{{ item.error }}</span><button v-if="item.status === '上传失败'" :disabled="busy" @click="upload([item])">重试</button></li></ul>
        <p v-if="isAdmin" class="muted">{{ dragging ? '松开即可上传照片' : '可将图片拖入此区域，或点击添加照片。支持多选 JPG、PNG、WebP，每张不超过 15MB。' }}</p>
      </section>
      <dl class="memory-details">
        <template v-if="record.checkin_points"><dt>打卡点（景点 / 地区）</dt><dd>{{ record.checkin_points }}</dd></template>
        <template v-if="record.event"><dt>大事件</dt><dd>{{ record.event }}</dd></template>
        <template v-if="record.notes"><dt>旅途感想</dt><dd>{{ record.notes }}</dd></template>
        <template v-if="record.planning_reason"><dt>当时想去的原因</dt><dd>{{ record.planning_reason }}</dd></template>
      </dl>
      <footer v-if="isAdmin"><button :disabled="busy" @click="$emit('plan', record)">预定旅程</button><button :disabled="busy" @click="$emit('new', record)">再次到访</button><button class="primary" :disabled="busy" @click="$emit('edit', record)">编辑旅程</button></footer>
    </div>
    <JourneyPhotoViewer v-if="viewerIndex !== null" :photos="photos" :initial-index="viewerIndex" @close="closeViewer" />
  </AppDialog>
</template>
<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppDialog from '../../components/shared/AppDialog.vue'
import JourneyPhoto from './JourneyPhoto.vue'
import JourneyPhotoViewer from './JourneyPhotoViewer.vue'
import request from '../../utils/request'
import { invalidatePrivatePhoto } from './privatePhotoCache'
const props = defineProps({ record: { type: Object, required: true }, isAdmin: Boolean, chooseOnOpen: Boolean, related: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'edit', 'new', 'plan', 'view', 'photos-updated'])
const photos = ref([]), queue = ref([]), loading = ref(true), loadError = ref(false), working = ref(false)
const uploadInput = ref(null)
const viewerIndex = ref(null)
const sorting = ref(false), dragId = ref(null)
const undoPhotos = ref(null)
let originalPhotos = [], touchTimer, touchId = null, startPoint = null, pointerElement = null, suppressClickUntil = 0, undoTimer, scrollFrame = 0, scrollPoint = null
const dragging = ref(false)
const busy = computed(() => working.value || sorting.value || viewerIndex.value !== null)
function beginSort() { originalPhotos = [...photos.value]; sorting.value = true }
function cancelGesture() { if (sorting.value) photos.value = [...originalPhotos]; sorting.value = false; stopTouchSort() }
function previewClick(index) { if (Date.now() >= suppressClickUntil && !sorting.value) viewPhotos(index) }
function photoMenuAction(event, callback) { event.currentTarget.closest('details').open = false; callback() }
function makeCover(index) { if (busy.value) return; beginSort(); moveBy(index, -index); void saveOrder() }
function moveBy(index, delta) { const list = [...photos.value]; const [item] = list.splice(index, 1); list.splice(index + delta, 0, item); photos.value = list }
function startDrag(event, id) { if (!sorting.value || working.value) { event.preventDefault(); return }; dragId.value = id; event.dataTransfer.setData('text/plain', id); event.dataTransfer.effectAllowed = 'move' }
function dropOrder(target) {
  if (!sorting.value || working.value || !dragId.value || target === dragId.value) return
  const from = photos.value.findIndex(p => p.id === dragId.value), to = photos.value.findIndex(p => p.id === target)
  if (from >= 0 && to >= 0) moveBy(from, to - from)
  dragId.value = null
}
function touchSortStart(event, id) {
  if (!props.isAdmin || photos.value.length < 2 || busy.value || !event.isPrimary || event.target.closest('.photo-menu') || (event.pointerType === 'mouse' && event.button !== 0)) return
  touchId = event.pointerId; startPoint = { x: event.clientX, y: event.clientY, id, touch: event.pointerType === 'touch' }; pointerElement = event.currentTarget
  if (startPoint.touch) touchTimer = setTimeout(() => activateSort(), 350)
}
function activateSort() {
  if (!startPoint) return
  beginSort(); dragId.value = startPoint.id
  pointerElement?.setPointerCapture(touchId)
  suppressClickUntil = Date.now() + 1000
}
function touchSortMove(event) {
  if (event.pointerId !== touchId || !startPoint) return
  if (!sorting.value && startPoint.touch && Math.hypot(event.clientX-startPoint.x,event.clientY-startPoint.y)>8) { stopTouchSort(); return }
  if (!sorting.value && !startPoint.touch && Math.hypot(event.clientX-startPoint.x,event.clientY-startPoint.y)>6) activateSort()
  if (!dragId.value) return
  scrollPoint = { x: event.clientX, y: event.clientY }
  if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll)
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-photo-id]')?.dataset.photoId
  if (target && target !== dragId.value) { const id = dragId.value; dropOrder(target); dragId.value = id }
}
function stopTouchSort() {
  clearTimeout(touchTimer)
  cancelAnimationFrame(scrollFrame); scrollFrame = 0; scrollPoint = null
  if (pointerElement?.hasPointerCapture(touchId)) pointerElement.releasePointerCapture(touchId)
  touchId = null; dragId.value = null; startPoint = null; pointerElement = null
}
function autoScroll() {
  scrollFrame = 0
  if (!sorting.value || !scrollPoint) return
  const body = pointerElement?.closest('.el-dialog__body')
  if (body) {
    const rect = body.getBoundingClientRect()
    const top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom)
    const delta = scrollPoint.y < top + 55 ? -7 : scrollPoint.y > bottom - 55 ? 7 : 0
    if (delta) {
      body.scrollTop += delta
      const target = document.elementFromPoint(scrollPoint.x, scrollPoint.y)?.closest('[data-photo-id]')?.dataset.photoId
      if (target && target !== dragId.value) { const id = dragId.value; dropOrder(target); dragId.value = id }
    }
  }
  scrollFrame = requestAnimationFrame(autoScroll)
}
function preventSortScroll(event) { if (sorting.value && startPoint?.touch && event.cancelable) event.preventDefault() }
async function undoOrder() {
  if (busy.value || !undoPhotos.value) return
  const previous = undoPhotos.value; undoPhotos.value = null; clearTimeout(undoTimer)
  beginSort(); photos.value = [...previous]; await saveOrder(false)
}
function finishSort() {
  const active = sorting.value
  stopTouchSort()
  if (active) { suppressClickUntil = Date.now() + 700; void saveOrder() }
}
async function saveOrder(offerUndo = true) {
  if (working.value || !sorting.value) return
  stopTouchSort()
  if (photos.value.every((photo, index) => photo.id === originalPhotos[index]?.id)) { sorting.value = false; return }
  working.value = true
  try {
    await request.put(`/journeys/${props.record.id}/photo-order`, { ids: photos.value.map(p => p.id), original_ids: originalPhotos.map(p => p.id) }, { signal: controller.signal })
    sorting.value = false; emit('photos-updated'); ElMessage.success('照片顺序已保存')
    clearTimeout(undoTimer)
    undoPhotos.value = offerUndo ? [...originalPhotos] : null
    if (offerUndo) undoTimer = setTimeout(() => { undoPhotos.value = null }, 10000)
  } catch (error) { photos.value = [...originalPhotos]; sorting.value = false; ElMessage.error(error.response?.data?.detail || '顺序保存失败，已恢复原顺序') }
  finally { working.value = false }
}
const uploadErrors = computed(() => queue.value.filter(item => item.error))
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
  selectFiles([...event.target.files || []]); event.target.value = ''
}
function leaveDrop(event) { if (!event.currentTarget.contains(event.relatedTarget)) dragging.value = false }
function dropFiles(event) { dragging.value = false; selectFiles([...event.dataTransfer?.files || []]) }
function selectFiles(files) {
  if (!props.isAdmin || busy.value || !files.length) return
  undoPhotos.value = null
  const items = files.map(file => ({ file, key: crypto.randomUUID(), status: !/\.(jpe?g|png|webp)$/i.test(file.name) ? '不支持的图片格式' : file.size > 15 * 1024 * 1024 ? '超过15MB' : '等待上传' }))
  queue.value.push(...items)
  void upload(queue.value.slice(-items.length).filter(item => item.status === '等待上传'))
}
async function upload(items) {
  if (!props.isAdmin || busy.value || !items.length) return
  working.value = true
  for (const item of items) {
    if (controller.signal.aborted) break
    item.status = '上传中…'; item.error = ''
    const body = new FormData(); body.append('file', item.file); body.append('request_key', item.key)
    try { await request.post(endpoint, body, { signal: controller.signal, timeout: 120000 }); item.status = '已上传' }
    catch (error) {
      item.status = '上传失败'
      const detail = error.response?.data?.detail
      item.error = typeof detail === 'string' && detail.trim() ? detail
        : Array.isArray(detail) ? detail.map(issue => `${(issue.loc || []).filter(part => part !== 'body').join(' / ')}：${issue.msg || '参数无效'}`).join('；')
        : error.response?.status === 413 ? '文件超过服务器或穿透入口的上传大小限制'
        : error.response?.status === 401 ? '登录已失效，请重新登录'
        : error.response?.status === 403 ? '当前账号没有上传权限'
        : error.response?.status === 404 ? '旅程或上传接口不存在，请确认后端已更新并重启'
        : error.response?.status >= 500 ? `服务器处理失败（${error.response.status}），请查看后端终端报错`
        : error.code === 'ECONNABORTED' ? '上传超过两分钟，请检查网络或缩小图片后重试'
        : error.response ? `上传被拒绝（${error.response.status}）`
        : '未能连接服务器，请检查网络、HTTPS证书或穿透连接'
      if (error.response?.status) item.error += `（HTTP ${error.response.status}）`
      if (!controller.signal.aborted) ElMessage({ type: 'error', message: `${item.file.name}：${item.error}`, duration: 10000, showClose: true })
    }
  }
  if (!controller.signal.aborted) { await loadPhotos(); emit('photos-updated') }
  working.value = false
}
async function deletePhoto(photo) {
  if (busy.value) return
  working.value = true
  undoPhotos.value = null
  try {
    await ElMessageBox.confirm('删除这张旅程照片？', '删除照片', { confirmButtonText: '删除', cancelButtonText: '取消' })
    await request.delete(`${endpoint}/${photo.id}`, { signal: controller.signal })
    invalidatePrivatePhoto(photo.id)
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
function viewPhotos(index) { if (!busy.value) viewerIndex.value = index }
function closeViewer() { viewerIndex.value = null }
onMounted(() => {
  document.addEventListener('touchmove', preventSortScroll, { passive: false, capture: true })
  void loadPhotos()
  if (props.chooseOnOpen && props.isAdmin) void nextTick(() => uploadInput.value?.click())
})
onUnmounted(() => { clearTimeout(undoTimer); document.removeEventListener('touchmove', preventSortScroll, { capture: true }); stopTouchSort(); controller.abort(); closeViewer() })
</script>
<style scoped>
.memory { padding: 28px; color: var(--color-text); }
.memory-photos { border-radius: 12px; outline: 2px dashed transparent; outline-offset: 8px; transition: background .2s, outline-color .2s; }
.memory-photos.dragging { outline-color: var(--color-rose); background: var(--color-rose-soft); }
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
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, 128px); gap: 16px; margin: 18px 0; align-items: start; }
.sort-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 14px 0; font-size: 12px; }
.sort-active { user-select: none; cursor: grab; }

.sort-active :deep(img) { pointer-events: none; -webkit-user-drag: none; }
.sort-dragging { opacity: .6; outline: 2px dashed var(--color-rose); border-radius: 10px; }
.photo-preview :deep(img) { object-fit: contain; }
figure { margin: 0; min-width: 0; }
.photo-preview { display: block; width: 128px; height: 128px; padding: 0; overflow: hidden; border-radius: 10px; background: #faf5f6; }
figcaption { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; margin: 8px 0; }
.photo-actions button { font-size: 12px; padding: 5px 8px; }
.memory-details dt { color: var(--color-rose-dark); font-size: 14px; margin: 24px 0 8px; }
.memory-details dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.9; }
footer { justify-content: flex-end; flex-wrap: wrap; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1e6e9; }
.primary { background: var(--color-rose-dark); color: #fff; }
.upload-queue { list-style: none; font-size: 12px; margin: 12px 0; }
.upload-queue li { display: flex; gap: 10px; padding: 5px 0; overflow-wrap: anywhere; }
.upload-queue li { flex-wrap: wrap; }
.upload-error { flex-basis: 100%; color: #ad324b; }
.upload-error-summary { margin: 16px 0; padding: 12px 14px; border: 1px solid #efb7bd; border-radius: 10px; background: #fff1f2; color: #9d2638; font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.upload-error-summary p { margin-top: 6px; }
@media (max-width: 600px) { .memory { padding: 20px; } .photo-grid { grid-template-columns: repeat(auto-fill, 96px); gap: 10px; } .photo-preview { width: 96px; height: 96px; } .photo-actions { flex-wrap: wrap; gap: 4px; } }
</style>

<style scoped>
.sort-hint { font-size: 12px; color: var(--color-text-light); margin: 12px 0; }
.photo-grid figure { position: relative; }
.photo-menu { position: absolute; top: 4px; right: 4px; z-index: 2; }
.photo-menu[open] { z-index: 4; }
.photo-menu summary { list-style: none; cursor: pointer; width: 30px; height: 28px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,.94); color: var(--color-text); font-size: 22px; line-height: 1; box-shadow: 0 1px 6px #0001; }
.photo-menu summary::-webkit-details-marker { display: none; }
.photo-menu > div { position: absolute; right: 0; top: 32px; min-width: 105px; padding: 5px; background: white; box-shadow: 0 4px 20px #0002; border-radius: 10px; }
.photo-menu button { display: block; width: 100%; background: transparent; border-radius: 6px; font-size: 12px; white-space: nowrap; text-align: left; }
.photo-menu button:hover { background: var(--color-rose-soft); }
</style>

<template>
  <section class="love-story-section">
    <div v-if="isAdmin && story && !editing && !loading && !loadError" class="story-toolbar">
      <button class="story-edit" @click="startEditing">编辑故事</button>
    </div>
  <article class="love-story" :aria-busy="loading || saving">
    <div class="story-card">
      <header class="story-header">
        <h3 v-if="!editing">{{ story?.title || '这就是我们的爱情故事' }}</h3>
        <h3 v-else>编辑我们的故事</h3>
      </header>
      <p v-if="loading" class="story-status" role="status">正在翻开我们的故事…</p>
      <p v-else-if="loadError" class="story-status" role="alert">故事暂时未能加载 <button class="story-edit" @click="fetchStory">重试</button></p>
      <form v-else-if="editing" class="story-editor" @submit.prevent="saveStory">
        <label for="story-title">标题</label>
        <input id="story-title" v-model="draft.title" maxlength="80" required :disabled="saving" />
        <label for="story-content">故事正文</label>
        <textarea id="story-content" ref="textarea" v-model="draft.content" maxlength="5000" required
          :disabled="saving" rows="3" placeholder="写下属于你们的故事，回车换行，空行分段…" @input="resizeEditor"></textarea>
        <div class="editor-hint"><span>回车换行，空行分段；文本框随内容自动伸缩</span><span>{{ draft.content.length }}/5000</span></div>
        <p v-if="saveError" class="story-error" role="alert">{{ saveError }}</p>
        <button v-if="conflict" type="button" class="story-edit" :disabled="saving" @click="reloadLatest">取消草稿并读取最新内容</button>
        <div class="story-actions">
          <button type="button" class="story-cancel" :disabled="saving" @click="cancelEditing">取消</button>
          <button type="submit" class="story-save" :disabled="saving || !draft.title.trim() || !draft.content.trim()">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </form>
      <p v-else-if="story" class="story-content">{{ story.content }}</p>
    </div>
  </article>
  </section>
</template>

<script setup>
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../utils/request'

const props = defineProps({ isAdmin: Boolean })
const story = ref(null)
const loading = ref(true)
const loadError = ref(false)
const editing = ref(false)
const saving = ref(false)
const saveError = ref('')
const conflict = ref(false)
const draft = reactive({ title: '', content: '', version: 0 })
const textarea = ref(null)
const controller = new AbortController()
let disposed = false

function resizeEditor() {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = `${textarea.value.scrollHeight + 2}px`
}
async function fetchStory() {
  loading.value = true; loadError.value = false
  try {
    const response = await request.get('/story', { signal: controller.signal })
    if (!disposed) story.value = response.data.data
  } catch { if (!disposed) loadError.value = true }
  finally { if (!disposed) loading.value = false }
}
async function startEditing() {
  if (!props.isAdmin || !story.value || loading.value) return
  Object.assign(draft, story.value)
  saveError.value = ''; conflict.value = false; editing.value = true
  await nextTick()
  resizeEditor()
  textarea.value?.focus({ preventScroll: true })
}
function cancelEditing() { if (!saving.value) { editing.value = false; saveError.value = ''; conflict.value = false } }
function reloadLatest() { cancelEditing(); void fetchStory() }
async function saveStory() {
  if (saving.value || !props.isAdmin || !editing.value) return
  if (!draft.title.trim() || !draft.content.trim()) return
  saving.value = true; saveError.value = ''; conflict.value = false
  const form = new FormData()
  form.append('title', draft.title.trim())
  form.append('content', draft.content.trim())
  form.append('version', String(draft.version))
  try {
    const response = await request.put('/story', form, { signal: controller.signal })
    if (disposed) return
    story.value = response.data.data
    editing.value = false
    ElMessage.success('我们的故事已保存')
  } catch (error) {
    if (disposed) return
    conflict.value = error.response?.status === 409
    saveError.value = error.response?.data?.detail || '保存失败，草稿已保留，请稍后重试'
  } finally { if (!disposed) saving.value = false }
}
watch(() => props.isAdmin, isAdmin => { if (!isAdmin) editing.value = false })
onMounted(() => { void fetchStory(); window.addEventListener('resize', resizeEditor) })
onUnmounted(() => { disposed = true; controller.abort(); window.removeEventListener('resize', resizeEditor) })
</script>

<style scoped>
.love-story-section { margin-bottom: 56px; }
.story-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.love-story { position: relative; border-radius: var(--radius-lg); overflow: hidden; background: #ffe8ef; }
.story-card { position: relative; padding: clamp(24px, 4vw, 48px); }
.story-header { position: relative; display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.story-header h3 { margin: 0; color: var(--color-rose-dark); font-family: var(--font-body); font-size: clamp(20px, 3vw, 24px); font-weight: 400; line-height: 1.6; overflow-wrap: anywhere; text-align: center; }
.story-edit, .story-cancel, .story-save { padding: 8px 18px; border-radius: 24px; font-size: 14px; white-space: nowrap; }
.story-edit, .story-cancel { background: rgba(255,255,255,.9); color: var(--color-rose-dark); border: 1px solid var(--color-rose-light); }
.story-save { background: var(--color-rose-dark); color: #fff; }
.story-content { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; text-align: center; color: var(--color-text); font-family: var(--font-body); font-size: 16px; line-height: 2; }
.story-status { text-align: center; color: var(--color-text-light); font-size: 14px; }
.story-editor { max-width: 780px; margin: 0 auto; }
.story-editor label { display: block; margin: 16px 0 8px; font-size: 14px; color: var(--color-text-light); }
.story-editor input, .story-editor textarea { display: block; width: 100%; border: 1px solid var(--color-rose-light); border-radius: 12px; padding: 12px 16px; font: inherit; font-size: 16px; background: rgba(255,255,255,.95); color: var(--color-text); }
.story-editor textarea { resize: none; overflow: hidden; line-height: 1.9; }
.editor-hint { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 12px; color: var(--color-text-light); }
.story-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.story-error { margin: 16px 0; color: #ad324b; font-size: 14px; overflow-wrap: anywhere; }
@media (max-width: 768px) { .story-content { font-size: 14px; } }
</style>

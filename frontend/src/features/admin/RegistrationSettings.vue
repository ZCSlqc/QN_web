<template>
  <section class="registration-settings" :aria-busy="loading || busy">
    <h3>注册分享码</h3>
    <p class="settings-hint">把分享码告诉想邀请的人。修改后旧码立即失效，已注册账号仍可正常登录。</p>
    <p v-if="loading" role="status">正在读取设置…</p>
    <div v-else-if="error" class="settings-error" role="alert">{{ error }} <button @click="load">重试</button></div>
    <template v-else-if="state">
      <div class="code-status">
        <span class="status-dot" :class="{ configured: state.configured }"></span>
        {{ state.configured ? '已设置分享码' : '尚未设置，注册暂未开放' }}
        <span class="source-badge">{{ state.editable ? '可在此修改' : '由部署环境管理' }}</span>
      </div>
      <div v-if="state.configured" class="current-code">
        <label for="current-share-code">当前分享码</label>
        <input id="current-share-code" :value="visible ? currentCode : '••••••••'" readonly aria-label="当前分享码" />
        <div class="code-actions">
          <button :disabled="busy" @click="toggleVisibility">{{ visible ? '隐藏' : '查看' }}</button>
          <button :disabled="busy" @click="copyCode">复制</button>
        </div>
      </div>
      <p v-if="!state.editable" class="settings-hint">分享码由服务器环境变量指定，请在部署环境中修改。这里不会覆盖服务器设置。</p>
      <form v-else @submit.prevent="save">
        <label for="new-share-code">新分享码</label>
        <div class="new-code-row">
          <input id="new-share-code" v-model="draft" :type="showDraft ? 'text' : 'password'" minlength="6" maxlength="64" required
            pattern="[A-Za-z0-9_-]{6,64}" autocomplete="off" :disabled="busy" placeholder="输入6至64位字母、数字、_ 或 -" />
          <button type="button" :disabled="busy" :aria-label="showDraft ? '隐藏新分享码' : '显示新分享码'" @click="showDraft = !showDraft">{{ showDraft ? '隐藏' : '显示' }}</button>
        </div>
        <p class="settings-hint">生成或输入后，点击保存才会生效。</p>
        <p v-if="saveError" class="settings-error" role="alert">{{ saveError }}</p>
        <div class="code-actions">
          <button type="button" :disabled="busy" @click="generate">随机生成</button>
          <button class="primary" type="submit" :disabled="busy || !validDraft">{{ busy ? '处理中…' : '保存分享码' }}</button>
        </div>
      </form>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../utils/request'

const emit = defineEmits(['unauthorized'])
const state = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const saveError = ref('')
const currentCode = ref('')
const visible = ref(false)
const draft = ref('')
const showDraft = ref(false)
const validDraft = computed(() => /^[A-Za-z0-9_-]{6,64}$/.test(draft.value))
const controller = new AbortController()
let disposed = false
function message(e) { return typeof e.response?.data?.detail === 'string' ? e.response.data.detail : '暂时无法完成操作，请稍后重试' }
function checkAuth(e) { if ([401, 403].includes(e.response?.status)) emit('unauthorized') }
async function load() {
  loading.value = true; error.value = ''; visible.value = false; currentCode.value = ''
  try {
    const res = await request.get('/admin/settings/registration', { signal: controller.signal })
    if (!disposed) state.value = res.data
  } catch (e) { if (!disposed) { error.value = message(e); checkAuth(e) } }
  finally { if (!disposed) loading.value = false }
}
async function reveal() {
  const res = await request.get('/admin/settings/registration', { params: { reveal: true }, signal: controller.signal })
  if (disposed) return ''
  const { code, ...metadata } = res.data
  state.value = metadata
  return code || ''
}
async function toggleVisibility() {
  if (busy.value) return
  if (visible.value) { visible.value = false; currentCode.value = ''; return }
  busy.value = true
  try { currentCode.value = await reveal(); visible.value = true }
  catch (e) { if (!disposed) { ElMessage.error(message(e)); checkAuth(e) } }
  finally { busy.value = false }
}
async function copyCode() {
  if (busy.value) return
  busy.value = true
  try {
    const code = await reveal()
    if (disposed) return
    if (!code) { ElMessage.info('尚未设置分享码'); return }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(code)
      ElMessage.success('分享码已复制')
    } catch {
      currentCode.value = code; visible.value = true
      ElMessage.info('浏览器不支持自动复制，请选中分享码手动复制')
    }
  } catch (e) { if (!disposed) { ElMessage.error(message(e)); checkAuth(e) } }
  finally { busy.value = false }
}
function generate() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  draft.value = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  showDraft.value = true; saveError.value = ''
}
async function save() {
  if (busy.value || !validDraft.value || !state.value?.editable) return
  busy.value = true; saveError.value = ''
  try {
    await ElMessageBox.confirm('保存后旧分享码立即失效，已注册用户不受影响。确认修改？', '修改注册分享码', { confirmButtonText: '保存', cancelButtonText: '取消' })
    const form = new FormData()
    form.append('code', draft.value)
    form.append('revision', state.value.revision)
    const res = await request.put('/admin/settings/registration', form, { signal: controller.signal })
    if (disposed) return
    state.value = res.data; draft.value = ''; currentCode.value = ''; visible.value = false; showDraft.value = false
    ElMessage.success('分享码已保存并立即生效')
  } catch (e) {
    if (!disposed && e !== 'cancel' && e !== 'close') {
      saveError.value = message(e); checkAuth(e)
      if (e.response?.status === 409) await load()
    }
  } finally { busy.value = false }
}
onMounted(load)
onUnmounted(() => { disposed = true; controller.abort(); currentCode.value = ''; draft.value = '' })
</script>

<style scoped>
.registration-settings { max-width: 720px; padding: clamp(20px, 4vw, 32px); background: #fff; border-radius: 20px; box-shadow: var(--shadow-sm); }
h3 { font-size: 21px; margin-bottom: 10px; }
.settings-hint { color: var(--color-text-light); line-height: 1.8; font-size: 13px; margin: 8px 0 20px; }
.code-status { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 24px 0; font-size: 14px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #aaa; }
.status-dot.configured { background: #659779; }
.source-badge { padding: 3px 10px; background: var(--color-cream); border-radius: 12px; font-size: 12px; }
label { display: block; font-size: 14px; margin-bottom: 10px; }
input { width: 100%; min-width: 0; border: 1px solid var(--color-rose-light); border-radius: 10px; padding: 12px; font-size: 16px; color: var(--color-text); }
.current-code { margin-bottom: 28px; }
.new-code-row { display: flex; gap: 8px; }
.new-code-row input { flex: 1; }
button { padding: 9px 16px; border-radius: 20px; background: var(--color-rose-soft); color: var(--color-rose-dark); white-space: nowrap; }
button.primary { background: var(--color-rose-dark); color: white; }
.code-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.settings-error { color: #ad324b; font-size: 14px; line-height: 1.7; }
</style>

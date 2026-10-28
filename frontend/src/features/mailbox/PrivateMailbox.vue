<template>
  <button class="mailbox-trigger" :class="{ scrolled }" :aria-label="triggerLabel" :title="triggerLabel" @click="openMailbox">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span v-if="summary.unread_letters" class="mailbox-badge">{{ summary.unread_letters > 99 ? '99+' : summary.unread_letters }}</span>
    <span v-else-if="summary.unread_reply_threads" class="mailbox-dot" aria-hidden="true"></span>
  </button>
  <AppDialog :model-value="visible" title="两个人的信箱" width="760px" :busy="busy" @update:model-value="value => { if (!value) closeMailbox() }">
    <div class="mailbox-panel" :class="{ composing: view === 'compose' }">
      <header class="mailbox-header">
        <div><span class="mailbox-eyebrow">JUST BETWEEN US</span><h3>两个人的信箱</h3></div>
        <button class="mailbox-close" :disabled="busy" aria-label="关闭信箱" @click="closeMailbox">✕</button>
      </header>
      <p class="mailbox-intro">有些话，想慢慢写给你。</p>
      <div v-if="summaryError" class="mailbox-error" role="alert">{{ summaryError }} <button @click="refreshSummary">重试</button></div>
      <p v-if="summary.partner && !summary.partner_ready" class="mailbox-muted">另一半注册后，就可以开始通信了。</p>
      <nav class="mailbox-tabs" aria-label="信箱栏目">
        <button :class="{ active: box === 'inbox' && view !== 'compose' }" :disabled="busy" @click="switchBox('inbox')">收件箱 <span v-if="summary.unread_letters">{{ summary.unread_letters }} 未读</span></button>
        <button :class="{ active: box === 'sent' && view !== 'compose' }" :disabled="busy" @click="switchBox('sent')">已发送 <span v-if="summary.pending_sent">{{ summary.pending_sent }} 对方未读</span></button>
        <button :class="{ active: view === 'compose' }" :disabled="busy || !summary.partner_ready" @click="startCompose">写封信</button>
      </nav>
      <p v-if="summary.unread_reply_threads" class="reply-notice">有 {{ summary.unread_reply_threads }} 封信收到新留言</p>

      <template v-if="view === 'list'">
        <div class="mailbox-list-tools"><span>{{ total }} 封信</span><button :disabled="listLoading" @click="refreshListAndSummary">刷新</button></div>
        <p v-if="listLoading" class="mailbox-state" role="status">正在整理信件…</p>
        <p v-else-if="listError" class="mailbox-error" role="alert">{{ listError }} <button @click="loadLetters">重试</button></p>
        <div v-else class="mailbox-list">
          <button v-for="letter in letters" :key="letter.id" class="letter-item" :class="{ unread: letter.unread }" @click="openLetter(letter.id)">
            <span class="letter-icon" aria-hidden="true">{{ kinds[letter.kind]?.icon || '✉️' }}</span>
            <span class="letter-meta"><strong>{{ letter.title }}</strong><small>{{ box === 'inbox' ? `来自 ${letter.sender_name}` : `写给 ${letter.recipient_name}` }} · {{ letter.created_at }}</small></span>
            <span class="letter-flags"><span v-if="letter.unread" class="letter-badge">未读</span><span v-else-if="letter.is_sender" class="receipt">{{ letter.recipient_read_at ? '对方已读' : '对方未读' }}</span><span v-if="letter.new_comments" class="letter-badge reply">新留言 {{ letter.new_comments }}</span></span>
          </button>
          <p v-if="!letters.length" class="mailbox-state">{{ box === 'inbox' ? '还没有来信，先给对方写一封吧。' : '你写下的悄悄话，会留在这里。' }}</p>
        </div>
        <div v-if="total > 20" class="mailbox-pagination">
          <button :disabled="page === 1 || listLoading" @click="changePage(-1)">上一页</button><span>{{ page }} / {{ Math.ceil(total / 20) }}</span><button :disabled="page * 20 >= total || listLoading" @click="changePage(1)">下一页</button>
        </div>
      </template>

      <form v-else-if="view === 'compose'" class="letter-compose" @submit.prevent="sendLetter">
        <p class="letter-to">写给 {{ summary.partner }}</p>
        <label for="mail-kind">想说些什么</label>
        <select id="mail-kind" v-model="draft.kind" :disabled="busy"><option v-for="(kind, key) in kinds" :key="key" :value="key">{{ kind.icon }} {{ kind.label }}</option></select>
        <label for="mail-title">标题</label>
        <input id="mail-title" v-model="draft.title" maxlength="100" required :disabled="busy" placeholder="给这封信起个名字…" />
        <label for="mail-body">正文</label>
        <textarea id="mail-body" v-model="draft.body" rows="4" maxlength="10000" required :disabled="busy" placeholder="想道个歉，分享一件小事，或者只是说一句想你…"></textarea>
        <p class="mailbox-count">{{ draft.body.length }} / 10000</p>
        <p v-if="actionError" class="mailbox-error" role="alert">{{ actionError }}</p>
        <footer class="mailbox-actions"><button type="button" :disabled="busy" @click="switchBox(box)">取消</button><button class="primary" type="submit" :disabled="busy || !draft.title.trim() || !draft.body.trim() || !summary.partner_ready">{{ busy ? '投递中…' : '寄给ta' }}</button></footer>
      </form>

      <template v-else>
        <div class="letter-navigation"><button :disabled="busy" @click="switchBox(box)">← 返回列表</button><div><button :disabled="busy || currentIndex <= 0" @click="navigateLetter(-1)">上一封</button><button :disabled="busy || currentIndex < 0 || currentIndex >= letters.length - 1" @click="navigateLetter(1)">下一封</button></div></div>
        <p v-if="detailLoading" class="mailbox-state" role="status">正在拆开信封…</p>
        <p v-else-if="detailError" class="mailbox-error" role="alert">{{ detailError }} <button @click="loadDetail(currentLetterId)">重试</button></p>
        <template v-else-if="detail">
          <article class="letter-paper">
            <span class="letter-kind">{{ kinds[detail.kind]?.icon }} {{ kinds[detail.kind]?.label }}</span>
            <h4>{{ detail.title }}</h4>
            <p class="letter-to">{{ detail.sender_name }} 写给 {{ detail.recipient_name }} · {{ detail.created_at }}</p>
            <div class="letter-body">{{ detail.body }}</div>
            <p class="letter-receipt">{{ detail.is_sender ? (detail.recipient_read_at ? `对方已读 · ${detail.recipient_read_at}` : '对方还没有打开这封信') : (detail.recipient_read_at ? `已读 · ${detail.recipient_read_at}` : '阅读状态待同步') }}</p>
          </article>
          <p v-if="readError" class="mailbox-error" role="alert">{{ readError }} <button @click="acknowledge(detail)">同步已读</button></p>
          <section class="letter-discussion" aria-label="信内留言">
            <header><h4>在信里聊聊</h4><button :disabled="busy || refreshing" @click="loadDetail(currentLetterId, true)">刷新留言</button></header>
            <p v-if="refreshError" class="mailbox-error" role="alert">{{ refreshError }}</p>
            <p v-if="!detail.comments.length" class="mailbox-muted">读完有什么想说的，就留在这里吧。</p>
            <div v-for="comment in detail.comments" :key="comment.id" class="mail-comment" :class="{ mine: comment.is_mine }">
              <div><strong>{{ comment.author }}</strong><time>{{ comment.created_at }}</time></div><p>{{ comment.content }}</p>
            </div>
            <form @submit.prevent="sendComment">
              <label for="mail-comment">留言</label><textarea id="mail-comment" v-model="replyText" rows="3" maxlength="2000" :disabled="busy" placeholder="把想回应的话写下来…"></textarea>
              <p v-if="actionError" class="mailbox-error" role="alert">{{ actionError }}</p>
              <footer class="mailbox-actions"><span class="mailbox-count">{{ replyText.length }} / 2000</span><button class="primary" type="submit" :disabled="busy || !replyText.trim()">{{ busy ? '发送中…' : '留下回应' }}</button></footer>
            </form>
          </section>
        </template>
      </template>
    </div>
  </AppDialog>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../utils/request'
import AppDialog from '../../components/shared/AppDialog.vue'
import { onBeforeRouteLeave } from 'vue-router'

defineProps({ scrolled: Boolean })
const emit = defineEmits(['unavailable'])
const kinds = { secret: { icon: '💌', label: '悄悄话' }, apology: { icon: '🤍', label: '想道个歉' }, share: { icon: '🌷', label: '分享日常' }, other: { icon: '✉️', label: '其他' } }
const visible = ref(false), view = ref('list'), box = ref('inbox'), page = ref(1), total = ref(0)
const summary = reactive({ unread_letters: 0, pending_sent: 0, unread_reply_threads: 0, partner: '', partner_ready: false })
const summaryError = ref(''), listError = ref(''), detailError = ref(''), actionError = ref(''), readError = ref(''), refreshError = ref('')
const letters = ref([]), detail = ref(null), currentLetterId = ref(null)
const listLoading = ref(false), detailLoading = ref(false), refreshing = ref(false), busy = ref(false)
const draft = reactive({ title: '', body: '', kind: 'secret' })
const replyText = ref('')
const currentIndex = computed(() => letters.value.findIndex(letter => letter.id === currentLetterId.value))
const triggerLabel = computed(() => `私密信箱，${summary.unread_letters}封未读，${summary.unread_reply_threads}封信有新留言`)
const controller = new AbortController()
let disposed = false, polling = false, pollTimer, listGeneration = 0, detailGeneration = 0
let sendKey = newKey(), replyKey = newKey()
function newKey() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('') }
function form(values) { const data = new FormData(); Object.entries(values).forEach(([key, value]) => data.append(key, String(value))); return data }
function errorMessage(error) { return typeof error.response?.data?.detail === 'string' ? error.response.data.detail : '暂时没能连接上，内容已保留，请稍后重试' }
function checkAccess(error) {
  if ([401, 403].includes(error.response?.status)) { visible.value = false; emit('unavailable') }
}
async function refreshSummary() {
  try {
    const res = await request.get('/mailbox/summary', { signal: controller.signal })
    if (!disposed) { Object.assign(summary, res.data); summaryError.value = '' }
  } catch (error) { if (!disposed) { summaryError.value = errorMessage(error); checkAccess(error) } }
}
async function loadLetters() {
  const generation = ++listGeneration
  listLoading.value = true; listError.value = ''
  try {
    const res = await request.get('/mailbox/letters', { params: { box: box.value, page: page.value }, signal: controller.signal })
    if (disposed || generation !== listGeneration) return
    letters.value = res.data.data; total.value = res.data.total
  } catch (error) { if (!disposed && generation === listGeneration) { listError.value = errorMessage(error); checkAccess(error) } }
  finally { if (generation === listGeneration) listLoading.value = false }
}
async function refreshListAndSummary() { await Promise.allSettled([refreshSummary(), loadLetters()]) }
async function openMailbox() { visible.value = true; await refreshListAndSummary() }
async function discardDraft() {
  if (busy.value) return false
  const dirty = view.value === 'compose' ? draft.title.trim() || draft.body.trim() : replyText.value.trim()
  if (!dirty) return true
  try {
    await ElMessageBox.confirm('还有没发送的文字，确定放弃吗？', '保留这段话', { confirmButtonText: '放弃草稿', cancelButtonText: '继续写' })
    return true
  } catch { return false }
}
function resetReply() { replyText.value = ''; replyKey = newKey(); actionError.value = '' }
function resetDraft() { Object.assign(draft, { title: '', body: '', kind: 'secret' }); sendKey = newKey(); actionError.value = '' }
async function closeMailbox() {
  if (!await discardDraft()) return
  visible.value = false; detailGeneration++; resetReply(); resetDraft(); view.value = 'list'; detail.value = null
}
async function switchBox(nextBox) {
  if (!await discardDraft()) return
  resetReply(); resetDraft(); detailGeneration++; detail.value = null; box.value = nextBox; page.value = 1; view.value = 'list'
  await refreshListAndSummary()
}
async function changePage(direction) { page.value += direction; await loadLetters() }
async function startCompose() {
  if (!await discardDraft()) return
  resetReply(); resetDraft(); detailGeneration++; view.value = 'compose'
}
async function openLetter(id) {
  if (busy.value) return
  currentLetterId.value = id; resetReply(); view.value = 'detail'
  await loadDetail(id)
}
async function navigateLetter(direction) {
  const target = letters.value[currentIndex.value + direction]
  if (target && await discardDraft()) await openLetter(target.id)
}
async function acknowledge(snapshot) {
  if (disposed || !visible.value || document.hidden || view.value !== 'detail' || currentLetterId.value !== snapshot.id) return
  try {
    const res = await request.post(`/mailbox/letters/${snapshot.id}/read`, form({ through_comment_id: snapshot.last_comment_id }), { signal: controller.signal })
    if (disposed) return
    Object.assign(summary, res.data.summary)
    if (detail.value?.id === snapshot.id) { detail.value.recipient_read_at = res.data.recipient_read_at; readError.value = '' }
    const row = letters.value.find(letter => letter.id === snapshot.id)
    if (row) { row.unread = false; row.recipient_read_at = res.data.recipient_read_at; row.new_comments = 0 }
  } catch (error) { if (!disposed) { readError.value = '阅读状态暂未同步，可重试。'; checkAccess(error) } }
}
async function loadDetail(id, refresh = false) {
  const generation = ++detailGeneration
  if (refresh) refreshing.value = true
  else { detailLoading.value = true; detail.value = null; detailError.value = ''; readError.value = '' }
  refreshError.value = ''
  try {
    const res = await request.get(`/mailbox/letters/${id}`, { signal: controller.signal })
    if (disposed || generation !== detailGeneration || view.value !== 'detail') return
    detail.value = res.data
    detailLoading.value = false
    await nextTick()
    if (generation === detailGeneration) await acknowledge(res.data)
  } catch (error) {
    if (!disposed && generation === detailGeneration) {
      if (refresh) refreshError.value = errorMessage(error)
      else detailError.value = errorMessage(error)
      checkAccess(error)
    }
  } finally { if (generation === detailGeneration) { detailLoading.value = false; refreshing.value = false } }
}
async function sendLetter() {
  if (busy.value || !draft.title.trim() || !draft.body.trim() || !summary.partner_ready) return
  busy.value = true; actionError.value = ''
  try {
    const res = await request.post('/mailbox/letters', form({ ...draft, request_key: sendKey }), { signal: controller.signal })
    if (disposed) return
    resetDraft(); box.value = 'sent'; page.value = 1
    visible.value = false; detailGeneration++; resetReply(); view.value = 'list'; detail.value = null
    void refreshListAndSummary()
    ElMessage.success('信已放进对方的信箱')
  } catch (error) { if (!disposed) { actionError.value = errorMessage(error); checkAccess(error) } }
  finally { busy.value = false }
}
async function sendComment() {
  if (busy.value || !replyText.value.trim() || !detail.value) return
  busy.value = true; actionError.value = ''
  try {
    await request.post(`/mailbox/letters/${detail.value.id}/comments`, form({ content: replyText.value, request_key: replyKey }), { signal: controller.signal })
    if (disposed) return
    resetReply(); await loadDetail(currentLetterId.value, true)
  } catch (error) { if (!disposed) { actionError.value = errorMessage(error); checkAccess(error) } }
  finally { busy.value = false }
}
async function poll() {
  clearTimeout(pollTimer)
  if (disposed || polling) return
  polling = true
  try {
    if (!document.hidden && !busy.value) {
      await refreshSummary()
      if (visible.value && view.value === 'list') await loadLetters()
      else if (visible.value && view.value === 'detail' && !detailLoading.value && !refreshing.value) await loadDetail(currentLetterId.value, true)
    }
  } finally {
    polling = false
    if (!disposed) pollTimer = setTimeout(poll, 30000)
  }
}
function onVisibility() { if (!document.hidden) void poll() }
function beforeUnload(event) {
  if (busy.value || draft.title.trim() || draft.body.trim() || replyText.value.trim()) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onBeforeRouteLeave(async () => !visible.value || await discardDraft())
onMounted(() => { document.addEventListener('visibilitychange', onVisibility); window.addEventListener('profile-updated', onVisibility); window.addEventListener('beforeunload', beforeUnload); void poll() })
onUnmounted(() => { disposed = true; clearTimeout(pollTimer); controller.abort(); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('profile-updated', onVisibility); window.removeEventListener('beforeunload', beforeUnload) })
</script>

<style scoped>
.mailbox-trigger { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 0; border-radius: 50%; background: rgba(255,255,255,.12); color: #fff; border: 1px solid rgba(255,255,255,.3); }
.mailbox-trigger.scrolled { color: var(--color-rose-dark); background: #fff5f8; border-color: var(--color-rose-light); }
.mailbox-badge { position: absolute; top: -4px; right: -6px; min-width: 18px; padding: 1px 4px; border-radius: 10px; background: #b85d73; color: white; font-size: 10px; line-height: 16px; border: 1px solid white; }
.mailbox-dot { position: absolute; top: 0; right: 0; width: 9px; height: 9px; border-radius: 50%; background: #b85d73; border: 1px solid white; }
.mailbox-panel { padding: clamp(20px, 4vw, 32px); color: var(--color-text); background: linear-gradient(180deg, #fff9fb, #fff); }
.mailbox-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.mailbox-eyebrow { font-size: 10px; letter-spacing: 3px; color: var(--color-rose-dark); }
.mailbox-header h3 { margin: 6px 0 0; font-weight: 500; font-size: 24px; }
.mailbox-close { width: 36px; height: 36px; padding: 0; border-radius: 50%; background: var(--color-rose-soft); color: var(--color-rose-dark); }
.mailbox-intro { margin: 12px 0 24px; color: var(--color-text-light); font-size: 13px; }
.mailbox-tabs { display: flex; gap: 6px; border-bottom: 1px solid #f1dfe5; padding-bottom: 12px; }
.mailbox-tabs button { flex: 1; padding: 10px 8px; border-radius: 12px; color: var(--color-text-light); background: transparent; font-size: 14px; }
.mailbox-tabs button.active { background: var(--color-rose-soft); color: var(--color-rose-dark); }
.mailbox-tabs span { display: block; margin-top: 4px; font-size: 11px; }
.reply-notice { color: var(--color-rose-dark); font-size: 12px; margin-top: 12px; }
.mailbox-list-tools, .mailbox-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 16px 0; font-size: 12px; color: var(--color-text-light); }
.mailbox-panel button:not(.letter-item):not(.mailbox-close):not(.primary) { color: var(--color-rose-dark); }
.mailbox-list-tools button, .mailbox-pagination button, .letter-navigation button, .letter-discussion header button, .mailbox-error button { padding: 6px 10px; border-radius: 14px; background: #fff0f4; font-size: 12px; }
.mailbox-list { display: flex; flex-direction: column; gap: 10px; }
.letter-item { display: flex; align-items: center; gap: 14px; padding: 18px; width: 100%; text-align: left; border: 1px solid #f0e6e9; border-radius: 14px; background: #fff; color: var(--color-text); }
.letter-item.unread { border-color: #edbdca; background: #fff6f9; }
.letter-icon { font-size: 24px; }
.letter-meta { flex: 1; min-width: 0; }
.letter-meta strong { display: block; overflow-wrap: anywhere; font-size: 15px; font-weight: 500; }
.letter-meta small { display: block; margin-top: 8px; font-size: 11px; color: var(--color-text-light); line-height: 1.6; }
.letter-flags { display: flex; align-items: flex-end; flex-direction: column; gap: 6px; flex-shrink: 0; }
.letter-badge { padding: 3px 7px; border-radius: 12px; background: #b85d73; color: #fff; font-size: 10px; }
.letter-badge.reply { background: #f4e1e7; color: #9b4d63; }
.receipt { font-size: 11px; color: var(--color-text-light); }
.mailbox-state { padding: 40px 10px; color: var(--color-text-light); text-align: center; font-size: 14px; }
.mailbox-muted { color: var(--color-text-light); font-size: 13px; line-height: 1.8; margin: 16px 0; }
.mailbox-error { color: #ad324b; font-size: 13px; line-height: 1.8; margin: 14px 0; }
.letter-compose { padding-top: 16px; }
.letter-compose label, .letter-discussion label { display: block; margin: 16px 0 8px; font-size: 13px; color: var(--color-text-light); }
.mailbox-panel input, .mailbox-panel textarea, .mailbox-panel select { display: block; width: 100%; padding: 12px; border: 1px solid #e8d5dc; border-radius: 10px; font: inherit; font-size: 16px; color: var(--color-text); background: #fff; }
.mailbox-panel textarea { resize: vertical; line-height: 1.9; }
.mailbox-count { font-size: 12px; text-align: right; color: var(--color-text-light); margin-top: 8px; }
.mailbox-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.mailbox-actions button { padding: 10px 20px; border-radius: 24px; background: var(--color-rose-soft); font-size: 14px; }
.mailbox-panel .primary { background: var(--color-rose-dark); color: #fff; }
.letter-navigation { display: flex; justify-content: space-between; gap: 12px; margin: 18px 0; }
.letter-navigation > div { display: flex; gap: 6px; }
.letter-paper { padding: clamp(20px, 4vw, 32px); background: #fff9f4; border: 1px solid #f0e4da; border-radius: 16px; }
.letter-kind { font-size: 12px; color: var(--color-rose-dark); }
.letter-paper h4 { margin: 16px 0 12px; font-size: 22px; font-weight: 500; overflow-wrap: anywhere; }
.letter-to { font-size: 12px; color: var(--color-text-light); line-height: 1.8; }
.letter-body { margin: 28px 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 16px; line-height: 2; }
.letter-receipt { font-size: 11px; text-align: right; color: var(--color-text-light); }
.letter-discussion { margin-top: 28px; }
.letter-discussion header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.letter-discussion h4 { font-size: 16px; font-weight: 500; }
.mail-comment { padding: 14px 16px; border-radius: 12px; margin: 12px 0; background: #f7f5f4; }
.mail-comment.mine { background: #fff0f4; }
.mail-comment > div { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--color-text-light); }
.mail-comment p { margin-top: 8px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.9; }
@media (max-width: 480px) {
  .mailbox-header h3 { font-size: 21px; }
  .letter-item { gap: 8px; padding: 14px 10px; flex-wrap: wrap; }
  .letter-icon { font-size: 19px; }
  .letter-flags { flex-direction: row; width: 100%; padding-left: 28px; }
  .letter-navigation { flex-wrap: wrap; }
  .mailbox-tabs button { padding: 10px 4px; font-size: 13px; }
}
.mailbox-panel.composing { padding: 20px 24px; }
.composing .mailbox-intro { margin: 8px 0 12px; }
.composing .letter-compose { padding-top: 4px; }
.composing .letter-compose label { margin: 10px 0 5px; }
.composing .letter-compose input, .composing .letter-compose select { padding: 8px 10px; }
.composing #mail-body { line-height: 1.6; height: clamp(90px, 18dvh, 140px); min-height: 80px; resize: none; }
.composing .mailbox-actions { margin-top: 12px; }
@media (max-height: 700px) { .mailbox-panel.composing { padding: 12px 18px; } .composing .mailbox-intro { display: none; } .composing .mailbox-header h3 { margin: 4px 0; } .composing #mail-body { height: 88px; } }
</style>

<template>
  <TodoReflectionDialog v-if="isAdmin" :item="reflectionItem" :completing="completingReflection" @close="reflectionItem = null" @saved="reflectionSaved" />
  <!-- 祝福弹窗 — 在 loading 层之外，确保首次登录即可见 -->
  <AppDialog v-model="showBlessingModal" title="留下你的祝福" :busy="saving">
    <div class="modal-card glass-card blessing-modal">
      <div class="modal-card__head">
        <h4>💌 留下你的祝福</h4>
      </div>
      <div class="modal-card__body">
        <p class="blessing-hint">欢迎来到 qiqi &amp; nini 的小世界，请留下一句祝福寄语吧 ✨</p>
        <textarea v-model="blessingText" aria-label="祝福内容" :disabled="saving" placeholder="写下你对我们的祝福..." rows="4" maxlength="300"></textarea>
        <span class="char-count">{{ blessingText.length }}/300</span>
      </div>
      <div class="modal-card__foot">
        <button class="btn-cancel" :disabled="saving" @click="skipBlessing">稍后再说</button>
        <button class="btn-rose" :disabled="saving || !blessingText.trim()" @click="submitBlessing">送出祝福</button>
      </div>
    </div>
  </AppDialog>

  <div class="page-wrapper">

    <!-- ============================================================
      Section 1：Hero 首页
      ============================================================ -->
    <section class="hero" id="home">
      <canvas ref="petalCanvas" class="petal-canvas" aria-hidden="true"></canvas>
      <img fetchpriority="high" decoding="async" class="hero-bg" src="/optimized/background/bg-flower.webp" alt="" />
      <div class="hero-overlay"></div>

      <SiteNavigation :light="scrollTop > 300" :is-admin="isAdmin" :has-mailbox="hasMailbox" :current-username="currentUsername" @mailbox-unavailable="hasMailbox = false" />

      <div class="hero-content">
        <p class="hero-eyebrow animate-fade-in-up">OUR LITTLE LOVE STORY</p>
        <h1 class="hero-title animate-fade-in-up">i love you</h1>
        <div class="hero-names animate-fade-in-up" style="animation-delay: 0.3s">
          <span class="name-item">qiqi</span>
          <span class="name-divider">
            <svg viewBox="0 0 24 24" class="heart-svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>
          </span>
          <span class="name-item">nini</span>
        </div>
        <p class="hero-days">我们已经相伴 {{ elapsedTime.days }} 天</p>
        <div class="hero-actions"><button @click="scrollTo('album')">翻看回忆</button><router-link v-if="canVisitPage('/journey', isAdmin)" to="/journey">查看足迹 →</router-link></div>
        <button class="scroll-hint" @click="scrollTo('story')">
          <span>向下探索</span>
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/></svg>
        </button>
      </div>
    </section>

    <!-- ============================================================
      Section 2：爱的故事（Things To Do）
      ============================================================ -->
    <section class="story-section" id="story">
      <div class="container">
        <div class="section-header">
          <div class="header-avatars">
            <img src="/optimized/img/qiqi.webp" alt="qiqi" class="avatar avatar-left" />
            <div class="header-text">
              <p class="section-eyebrow">The Story of our love</p>
              <h2 class="section-title section-title-script">Our Love Story</h2>
              <div class="section-line"></div>
            </div>
            <img src="/optimized/img/nini.webp" alt="nini" class="avatar avatar-right" />
          </div>
        </div>

        <div class="blessing-action"><button class="btn-cancel" :disabled="saving" @click="showBlessingModal = true">💌 送上祝福</button></div>
        <BlessingCarousel :items="allBlessings" :loading="blessingLoading" :error="blessingError" @retry="fetchBlessings" />

        <LoveStory :is-admin="isAdmin" />

        <!-- 待办卡片 -->
        <div class="todo-area">
          <div class="todo-header">
            <h3>Things To Do</h3>
            <button v-if="isAdmin" class="btn-add" @click="showAddModal = true">+ 新增心愿</button>
          </div>

          <div v-if="todoLoading" class="todo-empty" role="status">正在读取我们的心愿…</div>
          <div v-else-if="todoError" class="todo-empty" role="alert">心愿暂时未能加载 <button class="btn-cancel" @click="fetchTodoList">重试</button></div>
          <div v-else-if="todoList.length === 0" class="todo-empty">
            <p>还没有待办事项</p>
            <p class="sub">等着管理员来添加一起想做的事</p>
          </div>

          <div class="todo-grid">
            <div v-for="(item, idx) in todoList" :key="item.id || item.entry" class="todo-card">
              <div class="todo-card__body">
                <h4>{{ item.entry }}</h4>
                <div class="todo-card__meta">
                  <span class="tag">{{ item.type }}</span>
                  <span class="tag user">{{ item.user_display || item.user }}</span>
                </div>
                <time class="todo-card__date">{{ item.start_date }}</time>
              </div>
              <div v-if="isAdmin" class="todo-card__actions">
                <button class="btn-action edit" @click="openEditModal(item)">修改</button>
                <button :disabled="saving" class="btn-action done" @click="handleDone(item)">完成</button>
                <button :disabled="saving" class="btn-action del" @click="handleDelete(item)">删除</button>
              </div>
            </div>
          </div>

          <p v-if="doneError" role="alert">已完成心愿暂时未能加载 <button class="btn-cancel" @click="fetchDoneList">重试</button></p>
          <!-- 已完成列表 -->
          <div v-if="doneList.length > 0" class="done-area">
            <h4 class="done-title">已完成</h4>
            <div class="done-scroll">
              <div v-for="(item, idx) in doneList" :key="item.id || item.entry" class="done-item">
                <div class="done-item__row">
                <span class="done-item__entry">{{ item.entry }}</span>
                <span class="done-item__meta">
                  <span class="tag done-tag">{{ item.type }}</span>
                  <span class="tag done-tag-user">{{ item.user_display || item.user }}</span>
                  <span class="done-item__date">{{ item.end_date }}</span>
                </span>
                <button v-if="isAdmin" class="btn-sm" @click="editReflection(item)">{{ item.reflection ? '修改感想' : '写点感想' }}</button>
                <button v-if="isAdmin" class="btn-sm del" @click="handleDeleteDone(item)">删除</button>
                </div>
                <p v-if="item.reflection" class="done-item__reflection">{{ item.reflection }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================
      Section 3：爱的相册（3×3 九宫格 + 右下四格角滚动）
      ============================================================ -->
    <section class="album-section" id="album">
      <div class="container">
        <div class="section-header">
          <p class="section-eyebrow">Main Ceremony</p>
          <h2 class="section-title">爱的相册</h2>
          <div class="section-line"></div>
        </div>

        <PhotoAlbum :is-admin="isAdmin" />
      </div>
    </section>

    <!-- ============================================================
      Section 4：纪念日计时器
      ============================================================ -->
    <section class="date-section" id="date">
      <img loading="lazy" decoding="async" class="date-bg" src="/optimized/background/2.webp" alt="" />
      <div class="date-overlay"></div>
      <div class="date-content">
        <p class="date-eyebrow">Waiting for Wedding</p>
        <h2 class="date-title">Save the date</h2>
        <div class="countdown">
          <div class="countdown__item">
            <span class="countdown__num">{{ elapsedTime.days }}</span>
            <span class="countdown__label">天</span>
          </div>
          <div class="countdown__sep">:</div>
          <div class="countdown__item">
            <span class="countdown__num">{{ elapsedTime.hours }}</span>
            <span class="countdown__label">时</span>
          </div>
          <div class="countdown__sep">:</div>
          <div class="countdown__item">
            <span class="countdown__num">{{ elapsedTime.minutes }}</span>
            <span class="countdown__label">分</span>
          </div>
          <div class="countdown__sep">:</div>
          <div class="countdown__item">
            <span class="countdown__num">{{ elapsedTime.seconds }}</span>
            <span class="countdown__label">秒</span>
          </div>
        </div>
        <p class="date-since">自 2021年6月24日 起</p>
        <div class="date-heart">
          <span class="banner-heart" style="color: #e53e3e;">❤</span>
          <h2 class="banner-quote">有你，我的旅程便不会中止</h2>
        </div>
      </div>
    </section>

    <!-- ============================================================
      页脚
      ============================================================ -->
    <footer class="page-footer">
      <p>© 2021 qiqi &amp; nini Co., Ltd. 💕</p>
    </footer>

    <!-- ============================================================
      增加待办弹窗
      ============================================================ -->
    <AppDialog v-model="showAddModal" title="新增心愿" :busy="saving">
      <div class="modal-card glass-card">
        <div class="modal-card__head">
          <h4>新增心愿</h4>
          <button class="modal-close" aria-label="关闭" :disabled="saving" @click="showAddModal = false">✕</button>
        </div>
        <div class="modal-card__body">
          <label>名称</label>
          <input v-model="addForm.entry" aria-label="名称" :disabled="saving" type="text" placeholder="想一起做的事..." />
          <label>类型</label>
          <WishTypeSelect v-model="addForm.type" :disabled="saving" />
          <label>贡献人</label>
          <OwnerSelect v-model="addForm.user" :disabled="saving" default-current />
        </div>
        <div class="modal-card__foot">
          <button :disabled="saving" class="btn-rose" @click="handleAdd">确定</button>
          <button class="btn-cancel" :disabled="saving" @click="showAddModal = false">取消</button>
        </div>
      </div>
    </AppDialog>

    <!-- ============================================================
      修改心愿弹窗
      ============================================================ -->
    <AppDialog v-model="showEditModal" title="修改心愿" :busy="saving">
      <div class="modal-card glass-card">
        <div class="modal-card__head">
          <h4>修改心愿</h4>
          <button class="modal-close" aria-label="关闭" :disabled="saving" @click="showEditModal = false">✕</button>
        </div>
        <div class="modal-card__body">
          <label>名称</label>
          <input v-model="editForm.entry" aria-label="名称" :disabled="saving" type="text" />
          <label>类型</label>
          <WishTypeSelect v-model="editForm.type" :disabled="saving" />
          <label>贡献人</label>
          <OwnerSelect v-model="editForm.user" :disabled="saving" />
          <label>起始日</label>
          <input :value="editForm.start_date" aria-label="创建时间" readonly type="text" />
        </div>
        <div class="modal-card__foot">
          <button :disabled="saving" class="btn-rose" @click="handleEdit">确定</button>
          <button class="btn-cancel" :disabled="saving" @click="showEditModal = false">取消</button>
        </div>
      </div>
    </AppDialog>

  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '../utils/request'
import AppDialog from '../components/shared/AppDialog.vue'
import PhotoAlbum from '../features/album/PhotoAlbum.vue'
import BlessingCarousel from '../features/blessings/BlessingCarousel.vue'
import LoveStory from '../features/story/LoveStory.vue'
import SiteNavigation from '../components/shared/SiteNavigation.vue'
import { canVisitPage } from '../features/auth/pageAccess'
import { usePetals } from '../composables/usePetals'
import { ElMessage } from 'element-plus'
import { useTodos } from '../features/todos/useTodos'
import TodoReflectionDialog from '../features/todos/TodoReflectionDialog.vue'
import WishTypeSelect from '../features/todos/WishTypeSelect.vue'
import OwnerSelect from '../features/todos/OwnerSelect.vue'

// ── 导航 ──────────────────────────────────────────────────
const scrollTop = ref(0)
function onScroll() { scrollTop.value = window.scrollY }
function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

// ── 花瓣动画 ──────────────────────────────────────────────
const petalCanvas = ref(null)
usePetals(petalCanvas)

// ── 管理员 ────────────────────────────────────────────────
let disposed = false
const saving = ref(false)
const isAdmin = ref(false)
const hasMailbox = ref(false)
function clearAuth() { isAdmin.value = false; hasMailbox.value = false; currentUsername.value = ''; showAddModal.value = false; showEditModal.value = false }
const currentUsername = ref('')

async function fetchUserInfo() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    const res = await axios.get('/me', { headers: { Authorization: `Bearer ${token}` } })
    isAdmin.value = res.data.is_admin
    hasMailbox.value = res.data.has_mailbox === true
    currentUsername.value = res.data.display_name || res.data.username || ''
  } catch (e) { /* ignore */ }
}

// ── 祝福寄语弹窗 ──────────────────────────────────────────
const showBlessingModal = ref(false)
const route = useRoute()
const router = useRouter()
watch(() => route.query.compose, value => {
  if (value !== 'blessing') return
  showBlessingModal.value = true
  const query = { ...route.query }; delete query.compose
  void router.replace({ path: route.path, query, hash: route.hash })
}, { immediate: true })
const blessingText = ref('')
let blessingRequestKey = '', submittedBlessing = ''

function tryShowBlessing() {
  if (localStorage.getItem('need_blessing') === '1') {
    showBlessingModal.value = true
  }
}

async function submitBlessing() {
  if (saving.value) return
  if (!blessingText.value.trim()) return
  saving.value = true
  try {
    const fd = new FormData()
    if (!blessingRequestKey || submittedBlessing !== blessingText.value.trim()) {
      blessingRequestKey = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); submittedBlessing = blessingText.value.trim()
    }
    fd.append('content', submittedBlessing)
    fd.append('request_key', blessingRequestKey)
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const { data } = await axios.post('/blessings', fd, { headers })
    blessingRequestKey = ''; submittedBlessing = ''
    localStorage.removeItem('need_blessing')
    showBlessingModal.value = false
    const feedback = {
      granted: '祝福送到啦，猫条已放进你的口袋。',
      confirmed: '这条祝福已送到，猫条也已经到账啦。',
      confirmed_without_reward: '这条祝福已经送到啦。',
      already_claimed: '祝福收到啦，今天的猫条已经领过了。',
    }
    ElMessage.success(feedback[data.reward_status] || (data.replayed ? '这条祝福已经送到啦。' : data.treat_reward === 1 ? feedback.granted : '祝福已收到！💕'))
    blessingText.value = ''
    await fetchBlessings()
  } catch (e) { ElMessage.error('送出失败，请稍后重试') } finally { saving.value = false }

}

function skipBlessing() {
  localStorage.removeItem('need_blessing')
  showBlessingModal.value = false
}

// ── 祝福字幕 ──────────────────────────────────────────────
const allBlessings = ref([])
const blessingLoading = ref(true)
const blessingError = ref(false)

async function fetchBlessings() {
  blessingLoading.value = true; blessingError.value = false
  try {
    const res = await axios.get('/blessings')
    allBlessings.value = res.data.data || []
  } catch { blessingError.value = true }
  finally { blessingLoading.value = false }
}

// ── 纪念日计时器 ──────────────────────────────────────────
const TOGETHER_DATE = new Date('2021-06-24T22:24:00+08:00')
const elapsedTime = reactive({ days: '0', hours: '00', minutes: '00', seconds: '00' })
function updateClock() {
  const diff = Math.floor((Date.now() - TOGETHER_DATE) / 1000)
  elapsedTime.days    = String(Math.floor(diff / 86400))
  elapsedTime.hours   = String(Math.floor((diff % 86400) / 3600)).padStart(2, '0')
  elapsedTime.minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
  elapsedTime.seconds = String(diff % 60).padStart(2, '0')
}
let clockTimer = null

const { reflectionItem, completingReflection, editReflection, reflectionSaved, todoLoading, todoError, doneError, todoList, doneList, showAddModal, showEditModal, addForm, editForm, fetchTodoList, fetchDoneList, handleAdd, openEditModal, handleEdit, handleDelete, handleDone, handleDeleteDone } = useTodos(saving)

function refreshNames() { void Promise.allSettled([fetchUserInfo(), fetchBlessings(), fetchTodoList(), fetchDoneList()]) }

// ── 生命周期 ──────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('auth-expired', clearAuth)
  window.addEventListener('profile-updated', refreshNames)
  updateClock(); clockTimer = setInterval(updateClock, 1000)
  await Promise.allSettled([fetchTodoList(), fetchDoneList(), fetchUserInfo(), fetchBlessings()])
  if (disposed) return
  // 首次登录弹出祝福框
  tryShowBlessing()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (clockTimer) clearInterval(clockTimer)
  disposed = true
  window.removeEventListener('auth-expired', clearAuth)
  window.removeEventListener('profile-updated', refreshNames)
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   主页全部样式
   ═══════════════════════════════════════════════════════════ */

/* ── Hero ───────────────────────────────────────────────── */
.hero {
  position: relative; height: 100vh; min-height: 600px;
  display: flex; flex-direction: column; overflow: hidden;
}
.hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(30,15,18,0.35) 0%, rgba(60,30,35,0.5) 100%);
  z-index: 1; width: 100%; height: 100%;
}
.petal-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }

.hero-content { position: relative; z-index: 3; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 24px 120px; text-align: center; }
.hero-eyebrow { color: #f5ddd9; font-size: 10px; letter-spacing: .38em; margin-bottom: 20px; }
.hero-title { font-family: 'Great Vibes', 'Segoe Script', cursive; font-size: clamp(76px, 11vw, 148px); line-height: 1.2; color: #fff7f1; font-weight: 400; letter-spacing: 0; text-shadow: 0 3px 24px rgba(30,10,18,.3); margin-bottom: 28px; }
.hero-names { display: flex; align-items: center; gap: 24px; }
.hero-names::before, .hero-names::after { content: ''; width: clamp(24px, 5vw, 64px); height: 1px; background: rgba(255,235,225,.5); }
.name-item { font-family: var(--font-display); font-size: clamp(22px, 3vw, 32px); font-style: italic; color: #fff0e8; letter-spacing: 3px; }
.name-divider { color: #edb4bd; animation: pulse 2s ease-in-out infinite; }
.heart-svg { width: 18px; height: 18px; }
.scroll-hint { position: absolute; bottom: 40px; display: flex; flex-direction: column; align-items: center; gap: 4px; color: rgba(255,255,255,0.6); font-size: 12px; letter-spacing: 2px; cursor: pointer; animation: float 3s ease-in-out infinite; }
.scroll-hint:hover { opacity: 1; }

/* ── 头像摇脑袋 ─────────────────────────────────────────── */
.header-avatars {
  display: flex; align-items: center; justify-content: center; gap: 20px;
}
.header-text { text-align: center; }
.avatar {
  width: 56px; height: 56px; border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 12px rgba(180,130,140,0.25);
  animation: head-wobble 2.5s ease-in-out infinite;
}
.avatar-left  { animation-delay: 0s; }
.avatar-right { animation-delay: 0.4s; }
@keyframes head-wobble {
  0%, 100% { transform: rotate(0deg); }
  15%      { transform: rotate(-12deg); }
  30%      { transform: rotate(10deg); }
  45%      { transform: rotate(-8deg); }
  60%      { transform: rotate(6deg); }
  75%      { transform: rotate(-4deg); }
  90%      { transform: rotate(2deg); }
}

/* ── 故事 (TODO) Section ────────────────────────────────── */
.story-section { padding: 100px 0; background: linear-gradient(180deg, #fff 0%, var(--color-cream) 100%); }
.container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.section-header { text-align: center; margin-bottom: 56px; }
.section-eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: 3px; color: var(--color-text-light); margin-bottom: 8px; }
.section-title { font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px); color: var(--color-text); font-weight: 400; margin-bottom: 16px; }
.section-line { width: 60px; height: 2px; background: linear-gradient(90deg, var(--color-rose-light), var(--color-rose)); margin: 0 auto; border-radius: 1px; }

.todo-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.todo-header h3 { font-family: var(--font-script); font-size: clamp(34px, 4vw, 46px); font-weight: 400; line-height: 1.3; color: var(--color-rose-dark); }
.btn-add { padding: 10px 24px; background: linear-gradient(135deg, var(--color-rose), var(--color-rose-dark)); color: #fff; border-radius: var(--radius-full); font-size: 14px; letter-spacing: 1px; box-shadow: var(--shadow-button); transition: all var(--transition-smooth); }
.btn-add:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(212,120,143,0.4); }
.todo-empty { text-align: center; padding: 60px 0; color: var(--color-text-light); }
.todo-empty .sub { font-size: 13px; margin-top: 8px; opacity: 0.7; }

.todo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.todo-card { background: #fff; border-radius: var(--radius-md); padding: 20px 24px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; transition: all var(--transition-smooth); border: 1px solid rgba(0,0,0,0.04); }
.todo-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.todo-card__body h4 { font-size: 17px; color: var(--color-text); margin-bottom: 10px; }
.todo-card__meta { display: flex; gap: 8px; margin-bottom: 8px; }
.tag { font-size: 11px; padding: 2px 10px; background: var(--color-rose-soft); color: var(--color-rose); border-radius: var(--radius-full); }
.tag.user { background: var(--color-gold-light); color: var(--color-gold); }
.todo-card__date { font-size: 12px; color: var(--color-text-light); display: block; }
.todo-card__actions { display: flex; gap: 8px; margin-top: 14px; margin: 0 -4px; padding-top: 14px; border-top: 1px solid #f5f0f1; }
.btn-action { flex: 1; padding: 7px 0; border-radius: var(--radius-sm); font-size: 13px; background: #f8f5f6; color: var(--color-text-light); transition: all var(--transition-fast); margin: 0 4px;}
.btn-action:hover { background: #efe9eb; }
.btn-action.done { background: var(--color-rose-soft); color: var(--color-rose); }
.btn-action.done:hover { background: var(--color-rose-light); }
.btn-action.del { background: #fef0f0; color: #d47878; }
.btn-action.del:hover { background: #fde0e0; }
.btn-action.edit:hover { color: var(--color-rose); }

/* ── 已完成列表 ─────────────────────────────────────────── */
.done-area { margin-top: 40px; }
.done-title { font-family: var(--font-display); font-size: 18px; color: var(--color-text-light); margin-bottom: 12px; }
.done-scroll {
  max-height: 220px; overflow-y: auto;
  border: 1px solid #f0e8ea; border-radius: var(--radius-md);
  background: #fdfbfc;
}
.done-item {
  display: block;
  padding: 10px 16px; border-bottom: 1px solid #f5f0f1;
  font-size: 14px; color: var(--color-text-light);
}
.done-item:last-child { border-bottom: none; }
.done-item__entry { flex: 1; color: var(--color-text); text-decoration: line-through; }
.done-item__meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.done-item__date { font-size: 12px; color: var(--color-text-light); }
.tag.done-tag { background: #f0e8ea; color: #b0a0a5; }
.tag.done-tag-user { background: #f5f0e8; color: #b0a590; font-size: 11px; padding: 2px 10px; border-radius: var(--radius-full); }

/* ── 纪念日 ─────────────────────────────────────────────── */
.date-section { position: relative; padding: 140px 0; display: flex; align-items: center; justify-content: center; min-height: 500px; }
.date-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.date-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(40,20,25,0.6) 0%, rgba(30,15,20,0.7) 100%); z-index: 1; width: 100%; height: 100%;}
.date-content { position: relative; z-index: 2; text-align: center; }
.date-eyebrow { font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.7); margin-bottom: 12px; }
.date-title { font-family: var(--font-display); font-size: clamp(28px, 5vw, 48px); color: #fff; font-weight: 400; margin-bottom: 36px; }
.countdown { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
.countdown__item { background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.18); border-radius: var(--radius-md); padding: 16px 20px; min-width: 90px; }
.countdown__num { display: block; font-size: clamp(28px, 4vw, 48px); font-family: var(--font-display); color: #fff; line-height: 1.1; }
.countdown__label { font-size: 12px; color: rgba(255,255,255,0.6); letter-spacing: 1px; }
.countdown__sep { font-size: 32px; color: rgba(255,255,255,0.5); font-family: var(--font-display); }
.date-since { margin-top: 24px; font-size: 13px; color: rgba(255,255,255,0.5); letter-spacing: 1px; }

/* ── 相册 3×3 九宫格 ──────────────────────────────────── */
.album-section { padding: 100px 0; background: #fff; }
/* ── 横幅 ───────────────────────────────────────────────── */
.banner-section { position: relative; padding: 160px 0; display: flex; align-items: center; justify-content: center; min-height: 400px; }
.banner-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.banner-overlay { position: absolute; inset: 0; background: rgba(40,18,22,0.55); z-index: 1; width: 100%; height: 100%;}
.banner-content { position: relative; z-index: 2; text-align: center; }
.banner-heart { font-size: 40px; display: block; margin-bottom: 16px; }
.banner-quote { font-family: var(--font-display); font-size: clamp(22px, 3.2vw, 36px); color: #fff2e8; font-weight: 400; letter-spacing: .12em; line-height: 1.9; text-shadow: 0 2px 16px rgba(30,10,18,.35); max-width: 90vw; margin: 0 auto; padding: 0 12px; text-wrap: balance; }

/* ── 页脚 ───────────────────────────────────────────────── */
.page-footer { padding: 40px 0; text-align: center; background: var(--color-cream); font-size: 13px; color: var(--color-text-light); }

/* ── 音乐播放器 ─────────────────────────────────────────── */
/* ── 祝福弹窗 ───────────────────────────────────────────── */
.blessing-modal { max-width: 460px; }
.blessing-hint { font-size: 14px; color: var(--color-text-light); margin-bottom: 16px; text-align: center; line-height: 1.7; }
.blessing-modal textarea {
  width: 100%; padding: 14px; border: 1.5px solid #e8dde0; border-radius: var(--radius-md); font-size: 15px; color: var(--color-text); outline: none; resize: vertical; font-family: var(--font-body); line-height: 1.7; transition: border-color var(--transition-fast);
}
.blessing-modal textarea:focus { border-color: var(--color-rose); }
.char-count { display: block; text-align: right; font-size: 12px; color: var(--color-text-light); margin-top: 4px; }

/* ── 弹窗通用 ────────────────────────────────────────────── */
.modal-card {
  width: 100%;
  max-width: none;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
  overflow: hidden;
  transform: none;
  contain: layout paint;
}
.modal-card__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid #f0e8ea; }
.modal-card__head h4 { font-size: 17px; color: var(--color-text); }
.modal-close { background: none; font-size: 18px; color: var(--color-text-light); padding: 4px 8px; border-radius: var(--radius-sm); }
.modal-close:hover { background: #f5f0f1; }
.modal-card__body { padding: 24px; }
.modal-card__body label { display: block; font-size: 13px; color: var(--color-text-light); margin-bottom: 6px; margin-top: 12px; }
.modal-card__body label:first-child { margin-top: 0; }
.modal-card__body input { width: 100%; padding: 10px 12px; border: 1.5px solid #e8dde0; border-radius: var(--radius-sm); font-size: 14px; color: var(--color-text); outline: none; transition: border-color var(--transition-fast); font-family: var(--font-body); }
.modal-card__body input:focus { border-color: var(--color-rose); }
.modal-card__foot { display: flex; gap: 12px; padding: 16px 24px; border-top: 1px solid #f0e8ea; justify-content: flex-end; }
.btn-cancel { padding: 10px 24px; border-radius: var(--radius-full); font-size: 14px; background: #f5f2f3; color: var(--color-text-light); transition: background var(--transition-fast); }
.btn-cancel:hover { background: #ebe5e7; }
.btn-rose { padding: 10px 28px; border-radius: var(--radius-full); font-size: 14px; letter-spacing: 1px; background: linear-gradient(135deg, var(--color-rose), var(--color-rose-dark)); color: #fff; box-shadow: var(--shadow-button); transition: all var(--transition-smooth); }
.btn-rose:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(212,120,143,0.4); }
.btn-rose:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .countdown { gap: 6px; }
  .countdown__item { min-width: 68px; padding: 12px 14px; }
  .todo-grid { grid-template-columns: 1fr; }
  .story-section, .album-section { padding: 64px 0; }
  .date-section { padding: 100px 0; }
  .avatar { width: 42px; height: 42px; }
  .header-avatars { gap: 12px; }
}

@media (max-width: 480px) {
  .hero-title { font-size: clamp(70px, 20vw, 96px); }
  .hero-names { gap: 14px; }
  .hero-eyebrow { letter-spacing: .25em; }
}
</style>

<style scoped>
.hero { height: 100svh; min-height: 540px; }
.hero-title, .section-title-script, .date-title { font-family: var(--font-script); }
.section-title-script { font-size: clamp(40px, 5vw, 58px); line-height: 1.3; }
.date-title { font-size: clamp(46px, 6vw, 72px); line-height: 1.3; }
.hero-days { font-family: var(--font-literary); }
.blessing-action { text-align: center; margin: -24px 0 16px; }
.hero-days { margin-top: 24px; color: rgba(255,255,255,0.9); letter-spacing: 2px; font-size: 14px; }
.hero-actions { display: flex; gap: 12px; margin-top: 24px; }
.hero-actions button, .hero-actions a { padding: 11px 22px; border: 1px solid rgba(255,255,255,.5); border-radius: 30px; color: #fff; background: rgba(255,255,255,.12); font-size: 14px; }
.hero-actions button { background: rgba(255,255,255,.92); color: var(--color-rose-dark); }
.scroll-hint { background: none; }
.avatar { animation-iteration-count: 2; }
.modal-card__body input, .blessing-modal textarea { font-size: 16px; }
@media (max-width: 768px) {
  .countdown { gap: 4px; }
  .countdown__item { min-width: 0; padding: 10px 8px; }
  .countdown__num { font-size: clamp(24px, 7vw, 40px); }
  .done-item__row { flex-wrap: wrap; gap: 8px; }
  .done-item__meta { flex-wrap: wrap; }
}
</style>

<style scoped>
.done-item__row { display: flex; align-items: center; gap: 12px; }
.done-item__entry { min-width: 0; overflow-wrap: anywhere; }
.done-item__reflection { margin-top: 8px; color: var(--color-text-light); font-size: 14px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; text-decoration: none; }
.done-item .btn-sm { padding: 6px 10px; border-radius: 10px; background: var(--color-rose-soft); color: var(--color-rose-dark); font-size: 12px; white-space: nowrap; }
</style>

<template>
  <!-- 页面加载动画 -->
  <div v-if="isLoading" class="page-loader">
    <div class="loader-heart">💕</div>
    <p>正在加载我们的故事...</p>
  </div>

  <!-- 祝福弹窗 — 在 loading 层之外，确保首次登录即可见 -->
  <div v-if="showBlessingModal" class="modal-mask">
    <div class="modal-card glass-card blessing-modal">
      <div class="modal-card__head">
        <h4>💌 留下你的祝福</h4>
      </div>
      <div class="modal-card__body">
        <p class="blessing-hint">欢迎来到 qiqi &amp; nini 的小世界，请留下一句祝福寄语吧 ✨</p>
        <textarea v-model="blessingText" placeholder="写下你对我们的祝福..." rows="4" maxlength="300"></textarea>
        <span class="char-count">{{ blessingText.length }}/300</span>
      </div>
      <div class="modal-card__foot">
        <button class="btn-cancel" @click="skipBlessing">稍后再说</button>
        <button class="btn-rose" :disabled="!blessingText.trim()" @click="submitBlessing">送出祝福</button>
      </div>
    </div>
  </div>

  <div v-show="!isLoading" class="page-wrapper">

    <!-- ============================================================
      Section 1：Hero 首页
      ============================================================ -->
    <section class="hero" id="home">
      <img class="hero-bg" src="/background/bg-flower.jpg" alt="" />
      <div class="hero-overlay"></div>
      <canvas ref="petalCanvas" class="petal-canvas"></canvas>

      <header class="nav-bar" :class="{ scrolled: scrollTop > 300 }">
        <a class="nav-logo" href="#home" @click.prevent="scrollTo('home')">LOVE</a>
        <nav class="nav-links">
          <a href="#home" @click.prevent="scrollTo('home')">爱的首页</a>
          <a href="#story" @click.prevent="scrollTo('story')">爱的故事</a>
          <a href="#album" @click.prevent="scrollTo('album')">爱的相册</a>
          <router-link v-if="isAdmin" to="/admin" class="admin-nav-link">管理</router-link>
        </nav>
        <button class="nav-toggle" @click="mobileNavOpen = !mobileNavOpen">
          <span></span><span></span><span></span>
        </button>
      </header>
      <div v-if="mobileNavOpen" class="mobile-menu glass-card">
        <a href="#home" @click.prevent="scrollTo('home'); mobileNavOpen = false">爱的首页</a>
        <a href="#story" @click.prevent="scrollTo('story'); mobileNavOpen = false">爱的故事</a>
        <a href="#album" @click.prevent="scrollTo('album'); mobileNavOpen = false">爱的相册</a>
        <router-link v-if="isAdmin" to="/admin" @click="mobileNavOpen = false" class="admin-mobile-link">管理后台</router-link>
      </div>

      <div class="hero-content">
        <h1 class="hero-title animate-fade-in-up">i love you</h1>
        <div class="hero-names animate-fade-in-up" style="animation-delay: 0.3s">
          <span class="name-item">qiqi</span>
          <span class="name-divider">
            <svg viewBox="0 0 24 24" class="heart-svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>
          </span>
          <span class="name-item">nini</span>
        </div>
        <div class="scroll-hint" @click="scrollTo('story')">
          <span>向下探索</span>
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/></svg>
        </div>
      </div>
    </section>

    <!-- ============================================================
      Section 2：爱的故事（Things To Do）
      ============================================================ -->
    <section class="story-section" id="story">
      <div class="container">
        <div class="section-header">
          <div class="header-avatars">
            <img src="/img/qiqi.png" alt="qiqi" class="avatar avatar-left" />
            <div class="header-text">
              <p class="section-eyebrow">The Story of our love</p>
              <h2 class="section-title">Our Love Story</h2>
              <div class="section-line"></div>
            </div>
            <img src="/img/nini.png" alt="nini" class="avatar avatar-right" />
          </div>
        </div>

        <!-- 祝福寄语字幕 -->
        <div class="blessing-lyrics" @click="showBlessingModal = true" title="点击留下祝福">
          <div class="blessing-lyrics__inner">
            <div class="lyric-spacer"></div>
            <div
              v-for="(b, idx) in allBlessings"
              :key="idx"
              class="lyric-line"
            >
              <span class="lyric-content">「{{ b.content }}」</span>
              <span class="lyric-author">—— {{ b.author }}</span>
            </div>
            <div v-if="allBlessings.length === 0" class="lyric-line empty">
              <span class="lyric-content">还没有祝福，来做第一个留言的人吧 💌</span>
            </div>
            <div class="lyric-spacer"></div>
          </div>
        </div>

        <div class="story-image">
          <img src="/background/1.jpeg" alt="Our story" />
          <div class="story-image__text">
            <p class="story-image__title">这就是我们的爱情故事</p>
            <p>我们的故事，始于豫章，一见倾心。<br/>相伴奔赴金陵、钱塘，在朝夕相处里，慢慢读懂彼此。</p>
            <p>我们一起勇敢走向更大的世界：<br/>从江苏周边启程，一路远行；<br/>在锦城，享受过慢悠悠的烟火时光；<br/>在长安，看过千年沉默的兵马俑；<br/>在滨城，漫步过温柔的海边沙滩；<br/>在盛京，吹过凛冽的晚风。</p>
            <p>一路走过，<br/>三餐烟火，身边有你；<br/>万里山河，眼里有你。<br/>往后的每一段路，都想和你一起走下去。</p>
          </div>
        </div>

        <!-- 待办卡片 -->
        <div class="todo-area">
          <div class="todo-header">
            <h3>Things To Do</h3>
            <button v-if="isAdmin" class="btn-add" @click="showAddModal = true">+ 新增</button>
          </div>

          <div v-if="todoList.length === 0" class="todo-empty">
            <p>还没有待办事项</p>
            <p class="sub">等着管理员来添加一起想做的事</p>
          </div>

          <div class="todo-grid">
            <div v-for="(item, idx) in todoList" :key="idx" class="todo-card">
              <div class="todo-card__body">
                <h4>{{ item.entry }}</h4>
                <div class="todo-card__meta">
                  <span class="tag">{{ item.type }}</span>
                  <span class="tag user">{{ item.user }}</span>
                </div>
                <time class="todo-card__date">{{ item.start_date }}</time>
              </div>
              <div v-if="isAdmin" class="todo-card__actions">
                <button class="btn-action edit" @click="openEditModal(item)">修改</button>
                <button class="btn-action done" @click="handleDone(item)">完成</button>
                <button class="btn-action del" @click="handleDelete(item)">删除</button>
              </div>
            </div>
          </div>

          <!-- 已完成列表 -->
          <div v-if="doneList.length > 0" class="done-area">
            <h4 class="done-title">已完成</h4>
            <div class="done-scroll">
              <div v-for="(item, idx) in doneList" :key="'d'+idx" class="done-item">
                <span class="done-item__entry">{{ item.entry }}</span>
                <span class="done-item__meta">
                  <span class="tag done-tag">{{ item.type }}</span>
                  <span class="tag done-tag-user">{{ item.user }}</span>
                  <span class="done-item__date">{{ item.end_date }}</span>
                </span>
                <button v-if="isAdmin" class="btn-sm del" @click="handleDeleteDone(item)">删除</button>
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

        <div class="album-grid-9">
          <!-- Row1-2 Col1: 大图合并 -->
          <div class="album-item grid-tall" @click="previewImage(0)">
            <img :src="gridPhotos[0]" alt="Photo 1" loading="lazy" />
            <div class="album-item__overlay"><span class="album-item__icon">🔍</span></div>
          </div>
          <!-- Row1 Col2 -->
          <div class="album-item" @click="previewImage(1)">
            <img :src="gridPhotos[1]" alt="Photo 2" loading="lazy" />
            <div class="album-item__overlay"><span class="album-item__icon">🔍</span></div>
          </div>
          <!-- Row1 Col3 -->
          <div class="album-item" @click="previewImage(2)">
            <img :src="gridPhotos[2]" alt="Photo 3" loading="lazy" />
            <div class="album-item__overlay"><span class="album-item__icon">🔍</span></div>
          </div>
          <!-- Row2 Col2 -->
          <div class="album-item" @click="previewImage(3)">
            <img :src="gridPhotos[3]" alt="Photo 4" loading="lazy" />
            <div class="album-item__overlay"><span class="album-item__icon">🔍</span></div>
          </div>
          <!-- Row2 Col3 -->
          <div class="album-item" @click="previewImage(4)">
            <img :src="gridPhotos[4]" alt="Photo 5" loading="lazy" />
            <div class="album-item__overlay"><span class="album-item__icon">🔍</span></div>
          </div>
          <!-- Row3 Col1 -->
          <div class="album-item" @click="previewImage(5)">
            <img :src="gridPhotos[5]" alt="Photo 6" loading="lazy" />
            <div class="album-item__overlay"><span class="album-item__icon">🔍</span></div>
          </div>
          <!-- Row3 Col2 -->
          <div class="album-item" @click="previewImage(6)">
            <img :src="gridPhotos[6]" alt="Photo 7" loading="lazy" />
            <div class="album-item__overlay"><span class="album-item__icon">🔍</span></div>
          </div>
          <!-- Row3 Col3: 右下四格角滚动 -->
          <div class="album-item album-corner grid-corner">
            <div class="corner-grid">
              <div v-for="slot in 4" :key="'s' + slot" class="corner-slot">
                <img :src="cornerSlotImage(slot)" :class="{ fading: cornerFading[slot - 1] }" class="corner-img" alt="" />
              </div>
              <div class="corner-overlay" @click="previewCorner()">
                <span>+{{ cornerPhotos.length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <el-image-viewer
        v-if="previewVisible"
        :url-list="photoUrls"
        :initial-index="previewIndex"
        :hide-on-click-modal="true"
        @close="previewVisible = false"
      />
    </section>

    <!-- ============================================================
      Section 4：纪念日计时器
      ============================================================ -->
    <section class="date-section" id="date">
      <img class="date-bg" src="/background/2.jpg" alt="" />
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
      音乐播放器
      ============================================================ -->
    <div class="music-player">
      <audio ref="audioRef" autoplay loop preload="auto">
        <source src="/audio/City_Of_Stars.mp3" type="audio/mpeg" />
      </audio>
      <button class="music-btn" :class="{ playing: isPlaying }" @click="togglePlay" title="播放/暂停音乐">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
      </button>
    </div>

    <!-- ============================================================
      增加待办弹窗
      ============================================================ -->
    <div v-if="showAddModal" class="modal-mask" @click.self="showAddModal = false">
      <div class="modal-card glass-card">
        <div class="modal-card__head">
          <h4>新增待办</h4>
          <button class="modal-close" @click="showAddModal = false">✕</button>
        </div>
        <div class="modal-card__body">
          <label>名称</label>
          <input v-model="addForm.entry" type="text" placeholder="想一起做的事..." />
          <label>类型</label>
          <input v-model="addForm.type" type="text" placeholder="旅行/美食/电影..." />
          <label>贡献人</label>
          <input v-model="addForm.user" type="text" placeholder="谁发起的?" />
        </div>
        <div class="modal-card__foot">
          <button class="btn-rose" @click="handleAdd">确定</button>
          <button class="btn-cancel" @click="showAddModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- ============================================================
      修改待办弹窗
      ============================================================ -->
    <div v-if="showEditModal" class="modal-mask" @click.self="showEditModal = false">
      <div class="modal-card glass-card">
        <div class="modal-card__head">
          <h4>修改待办</h4>
          <button class="modal-close" @click="showEditModal = false">✕</button>
        </div>
        <div class="modal-card__body">
          <label>名称</label>
          <input v-model="editForm.entry" type="text" />
          <label>类型</label>
          <input v-model="editForm.type" type="text" />
          <label>贡献人</label>
          <input v-model="editForm.user" type="text" />
          <label>起始日</label>
          <input v-model="editForm.start_date" type="text" />
        </div>
        <div class="modal-card__foot">
          <button class="btn-rose" @click="handleEdit">确定</button>
          <button class="btn-cancel" @click="showEditModal = false">取消</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox, ElImageViewer } from 'element-plus'

// ── 加载 ──────────────────────────────────────────────────
const isLoading = ref(true)
onMounted(() => { setTimeout(() => { isLoading.value = false }, 500) })

// ── 导航 ──────────────────────────────────────────────────
const scrollTop = ref(0)
const mobileNavOpen = ref(false)
function onScroll() { scrollTop.value = window.scrollY }
function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
  mobileNavOpen.value = false
}

// ── 花瓣动画 ──────────────────────────────────────────────
const petalCanvas = ref(null)
let petalTimer = null
function startPetals() {
  if (!petalCanvas.value) return
  const canvas = petalCanvas.value
  const ctx = canvas.getContext('2d')
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
  resize()
  window.addEventListener('resize', resize)

  const petals = Array.from({ length: 30 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 4 + Math.random() * 10,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0.5 + Math.random() * 1.8,
    swing: Math.random() * Math.PI * 2,
    swingSpeed: 0.01 + Math.random() * 0.02,
    opacity: 0.18 + Math.random() * 0.35,
  }))

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    petals.forEach(p => {
      p.y += p.vy
      p.swing += p.swingSpeed
      p.x += p.vx + Math.sin(p.swing) * 0.5
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width }
      if (p.x > canvas.width + 20) p.x = -20
      if (p.x < -20) p.x = canvas.width + 20
      ctx.fillStyle = `rgba(240, 185, 195, ${p.opacity})`
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, p.swing * 0.3, 0, Math.PI * 2)
      ctx.fill()
    })
    petalTimer = requestAnimationFrame(draw)
  }
  petalTimer = requestAnimationFrame(draw)
}

// ── 管理员 ────────────────────────────────────────────────
const isAdmin = ref(false)
const currentUsername = ref('')

async function fetchUserInfo() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    const res = await axios.get('/me', { headers: { Authorization: `Bearer ${token}` } })
    isAdmin.value = res.data.is_admin
    currentUsername.value = res.data.username || ''
  } catch (e) { /* ignore */ }
}

// ── 祝福寄语弹窗 ──────────────────────────────────────────
const showBlessingModal = ref(false)
const blessingText = ref('')

function tryShowBlessing() {
  if (localStorage.getItem('need_blessing') === '1') {
    showBlessingModal.value = true
  }
}

async function submitBlessing() {
  if (!blessingText.value.trim()) return
  try {
    const fd = new FormData()
    fd.append('content', blessingText.value.trim())
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    await axios.post('/blessings', fd, { headers })
    localStorage.removeItem('need_blessing')
    showBlessingModal.value = false
    ElMessage.success('祝福已收到！💕')
    await fetchBlessings()
  } catch (e) { ElMessage.error('送出失败，请稍后重试') }
}

function skipBlessing() {
  localStorage.removeItem('need_blessing')
  showBlessingModal.value = false
}

// ── 祝福字幕 ──────────────────────────────────────────────
const allBlessings = ref([])

async function fetchBlessings() {
  try {
    const res = await axios.get('/blessings')
    allBlessings.value = res.data.data || []
  } catch (e) { /* ignore */ }
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

// ── 相册（3×3 九宫格，7张图 + 右下四格角）───────────────
const gridPhotos = [
  '/album/IMG_DAZZ_ARG_20250505160350853.jpg',
  '/album/college (1).jpg',
  '/album/college (2).jpg',
  '/album/mmexport1738078414583.jpg',
  '/album/IMG_DAZZ_ARG_20250505160333542.jpg',
  '/album/IMG_20250719_150456.jpg',
  '/album/IMG_20250719_192034.jpg',
]
// 四格角滚动图片（循环切换）
const cornerPhotos = [
  '/album/IMG_20250719_155502.jpg',
  '/album/IMG_20250719_155404.jpg',
  '/album/IMG_20250806_222951.jpg',
  '/album/IMG_20250921_165512.jpg',
  '/album/IMG_DAZZ_ARG_20250505160345509.jpg',
  '/album/IMG_20250705_160216.jpg',
  '/album/IMG_20250129_104238.jpg',
]
const cornerActive = ref([0, 1, 2, 3])  // 每个 slot 当前显示的图片索引
const cornerFading = ref([false, false, false, false])
let cornerTimers = []
let cornerSwitchTimers = []

function cornerSlotImage(slot) {
  return cornerPhotos[cornerActive.value[slot - 1]]
}

function rotateCornerSlot(slotIdx) {
  // 1. 先淡出当前图片
  cornerFading.value[slotIdx] = true
  // 清除旧的切换定时器
  if (cornerSwitchTimers[slotIdx]) clearTimeout(cornerSwitchTimers[slotIdx])
  // 2. 1.5s 后切换图片并淡入
  cornerSwitchTimers[slotIdx] = setTimeout(() => {
    cornerActive.value[slotIdx] = (cornerActive.value[slotIdx] + 4) % cornerPhotos.length
    // 等 Vue 用新 src + opacity:0 渲染完再触发淡入
    nextTick(() => {
      cornerFading.value[slotIdx] = false
    })
  }, 1500)
}

function startCornerRotation() {
  // 四个格子各 6s 周期（淡入1.5s + 停留3s + 淡出1.5s），间隔1s错开
  [0, 1, 2, 3].forEach((_, i) => {
    const doCycle = () => {
      rotateCornerSlot(i)
      cornerTimers[i] = setTimeout(doCycle, 6000)
    }
    cornerTimers[i] = setTimeout(doCycle, i * 1000)
  })
}

const previewVisible = ref(false)
const previewIndex = ref(0)
const photoUrls = computed(() => [...gridPhotos, ...cornerPhotos])

function previewImage(idx) {
  previewIndex.value = idx
  previewVisible.value = true
}
function previewCorner() {
  previewIndex.value = gridPhotos.length
  previewVisible.value = true
}

// ── 音乐 ──────────────────────────────────────────────────
const audioRef = ref(null)
const isPlaying = ref(true)
function togglePlay() {
  if (!audioRef.value) return
  if (isPlaying.value) { audioRef.value.pause(); isPlaying.value = false }
  else { audioRef.value.play(); isPlaying.value = true }
}

// ── 待办列表 ──────────────────────────────────────────────
const todoList = ref([])
const doneList = ref([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const addForm = reactive({ entry: '', type: '', user: '' })
const editForm = reactive({ entry_old: '', entry: '', type: '', user: '', start_date: '' })

async function fetchTodoList() {
  try {
    const res = await axios.get('/table_data')
    todoList.value = res.data.data || []
  } catch (e) { console.error('获取待办失败:', e) }
}

async function fetchDoneList() {
  try {
    const res = await axios.get('/table_done_list')
    doneList.value = res.data.data || []
  } catch (e) { console.error('获取已完成列表失败:', e) }
}

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleAdd() {
  if (!addForm.entry) { ElMessage.warning('名称不能为空'); return }
  if (!addForm.type)  { ElMessage.warning('类型不能为空'); return }
  if (!addForm.user)  { ElMessage.warning('贡献人不能为空'); return }
  try {
    const fd = new FormData()
    fd.append('entry', addForm.entry)
    fd.append('type', addForm.type)
    fd.append('user', addForm.user)
    const res = await axios.post('/table_add', fd, { headers: getAuthHeaders() })
    if (res.data.data?.[0]?.entry === -1) { ElMessage.error('项目已存在'); return }
    todoList.value = res.data.data || []
    addForm.entry = ''; addForm.type = ''; addForm.user = ''
    showAddModal.value = false
    ElMessage.success('添加成功!')
  } catch (e) {
    if (e.response?.status === 403) ElMessage.error('仅管理员可操作')
    else ElMessage.error('添加失败')
  }
}

function openEditModal(item) {
  editForm.entry_old  = item.entry
  editForm.entry      = item.entry
  editForm.type       = item.type
  editForm.user       = item.user
  editForm.start_date = item.start_date
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.entry) { ElMessage.warning('名称不能为空'); return }
  try {
    const fd = new FormData()
    fd.append('entry_old', editForm.entry_old)
    fd.append('entry', editForm.entry)
    fd.append('type', editForm.type)
    fd.append('user', editForm.user)
    fd.append('start_date', editForm.start_date)
    const res = await axios.post('/table_change', fd, { headers: getAuthHeaders() })
    if (res.data.data?.[0]?.entry === -1) { ElMessage.error('项目名称已存在'); return }
    todoList.value = res.data.data || []
    showEditModal.value = false
    ElMessage.success('修改成功!')
  } catch (e) {
    if (e.response?.status === 403) ElMessage.error('仅管理员可操作')
    else ElMessage.error('修改失败')
  }
}

async function handleDelete(item) {
  try {
    await ElMessageBox.confirm(`确定删除「${item.entry}」吗？`, '删除确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    })
    const fd = new FormData(); fd.append('entry', item.entry)
    await axios.post('/table_delete', fd, { headers: getAuthHeaders() })
    todoList.value = todoList.value.filter(t => t.entry !== item.entry)
    ElMessage.success('删除成功!')
  } catch (e) {
    if (e.response?.status === 403) ElMessage.error('仅管理员可操作')
  }
}

async function handleDone(item) {
  try {
    await ElMessageBox.confirm(`确定完成「${item.entry}」吗？`, '完成确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'success',
    })
    const fd = new FormData(); fd.append('entry', item.entry)
    await axios.post('/table_done', fd, { headers: getAuthHeaders() })
    await fetchTodoList()
    await fetchDoneList()
    ElMessage.success('太棒了，完成了一项心愿! 🎉')
  } catch (e) {
    if (e.response?.status === 403) ElMessage.error('仅管理员可操作')
  }
}

async function handleDeleteDone(item) {
  try {
    await ElMessageBox.confirm(`确定删除「${item.entry}」？删除后不可恢复。`, '删除确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    })
    const fd = new FormData(); fd.append('entry', item.entry)
    await axios.post('/table_delete', fd, { headers: getAuthHeaders() })
    doneList.value = doneList.value.filter(t => t.entry !== item.entry)
    ElMessage.success('已删除')
  } catch (e) {
    if (e.response?.status === 403) ElMessage.error('仅管理员可操作')
  }
}

// ── 生命周期 ──────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('scroll', onScroll)
  updateClock(); clockTimer = setInterval(updateClock, 500)
  await fetchTodoList()
  await fetchDoneList()
  await fetchUserInfo()
  await fetchBlessings()
  startCornerRotation()
  await nextTick(); startPetals()
  // 首次登录弹出祝福框
  tryShowBlessing()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (clockTimer) clearInterval(clockTimer)
  if (petalTimer) cancelAnimationFrame(petalTimer)
  cornerTimers.forEach(t => clearTimeout(t))
  cornerSwitchTimers.forEach(t => clearTimeout(t))
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   主页全部样式
   ═══════════════════════════════════════════════════════════ */

/* ── 加载 ──────────────────────────────────────────────── */
.page-loader {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 99999 !important;
  background: var(--color-cream) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
  padding: 0 !important;
}

.loader-heart {
  font-size: 48px !important;
  animation: pulse 1s ease-in-out infinite !important;
  margin: 0 !important;
}

.page-loader p {
  margin-top: 16px !important;
  color: var(--color-rose) !important;
  font-size: 14px !important;
  text-align: center !important;
}

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
.petal-canvas { position: absolute; inset: 0; z-index: 2; pointer-events: none; }

.nav-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 48px;
  transition: all var(--transition-smooth);
}
.nav-bar.scrolled {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.nav-logo { font-family: var(--font-display); font-size: 24px; color: #fff; letter-spacing: 3px; transition: color var(--transition-smooth); }
.nav-bar.scrolled .nav-logo { color: var(--color-rose); }
.nav-links { display: flex; }
.nav-links a { font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 1px; transition: color var(--transition-fast); margin-right: 32px;}
.nav-links a:hover, .nav-links .admin-nav-link:hover { color: #fff; }
.admin-nav-link { color: var(--color-gold) !important; }
.nav-bar.scrolled .nav-links a { color: var(--color-text-light); }
.nav-bar.scrolled .nav-links a:hover, .nav-bar.scrolled .admin-nav-link:hover { color: var(--color-rose); }
.nav-bar.scrolled .admin-nav-link { color: var(--color-gold) !important; }
.nav-toggle { display: none; flex-direction: column; gap: 5px; background: none; padding: 4px; }
.nav-toggle span { width: 24px; height: 2px; background: #fff; border-radius: 1px; transition: all var(--transition-fast); }
.nav-bar.scrolled .nav-toggle span { background: var(--color-text); }

.mobile-menu { display: none; position: fixed; top: 64px; left: 16px; right: 16px; z-index: 999; padding: 20px; background: var(--color-surface-solid); }
.mobile-menu a { display: block; padding: 12px 0; text-align: center; font-size: 16px; color: var(--color-text); border-bottom: 1px solid #f0e8ea; }
.mobile-menu a:last-child { border: none; }

.hero-content { position: relative; z-index: 3; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hero-title { font-family: var(--font-display); font-size: clamp(48px, 8vw, 96px); color: #fff; font-weight: 400; letter-spacing: 6px; text-shadow: 0 2px 20px rgba(0,0,0,0.2); margin-bottom: 24px; }
.hero-names { display: flex; align-items: center; gap: 20px; }
.name-item { font-family: var(--font-display); font-size: clamp(20px, 3vw, 32px); color: rgba(255,255,255,0.9); letter-spacing: 2px; }
.name-divider { color: #e53e3e; animation: pulse 2s ease-in-out infinite; }
.heart-svg { width: 28px; height: 28px; }
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

/* ── 祝福寄语字幕 ───────────────────────────────────────── */
.blessing-lyrics {
  max-width: 600px; margin: 0 auto 48px;
  height: 120px; overflow: hidden;
  position: relative; cursor: pointer;
  mask-image: linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%);
}
.blessing-lyrics:hover { opacity: 0.85; }
.blessing-lyrics__inner {
  display: flex; flex-direction: column; align-items: center;
  animation: scroll-lyrics 23s linear infinite;
}
.lyric-spacer { height: 130px; flex-shrink: 0; }
.lyric-line {
  padding: 12px 0; text-align: center;
  font-size: 14px; color: var(--color-text);
  animation: lyric-fade 15s linear infinite;
  white-space: normal; line-height: 1.7;
}
.lyric-content {
  color: var(--color-rose);
  font-family: var(--font-display);
  font-style: italic;
}
.lyric-author { color: var(--color-text-light); font-size: 12px; }
.lyric-line.empty { color: var(--color-text-light); font-style: italic; }
.lyric-line.empty .lyric-content { color: var(--color-text-light); }
@keyframes scroll-lyrics {
  0%   { transform: translateY(0); }
  100% { transform: translateY(calc(-100% + 120px)); }
}
@keyframes lyric-fade {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1; }
}

/* ── 故事 (TODO) Section ────────────────────────────────── */
.story-section { padding: 100px 0; background: linear-gradient(180deg, #fff 0%, var(--color-cream) 100%); }
.container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.section-header { text-align: center; margin-bottom: 56px; }
.section-eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: 3px; color: var(--color-text-light); margin-bottom: 8px; }
.section-title { font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px); color: var(--color-text); font-weight: 400; margin-bottom: 16px; }
.section-line { width: 60px; height: 2px; background: linear-gradient(90deg, var(--color-rose-light), var(--color-rose)); margin: 0 auto; border-radius: 1px; }

.story-image { position: relative; border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 56px; }
.story-image img { width: 100%; height:440px; object-fit: cover; display: block; }
.story-image__text {
  position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; align-items: center;
  padding: 36px 32px;
  text-align: center;
  line-height: 2; font-size: 13px;
  color: #555;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}
.story-image__title {
  font-family: var(--font-display);
  font-size: 22px; color: var(--color-rose);
  margin-bottom: 16px; letter-spacing: 2px;
  text-shadow: 0 1px 3px rgba(255,255,255,0.6);
}
.story-image__text p {
  margin-bottom: 8px;
}
.story-image__text p:last-child { margin-bottom: 0; }

.todo-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.todo-header h3 { font-family: var(--font-display); font-size: 24px; color: var(--color-text); }
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
  display: flex; align-items: center; gap: 12px;
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
.album-grid-9 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 280px 280px 280px;
  gap: 12px;
}
.album-item { position: relative; border-radius: var(--radius-md); overflow: hidden; cursor: pointer; }
/* 第一列 1-2 行合并 */
.album-item.grid-tall  { grid-column: 1; grid-row: 1 / 3; }
/* 右下角四格 */
.album-item.grid-corner { grid-column: 3; grid-row: 3; }
.album-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.album-item:hover img { transform: scale(1.06); }
.album-item__overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35) 100%); display: flex; align-items: flex-end; justify-content: flex-end; padding: 16px; opacity: 0; transition: opacity var(--transition-smooth); }
.album-item:hover .album-item__overlay { opacity: 1; }
.album-item__icon { font-size: 20px; }

/* 四格角 */
.album-corner { background: #fff; }
.corner-grid { width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; position: relative; }
.corner-slot { position: relative; overflow: hidden; background: #fff; }
.corner-img { width: 100%; height: 100%; object-fit: cover; transition: opacity 1.5s ease-in-out; opacity: 1; }
.corner-img.fading { opacity: 0; }
.corner-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.25);
  color: #fff; font-size: 24px; font-weight: 300;
  opacity: 0; transition: opacity var(--transition-smooth);
  z-index: 1;
}
.album-corner:hover .corner-overlay { opacity: 1; }

/* ── 横幅 ───────────────────────────────────────────────── */
.banner-section { position: relative; padding: 160px 0; display: flex; align-items: center; justify-content: center; min-height: 400px; }
.banner-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.banner-overlay { position: absolute; inset: 0; background: rgba(40,18,22,0.55); z-index: 1; width: 100%; height: 100%;}
.banner-content { position: relative; z-index: 2; text-align: center; }
.banner-heart { font-size: 40px; display: block; margin-bottom: 16px; }
.banner-quote { font-family: var(--font-display); font-size: clamp(18px, 3vw, 28px); color: #fff; font-weight: 400; letter-spacing: 3px; line-height: 1.6; }

/* ── 页脚 ───────────────────────────────────────────────── */
.page-footer { padding: 40px 0; text-align: center; background: var(--color-cream); font-size: 13px; color: var(--color-text-light); }

/* ── 音乐播放器 ─────────────────────────────────────────── */
.music-player { position: fixed; top: 80px; right: 24px; z-index: 1001; }
.music-btn { width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #fff; display: flex; align-items: center; justify-content: center; transition: all var(--transition-smooth); border: 1px solid rgba(255,255,255,0.2); }
.music-btn:hover { background: rgba(255,255,255,0.25); }
.music-btn.playing { animation: spin-music 4s linear infinite; }

/* ── 祝福弹窗 ───────────────────────────────────────────── */
.blessing-modal { max-width: 460px !important; }
.blessing-hint { font-size: 14px; color: var(--color-text-light); margin-bottom: 16px; text-align: center; line-height: 1.7; }
.blessing-modal textarea {
  width: 100%; padding: 14px; border: 1.5px solid #e8dde0; border-radius: var(--radius-md); font-size: 15px; color: var(--color-text); outline: none; resize: vertical; font-family: var(--font-body); line-height: 1.7; transition: border-color var(--transition-fast);
}
.blessing-modal textarea:focus { border-color: var(--color-rose); }
.char-count { display: block; text-align: right; font-size: 12px; color: var(--color-text-light); margin-top: 4px; }

/* ── 弹窗通用 ────────────────────────────────────────────── */
.modal-mask {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 99999 !important;
  background: rgba(0, 0, 0, 0.4) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  outline: none !important;
  contain: layout paint size !important;
}

.modal-card {
  width: 420px !important;
  max-width: 92vw !important;
  background: #ffffff !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  outline: none !important;
  overflow: hidden !important;
  transform: none !important;
  contain: layout paint !important;
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
  .nav-links { display: none; }
  .nav-toggle { display: flex; }
  .mobile-menu { display: block; }
  .countdown { gap: 6px; }
  .countdown__item { min-width: 68px; padding: 12px 14px; }
  .album-grid-9 { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
  .album-item.grid-tall { grid-column: auto; grid-row: auto; }
  .album-item.grid-corner { grid-column: auto; grid-row: auto; }
  .todo-grid { grid-template-columns: 1fr; }
  .nav-bar { padding: 14px 20px; }
  .story-section, .album-section { padding: 64px 0; }
  .date-section { padding: 100px 0; }
  .avatar { width: 42px; height: 42px; }
  .blessing-lyrics { height: 100px; }
  .header-avatars { gap: 12px; }
}

@media (max-width: 480px) {
  .album-grid-9 { grid-template-columns: 1fr; grid-template-rows: auto; }
  .album-item.grid-tall, .album-item.grid-corner { grid-column: auto; grid-row: auto; }
  .hero-title { font-size: 40px; }
}
</style>

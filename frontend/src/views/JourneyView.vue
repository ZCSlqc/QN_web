<template>
  <SiteNavigation light :is-admin="isAdmin" :has-mailbox="hasMailbox" :current-username="currentUsername" @mailbox-unavailable="hasMailbox = false" />

  <section class="journey-section" id="journey">
    <div class="container">
      <div class="section-header">
        <p class="section-eyebrow">The Journey of our love</p>
        <h2 class="section-title">爱的旅程</h2>
        <div class="section-line"></div>
      </div>
      <div class="journey-summary">
        <span><strong>{{ cityCount }}</strong> 座城市</span>
        <span><strong>{{ journeys.length }}</strong> 段旅程</span>
        <p>把一起走过的路，留在这里。</p>
      </div>
      <p v-if="mapError" class="journey-status" role="alert">地图暂时无法加载，仍可浏览下方记录。<button class="btn-cancel" @click="retryMap">重试地图</button></p>
      <p v-if="outlineError" class="journey-status" role="alert">外轮廓暂未加载，城市地图仍可使用。<button class="btn-cancel" @click="loadOutline">重试轮廓</button></p>
      <div ref="mapEl" class="map-container" aria-label="旅行足迹地图"></div>
      <div class="basemap-status" role="status">
        <span v-if="basemapStatus === 'loading'">正在加载详细底图，省市足迹可先查看…</span>
        <template v-else-if="basemapStatus === 'local'">
          <span>当前显示本地足迹地图</span>
          <button class="btn-cancel" @click="startBasemap">重试详细底图</button>
        </template>
        <span v-else>详细底图 · <span class="visited-key"></span> 到访越多，颜色越深（省份 30%–50%，城市 40%–70%）</span>
      </div>
      <p class="planned-legend"><span></span> 黄色：预定旅程（40%） · 点击省市查看或预定</p>
      <p class="map-hint">地图内滚轮缩放，拖动探索 · 点击城市查看回忆{{ isAdmin ? ' · 可新增旅行记录' : '' }}</p>
      <div class="journey-list-head">
        <h3>一路上的回忆</h3>
        <input v-model="search" type="search" aria-label="搜索城市或旅途印象" placeholder="搜索城市或旅途印象…" />
      </div>
      <p v-if="loading" class="journey-status" role="status">正在整理我们的足迹…</p>
      <p v-else-if="loadError" class="journey-status" role="alert">记录暂时未能加载。<button class="btn-cancel" @click="fetchJourneys">重试</button></p>
      <div v-else class="journey-records">
        <article v-for="record in visibleJourneys" :key="record.id" class="journey-record" @click="openRecord(record)">
          <div v-if="record.cover" class="record-cover"><JourneyPhoto :src="record.cover.thumbnail_url" :alt="record.cover.caption || '旅程封面'" /><span>{{ record.photo_count }} 张照片</span></div>
          <span class="record-place">{{ journeyNames(record).join("、") }}</span>
          <time>{{ formatJourneyDate(record.departure_date) || '日期待补充' }} — {{ formatJourneyDate(record.return_date) || '未填写' }}</time>
          <p v-if="record.checkin_points" class="record-detail">📍 {{ record.checkin_points }}</p>
          <p v-if="record.event" class="record-detail">✨ {{ record.event }}</p>
          <p class="record-notes">{{ record.notes || '每一段同行，都值得珍藏。' }}</p>
          <div class="record-actions"><button class="record-link" @click.stop="openRecord(record)">翻开这段回忆 →</button><button v-if="isAdmin" class="record-edit" @click.stop="editRecord(record)">编辑</button></div>
        </article>
        <p v-if="!filteredJourneys.length" class="journey-status">{{ search ? '没有找到相关旅程，换个关键词试试。' : '还没有旅行记录，下一站的故事等我们一起写。' }}</p>
      </div>
      <button v-if="filteredJourneys.length > collapsedCount" class="btn-cancel records-toggle" @click="showAll = !showAll">{{ showAll ? '收起' : `显示全部（共 ${filteredJourneys.length} 段回忆）` }}</button>
    </div>

    <JourneyMemory v-if="memoryRecord" :key="memoryRecord.id" :record="memoryRecord" :related="cityRecords" :is-admin="isAdmin" @close="memoryRecord = null" @view="openRecord" @edit="editRecord" @new="memoryNewVisit" @plan="memoryNewPlan" @photos-updated="fetchJourneys" />
    <AppDialog v-model="modalVisible" :title="modalTitle" :busy="saving">
      <div class="journey-modal-card">
        <div class="journey-modal__head">
          <h4>{{ modalTitle }}</h4>
          <span class="journey-modal__place">📍 {{ formName.join("、") }}</span>
          <button type="button" class="journey-modal__close" aria-label="关闭" :disabled="saving" @click="closeModal">✕</button>
        </div>
        <div class="journey-modal__body">
          <div v-if="!convertingId" class="journey-tabs">
            <button type="button" :disabled="saving" :aria-pressed="!planning" @click="switchMode(false)">旅行回忆</button>
            <button type="button" :disabled="saving" :aria-pressed="planning" @click="switchMode(true)">预定旅程</button>
          </div>
          <div v-if="planning && cityPlans.length" class="city-records">
            <label for="journey-plan">这个城市的预定</label>
            <select id="journey-plan" :value="editingPlanId || ''" :disabled="saving" @change="selectPlan($event.target.value)">
              <option v-if="!editingPlanId" value="">新的预定</option>
              <option v-for="plan in cityPlans" :key="plan.id" :value="plan.id">{{ formatJourneyDate(plan.expected_departure) || '时间待定' }} · {{ plan.name.join('、') }} · {{ plan.checkin_points || plan.reason || '预定旅程' }}</option>
            </select>
            <button v-if="isAdmin && editingPlanId" class="btn-cancel" :disabled="saving" @click="newPlan">＋新增预定</button>
          </div>
          <div v-if="!planning && !convertingId && cityRecords.length" class="city-records">
            <label for="journey-visit">这个城市的回忆</label>
            <select id="journey-visit" :value="editingId || ''" :disabled="saving" @change="selectVisit($event.target.value)">
              <option v-if="!isEditMode" value="">新的旅程</option>
              <option v-for="record in cityRecords" :key="record.id" :value="record.id">{{ formatJourneyDate(record.departure_date) || '日期待补充' }} · {{ journeyNames(record).join("、") }}</option>
            </select>
            <button v-if="isAdmin && isEditMode" class="btn-cancel" :disabled="saving" @click="newVisit">+ 再次到访</button>
          </div>
          <p v-if="!isAdmin && !hasSelectedRecord" class="journey-status">{{ planning ? '这个城市还没有预定旅程。' : '这个城市还没有旅行回忆。' }}</p>
          <template v-if="isAdmin">
            <label for="journey-province">省份 / 直辖市 / 特别行政区</label>
            <select id="journey-province" v-model="selectedProvince" :disabled="saving || citiesLoading" @change="selectedCity = ''">
              <option value="" disabled>先选择省份</option>
              <option v-for="province in provinceOptions" :key="province.code" :value="province.code">{{ province.name }}</option>
            </select>
            <label for="journey-city">城市</label>
            <div class="city-picker">
              <select id="journey-city" v-model="selectedCity" :disabled="saving || citiesLoading || !selectedProvince">
                <option value="" disabled>再选择城市</option>
                <option v-for="city in filteredCityOptions" :key="city.code" :value="city.code">{{ city.name }}</option>
              </select>
              <button type="button" class="btn-cancel" :disabled="saving || !selectedCity || formAdcodes.includes(selectedCity)" @click="addSelectedCity">添加</button>
            </div>
            <div class="selected-cities" aria-label="这次旅程的城市">
              <span v-for="(code, index) in formAdcodes" :key="code" class="selected-city">
                {{ formName[index] }}
                <button type="button" :disabled="saving" :aria-label="`移除${formName[index]}`" @click="removeSelectedCity(index)">×</button>
              </span>
            </div>
            <small>添加后可切换省份，继续添加这次旅程经过的城市。</small>
            <p v-if="citiesError" role="alert">城市列表加载失败 <button type="button" class="btn-cancel" @click="loadCityOptions">重试</button></p>
            <label for="checkin-points">打卡点（景点 / 地区）</label>
            <textarea id="checkin-points" v-model="formCheckinPoints" rows="2" maxlength="2000" :disabled="saving"></textarea>
            <template v-if="planning">
              <label for="expected-departure">预估去程时间</label>
              <JourneyDateInput id="expected-departure" v-model="formExpectedDeparture" :disabled="saving" />
              <small>可以留空，显示“时间待定”。</small>
              <label for="plan-reason">想去原因</label>
              <textarea id="plan-reason" v-model="formReason" rows="4" maxlength="2000" :disabled="saving" placeholder="为什么想一起去这里？"></textarea>
            </template>
            <template v-else>
            <label for="journey-event">大事件</label>
            <input id="journey-event" v-model="formEvent" maxlength="500" :disabled="saving" />
            <label for="departure">出行去程时间</label>
            <JourneyDateInput id="departure" v-model="formDepartureDate" :disabled="saving" />
            <label for="return">出行返程时间</label>
            <JourneyDateInput id="return" v-model="formReturnDate" :min="formDepartureDate" :disabled="saving" />
            <label for="notes">备注 / 旅途感想</label>
            <textarea id="notes" v-model="formNotes" rows="4" maxlength="2000" :disabled="saving" placeholder="写下这次旅程难忘的小事…"></textarea>
            <p v-if="formReason" class="planning-reason">当时想去的原因：{{ formReason }}</p>
            </template>
          </template>
          <div v-else-if="hasSelectedRecord" class="journey-readonly">
            <p v-if="formCheckinPoints">📍 {{ formCheckinPoints }}</p>
            <template v-if="planning">
              <p>预估去程：{{ formatJourneyDate(formExpectedDeparture) || '时间待定' }}</p>
              <p>{{ formReason || '想去的原因，留待慢慢记录。' }}</p>
            </template>
            <template v-else>
            <p v-if="formEvent">✨ {{ formEvent }}</p>
            <p>{{ formatJourneyDate(formDepartureDate) || '日期待补充' }} — {{ formatJourneyDate(formReturnDate) || '未填写' }}</p>
            <p>{{ formNotes || '这段回忆的文字还在酝酿中。' }}</p>
            <p v-if="formReason">当时想去的原因：{{ formReason }}</p>
            </template>
          </div>
        </div>
        <div class="journey-modal__foot">
          <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">{{ isAdmin ? '取消' : '关闭' }}</button>
          <button v-if="isAdmin && planning && editingPlanId" type="button" class="btn-cancel" :disabled="saving" @click="beginConversion">转为旅程</button>
          <button v-if="isAdmin && hasSelectedRecord && !convertingId" type="button" class="btn-delete" :disabled="saving" @click="handleDelete">{{ planning ? '取消预定' : '删除' }}</button>
          <button v-if="isAdmin" type="button" class="btn-rose" :disabled="saving" @click="handleSubmit">{{ saving ? '保存中…' : (convertingId ? '保存为旅程' : hasSelectedRecord ? '修改保存' : planning ? '保存预定' : '确定') }}</button>
        </div>
      </div>
    </AppDialog>
  </section>
  <footer class="page-footer">
    <p>未完待续...</p>
  </footer>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import axios from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppDialog from '../components/shared/AppDialog.vue'
import SiteNavigation from '../components/shared/SiteNavigation.vue'
import JourneyDateInput from '../components/JourneyDateInput.vue'
import JourneyMemory from '../features/journey/JourneyMemory.vue'
import JourneyPhoto from '../features/journey/JourneyPhoto.vue'
import L from 'leaflet'
import { readGeo } from '../features/journey/geoData'
import 'leaflet/dist/leaflet.css'

const mapEl = ref(null)
const journeys = ref([])
const memoryRecord = ref(null)
const plans = ref([])
const planning = ref(false)
const editingPlanId = ref(null)
const convertingId = ref(null)
const formExpectedDeparture = ref('')
const formReason = ref('')
const clickedName = ref('')
const showAll = ref(false)
const smallScreen = ref(false)
const screenQuery = window.matchMedia('(max-width: 768px)')
function updateScreen() { smallScreen.value = screenQuery.matches }
const collapsedCount = computed(() => smallScreen.value ? 3 : 6)
const visibleJourneys = computed(() => showAll.value ? filteredJourneys.value : filteredJourneys.value.slice(0, collapsedCount.value))
const hasSelectedRecord = computed(() => planning.value ? !!editingPlanId.value : isEditMode.value)
const modalTitle = computed(() => convertingId.value ? '将预定转为旅程' : planning.value ? (isAdmin.value ? (editingPlanId.value ? '编辑预定旅程' : '预定旅程') : '预定旅程') : isAdmin.value ? (isEditMode.value ? '编辑旅程' : '记录旅程') : '旅行回忆')
const isAdmin = ref(false)
const hasMailbox = ref(false)
const currentUsername = ref('')
const loading = ref(true)
const loadError = ref(false)
const mapError = ref(false)
const basemapStatus = ref('loading')
const saving = ref(false)
function newRequestKey() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('') }
let journeyRequestKey = newRequestKey()
const search = ref('')
watch(search, () => { showAll.value = false })
const modalVisible = ref(false)
const currentAdcode = ref('')
const formName = ref([])
const formAdcodes = ref([])
const formCheckinPoints = ref('')
const formEvent = ref('')
const cityOptions = ref([])
const provinceOptions = ref([])
const selectedProvince = ref('')
const selectedCity = ref('')
const filteredCityOptions = computed(() => cityOptions.value.filter(city => city.code.slice(0, 2) === selectedProvince.value))
function addSelectedCity() {
  if (saving.value || !selectedCity.value || formAdcodes.value.includes(selectedCity.value)) return
  if (formAdcodes.value.length >= 30) { ElMessage.warning('一次旅程最多添加30个城市'); return }
  formAdcodes.value.push(selectedCity.value)
  syncCityNames()
  selectedCity.value = ''
}
function removeSelectedCity(index) {
  formAdcodes.value.splice(index, 1)
  formName.value.splice(index, 1)
}
const citiesLoading = ref(false)
const citiesError = ref(false)
function canonicalCode(code) { return ['11', '12', '31', '50', '81', '82'].includes(String(code).slice(0, 2)) ? String(code).slice(0, 2) + '0000' : String(code) }
function journeyCodes(record) { return [...new Set(record.adcodes.map(canonicalCode))] }
function journeyNames(record) { return record.name }
function syncCityNames() {
  formName.value = formAdcodes.value.map(code => cityOptions.value.find(city => city.code === code)?.name || code)
}
async function loadCityOptions() {
  if (citiesLoading.value) return
  citiesLoading.value = true; citiesError.value = false
  try {
    const [cities, provinces] = await Promise.all([readGeo('/svg/city.geojson'), readGeo('/svg/province.geojson')])
    if (disposed) return
    const options = new Map()
    provinceOptions.value = provinces.features.filter(f => /^\d{6}$/.test(String(f.properties.adcode)))
      .map(f => ({ code: String(f.properties.adcode).slice(0, 2), name: f.properties.name }))
    const names = new Map(provinceOptions.value.map(p => [p.code, p.name]))
    for (const f of [...cities.features, ...provinces.features.filter(f => ['110000','120000','310000','500000','810000','820000'].includes(String(f.properties.adcode)))]) {
      const code = String(f.properties.adcode)
      if (canonicalCode(code) !== code) continue
      options.set(code, { code, name: f.properties.name, label: `${names.get(code.slice(0, 2)) || ''} ${f.properties.name}` })
    }
    formAdcodes.value.forEach((code, i) => { if (!options.has(code)) options.set(code, { code, name: formName.value[i], label: formName.value[i] }) })
    cityOptions.value = [...options.values()].sort((a,b) => a.code.localeCompare(b.code))
    selectedProvince.value = currentAdcode.value.slice(0, 2)
    selectedCity.value = cityOptions.value.some(city => city.code === currentAdcode.value) ? currentAdcode.value : ''
  } catch { if (!disposed) citiesError.value = true }
  finally { citiesLoading.value = false }
}
const formDepartureDate = ref('')
const formReturnDate = ref('')
const formNotes = ref('')
const editingId = ref(null)
const isEditMode = computed(() => editingId.value !== null)
const cityCount = computed(() => new Set(journeys.value.flatMap(journeyCodes)).size)
function matchesClicked(record) {
  return journeyCodes(record).some(code => isProvince(currentAdcode.value) ? code.slice(0, 2) === currentAdcode.value.slice(0, 2) : code === currentAdcode.value)
}
const cityRecords = computed(() => journeys.value.filter(matchesClicked))
const cityPlans = computed(() => plans.value.filter(matchesClicked))
const plannedCities = computed(() => new Set(plans.value.flatMap(journeyCodes)))
const filteredJourneys = computed(() => journeys.value.filter(j => `${journeyNames(j).join(' ')} ${j.checkin_points || ''} ${j.event || ''} ${j.notes || ''}`.includes(search.value.trim())))
function formatJourneyDate(value) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value || '')
  if (!match) return value || ''
  return match[3] ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : `${match[1]}年${Number(match[2])}月`
}
let map, cityGroup, provinceGroup, visitedGroup, provinceData, outlineGroup, plannedGroup
const outlineError = ref(false)
let cityFeatures = []
let removeBasemap, basemapTimer
let basemapAttempt = 0
let cityPending = false
let disposed = false
const controller = new AbortController()
const cityLayers = new Map()
const provinceLayers = new Map()
const visitedLayers = new Map()
const visitCounts = computed(() => {
  const counts = new Map()
  for (const record of journeys.value) {
    for (const code of journeyCodes(record)) counts.set(code, (counts.get(code) || 0) + 1)
  }
  return counts
})
const provinceVisitCounts = computed(() => {
  const counts = new Map()
  for (const record of journeys.value) {
    for (const prefix of new Set(journeyCodes(record).map(code => code.slice(0, 2)))) {
      counts.set(prefix, (counts.get(prefix) || 0) + 1)
    }
  }
  return counts
})
const visitedCities = computed(() => new Set(visitCounts.value.keys()))
const defaultStyle = { color: '#d6bdc4', weight: 0.7, fillColor: '#fdf6f0', fillOpacity: 0.2 }
const visitedStyle = { color: '#b85d73', weight: 1, fillColor: '#d4788f', fillOpacity: 0.4 }
function visitOpacity(count) { return Math.min(70, 40 + Math.max(0, count - 1) * 3) / 100 }
function provinceOpacity(count) { return Math.min(50, 30 + Math.max(0, count - 1)) / 100 }
function cityVisitedStyle(code) { return { ...visitedStyle, fillOpacity: visitOpacity(visitCounts.value.get(code) || 0) } }
function cityTooltip(name, code) {
  const text = document.createElement('span')
  text.textContent = `${name} · 到访 ${visitCounts.value.get(code) || 0} 次${plannedCities.value.has(code) ? ' · 有预定旅程' : ''}`
  return text
}
// The lower canvas retains hit testing; only the upper pane paints visited cities.
const plannedStyle = { color: '#bb8b19', weight: 1.2, fillColor: '#f2c94c', fillOpacity: 0.4 }
const visitedHitStyle = { ...visitedStyle, opacity: 0, fillOpacity: 0 }
const WHOLE_REGION_ADCODES = new Set(['110000', '120000', '310000', '500000', '810000', '820000'])
const WHOLE_REGION_PREFIXES = new Set(['11', '12', '31', '50', '81', '82'])

async function startBasemap() {
  if (disposed || !map) return
  const attempt = ++basemapAttempt
  clearTimeout(basemapTimer)
  removeBasemap?.(); removeBasemap = null
  basemapStatus.value = 'loading'
  const fallback = () => {
    if (disposed || attempt !== basemapAttempt) return
    basemapAttempt++
    clearTimeout(basemapTimer)
    removeBasemap?.(); removeBasemap = null
    basemapStatus.value = 'local'
  }
  basemapTimer = setTimeout(fallback, 12000)
  try {
    const { attachOpenFreeMap } = await import('../features/journey/openFreeMap')
    if (disposed || attempt !== basemapAttempt) return
    removeBasemap = attachOpenFreeMap(map, () => {
      if (disposed || attempt !== basemapAttempt) return
      clearTimeout(basemapTimer)
      basemapStatus.value = 'online'
    }, fallback)
  } catch { fallback() }
}

function clearAuth() { isAdmin.value = false; hasMailbox.value = false; currentUsername.value = ''; modalVisible.value = false; memoryRecord.value = null }
function openRecord(record) {
  if (!matchesClicked(record)) { currentAdcode.value = journeyCodes(record)[0]; clickedName.value = record.name[0] }
  modalVisible.value = false
  memoryRecord.value = record
}
function memoryNewVisit(record) {
  if (!matchesClicked(record)) { currentAdcode.value = journeyCodes(record)[0]; clickedName.value = record.name[0] }
  memoryRecord.value = null; newVisit(); void loadCityOptions(); modalVisible.value = true
}
function memoryNewPlan(record) {
  if (!matchesClicked(record)) { currentAdcode.value = journeyCodes(record)[0]; clickedName.value = record.name[0] }
  memoryRecord.value = null; newPlan(); void loadCityOptions(); modalVisible.value = true
}
function editRecord(record) {
  memoryRecord.value = null
  planning.value = false; convertingId.value = null; editingPlanId.value = null
  formReason.value = record.planning_reason || ''
  const codes = journeyCodes(record)
  if (!matchesClicked(record)) { currentAdcode.value = codes[0]; clickedName.value = record.name[0] }
  formAdcodes.value = codes
  formCheckinPoints.value = record.checkin_points || ''
  formEvent.value = record.event || ''
  editingId.value = record.id
  formName.value = [...journeyNames(record)]
  if (isAdmin.value) void loadCityOptions()
  formDepartureDate.value = record.departure_date || ''
  formReturnDate.value = record.return_date || ''
  formNotes.value = record.notes || ''
  modalVisible.value = true
}
function isProvince(code) { return code.endsWith('0000') && !WHOLE_REGION_ADCODES.has(code) }
function resetForm() {
  editingId.value = null; editingPlanId.value = null; convertingId.value = null
  formDepartureDate.value = ''; formReturnDate.value = ''; formExpectedDeparture.value = ''
  formNotes.value = ''; formReason.value = ''; formCheckinPoints.value = ''; formEvent.value = ''
  formAdcodes.value = isProvince(currentAdcode.value) ? [] : [currentAdcode.value]
  formName.value = formAdcodes.value.length ? [clickedName.value] : []
  selectedProvince.value = currentAdcode.value.slice(0, 2)
  selectedCity.value = isProvince(currentAdcode.value) ? '' : currentAdcode.value
}
function newVisit() {
  journeyRequestKey = newRequestKey()
  resetForm(); planning.value = false
}
function newPlan() { resetForm(); planning.value = true }
function selectVisit(id) {
  const record = journeys.value.find(j => String(j.id) === String(id))
  if (record) editRecord(record)
}
function selectPlan(id) {
  const plan = plans.value.find(j => String(j.id) === String(id))
  if (plan) openPlan(plan)
}
function openPlan(plan) {
  resetForm(); planning.value = true; editingPlanId.value = plan.id
  formAdcodes.value = [...plan.adcodes]; formName.value = [...plan.name]
  formCheckinPoints.value = plan.checkin_points || ''
  formExpectedDeparture.value = plan.expected_departure || ''
  formReason.value = plan.reason || ''
  if (isAdmin.value) void loadCityOptions()
  modalVisible.value = true
}
function switchMode(toPlan) {
  if (saving.value) return
  if (toPlan) { if (cityPlans.value.length) openPlan(cityPlans.value[0]); else newPlan() }
  else { if (cityRecords.value.length) openRecord(cityRecords.value[0]); else newVisit() }
}
function beginConversion() {
  convertingId.value = editingPlanId.value
  planning.value = false; editingId.value = null
  formDepartureDate.value = formExpectedDeparture.value
  formReturnDate.value = ''; formNotes.value = ''; formEvent.value = ''
}
function openCity(adcode, name) {
  if (loading.value || loadError.value) { ElMessage.info('请先等待旅行记录加载完成'); return }
  currentAdcode.value = canonicalCode(adcode)
  clickedName.value = name
  resetForm()
  if (cityPlans.value.length) openPlan(cityPlans.value[0])
  else if (cityRecords.value.length) { openRecord(cityRecords.value[0]); return }
  else newVisit()
  if (isAdmin.value) void loadCityOptions()
  modalVisible.value = true
}
function closeModal() { if (!saving.value) modalVisible.value = false }
function applyStyles(rebuildVisited = true) {
  cityLayers.forEach((layer, code) => {
    layer.setStyle(visitedCities.value.has(code) ? visitedHitStyle : defaultStyle)
    layer.setTooltipContent(cityTooltip(layer.feature.properties.name, code))
  })
  provinceLayers.forEach((layer, code) => {
    // All regions keep their province fill, including municipalities and SARs.
    const count = provinceVisitCounts.value.get(code.slice(0, 2)) || 0
    layer.setStyle(count ? { ...visitedStyle, fillOpacity: provinceOpacity(count) } : defaultStyle)
  })
  if (plannedGroup && rebuildVisited) {
    plannedGroup.clearLayers()
    plannedGroup.addData({ type: 'FeatureCollection', features: cityFeatures.filter(f => plannedCities.value.has(String(f.properties.adcode))) })
  }
  if (visitedGroup && rebuildVisited) {
    visitedLayers.clear()
    visitedGroup.clearLayers()
    visitedGroup.addData({ type: 'FeatureCollection', features: cityFeatures.filter(feature => visitedCities.value.has(String(feature.properties.adcode))) })
  }
}
async function fetchJourneys() {
  loading.value = true; loadError.value = false
  try {
    const [res, planRes] = await Promise.all([axios.get('/journeys', { signal: controller.signal }), axios.get('/journey-plans', { signal: controller.signal })])
    if (disposed) return
    journeys.value = res.data.data || []
    plans.value = planRes.data.data || []
    applyStyles()
  } catch { if (!disposed) loadError.value = true }
  finally { if (!disposed) loading.value = false }
}
async function handleSubmit() {
  if (saving.value || !isAdmin.value) return
  if (!planning.value && (!formDepartureDate.value || !formReturnDate.value)) { ElMessage.warning('请填写出发和返程日期'); return }
  if (!planning.value && formReturnDate.value < formDepartureDate.value) { ElMessage.warning('返程日期不能早于出发日期'); return }
  if (!formAdcodes.value.length) { ElMessage.warning('请至少选择一个城市'); return }
  saving.value = true
  const fd = new FormData()
  fd.append('request_key', journeyRequestKey)
  Object.entries({ adcodes: JSON.stringify(formAdcodes.value), name: JSON.stringify(formName.value), checkin_points: formCheckinPoints.value, event: formEvent.value, departure_date: formDepartureDate.value,
    return_date: formReturnDate.value, notes: formNotes.value, reason: formReason.value }).forEach(([key, value]) => fd.append(key, value))
  try {
    if (planning.value) {
      const planData = new FormData()
      Object.entries({ name: JSON.stringify(formName.value), adcodes: JSON.stringify(formAdcodes.value), expected_departure: formExpectedDeparture.value,
        checkin_points: formCheckinPoints.value, reason: formReason.value }).forEach(([key, value]) => planData.append(key, value))
      if (editingPlanId.value) await axios.put(`/journey-plans/${editingPlanId.value}`, planData)
      else await axios.post('/journey-plans', planData)
    }
    else if (convertingId.value) await axios.post(`/journey-plans/${convertingId.value}/convert`, fd)
    else if (isEditMode.value) await axios.put(`/journeys/${editingId.value}`, fd)
    else await axios.post('/journeys', fd)
    modalVisible.value = false
    ElMessage.success(planning.value ? '预定旅程已保存' : '旅程已保存 💕')
    await fetchJourneys()
  } catch (e) { ElMessage.error(e.response?.data?.detail || '保存失败，请稍后重试') }
  finally { saving.value = false }
}
async function handleDelete() {
  if (saving.value || !isAdmin.value) return
  saving.value = true
  try {
    await ElMessageBox.confirm(planning.value ? '确定取消这条预定旅程吗？' : '确定删除这条旅程记录吗？', '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    if (planning.value) await axios.delete(`/journey-plans/${editingPlanId.value}`)
    else await axios.delete(`/journeys/${editingId.value}`)
    await fetchJourneys()
    applyStyles(); modalVisible.value = false
    ElMessage.success(planning.value ? '预定已取消' : '旅程记录已删除')
  } catch (e) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.detail || '删除失败，请稍后重试') }
  finally { saving.value = false }
}
async function loadCities() {
  if (disposed || cityPending || cityGroup || !map) return
  cityPending = true
  try {
    const data = await readGeo('/svg/city.geojson')
    if (!provinceData) provinceData = await readGeo('/svg/province.geojson')
    if (disposed) return
    // The city file splits municipalities and Hong Kong/Macao into districts; replace those
    // with the whole-region province shapes so each region is one click.
    const municipalities = provinceData.features
      .filter(feature => WHOLE_REGION_ADCODES.has(String(feature.properties.adcode)))
      .map(feature => ({ ...feature, properties: { ...feature.properties, level: 'city' } }))
    const features = [
      ...data.features.filter(feature => !WHOLE_REGION_PREFIXES.has(String(feature.properties.adcode).slice(0, 2))),
      ...municipalities,
    ]
    cityFeatures = features
    cityGroup = L.geoJSON({ type: 'FeatureCollection', features }, {
      pane: 'cities',
      style: defaultStyle,
      onEachFeature(feature, layer) {
        const code = String(feature.properties.adcode)
        cityLayers.set(code, layer)
        layer.bindTooltip(cityTooltip(feature.properties.name, code), { sticky: true, className: 'city-tooltip' })
        layer.on('click', () => openCity(code, feature.properties.name))
        layer.on('mouseover', () => {
          if (visitedCities.value.has(code)) visitedLayers.get(code)?.bringToFront()
          else layer.setStyle({ fillOpacity: 0.65 })
        })
        layer.on('mouseout', () => {
          layer.setStyle(visitedCities.value.has(code) ? visitedHitStyle : defaultStyle)
          visitedLayers.get(code)?.setStyle(cityVisitedStyle(code))
        })
      },
    })
    visitedGroup = L.geoJSON(null, {
      pane: 'visitedCities', interactive: false, style: feature => cityVisitedStyle(String(feature.properties.adcode)),
      onEachFeature(feature, layer) { visitedLayers.set(String(feature.properties.adcode), layer) },
    })
    plannedGroup = L.geoJSON(null, {
      pane: 'plannedCities', renderer: L.svg({ pane: 'plannedCities' }), style: plannedStyle,
      onEachFeature(feature, layer) {
        const code = String(feature.properties.adcode)
        layer.bindTooltip(cityTooltip(feature.properties.name, code), { sticky: true, className: 'city-tooltip' })
        layer.on('click', () => openCity(code, feature.properties.name))
      },
    }).addTo(map)
    syncMapLayers(); applyStyles(); mapError.value = false
  } catch { if (!disposed) mapError.value = true }
  finally { cityPending = false }
}
function syncMapLayers() {
  if (!map || disposed) return
  if (map.getZoom() >= 5) {
    if (cityGroup) {
      if (!map.hasLayer(cityGroup)) cityGroup.addTo(map)
      if (visitedGroup && !map.hasLayer(visitedGroup)) visitedGroup.addTo(map)
    }
    else void loadCities()
  } else {
    if (cityGroup && map.hasLayer(cityGroup)) map.removeLayer(cityGroup)
    if (visitedGroup && map.hasLayer(visitedGroup)) map.removeLayer(visitedGroup)
  }
  applyStyles(false)
}
async function loadProvinces() {
  try {
    const data = await readGeo('/svg/province.geojson')
    if (disposed) return
    provinceData = data
    provinceGroup = L.geoJSON(data, { pane: 'provinces', style: defaultStyle,
      onEachFeature(feature, layer) {
        const code = String(feature.properties.adcode)
        provinceLayers.set(code, layer)
        layer.on('click', () => openCity(code, feature.properties.name))
      },
    }).addTo(map)
    const bounds = provinceGroup.getBounds()
    map.fitBounds(bounds, { padding: [15, 15], animate: false })
    map.setMinZoom(map.getZoom()); map.setMaxBounds(bounds.pad(0.3))
    applyStyles(); mapError.value = false
    syncMapLayers()
    void loadCities()
  } catch { if (!disposed) mapError.value = true }
}
async function loadOutline() {
  outlineError.value = false
  try {
    const data = await readGeo('/svg/outline.geojson')
    if (disposed) return
    outlineGroup = L.geoJSON(data, {
      pane: 'countryOutline', interactive: false,
      style: { color: '#987080', weight: 0.7, opacity: 1, fill: false, lineJoin: 'round' },
    }).addTo(map)
  } catch { if (!disposed) outlineError.value = true }
}
async function retryMap() {
  if (provinceGroup) await loadCities()
  else await loadProvinces()
}
onMounted(() => {
  updateScreen(); screenQuery.addEventListener('change', updateScreen)
  window.addEventListener('auth-expired', clearAuth)
  void fetchJourneys()
  if (localStorage.getItem('token')) axios.get('/me', { signal: controller.signal }).then(res => { if (!disposed) { isAdmin.value = res.data.is_admin; hasMailbox.value = res.data.has_mailbox === true; currentUsername.value = res.data.username || '' } }).catch(() => {})
  map = L.map(mapEl.value, {
    center: [35.86, 104.19], zoom: 4, maxZoom: 18, preferCanvas: true,
    // Leaflet consumes wheel events inside the map, leaving page scrolling outside intact.
    scrollWheelZoom: true, wheelDebounceTime: 80, wheelPxPerZoomLevel: 200,
    zoomSnap: 0.5, zoomDelta: 0.5,
  })
  map.createPane('provinces').style.zIndex = '350'
  map.createPane('plannedCities').style.zIndex = '470'
  map.createPane('cities').style.zIndex = '400'
  map.createPane('visitedCities').style.zIndex = '450'
  map.getPane('visitedCities').style.pointerEvents = 'none'
  map.createPane('countryOutline').style.zIndex = '460'
  map.getPane('countryOutline').style.pointerEvents = 'none'
  map.on('zoomend', syncMapLayers)
  void loadProvinces()
  void loadOutline()
  void startBasemap()
})
onUnmounted(() => {
  screenQuery.removeEventListener('change', updateScreen)
  disposed = true; controller.abort()
  basemapAttempt++
  clearTimeout(basemapTimer)
  removeBasemap?.(); removeBasemap = null
  window.removeEventListener('auth-expired', clearAuth)
  map?.remove(); map = null
})
</script>

<style scoped>


.journey-section {
  padding: 120px 0 100px;
  background: linear-gradient(180deg, #fff 0%, var(--color-cream) 100%);
  min-height: 100vh;
}
.container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.section-header { text-align: center; margin-bottom: 56px; }
.section-eyebrow {
  font-size: 12px; text-transform: uppercase; letter-spacing: 3px;
  color: var(--color-text-light); margin-bottom: 8px;
}
.section-title {
  font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px);
  color: var(--color-text); font-weight: 400; margin-bottom: 16px;
}
.section-line {
  width: 60px; height: 2px;
  background: linear-gradient(90deg, var(--color-rose-light), var(--color-rose));
  margin: 0 auto; border-radius: 1px;
}

.map-container {
  width: 100%; height: 750px;
  border-radius: var(--radius-lg); overflow: hidden;
  box-shadow: var(--shadow-md); cursor: pointer; background: #f7f0e8;
}

/* 屏蔽 Leaflet 点击黑框 */
:deep(.map-container path.leaflet-interactive:focus) {
  outline: none;
}

.journey-modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99999;
  background: rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center;
}
.journey-modal-card {
  width: 400px; max-width: 92vw; background: #fff;
  border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); overflow: hidden;
}
.journey-modal__head {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 24px; border-bottom: 1px solid #f0e8ea;
}
.journey-modal__head h4 { font-size: 16px; color: var(--color-text); font-family: var(--font-display); }
.journey-modal__place { flex: 1; font-size: 13px; color: var(--color-rose); }
.journey-modal__close {
  background: none; font-size: 16px; color: var(--color-text-light);
  padding: 4px 8px; border-radius: 6px;
}
.journey-modal__close:hover { background: #f5f0f1; }

.journey-modal__body { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
.journey-modal__body label { font-size: 13px; color: var(--color-text-light); margin-bottom: -8px; }
.journey-modal__body input,
.journey-modal__body textarea {
  width: 100%; padding: 10px 12px;
  border: 1.5px solid #e8dde0; border-radius: 8px;
  font-size: 14px; color: var(--color-text); outline: none;
  font-family: var(--font-body); transition: border-color 0.2s; resize: vertical;
}
.journey-modal__body input:focus,
.journey-modal__body textarea:focus { border-color: var(--color-rose); }

.journey-modal__foot {
  display: flex; gap: 10px; padding: 14px 24px;
  border-top: 1px solid #f0e8ea; justify-content: flex-end;
}
.btn-cancel {
  padding: 9px 22px; border-radius: 9999px; font-size: 13px;
  background: #f5f2f3; color: var(--color-text-light); transition: background 0.2s;
}
.btn-cancel:hover { background: #ebe5e7; }
.btn-delete {
  padding: 9px 22px; border-radius: 9999px; font-size: 13px;
  background: #fef0f0; color: #d47878; transition: all 0.2s;
}
.btn-delete:hover { background: #fde0e0; }
.btn-rose {
  padding: 9px 26px; border-radius: 9999px; font-size: 13px; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--color-rose), var(--color-rose-dark));
  color: #fff; box-shadow: 0 2px 10px rgba(212,120,143,0.3); transition: all 0.3s;
}
.btn-rose:hover { transform: translateY(-1px); box-shadow: 0 4px 18px rgba(212,120,143,0.4); }

:deep(.city-tooltip) {
  background: rgba(255,255,255,0.92); border: 1px solid var(--color-rose-light);
  border-radius: 8px; padding: 4px 14px; font-family: var(--font-body);
  font-size: 13px; color: var(--color-rose);
  box-shadow: 0 2px 12px rgba(180,130,140,0.18);
}
:deep(.city-tooltip::before), :deep(.city-tooltip::after) { display: none; }

:deep(.leaflet-control-zoom) { border: none; box-shadow: var(--shadow-sm); border-radius: 8px; overflow: hidden; }
:deep(.leaflet-control-zoom a) { color: var(--color-text-light); }

.page-footer {
  padding: 40px 0; text-align: center; font-size: 13px;
  color: var(--color-text-light); background: var(--color-cream);
}

@media (max-width: 768px) {
  .journey-section { padding: 100px 0 64px; }
  .journey-modal-card { width: 94vw; }
}
</style>

<style scoped>
.journey-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 24px; margin: -24px 0 28px; padding: 20px 24px; border-radius: 16px; background: #fff; border: 1px solid var(--color-rose-light); }
.journey-summary strong { color: var(--color-rose-dark); font-size: 28px; margin-right: 6px; }
.journey-summary p { margin-left: auto; color: var(--color-text-light); font-size: 14px; }
.map-hint { margin: 12px 0 40px; text-align: center; color: var(--color-text-light); font-size: 13px; }
.basemap-status { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; color: var(--color-text-light); font-size: 12px; }
.basemap-status .btn-cancel { font-size: 12px; padding: 6px 12px; }
.visited-key { display: inline-block; width: 24px; height: 10px; border: 1px solid #b85d73; border-radius: 3px; background: linear-gradient(90deg, rgba(212,120,143,.4), rgba(212,120,143,.7)); margin: 0 3px; }
:deep(.leaflet-visitedCities-pane), :deep(.leaflet-visitedCities-pane canvas), :deep(.leaflet-provinces-pane canvas) { pointer-events: none; }
:deep(.leaflet-gl-layer) { pointer-events: none; }
:deep(.leaflet-countryOutline-pane), :deep(.leaflet-countryOutline-pane canvas) { pointer-events: none; }
.journey-list-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.journey-list-head input { padding: 12px 16px; border: 1px solid var(--color-rose-light); border-radius: 12px; background: #fff; }
.journey-records { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.journey-record { text-align: left; padding: 24px; border-radius: 18px; background: #fff; border: 1px solid #efdee3; box-shadow: var(--shadow-sm); transition: transform .2s; color: var(--color-text); }
.journey-record:hover { transform: translateY(-3px); }
.record-place { display: block; color: var(--color-rose-dark); font-size: 22px; margin-bottom: 8px; }
.journey-record time { font-size: 12px; color: var(--color-text-light); }
.journey-record p { margin: 14px 0; line-height: 1.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.record-link { font-size: 13px; color: var(--color-rose-dark); }
.journey-status { grid-column: 1 / -1; padding: 28px; text-align: center; color: var(--color-text-light); }
.city-records { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
.city-records select { padding: 10px; border: 1px solid var(--color-rose-light); border-radius: 8px; background: #fff; }
.journey-readonly { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.9; }
.journey-readonly p + p { margin-top: 16px; }
.journey-modal__body input, .journey-modal__body textarea { font-size: 16px; }
@media (max-width: 768px) {
  .journey-records { grid-template-columns: 1fr; }
  .journey-list-head { align-items: stretch; flex-direction: column; }
  .journey-summary { gap: 16px; padding: 16px; }
  .journey-summary p { margin: 0; width: 100%; }
  .map-container { height: 540px; }
  .journey-modal__head { padding: 16px; gap: 8px; }
}
</style>

<style scoped>
#journey-province, #journey-city { width: 100%; min-width: 0; padding: 10px; border: 1px solid var(--color-rose-light); border-radius: 8px; font-size: 16px; background: #fff; }
.city-picker { display: flex; gap: 8px; }
.city-picker select { flex: 1; }
.city-picker button { flex-shrink: 0; }
.selected-cities { display: flex; flex-wrap: wrap; gap: 8px; }
.selected-city { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--color-rose-soft); color: var(--color-rose-dark); border-radius: 16px; font-size: 13px; }
.selected-city button { padding: 4px; background: transparent; color: inherit; font-size: 18px; }
.journey-modal__body small { color: var(--color-text-light); line-height: 1.6; }
.journey-record .record-detail { font-size: 13px; margin: 10px 0; }
</style>

<style scoped>
.planned-legend { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--color-text-light); font-size: 13px; margin: 12px 0; }
.planned-legend span { width: 16px; height: 16px; background: rgba(242,201,76,.4); border: 1px solid #bb8b19; border-radius: 4px; }
.records-toggle { display: block; margin: 24px auto 0; }
.record-notes { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.journey-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.journey-tabs button { flex: 1; border-radius: 20px; padding: 10px; background: #f5f0f1; color: var(--color-text); }
.journey-tabs button[aria-pressed="true"] { background: var(--color-rose-soft); color: var(--color-rose-dark); box-shadow: inset 0 0 0 1px var(--color-rose-light); }
.planning-reason { margin-top: 16px; font-size: 14px; color: var(--color-text-light); white-space: pre-wrap; }
.journey-modal__foot { flex-wrap: wrap; }
</style>

<style scoped>
.record-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: auto; padding-top: 16px; }
.record-actions button { background: transparent; padding: 6px 0; font-size: 13px; color: var(--color-rose-dark); }
.record-actions .record-edit { padding: 6px 14px; border-radius: 16px; background: var(--color-rose-soft); }
.record-cover { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 10px; margin-bottom: 14px; }
.record-cover span { position: absolute; right: 10px; bottom: 8px; background: rgba(0,0,0,.5); color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.journey-record { cursor: pointer; display: flex; flex-direction: column; }
</style>

<template>
  <nav class="journey-nav">
    <router-link to="/index" class="journey-nav__back">← 返回主页</router-link>
    <span class="journey-nav__title">爱的旅程</span>
    <span class="journey-nav__spacer"></span>
  </nav>

  <section class="journey-section" id="journey">
    <div class="container">
      <div class="section-header">
        <p class="section-eyebrow">The Journey of our love</p>
        <h2 class="section-title">爱的旅程</h2>
        <div class="section-line"></div>
      </div>
      <div ref="mapEl" class="map-container"></div>
    </div>

    <div v-if="modalVisible" class="journey-modal-mask" @click.self="closeModal">
      <div class="journey-modal-card" @click.stop>
        <div class="journey-modal__head">
          <h4>{{ isEditMode ? '编辑旅程' : '记录旅程' }}</h4>
          <span class="journey-modal__place">📍 {{ formName }}</span>
          <button type="button" class="journey-modal__close" @click.stop="closeModal">✕</button>
        </div>
        <div class="journey-modal__body">
          <label>出行去程时间</label>
          <input v-model="formDepartureDate" type="date" />
          <label>出行返程时间</label>
          <input v-model="formReturnDate" type="date" />
          <label>旅途印象/感想</label>
          <textarea v-model="formImpression" rows="3" placeholder="写下你的旅途感受..."></textarea>
          <label>备注补充内容</label>
          <textarea v-model="formNotes" rows="2" placeholder="补充说明..."></textarea>
        </div>
        <div class="journey-modal__foot">
          <button type="button" class="btn-cancel" @click.stop="closeModal">取消</button>
          <button v-if="isEditMode" type="button" class="btn-delete" @click.stop="handleDelete">删除</button>
          <button type="button" class="btn-rose" @click.stop="handleSubmit">{{ isEditMode ? '修改保存' : '确定' }}</button>
        </div>
      </div>
    </div>
  </section>
  <footer class="page-footer">
    <p>未完待续...</p>
  </footer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const mapEl = ref(null)
let map = null
const provinceLayers = {}
const cityLayers = {}

const journeyMap = new Map()
const modalVisible = ref(false)
const isEditMode = ref(false)
const currentAdcode = ref('')
const formName = ref('')
const formDepartureDate = ref('')
const formReturnDate = ref('')
const formImpression = ref('')
const formNotes = ref('')
let editingId = null

const defaultProvinceStyle = { color: '#b89b6e', weight: 0.8, fillColor: '#fdf6f0', fillOpacity: 0.22, opacity: 0.9 }
const visitedProvinceStyle = { color: '#c97d8b', weight: 0.8, fillColor: '#d4788f', fillOpacity: 0.45, opacity: 0.9 }

const defaultCityStyle = { color: '#e0d0d4', weight: 0.5, fillColor: 'transparent', fillOpacity: 0, opacity: 0.5 }
const visitedCityStyle = { color: '#d4788f', weight: 1, fillColor: '#d4788f', fillOpacity: 0.35, opacity: 0.6 }
const hoverCityStyle = { fillColor: '#f0c8d4', fillOpacity: 0.35 }
const hoverCityVisitedStyle = { fillColor: '#e8909f', fillOpacity: 0.5 }

function openModal(adcode, name) {
  currentAdcode.value = adcode
  const existing = journeyMap.get(adcode)
  if (existing) {
    isEditMode.value = true
    editingId = existing.id
    formName.value = existing.name
    formDepartureDate.value = existing.departure_date || ''
    formReturnDate.value = existing.return_date || ''
    formImpression.value = existing.impression || ''
    formNotes.value = existing.notes || ''
  } else {
    isEditMode.value = false
    editingId = null
    formName.value = name
    formDepartureDate.value = ''
    formReturnDate.value = ''
    formImpression.value = ''
    formNotes.value = ''
  }
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
}

async function handleSubmit() {
  if (!formDepartureDate.value) {
    ElMessage.warning('请填写出行去程时间')
    return
  }
  if (!formReturnDate.value) {
    ElMessage.warning('请填写出行返程时间')
    return
  }

  const fd = new FormData()
  fd.append('adcode', currentAdcode.value)
  fd.append('name', formName.value)
  fd.append('departure_date', formDepartureDate.value)
  fd.append('return_date', formReturnDate.value)
  fd.append('impression', formImpression.value)
  fd.append('notes', formNotes.value)

  try {
    if (isEditMode.value) {
      await axios.put(`/journeys/${editingId}`, fd)
      ElMessage.success('旅程记录已更新')
    } else {
      await axios.post('/journeys', fd)
      ElMessage.success('旅程记录已保存 💕')
    }
    await fetchJourneys()
    closeModal()
  } catch (e) {
    console.error('保存旅程失败:', e)
    ElMessage.error('保存失败，请稍后重试')
  }
}

async function handleDelete() {
  if (!confirm('确定删除这条旅程记录吗？')) return
  try {
    await axios.delete(`/journeys/${editingId}`)
    ElMessage.success('旅程记录已删除')
    journeyMap.delete(currentAdcode.value)
    updateLayerStyle(currentAdcode.value)
    closeModal()
  } catch (e) {
    console.error('删除旅程失败:', e)
    ElMessage.error('删除失败，请稍后重试')
  }
}

function updateLayerStyle(adcode) {
  const visited = journeyMap.has(adcode)
  if (provinceLayers[adcode]) {
    provinceLayers[adcode].setStyle(visited ? visitedProvinceStyle : defaultProvinceStyle)
  }
  if (cityLayers[adcode]) {
    cityLayers[adcode].setStyle(visited ? visitedCityStyle : defaultCityStyle)
  }
}

function applyAllStyles() {
  Object.entries(provinceLayers).forEach(([adcode, layer]) => {
    layer.setStyle(journeyMap.has(adcode) ? visitedProvinceStyle : defaultProvinceStyle)
  })
  Object.entries(cityLayers).forEach(([adcode, layer]) => {
    layer.setStyle(journeyMap.has(adcode) ? visitedCityStyle : defaultCityStyle)
  })
}

async function fetchJourneys() {
  try {
    const res = await axios.get('/journeys')
    journeyMap.clear()
    ;(res.data.data || []).forEach((j) => {
      journeyMap.set(String(j.adcode), j)
    })
    applyAllStyles()
  } catch (e) {
    console.error('获取旅程数据失败:', e)
  }
}

onMounted(async () => {
  map = L.map(mapEl.value, {
    center: [35.86, 104.19],
    zoom: 4,
    zoomControl: true,
    scrollWheelZoom: true,
    dragging: true,
    attributionControl: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
  }).addTo(map)

  try {
    const [provinceRes, cityRes] = await Promise.all([
      fetch('/svg/province.geojson'),
      fetch('/svg/city.geojson'),
    ])
    const provinceData = await provinceRes.json()
    const cityData = await cityRes.json()

    provinceData.features.forEach((f) => {
      const adcode = String(f.properties.adcode)
      const isVisited = journeyMap.has(adcode)
      const style = isVisited ? { ...visitedProvinceStyle } : { ...defaultProvinceStyle }

      const layer = L.geoJSON(f, { style, interactive: false }).addTo(map)
      provinceLayers[adcode] = layer
    })

    cityData.features.forEach((f) => {
      const adcode = String(f.properties.adcode)
      const isVisited = journeyMap.has(adcode)
      const style = isVisited ? { ...visitedCityStyle } : { ...defaultCityStyle }

      const layer = L.geoJSON(f, { style }).addTo(map)
      cityLayers[adcode] = layer

      layer.bindTooltip(f.properties.name, { sticky: true, direction: 'top', className: 'city-tooltip' })
      layer.on('click', () => openModal(adcode, f.properties.name))
      layer.on('mouseover', () => {
        layer.setStyle(journeyMap.has(adcode) ? hoverCityVisitedStyle : hoverCityStyle)
        layer.bringToFront()
      })
      layer.on('mouseout', () => {
        layer.setStyle(journeyMap.has(adcode) ? visitedCityStyle : defaultCityStyle)
      })
    })

    const allBounds = L.geoJSON(provinceData).getBounds()
    map.fitBounds(allBounds, { padding: [30, 30], animate: false })
    const fitZ = map.getZoom()
    map.setZoom(fitZ + 1)
    map.setMinZoom(fitZ)
    map.setMaxBounds(allBounds.pad(0.3))
  } catch (e) {
    console.error('Failed to load geojson:', e)
  }

  await fetchJourneys()
})

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})
</script>

<style scoped>
.journey-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 48px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.journey-nav__back {
  font-size: 14px; color: var(--color-rose); letter-spacing: 1px; transition: opacity 0.2s;
}
.journey-nav__back:hover { opacity: 0.7; }
.journey-nav__title {
  font-family: var(--font-display); font-size: 18px; color: var(--color-text); letter-spacing: 2px;
}
.journey-nav__spacer { width: 80px; }

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
  width: 100%; height: 580px;
  border-radius: var(--radius-lg); overflow: hidden;
  box-shadow: var(--shadow-md); cursor: pointer;
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
:deep(.city-tooltip::before) { border-top-color: var(--color-rose-light); }

:deep(.leaflet-control-zoom) { border: none; box-shadow: var(--shadow-sm); border-radius: 8px; overflow: hidden; }
:deep(.leaflet-control-zoom a) { color: var(--color-text-light); }

.page-footer {
  padding: 40px 0; text-align: center; font-size: 13px;
  color: var(--color-text-light); background: var(--color-cream);
}

@media (max-width: 768px) {
  .journey-nav { padding: 12px 20px; }
  .journey-section { padding: 100px 0 64px; }
  .map-container { height: 420px; }
  .journey-modal-card { width: 94vw; }
}
</style>

<template>
  <section class="journey-section" id="journey">
    <div class="container">
      <div class="section-header">
        <p class="section-eyebrow">The Journey of our love</p>
        <h2 class="section-title">爱的旅程</h2>
        <div class="section-line"></div>
      </div>
      <div ref="mapEl" class="map-container"></div>
    </div>
  </section>
  <footer class="page-footer">
    <p>未完待续...</p>
  </footer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const mapEl = ref(null)
let map = null

onMounted(async () => {
  map = L.map(mapEl.value, {
    center: [35.86, 104.19],
    zoom: 5,
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

    const provinceLayer = L.geoJSON(provinceData, {
      style: {
        color: '#b89b6e',
        weight: 2.5,
        fillColor: '#fdf6f0',
        fillOpacity: 0.22,
        opacity: 0.9,
      },
    }).addTo(map)

    L.geoJSON(cityData, {
      style: {
        color: '#e0d0d4',
        weight: 0.5,
        fillColor: 'transparent',
        fillOpacity: 0,
        opacity: 0.3,
      },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.name, {
          sticky: true,
          direction: 'top',
          className: 'city-tooltip',
        })
        layer.on('mouseover', () => {
          layer.setStyle({
            fillColor: '#d4788f',
            fillOpacity: 0.4,
            weight: 1.2,
            color: '#d4788f',
            opacity: 0.75,
          })
          layer.bringToFront()
        })
        layer.on('mouseout', () => {
          layer.setStyle({
            fillColor: 'transparent',
            fillOpacity: 0,
            weight: 0.5,
            color: '#e0d0d4',
            opacity: 0.3,
          })
        })
      },
    }).addTo(map)

    const bounds = provinceLayer.getBounds()
    map.fitBounds(bounds, { padding: [12, 12] })
    map.setMinZoom(map.getZoom())
    map.setMaxBounds(bounds.pad(0.2))
  } catch (e) {
    console.error('Failed to load geojson:', e)
    mapEl.value.innerHTML =
      '<p style="text-align:center;padding:80px 0;color:var(--color-text-light);">地图数据加载失败，请稍后重试</p>'
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
/* ── 旅程 Section ────────────────────────────────────────── */
.journey-section {
  padding: 100px 0;
  background: linear-gradient(180deg, #fff 0%, var(--color-cream) 100%);
  min-height: 100vh;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  margin-bottom: 56px;
}

.section-eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--color-text-light);
  margin-bottom: 8px;
}

.section-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 42px);
  color: var(--color-text);
  font-weight: 400;
  margin-bottom: 16px;
}

.section-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, var(--color-rose-light), var(--color-rose));
  margin: 0 auto;
  border-radius: 1px;
}

/* ── 地图容器 ────────────────────────────────────────────── */
.map-container {
  width: 100%;
  height: 580px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

/* ── 城市悬浮提示 ────────────────────────────────────────── */
:deep(.city-tooltip) {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--color-rose-light);
  border-radius: 8px;
  padding: 4px 14px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-rose);
  box-shadow: 0 2px 12px rgba(180, 130, 140, 0.18);
}

:deep(.city-tooltip::before) {
  border-top-color: var(--color-rose-light);
}

/* ── Leaflet 样式覆写 ────────────────────────────────────── */
:deep(.leaflet-control-zoom) {
  border: none;
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

:deep(.leaflet-control-zoom a) {
  color: var(--color-text-light);
}

/* ── 页脚 ───────────────────────────────────────────────── */
.page-footer {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-light);
  background: var(--color-cream);
}

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .journey-section {
    padding: 64px 0;
  }
  .map-container {
    height: 420px;
  }
}
</style>

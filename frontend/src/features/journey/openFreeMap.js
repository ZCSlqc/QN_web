import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { Util, DomUtil } from 'leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

export function attachOpenFreeMap(map, onReady, onFailure) {
  // Avoid attaching a partially constructed Leaflet layer on browsers without WebGL2.
  const probe = document.createElement('canvas').getContext('webgl2')
  if (!probe) throw new Error('WebGL2 unavailable')
  probe.getExtension('WEBGL_lose_context')?.loseContext()

  const layer = maplibreGL({
    style: 'https://tiles.openfreemap.org/styles/positron',
    interactive: false,
    pane: 'tilePane',
    attributionControl: {
      customAttribution: '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    },
  })
  // The adapter schedules an untracked resize frame that can outlive onRemove.
  // Own that frame here so rapid route changes cannot access a detached map.
  let stopped = false, transitionFrame
  layer._transitionEnd = function () {
    Util.cancelAnimFrame(transitionFrame)
    transitionFrame = Util.requestAnimFrame(() => {
      if (stopped || !this._map || !this._glMap) return
      const zoom = this._map.getZoom(), center = this._map.getCenter()
      const offset = this._map.latLngToContainerPoint(this._map.getBounds().getNorthWest())
      this._resizeContainer()
      DomUtil.setTransform(this._glMap.getCanvas(), offset, 1)
      this._glMap.once('moveend', () => { if (!stopped && this._map) this._zoomEnd() })
      this._glMap.jumpTo({ center, zoom: zoom - 1 })
    })
  }
  layer.addTo(map)
  const gl = layer.getMaplibreMap()
  // Removal is deferred so MapLibre can finish dispatching its current event.
  const fail = () => queueMicrotask(() => { if (!stopped) onFailure() })
  gl.on('load', onReady)
  gl.on('error', fail)
  const canvas = gl.getCanvas()
  canvas.addEventListener('webglcontextlost', fail)

  return () => {
    stopped = true
    Util.cancelAnimFrame(transitionFrame)
    gl.off('load', onReady)
    gl.off('error', fail)
    canvas.removeEventListener('webglcontextlost', fail)
    if (map.hasLayer(layer)) map.removeLayer(layer)
  }
}

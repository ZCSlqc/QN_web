import { ref, onMounted, onUnmounted } from 'vue'
import request from '../../utils/request'
import { readPendingFeed, writePendingFeed, clearPendingFeed } from './pendingFeed'

export const foodTypes = [
  { id: 'treat', name: '猫条', unit: '根', description: '一根慢慢舔的小零食', reply: '舔舔舔……还有最后一口！' },
  { id: 'kibble', name: '猫粮', unit: '份', description: '一碗踏踏实实的满足', reply: '咔嚓咔嚓，这顿吃得很认真。' },
  { id: 'can', name: '猫罐头', unit: '罐', description: '值得蹭蹭你的加餐', reply: '是罐罐！这就过来蹭蹭你。' },
]

export function usePet(onFed, scene = null) {
  const pet = ref(null), loading = ref(true), refreshing = ref(false), error = ref(''), feedError = ref('')
  const feeding = ref(false), pendingFood = ref(null)
  const weatherSaving = ref(false), weatherError = ref('')
  async function setWeather(weather) {
    if (!pet.value?.is_admin || weatherSaving.value) return
    weatherSaving.value = true; weatherError.value = ''; generation++
    try {
      const body = new FormData(); body.append('weather', weather)
      const { data } = await request.put('/pet/weather', body, { signal: controller.signal })
      if (!disposed) { generation++; pet.value.weather = data.weather }
    } catch (e) { if (!disposed) weatherError.value = message(e) }
    finally { weatherSaving.value = false }
  }
  const showAllActivity = ref(false)
  const controller = new AbortController()
  let disposed = false, pollTimer, key = '', generation = 0
  let sceneVisible = !scene, sceneObserver
  let restoredFor = null
  function restorePending(userId) {
    if (restoredFor === userId) return
    restoredFor = userId
    const pending = readPendingFeed(userId)
    pendingFood.value = pending?.food || null; key = pending?.key || ''
    feedError.value = pending ? '上次投喂的结果还没确认，请先确认这一份，不会重复扣粮。' : ''
  }
  function clearPending() {
    clearPendingFeed(restoredFor)
    pendingFood.value = null; key = ''
  }
  function newKey() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('') }
  function message(e) { return typeof e.response?.data?.detail === 'string' ? e.response.data.detail : '暂时没连上，稍后再试试。' }
  async function load(background = false) {
    if (feeding.value || refreshing.value || weatherSaving.value) return
    const version = ++generation
    refreshing.value = true
    if (!background && !pet.value) loading.value = true
    try {
      const res = await request.get('/pet', { params: { all_activity: showAllActivity.value }, signal: controller.signal })
      if (!disposed && generation === version) { pet.value = res.data; restorePending(res.data.viewer_id); error.value = '' }
    } catch (e) {
      if (!disposed) error.value = message(e)
    } finally { if (!disposed) { loading.value = false; refreshing.value = false } }
  }
  async function feed(food) {
    if (feeding.value || !pet.value || (food === 'reward_treat' ? !pet.value.can_spend_personal : !pet.value.can_feed)) return
    if (pendingFood.value && pendingFood.value !== food) return
    if (!pendingFood.value) {
      const nextKey = newKey()
      try { writePendingFeed(pet.value.viewer_id, food, nextKey) }
      catch { feedError.value = '浏览器暂时无法保存投喂确认状态，请允许网站存储后再试。'; return }
      pendingFood.value = food; key = nextKey
    }
    generation++
    feeding.value = true; feedError.value = ''
    const body = new FormData(); body.append('food', food); body.append('request_key', key)
    try {
      const res = await request.post(food === 'reward_treat' ? '/pet/reward-feed' : '/pet/feed', body, { signal: controller.signal })
      if (disposed) return
      pet.value = res.data.pet; clearPending(); error.value = ''
      onFed(food === 'reward_treat' ? 'treat' : food, res.data.replayed)
    } catch (e) {
      if (disposed) return
      if (e.response?.status >= 400 && e.response?.status < 500) clearPending()
      feedError.value = e.response ? message(e) : '这次投喂的结果还没确认。请点“确认这次投喂”，不会重复扣粮。'
      if ([401, 403].includes(e.response?.status)) { pet.value.can_feed = false; pet.value.can_spend_personal = false }
    } finally {
      feeding.value = false
      if (!disposed && showAllActivity.value && !pendingFood.value) void load()
    }
  }
  function clearAuth() {
    clearPending(); restoredFor = null
    if (pet.value) { pet.value.can_feed = false; pet.value.can_spend_personal = false; pet.value.personal_treats = 0; pet.value.viewer_id = null }
  }
  async function poll() {
    clearTimeout(pollTimer)
    if (!document.hidden && sceneVisible) await load(true)
    if (!disposed) pollTimer = setTimeout(poll, 30000)
  }
  function visibility() { if (!document.hidden) void poll() }
  onMounted(() => {
    void load()
    if (scene?.value) {
      sceneObserver = new IntersectionObserver(([entry]) => {
        const wasVisible = sceneVisible; sceneVisible = entry.isIntersecting
        if (sceneVisible && !wasVisible) void poll()
      }, { threshold: 0.1 })
      sceneObserver.observe(scene.value)
    } else void poll()
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('auth-expired', clearAuth)
    window.addEventListener('profile-updated', visibility)
  })
  onUnmounted(() => {
    sceneObserver?.disconnect()
    disposed = true; generation++; clearTimeout(pollTimer); controller.abort()
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('auth-expired', clearAuth)
    window.removeEventListener('profile-updated', visibility)
  })
  return { weatherSaving, weatherError, setWeather, pet, loading, refreshing, error, feedError, feeding, pendingFood, load, feed, showAllActivity }
}

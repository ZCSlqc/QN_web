import { ref, watch, onMounted, onUnmounted } from 'vue'

// Files are played at their original speed, once, with no overlapping voices.
export function useCatSounds(scene, action) {
  const enabled = ref(readPreference())
  let voice, visible = false, unlocked = false, observer, lastPlayed = -Infinity, disposed = false
  function readPreference() { try { return localStorage.getItem('liuyi-sounds') !== 'off' } catch { return true } }
  function stop() { if (voice) { voice.pause(); voice.currentTime = 0; voice = null } }
  function play(name) {
    if (disposed || !enabled.value || !unlocked || !visible || document.hidden || Date.now() - lastPlayed < 8000 || (voice && !voice.ended)) return
    stop()
    const audio = new Audio(`/pet/sounds/${name}.mp3`)
    voice = audio; audio.volume = .28; audio.preload = 'none'
    lastPlayed = Date.now()
    void audio.play().catch(() => { if (voice === audio) voice = null })
  }
  function unlock() { unlocked = true }
  function toggle() {
    enabled.value = !enabled.value
    try { localStorage.setItem('liuyi-sounds', enabled.value ? 'on' : 'off') } catch { /* optional */ }
    if (!enabled.value) stop()
    else { unlocked = true; play('meow') }
  }
  watch(action, (next, previous) => {
    if (['sleep', 'leaving-room', 'bathroom'].includes(next)) { stop(); return }
    if (next === 'pet') play('pet')
    else if (next === 'play') play('play')
    else if (['treat', 'kibble', 'can'].includes(next)) play('hungry')
    else if (next === 'idle' && ['kibble', 'can'].includes(previous)) play('content')
    else if (next === 'idle' && ['sleep', 'returning-room'].includes(previous)) play('meow')
  })
  function visibility() { if (document.hidden) stop() }
  onMounted(() => {
    observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) stop() }, { threshold: .2 })
    if (scene.value) observer.observe(scene.value)
    document.addEventListener('pointerdown', unlock, { capture: true })
    document.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('visibilitychange', visibility)
  })
  onUnmounted(() => {
    disposed = true; stop(); observer?.disconnect()
    document.removeEventListener('pointerdown', unlock, { capture: true })
    document.removeEventListener('keydown', unlock, { capture: true })
    document.removeEventListener('visibilitychange', visibility)
  })
  return { enabled, toggle }
}

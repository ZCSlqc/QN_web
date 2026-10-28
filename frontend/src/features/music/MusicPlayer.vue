<template>
  <div class="music-player">
    <audio ref="audio" loop preload="none" :src="musicSrc"
      @play="playing = true" @pause="playing = false" @error="onAudioError" />
    <button class="music-button" :class="{ playing }" :aria-label="playing ? '暂停音乐' : '播放音乐'"
      :aria-pressed="playing" :disabled="pending" @click="toggle">
      <span class="record" aria-hidden="true"><span class="record-label">Q ♡ N</span></span>
      <span class="music-state" aria-hidden="true">{{ playing ? 'Ⅱ' : '♫' }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
const audio = ref(null)
const playing = ref(false)
const pending = ref(false)
const musicSrc = `${import.meta.env.BASE_URL}audio/City_Of_Stars.mp3`
let disposed = false
let errorReported = false
function reportError(error) {
  if (disposed || errorReported || error?.name === 'AbortError') return
  errorReported = true
  const code = audio.value?.error?.code
  const message = error?.name === 'NotAllowedError'
    ? '浏览器阻止了播放，请允许此网站播放声音后重试'
    : code === 2 ? '音乐加载失败，请检查网络后再次点击唱片'
    : code === 3 ? '音乐解码失败，请换一个浏览器重试'
    : code === 4 || error?.name === 'NotSupportedError'
      ? '音乐文件无法读取或格式不受支持，请检查音乐资源是否已部署'
      : '音乐未能播放，请再次点击唱片重试'
  ElMessage.info(message)
}
function onAudioError() {
  playing.value = false
  reportError()
}
async function toggle() {
  if (pending.value || !audio.value) return
  if (playing.value) { audio.value.pause(); return }
  pending.value = true
  errorReported = false
  try {
    if (audio.value.error) audio.value.load()
    await audio.value.play()
  }
  catch (error) { reportError(error) }
  finally { pending.value = false }
}
onUnmounted(() => { disposed = true; audio.value?.pause() })
</script>

<style scoped>
.music-player { position: fixed; bottom: max(24px, env(safe-area-inset-bottom)); right: 20px; z-index: 1001; }
.music-button { position: relative; display: grid; place-items: center; width: 56px; height: 56px; padding: 0; border-radius: 50%; background: transparent; opacity: .5; box-shadow: 0 4px 18px rgba(25,15,20,.28); transition: opacity .3s ease; }
.music-button:hover, .music-button:focus-visible { opacity: .9; }
.record { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; border: 1px solid rgba(255,255,255,.45); background: conic-gradient(from 25deg, transparent 0deg, rgba(255,255,255,.22) 45deg, transparent 80deg, transparent 180deg, rgba(255,255,255,.18) 225deg, transparent 260deg), repeating-radial-gradient(circle, #242128 0px, #242128 2px, #454047 3px, #242128 4px); animation: record-spin 14s linear infinite; animation-play-state: paused; }
.playing .record { animation-play-state: running; }
.record-label { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 50%; background: #d9a0ad; color: #51333d; border: 2px solid #ecc4cd; font-family: Georgia, serif; font-size: 7px; letter-spacing: .3px; }
.music-state { position: absolute; bottom: -2px; right: -2px; display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; background: #fff4f2; color: #85485d; font-size: 11px; border: 1px solid #ddbbc5; }
@keyframes record-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .record { animation: none; } }
</style>

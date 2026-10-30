<template>
  <div class="pet-page">
    <SiteNavigation light :is-admin="isAdmin" :has-mailbox="hasMailbox" :current-username="currentUsername" @mailbox-unavailable="hasMailbox = false" />
    <main class="pet-main">
      <header class="pet-heading"><p class="eyebrow">A LITTLE HOME, A LOT OF LOVE</p><h1>爱的小窝</h1><div class="section-line"></div><p>生活慢一点，陪六一待一会儿。</p></header>
      <div class="pet-layout">
        <section ref="scene" class="pet-room" @dragstart.prevent @contextmenu.prevent @pointerdown="touch.start" @pointermove="roomPointerMove" @pointerup="touch.end" @pointercancel="touch.end" @lostpointercapture="touch.end" @pointerleave="!touch.active() && life.leave()" @click="roomClick" :class="{ 'realistic-room': style === 'realistic', 'night-room': night, 'rainy-room': pet?.weather === 'rainy', 'cloudy-room': pet?.weather === 'cloudy', 'is-playing': action === 'play', 'is-teasing': action === 'play' && activeToy === 'teaser', 'is-stroking': stroking, 'has-petting-hand': life.hand.value.visible }" aria-label="六一的房间">
          <div class="room-topline"><button class="cat-sound-toggle" :aria-label="sounds.enabled.value ? '关闭猫咪音效' : '开启猫咪音效'" :aria-pressed="sounds.enabled.value" @click.stop="sounds.toggle">{{ sounds.enabled.value ? '♪' : '♩' }}</button><div class="style-switch" aria-label="六一形象风格"><button :aria-pressed="style === 'illustrated'" :class="{ active: style === 'illustrated' }" @click="setStyle('illustrated')">插画</button><button :aria-pressed="style === 'realistic'" :class="{ active: style === 'realistic' }" @click="setStyle('realistic')">写实</button></div></div>
          <div class="room-window" aria-hidden="true"><span class="window-sun"></span><span class="window-cloud"></span><span class="window-cloud cloud-far"></span><div v-if="pet?.weather === 'rainy'" class="window-rain"><i v-for="n in 18" :key="n" :style="{ left: ((n * 37) % 113) + '%', height: (9 + n % 5 * 4) + 'px', opacity: .22 + n % 4 * .12, animationDuration: (.65 + n % 6 * .19) + 's', animationDelay: (-n * .31) + 's' }"></i><b v-for="n in 4" :key="'drop' + n" :style="{ left: (n * 23 - 10) + '%', animationDelay: (-n * 2.7) + 's', animationDuration: (8 + n * 2) + 's' }"></b></div></div>
          <div class="weather-control" role="group" aria-label="窗外天气"><div class="weather-icons" aria-hidden="true"><span v-for="option in weatherOptions" :key="option.id" :class="{ selected: (pet?.weather || 'sunny') === option.id }"><img :src="`/pet/liuyi/weather/${option.id}.png`" alt="" /></span></div><button v-for="option in weatherOptions" :key="option.id" :aria-label="option.label" :title="option.label" :aria-pressed="(pet?.weather || 'sunny') === option.id" :disabled="!pet?.is_admin || weatherSaving" @click.stop="setWeather(option.id)"><img :src="`/pet/liuyi/weather/${option.id}.png`" alt="" /></button><p v-if="weatherError" role="alert">{{ weatherError }}</p></div>
          <div class="wall-note" aria-hidden="true"><span>今日待办</span><strong>{{ wallNote[0] }}<br/>{{ wallNote[1] }}</strong><i>♡</i></div>
          <div class="room-floor" aria-hidden="true"></div>
          <div class="cat-rug" aria-hidden="true"></div>
          <div class="cat-home"><div></div><span>61</span><button v-if="life.sleeping.value" class="sleeping-cat" aria-label="轻轻叫醒六一" @click.stop="life.wake"><img :src="`/pet/liuyi/${style}/sleep.webp`" alt="六一闭眼枕着爪子睡觉" /><span class="sleep-zzz" aria-hidden="true">zzZ</span></button></div>
          <Transition name="speech"><div v-if="bubbleVisible && !life.sleeping.value && action !== 'bathroom'" class="speech-bubble" :style="{ left: Math.max(38, Math.min(62, walk.x.value)) + '%' }" role="status" aria-live="polite">{{ speech }}</div></Transition>
          <div v-show="!life.sleeping.value && action !== 'bathroom'" class="cat-wrap" :class="[style, action, { 'walking-left': walk.walking.value && walk.facing.value < 0 }]" :style="walk.spriteStyle.value" :data-x="walk.x.value">
            <button class="cat-touch" aria-label="摸摸六一" :disabled="feeding || away" @click="catClick">
              <CatSprite :style-name="style" :pose="pose" :walking="walk.walking.value" :walk-frame="walk.frame.value" />
            </button>
            <img v-if="moments.emotion.value" :key="moments.emotion.value" class="cat-emotion" :class="moments.emotion.value" :src="`/pet/liuyi/emotions/${moments.emotion.value}.png`" alt="" aria-hidden="true" />
          </div>
          <FeedingProps :action="action" />
          <CatFurniture :drinking="action === 'drinking'" />
          <div v-if="action === 'play'" class="cat-toy" :class="{ 'toy-mouse': activeToy === 'mouse', 'toy-teaser': activeToy === 'teaser', 'mouse-left': life.mouse.value.left }" :style="activeToy === 'mouse' ? { left: life.mouse.value.x + '%' } : { left: toyPoint.x + '%', top: toyPoint.y + '%' }" aria-hidden="true"><img :src="activeToy === 'mouse' ? '/pet/liuyi/icons/toy-mouse.png' : '/pet/liuyi/interaction/hand-teaser.webp'" alt="" /></div>
          <img v-if="life.hand.value.visible" class="petting-hand" :class="{ stroking }" src="/pet/liuyi/interaction/hand-pet.webp" :style="{ left: life.hand.value.x + 'px', top: life.hand.value.y + 'px' }" alt="" aria-hidden="true" />
          <div class="scene-tools" role="group" aria-label="陪六一玩">
            <button :disabled="away || feeding || eating || action === 'approaching-food'" :aria-pressed="action === 'play' && activeToy === 'teaser'" aria-label="逗猫棒" title="逗猫棒" @click.stop="playWith('teaser')"><img src="/pet/liuyi/icons/cat-teaser.png" alt="" /><span>逗猫棒</span></button>
            <button :disabled="away || feeding || eating || action === 'approaching-food'" :aria-pressed="action === 'play' && activeToy === 'mouse'" aria-label="玩具老鼠" title="玩具老鼠" @click.stop="playWith('mouse')"><img src="/pet/liuyi/icons/toy-mouse.png" alt="" /><span>玩具老鼠</span></button>
            <button v-for="food in sceneFoods" :key="food.id" :aria-label="`画面内投喂${food.name}`" :title="food.name" :disabled="!canSceneFeed(food.id)" @click.stop="sceneFeed(food.id)"><FoodIcon :kind="food.id" /><span>{{ food.name }}</span><small>{{ sceneFoodCount(food.id) }}</small></button>
          </div>
          <div class="room-caption"><span>六一小朋友·{{ currentState }}</span></div>
        </section>

        <aside class="pet-sidebar">
          <section class="pet-card hello-card">
            <p class="card-eyebrow">SAY HELLO</p><h2>来都来了，陪六一玩一会儿</h2>
            <p>摸摸头，逗一逗，有猫条的话就喂它一根。</p>
            <div class="touch-actions"><button :disabled="away || feeding || eating || action === 'approaching-food'" @click="interact('pet')"><span aria-hidden="true">♡</span>摸摸头</button><button :disabled="away || feeding || eating || action === 'approaching-food'" @click="playWith('teaser')"><span aria-hidden="true">✧</span>逗一逗</button></div>
            <small v-if="pet?.is_admin">猫条、猫粮、罐头，都从你们一起攒的小背包里拿。</small>
            <CatFriends />
          </section>
          <section v-if="pet" class="pet-card pantry-card" :aria-busy="feeding">
            <div class="card-title-row"><div><p class="card-eyebrow">{{ pet.is_admin ? 'OUR LITTLE BACKPACK' : 'GIFTS FOR LIUYI' }}</p><h2>{{ pet.is_admin ? '我们的小背包' : '你带来的礼物' }}</h2></div><button class="refresh-pet" :disabled="refreshing || feeding" aria-label="刷新食物背包" @click="load()">↻</button></div>
            <template v-if="pet.is_admin">
              <p class="pantry-hint">两个人一起攒，一起花</p>
              <p class="pantry-sources">上传新照片 → 猫条 | 完成心愿 → 猫粮 | 完成旅程 → 罐头</p>
            </template>
            <div v-else class="gift-reward-note">
              <small class="reward-rule">每天第一条首页祝福留言，可获得 1 根猫条。</small>
              <router-link :to="{ path: '/index', query: { compose: 'blessing' }, hash: '#story' }">{{ pet.reward_claimed_today ? '今日已领取 · 再送一句祝福 →' : '去送祝福，攒根猫条 →' }}</router-link>
            </div>
            <div class="food-list"><button v-for="food in foodTypes" :key="food.id" class="food-item" :class="[food.id, { 'owner-only': !pet.is_admin && food.id !== 'treat' }]" :aria-label="`投喂${food.name}`" :disabled="!canSceneFeed(food.id)" @click="sceneFeed(food.id)">
              <span class="food-icon"><FoodIcon :kind="food.id" /></span><span class="food-copy"><strong>{{ food.name }}</strong><small>{{ !pet.is_admin && food.id !== 'treat' ? '主人专属，粮库未开放' : food.description }}</small></span><span v-if="pet.is_admin || food.id === 'treat'" class="food-count">{{ sceneFoodCount(food.id) }}<small>{{ food.unit }}</small></span>
            </button></div>
            <p v-if="pet.is_admin && !pet.can_feed" class="pantry-hint">背包仅由配置好的两位主人投喂。</p>
          </section>
          <p v-if="loading" class="pet-state" role="status">正在看看六一的近况…</p>
          <div v-if="error" class="pet-error" role="alert">{{ error }} <button :disabled="feeding" @click="load()">重试</button></div>
          <p v-if="feeding" class="pet-state" role="status">把食物递给六一…</p>
          <p v-if="feedError" class="pet-error" role="alert">{{ feedError }}</p>
          <button v-if="pendingFood && !feeding && (pendingFood === 'reward_treat' ? pet?.can_spend_personal : pet?.can_feed)" class="retry-feed" :disabled="away" @click="feed(pendingFood)">确认这次投喂</button>
        </aside>
      </div>

      <section class="pet-diary">
        <div class="diary-heading"><div><p class="card-eyebrow">OUR SMALL MOMENTS</p><h2>六一的小日常</h2></div><span v-if="pet">已经被惦记着喂了 {{ pet.feed_count }} 次</span></div>
        <p v-if="!pet" class="diary-empty">等零食柜打开，再一起看看六一的日常。</p>
        <p v-else-if="!pet.activity.length" class="diary-empty">六一刚搬进来，还在四处闻闻。第一顿饭，会是谁来喂呢？</p>
        <ol v-else class="diary-list"><li v-for="event in visibleActivity" :key="event.id"><span class="diary-dot" aria-hidden="true">♡</span><p><strong>{{ event.actor_name }}</strong> {{ event.kind === 'reward_feed' ? '把留言攒下的猫条喂给了六一。' : '从背包里拿了' + foodSentence(event.food) + '，喂给六一。' }}<small>{{ formatTime(event.created_at) }}</small></p><span class="diary-food"><FoodIcon :kind="event.food" /></span></li></ol>
        <p v-if="showAllActivity && historyError" class="pet-error" role="alert">{{ historyError }} <button @click="loadHistory()">重试</button></p>
        <button v-if="showAllActivity && historyCursor" class="diary-toggle" :disabled="historyLoading" @click="loadHistory(true)">{{ historyLoading ? '加载中…' : '加载更多' }}</button>
        <button v-if="pet && pet.feed_count > 3" class="diary-toggle" :disabled="refreshing || feeding" :aria-expanded="showAllActivity" @click="toggleActivity">{{ showAllActivity ? '收起' : '显示全部' }}</button>
      </section>
      <footer class="pet-footer">不管今天过得怎么样，这里总有一只小猫等你。<span>♡</span></footer>
    </main>
  </div>
</template>

<script setup>
import { recentProfile } from '../features/auth/pageAccess'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePet, foodTypes } from '../features/pet/usePet'
import FoodIcon from '../features/pet/FoodIcon.vue'
import CatFurniture from '../features/pet/CatFurniture.vue'
import { useCatSounds } from '../features/pet/useCatSounds'
import { useCatMoments } from '../features/pet/useCatMoments'
import { useCatWater } from '../features/pet/useCatWater'
import FeedingProps from '../features/pet/FeedingProps.vue'
import CatSprite from '../features/pet/CatSprite.vue'
import CatFriends from '../features/pet/CatFriends.vue'
import { useCatInteraction } from '../features/pet/useCatInteraction'
import { useRoomTime } from '../features/pet/useRoomTime'
import { useCatLife } from '../features/pet/useCatLife'
import { useTouchCat } from '../features/pet/useTouchCat'
import { useCatWalk } from '../features/pet/useCatWalk'
import SiteNavigation from '../components/shared/SiteNavigation.vue'
import request from '../utils/request'
const isAdmin = ref(false), hasMailbox = ref(false), currentUsername = ref('')
const authController = new AbortController()
onMounted(async () => {
  try { const { data } = (recentProfile() ? { data: recentProfile() } : await request.get('/me', { signal: authController.signal })); isAdmin.value = data.is_admin === true; hasMailbox.value = data.has_mailbox === true; currentUsername.value = data.display_name || data.username || '' } catch { /* route guard handles login expiry */ }
})
onUnmounted(() => authController.abort())
const { night } = useRoomTime()
const style = ref(readPreference())
const { scene, action, pose, say, speech, bubbleVisible, eating, toyPoint, stroking, interact: react, feedReaction, reset, moveToy } = useCatInteraction()
const walk = useCatWalk(scene, style, action)
const sounds = useCatSounds(scene, action)
const weatherOptions = [{ id: 'sunny', label: '晴天' }, { id: 'cloudy', label: '阴天' }, { id: 'rainy', label: '雨天' }]
const { weatherSaving, weatherError, setWeather, pet, loading, refreshing, error, feedError, feeding, pendingFood, load, feed, showAllActivity, history, historyCursor, historyLoading, historyError, loadHistory } = usePet((food, replayed) => {
  life.wake(); action.value = 'approaching-food'
  if (!walk.walking.value) scene.value?.scrollIntoView({ block: 'center', behavior: 'auto' })
  walk.go(50, () => feedReaction(food, replayed))
}, scene)
const life = useCatLife({ scene, action, pose, walk, reset, react, moveToy, feeding, eating, say })
useCatWater({ scene, action, pose, walk, reset, say, feeding })
const moments = useCatMoments({ scene, action, walk, reset, say, feeding })
const away = moments.away
const { activeToy, playWith } = life
watch(() => pet.value?.weather, (value, previous) => { if (previous && value !== previous && action.value === 'idle') say(value === 'rainy' ? '外面下雨啦，还好窝里暖暖的。' : value === 'cloudy' ? '云朵把天空盖住啦。' : night.value ? '云散啦，看看月亮。' : '太阳出来啦，找个地方晒晒。', false) })
const wallNote = computed(() => pet.value?.weather === 'rainy' ? ['听听雨', '陪你窝着'] : pet.value?.weather === 'cloudy' ? ['看看云', '等你回来'] : night.value ? ['看月亮', '等你晚安'] : ['晒太阳', '等你回来'])
const currentState = computed(() => ({ sleep: '睡觉中', 'leaving-room': '出去一下', bathroom: '上厕所去了', 'returning-room': '回来啦', 'approaching-water': '去喝水', drinking: '喝水中', 'going-home': '准备睡觉', 'approaching-food': '开饭啦', treat: '吃猫条', kibble: '吃猫粮', can: '吃罐罐', pet: '享受摸摸', play: activeToy.value === 'mouse' ? '追小老鼠' : '玩逗猫棒' })[action.value] || (walk.walking.value ? '散步中' : '发会儿呆'))
function interact(kind) {
  if (away.value || feeding.value || eating.value || action.value === 'approaching-food') return
  if (['sleep', 'going-home', 'play', 'approaching-water', 'drinking'].includes(action.value)) life.wake()
  walk.stop(); react(kind)
}
const touch = useTouchCat({ scene, action, activeToy, hand: life.hand, moveToy: life.teaserMove,
  busy: computed(() => away.value || feeding.value || eating.value || action.value === 'approaching-food'),
  pet: () => interact('pet'),
})
function roomPointerMove(event) { if (touch.active()) touch.move(event); else if (event.pointerType !== 'touch') life.pointerMove(event) }
function catClick(event) { if (action.value === 'play' && activeToy.value === 'teaser') { life.teaserMove(event); return }; if (!touch.ignoreClick()) interact('pet') }
function roomClick(event) { if (event.target.closest('.scene-tools, .room-topline, .weather-control')) return; if (action.value === 'play' && activeToy.value === 'teaser') { life.teaserMove(event); return }; if (!touch.ignoreClick()) walk.floorClick(event) }
const visibleActivity = computed(() => showAllActivity.value ? history.value : (pet.value?.activity || []).slice(0, 3))
async function toggleActivity() { showAllActivity.value = !showAllActivity.value; if (showAllActivity.value) await loadHistory() }
const sceneFoods = computed(() => pet.value?.is_admin ? foodTypes : foodTypes.filter(food => food.id === 'treat'))
function sceneFoodCount(food) { return pet.value?.is_admin ? pet.value.inventory?.[food] || 0 : food === 'treat' ? pet.value?.personal_treats || 0 : 0 }
function canSceneFeed(food) { return !away.value && !feeding.value && !eating.value && action.value !== 'approaching-food' && !pendingFood.value && sceneFoodCount(food) > 0 && (pet.value?.is_admin ? pet.value.can_feed : food === 'treat' && pet.value?.can_spend_personal) }
function sceneFeed(food) { if (canSceneFeed(food)) void feed(pet.value.is_admin ? food : 'reward_treat') }
function readPreference() { try { return localStorage.getItem('liuyi-style') === 'illustrated' ? 'illustrated' : 'realistic' } catch { return 'realistic' } }
function setStyle(value) { style.value = value; try { localStorage.setItem('liuyi-style', value) } catch { /* preference is optional */ } }
function foodSentence(food) { return ({ treat: '一根猫条', kibble: '一份猫粮', can: '一罐猫罐头' })[food] || '一份食物' }
function formatTime(value) { return value.replace(/^(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`).slice(0, -3) }
</script>

<style scoped src="../features/pet/pet.css"></style>

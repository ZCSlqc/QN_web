<template>
  <main class="wedding-page">
    <div
      ref="canvas"
      class="wedding-canvas"
      aria-label="婚礼庭院，点击地面走动"
    ></div>
    <div class="wedding-labels" aria-hidden="true">
      <span
        v-for="label in labels.filter((item) => item.visible && !item.cat && !item.speech)"
        :key="label.id"
        :style="{ left: label.x + 'px', top: label.y + 'px' }"
        >{{ label.name }}</span
      >
    </div>
    <div class="wedding-speeches"><div v-for="label in labels.filter(item=>item.visible&&item.speech)" :key="label.id" class="juggler-speech" :style="{left:label.speechX+'px',top:label.speechY+'px'}"><small>{{label.name}}</small><span>{{label.speech.slice(0,-5)}}</span><strong>{{label.speech.slice(-5)}}</strong></div></div>
    <div class="wedding-cat-labels">
      <button
        v-for="label in labels.filter((item) => item.visible && item.cat)"
        :key="label.id"
        :class="{ active: label.active }"
        :style="{ left: label.x + 'px', top: label.y + 'px' }"
        :aria-label="'摸摸' + label.name"
        @click="scene?.petCat(label.id)"
      >{{ label.name }} · {{ label.personality }}</button>
    </div>
    <router-link class="wedding-back" to="/index">← 返回</router-link>
    <WeddingAmenities v-if="ready" :layout="sceneLayout" @claim="claimItem" @put-away="putAway" @consumed="consumeItem" @cancel-approach="scene?.stopApproach()" @approach="station => { scene?.approach(station); message = `正在走向${station.label}，到附近后打开。`; }" />
    <header class="wedding-title">
      <p>TOGETHER, WITH YOU</p>
      <h1>爱的婚礼</h1>
      <span>{{coupleNames.groom}} & {{coupleNames.bride}} · 有你在，今天更美好</span>
    </header>
    <p v-if="!ready && !error" class="wedding-loading" role="status">
      正在布置花园…
    </p>
    <p v-if="error" class="wedding-error" role="alert">
      {{ error }}<button @click="start">重新加载</button>
    </p>
    <div class="wedding-toolbar">
      <p aria-live="polite">{{ message }}</p>
      <div>
        <button :disabled="!ready" @click="act('walk')">🚶 走路</button>
        <button :disabled="!ready" @click="act('clap')">👏 鼓掌</button>
        <button :disabled="!ready" @click="act('dance')">♪ 跳舞</button>
        <button :disabled="!ready" @click="act('jump')">↟ 跳跃</button>
        <button :disabled="!ready" aria-label="更多舞步" :aria-expanded="motionOpen" @click="motionOpen=!motionOpen;wardrobe=false;emojiOpen=false">舞步</button>
        <button :disabled="!ready" @click="act('bless')">♡ 祝福</button>
        <button :disabled="!ready" :aria-expanded="emojiOpen" @click="emojiOpen = !emojiOpen; wardrobe = false;motionOpen=false">emoji</button>
        <button
          :disabled="!ready"
          aria-label="我的造型" @click="wardrobe = !wardrobe; emojiOpen = false;motionOpen=false"
          :aria-expanded="wardrobe"
        >
          造型
        </button>
      </div>
      <small>点击地面走动 · 摸摸猫咪 · 拖动查看两侧</small>
    </div>
    <button
      v-if="ready"
      class="wedding-center"
      aria-label="回到我的位置"
      title="定位我 · 点亮脚下光圈"
      @click="scene?.center(); message = '找到你啦，脚下光圈就是你的位置。'"
    >
      ⌖
    </button>
    <WeddingWardrobe
      v-if="wardrobe"
      :appearance="appearance"
      :nickname="nickname"
      :busy="changingLook"
      :error="lookError"
      :default-appearance="weddingAppearance(weddingRole(currentProfile),weddingPersona(currentProfile))"
      :library-outfits="libraryOutfits" :library-busy="libraryBusy" :library-error="libraryError"
      @save-outfit="saveOutfit" @remove-outfit="removeOutfit"
      @apply="applyLook"
      @close="wardrobe = false"
    />
    <section v-if="motionOpen" class="motion-picker" aria-label="选择舞步">
      <header><strong>选一支小舞</strong><button aria-label="关闭舞步" @click="motionOpen=false">×</button></header>
      <div><button v-for="move in danceMoves" :key="move.id" @click="act(move.id);motionOpen=false"><span>{{move.label}}</span><small>{{move.description}}</small></button><button @click="act('wave');motionOpen=false"><span>挥手招呼</span><small>向朋友轻轻挥手</small></button><button @click="act('stretch');motionOpen=false"><span>伸个懒腰</span><small>举起双臂，放松一下</small></button><button @click="act('scratch');motionOpen=false"><span>抓抓屁股</span><small>一个不经意的小动作</small></button><button @click="act('sway');motionOpen=false"><span>轻轻摇摆</span><small>站着也可以活动一下</small></button></div>
    </section>
    <section v-if="emojiOpen" class="emoji-picker" aria-label="emoji 表达感想" @keydown.esc="emojiOpen = false">
      <header><strong>emoji · 表达一下</strong><button aria-label="关闭 emoji" @click="emojiOpen = false">×</button></header>
      <p>临时换上这张头像，5 秒后恢复原来的造型。</p>
      <div class="emoji-options">
        <button v-for="item in emojiHeads.filter(e => emojiMore || e.featured)" :key="item.id" :aria-label="'表达：' + item.label"
          @click="express(item)"><img :src="partUrl(item)" alt="" /><span>{{ item.label }}</span></button>
      </div>
      <button class="emoji-more" :aria-expanded="emojiMore" @click="emojiMore = !emojiMore">{{ emojiMore ? '收起' : '更多趣味' }}</button>
      <p v-if="emojiError" role="alert">{{ emojiError }}</p>
    </section>
  </main>
</template>
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { currentProfile } from "../features/auth/pageAccess";
import WeddingWardrobe from "../features/wedding/WeddingWardrobe.vue";
import { emojiHeads, partUrl } from "../features/wedding/catalog";
import {danceMoves} from '../features/wedding/motions';
import WeddingAmenities from '../features/wedding/WeddingAmenities.vue';
import {weddingRole,weddingAppearance,weddingPersona} from '../features/wedding/weddingIdentity';
import {loadWardrobe,saveAppearance,saveUserOutfit,removeUserOutfit} from '../features/wedding/wardrobeStore';
import {loadWeddingPeople} from '../features/wedding/weddingPeople';
const libraryOutfits=ref([]),libraryBusy=ref(false),libraryError=ref('');
const coupleNames=ref({groom:'新郎',bride:'新娘'});
const sceneLayout=ref({left:0,top:0,scale:1});
const motionOpen=ref(false);
const emojiOpen = ref(false), emojiMore = ref(false), emojiError = ref("");
const canvas = ref(null),
  labels = ref([]),
  ready = ref(false),
  error = ref(""),
  wardrobe = ref(false);
const nickname = computed(
    () =>
      currentProfile.value?.nickname?.trim() ||
      currentProfile.value?.username ||
      currentProfile.value?.display_name ||
      "来宾",
  ),
  appearance = ref(weddingAppearance(weddingRole(currentProfile.value),weddingPersona(currentProfile.value)));
const changingLook = ref(false),
  lookError = ref("");
const message = ref("带着祝福，慢慢走近。");
let scene,
  disposed = false,
  loading = false;
const controller = new AbortController();
async function start() {
  if (loading) return;
  loading = true;
  error.value = "";
  ready.value = false;
  try {
    const { createWeddingScene } = await import("../features/wedding/scene");
    const [stored,people]=await Promise.all([loadWardrobe(currentProfile.value,{signal:controller.signal}),loadWeddingPeople(currentProfile.value,{signal:controller.signal})]);
    libraryOutfits.value=stored.outfits;
    for(const person of people)if(person.role==='groom'||person.role==='bride')coupleNames.value[person.role]=person.name;
    const ownRole=weddingRole(currentProfile.value);if(ownRole)coupleNames.value[ownRole]=nickname.value;
    if(stored.appearance)appearance.value=stored.appearance;
    if (disposed) return;
    scene?.dispose();
    labels.value = [];
    const created = await createWeddingScene(
      canvas.value,
      (value) => (labels.value = value),
      { signal: controller.signal, role:weddingRole(currentProfile.value), persona:weddingPersona(currentProfile.value), username:currentProfile.value?.username,people,playerAppearance:appearance.value, onLayout: value => (sceneLayout.value=value), onPet: (name) => (message.value = `${name}收到你的摸摸，送你一颗小爱心。`) },
    );
    if (disposed) {
      created.dispose();
      return;
    }
    scene = created;
    await scene.customize(nickname.value, appearance.value);
    ready.value = true;
  } catch {
    if (!disposed) error.value = "花园素材暂时没有加载好，或猫咪资料未能读取，请重试。";
  } finally {
    loading = false;
  }
}
function act(kind) {
  if (!scene?.gesture(kind)) return;
  message.value = {
    walk: "点一下地面，走到你想去的地方。",
    clap: `把掌声送给${coupleNames.value.groom}和${coupleNames.value.bride}。`,
    dance: "跟着心情，轻轻跳一支舞。",
    jump: "轻轻跃起，把开心送到半空。",
    wave: "挥挥手，和大家打个招呼。",
    stretch: "伸个懒腰，放松一下。",
    scratch: "悄悄整理一下衣服，继续参加婚礼。",
    sway: "轻轻摇一摇，等一等朋友。",
    bless: "把两颗爱心，送给今天的两位主角。",
  }[kind]||`一起跳一支${danceMoves.find(p=>p.id===kind)?.label||'小舞'}。`;
}
async function express(item) {
  emojiError.value = "";
  try {
    if (await scene?.express(item.id)) {
      message.value = `此刻的心情：${item.label}`;
      emojiOpen.value = false;
    }
  } catch { emojiError.value = "这个 emoji 暂时没有加载好，点一下重试。"; }
}
async function claimItem(item){
  try{if(await scene?.carry(item.id))message.value=`拿上${item.name}，一起逛逛花园。`;}
  catch{message.value='这件物品暂时没有加载好，请再领取一次。';}
}
async function putAway(){if(await scene?.carry(null))message.value='把物品放回，双手又空出来啦。';}
async function consumeItem(item){if(await scene?.carry(null))message.value=`${item.name}${item.category==='drinks'||item.id==='coconut-drink'?'喝':'吃'}完啦，再去挑一份吧。`;}
async function applyLook(value) {
  if (changingLook.value || !scene) return;
  changingLook.value = true;
  lookError.value = "";
  try {
    if (await scene.customize(nickname.value, value)) {
      const stored=await saveAppearance(currentProfile.value,value);
      libraryOutfits.value=stored.outfits;
      appearance.value = { ...value };
      wardrobe.value = false;
    }
  } catch {
    lookError.value = "这次换装没有保存好，请重试。";
  } finally {
    changingLook.value = false;
  }
}
async function saveOutfit(value){
 if(libraryBusy.value)return;libraryBusy.value=true;libraryError.value='';
 try{const stored=await saveUserOutfit(currentProfile.value,value.name,value.appearance);libraryOutfits.value=stored.outfits;}
 catch(error){libraryError.value=error.response?.data?.detail||'这套搭配没有保存好，请重试。';}
 finally{libraryBusy.value=false;}
}
async function removeOutfit(id){
 if(libraryBusy.value)return;libraryBusy.value=true;libraryError.value='';
 try{const stored=await removeUserOutfit(currentProfile.value,id);libraryOutfits.value=stored.outfits;}
 catch{libraryError.value='这套搭配暂时没有移除，请重试。';}
 finally{libraryBusy.value=false;}
}
watch(nickname, (name) => {
  if (scene) void scene.customize(name, appearance.value).catch(() => {});
});
onMounted(start);
onUnmounted(() => {
  disposed = true;
  controller.abort();
  scene?.dispose();
});
</script>
<style scoped>
.motion-picker{position:absolute;z-index:7;bottom:165px;right:24px;width:min(360px,calc(100% - 32px));max-height:calc(100dvh - 240px);overflow:auto;border:1px solid #e6dace;background:#fffaf3f5;border-radius:18px;padding:16px;box-shadow:0 8px 32px #573f3429}.motion-picker header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.motion-picker button{border:1px solid #e2d4c5;border-radius:10px;padding:10px;background:#f5ede1;color:#756354;cursor:pointer}.motion-picker>div{display:grid;grid-template-columns:1fr 1fr;gap:8px}.motion-picker span,.motion-picker small{display:block}.motion-picker small{font-size:10px;margin-top:5px;color:#998978}.motion-picker header button{padding:3px 9px}.wedding-toolbar>div{flex-wrap:wrap}
.wedding-page {
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 320px;
  overflow: hidden;
  background: #eae5d9;
  color: #756354;
}
.wedding-emotions { position:absolute; inset:0; pointer-events:none; }
.wedding-emotions img { position:absolute; width:52px; height:52px; object-fit:contain; transform:translate(-50%,-100%); filter:drop-shadow(0 2px 4px #69513e33); }
.emoji-picker { position:absolute; z-index:6; bottom:165px; right:24px; width:min(340px,calc(100% - 32px)); max-height:calc(100dvh - 260px); overflow:auto; padding:16px; box-sizing:border-box; border-radius:20px; background:#fffaf3f5; box-shadow:0 8px 32px #573f3429; }
.emoji-picker header { display:flex; align-items:center; justify-content:space-between; }
.emoji-picker p { font-size:12px; margin:10px 0; }
.emoji-picker button { cursor:pointer; color:inherit; border-radius:12px; padding:8px; background:#f1e5d7; }
.emoji-options { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
.emoji-options img { width:100%; aspect-ratio:1; object-fit:contain; }
.emoji-options span { display:block; font-size:10px; }
.emoji-more { margin-top:10px; }
.wedding-canvas {
  position: absolute;
  inset: 0;
  touch-action: none;
}
.wedding-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.wedding-back {
  position: absolute;
  left: 24px;
  top: 24px;
  padding: 10px 17px;
  border-radius: 24px;
  background: #fffaf0dd;
  color: #756354;
  font-size: 14px;
  z-index: 3;
}
.wedding-title {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
  width: max-content;
  color: #fff9ed;
  text-shadow: 0 2px 12px #30231780;
}
.wedding-title p {
  font-size: 10px;
  letter-spacing: 3px;
  color: #fff1da;
}
.wedding-title h1 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 30px;
  margin: 8px 0;
}
.wedding-title span {
  font-size: 12px;
  letter-spacing: 1px;
}
.wedding-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.wedding-speeches{position:absolute;inset:0;pointer-events:none;overflow:hidden}.juggler-speech{position:absolute;transform:translate(-50%,-100%);box-sizing:border-box;width:220px;padding:8px 12px;border:1px solid #ddc78d;border-radius:12px;background:#fff9e9f2;color:#806135;box-shadow:0 4px 14px #795c2920;font-size:12px;line-height:1.65;text-align:center}.juggler-speech::before{content:'';position:absolute;bottom:-6px;left:50%;width:10px;height:10px;background:#fff9e9;transform:translateX(-50%) rotate(45deg);border-right:1px solid #ddc78d;border-bottom:1px solid #ddc78d}.juggler-speech small{display:block;font-size:10px;color:#ad8c53;letter-spacing:1px}.juggler-speech span,.juggler-speech strong{display:block}.juggler-speech strong{font-size:13px;color:#ad7437;font-weight:600}
.wedding-cat-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.wedding-cat-labels button {
  position: absolute;
  transform: translate(-50%, -100%);
  opacity: 0;
  border-radius: 12px;
  padding: 4px 9px;
  background: #fff5e8ed;
  color: #795d50;
  font-size: 11px;
}
.wedding-cat-labels button.active,
.wedding-cat-labels button:focus-visible {
  opacity: 1;
}
.wedding-cat-labels button:focus-visible {
  outline: 2px solid #bd8a6b;
}
.wedding-labels span {
  position: absolute;
  transform: translate(-50%, -100%);
  background: #fffbf2df;
  box-shadow: 0 2px 8px #49372a12;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
  white-space: nowrap;
}
.wedding-toolbar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  width: min(620px, calc(100% - 32px));
  box-sizing: border-box;
  padding: 12px 16px 10px;
  border: 1px solid #ffffff70;
  border-radius: 22px;
  background: linear-gradient(135deg, #fffaf07a, #fff4e84d);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 28px #60432a12, inset 0 1px 0 #ffffff70;
}
.wedding-toolbar p {
  font-size: 12px;
  color: #624b3c;
  margin: 0 0 10px;
  line-height: 1.5;
  text-shadow: 0 1px 3px #fff9eec9;
}
.wedding-toolbar > div {
  display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
}
.wedding-toolbar button,
.wedding-error button {
  padding: 10px 7px;
  border-radius: 20px;
  background: #edd8ce;
  color: #795d50;
  cursor: pointer;
}
.wedding-toolbar button {
  min-height: 42px;
  padding: 10px 4px;
  border: 1px solid #ffffff66;
  border-radius: 14px;
  background: #fffaf038;
  color: #604938;
  font-size: 12px;
  white-space: nowrap;
  transition: background .16s, box-shadow .16s;
}
.wedding-toolbar button:hover:not(:disabled),
.wedding-toolbar button[aria-expanded="true"] {
  background: #fffaf0b3;
  box-shadow: 0 3px 10px #70533a12;
}
.wedding-toolbar button:focus-visible { outline: 2px solid #936c52; outline-offset: 2px; }
.wedding-toolbar button:disabled { opacity: .45; cursor: default; }
.wedding-toolbar small {
  display: block;
  font-size: 10px;
  color: #796451;
  margin-top: 8px;
  text-shadow: 0 1px 3px #fff9ee;
}
.wedding-error {
  position: absolute;
  top: 45%;
  left: 10%;
  right: 10%;
  padding: 24px;
  background: #fff8ef;
  text-align: center;
  border-radius: 16px;
}
.wedding-error button {
  margin-left: 12px;
}
@media (max-width: 600px) {
  .juggler-speech{padding:6px 10px;font-size:11px;line-height:1.45}
  .juggler-speech small{display:none}
  .juggler-speech strong{font-size:12px}
  .wedding-back {
    left: 12px;
    top: 14px;
    padding: 8px 12px;
  }
  .wedding-title {
    top: 20px;
  }
  .wedding-title span {
    display: none;
  }
  .wedding-title h1 {
    font-size: 23px;
  }
  .wedding-title p {
    font-size: 8px;
    letter-spacing: 1px;
  }
  .wedding-toolbar {
    bottom: max(12px, env(safe-area-inset-bottom));
    padding: 10px;
  }
  .wedding-toolbar > div { grid-template-columns: repeat(8, minmax(0, 1fr));gap:3px; }
  .wedding-toolbar button {
    font-size: 10px;
    min-height:36px;
    padding: 8px 1px;
    white-space:nowrap;
  }
  .wedding-wardrobe {
    right: 16px;
    bottom: 170px;
  }
}
.wedding-loading {
  position: absolute;
  top: 45%;
  width: 100%;
  text-align: center;
  color: #8f7362;
  pointer-events: none;
}
.wedding-center {
  position: absolute;
  right: 22px;
  top: 22px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fffaf0dd;
  color: #795d50;
  cursor: pointer;
  font-size: 24px;
}
.wedding-canvas :deep(canvas) {
  cursor: crosshair;
  outline: none;
}
.wedding-canvas :deep(canvas:focus-visible) {
  outline: 2px solid #bd8a6b;
  outline-offset: -4px;
}
@media (max-height: 550px) {
  .wedding-title {
    top: 14px;
  }
  .wedding-title h1 {
    font-size: 21px;
    margin: 3px 0;
  }
  .wedding-title span {
    display: none;
  }
  .wedding-toolbar {
    bottom: 8px;
    padding: 8px 14px;
  }
  .wedding-toolbar p {
    display: none;
  }
  .wedding-wardrobe {
    bottom: 98px;
    max-height: calc(100dvh - 110px);
    overflow: auto;
  }
}
</style>

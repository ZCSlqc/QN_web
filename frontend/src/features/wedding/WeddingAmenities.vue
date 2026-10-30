<template>
  <div class="amenities">
    <div class="station-layer">
      <button v-for="station in stations" :key="station.id" class="station" :class="{ 'qr-stand': station.id==='payment' }" :data-station="station.id"
        :style="position(station)" @click="open(station.id)" :aria-label="station.label">
        <template v-if="station.id!=='payment'"><span>{{ station.icon }}</span>{{ station.label }}</template>
      </button>
    </div>
    <nav class="quick-access" aria-label="婚礼招待"><button v-for="station in stations" :key="station.id" @click="open(station.id)">{{ station.icon }} {{ station.label }}<small>{{ nearby(station) ? '点击打开' : pending===station.id ? '正在前往…' : '走过去' }}</small></button></nav>
    <button v-if="pending" class="cancel-approach" @click="pending='';emit('cancel-approach')">取消前往</button>
    <div v-if="selected" class="collected" role="status"><img :src="selected.image" alt=""><span>手持 · {{ selected.name }}<small v-if="remaining>0" class="consume-time">{{ Math.ceil(remaining/1000) }} 秒后{{ drinking ? '喝完' : '吃完' }}</small></span><button @click="putAway" aria-label="收起领取物品">放回</button></div>
    <dialog ref="dialog" class="amenity-dialog" @click="backdrop" @close="active=''">
      <header><div><small>WITH LOVE, FOR YOU</small><h2>{{ current?.label }}</h2></div><button class="close" aria-label="关闭招待面板" @click="close">×</button></header>
      <template v-if="active==='payment'">
        <p class="welcome">人来就很开心啦，随意随意 ♡</p>
        <img class="payment-code" src="/wedding/payment/wechat-receive.jpg" alt="微信收款二维码，扫码随个份子" @error="codeError=true">
        <p v-if="codeError" role="alert">收款码加载失败，请关闭后重新打开。</p>
        <a class="save-code" href="/wedding/payment/wechat-receive.jpg" download="婚礼微信收款码.jpg">保存收款码原图</a>
        <p class="hint">可放大查看；请在微信中核对收款人。心意收到，祝福也珍藏。</p>
      </template>
      <template v-else>
        <p class="welcome">{{ active==='gifts' ? '花礼管家：挑一份喜欢的，把心意带上吧。' : '今天的快乐不限量，挑一份喜欢的吧。' }}</p>
        <nav class="food-tabs" aria-label="物品分类"><button :aria-pressed="category==='all'" @click="category='all'">全部 {{ stationItems.length }}</button><button v-for="tab in current?.categories" :key="tab" :aria-pressed="category===tab" @click="category=tab">{{ categoryNames[tab] }}</button></nav>
        <div class="item-grid"><button v-for="item in available" :key="item.id" @click="claim(item)" :aria-label="'领取'+item.name"><img :src="item.image" alt="" loading="lazy"><span>{{ item.name }}</span><small>{{ selected?.id===item.id ? '已领取' : '领取一份' }}</small></button></div>
        <p class="hint">每次拿一件，可随时更换或放回。花束单手握，礼盒和餐盘双手托；跳舞和鼓掌时暂时收好，结束再拿起来。</p>
      </template>
      <p class="notice" aria-live="polite">{{ notice }}</p>
    </dialog>
  </div>
</template>
<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { items, stations } from './amenities';
const props=defineProps({layout:{type:Object,default:()=>({left:0,top:0,scale:1})}});
const emit=defineEmits(['claim','put-away','consumed','approach','cancel-approach']);
const pending=ref('');
function nearby(station){return Math.hypot(props.layout.playerX-station.x,props.layout.playerY-station.y)<=145}
watch(()=>props.layout,()=>{const station=stations.find(s=>s.id===pending.value);if(station&&nearby(station)){pending.value='';show(station.id)}});
const dialog=ref(null),active=ref(''),selected=ref(null),notice=ref(''),codeError=ref(false);
const category=ref('all');
const remaining=ref(0);
const edibleCategories=['drinks','fruits','food','desserts','meals'];
const drinking=computed(()=>selected.value?.category==='drinks'||selected.value?.id==='coconut-drink');
let timer,lastTick=0;
function tick(){
  const now=performance.now(),elapsed=now-lastTick;lastTick=now;
  if(document.hidden||!selected.value||remaining.value<=0)return;
  remaining.value=Math.max(0,remaining.value-elapsed);
  if(remaining.value===0){const item=selected.value;selected.value=null;notice.value=`${item.name}${item.category==='drinks'||item.id==='coconut-drink'?'喝':'吃'}完啦，再去挑一份吧。`;emit('consumed',item);}
}
function visibility(){lastTick=performance.now()}
onMounted(()=>{lastTick=performance.now();timer=setInterval(tick,250);document.addEventListener('visibilitychange',visibility)});
onUnmounted(()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility)});
function putAway(){selected.value=null;remaining.value=0;emit('put-away')}
const categoryNames={drinks:'饮品',fruits:'水果',food:'小食',desserts:'甜点',meals:'餐食',flowers:'鲜花',gifts:'礼物',balloons:'气球',celebration:'礼花'};
const current=computed(()=>stations.find(s=>s.id===active.value));
const stationItems=computed(()=>items.filter(item=>current.value?.categories?.includes(item.category)&&item.uses.includes('handheld')));
const available=computed(()=>stationItems.value.filter(item=>category.value==='all'||item.category===category.value));
const position=s=>({left:props.layout.left+s.x*props.layout.scale+'px',top:props.layout.top+s.y*props.layout.scale+'px',...(s.id==='payment'?{width:s.width*props.layout.scale+'px',height:s.height*props.layout.scale+'px'}:{})});
function open(id){const station=stations.find(s=>s.id===id);if(!station)return;if(!nearby(station)){pending.value=id;emit('approach',station);return}pending.value='';show(id)}
function show(id){active.value=id;category.value='all';notice.value='';codeError.value=false;if(!dialog.value.open)dialog.value.showModal()}
function close(){dialog.value.close()}
function backdrop(event){if(event.target!==dialog.value)return;const r=dialog.value.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()}
function claim(item){selected.value=item;remaining.value=edibleCategories.includes(item.category)?30000:0;lastTick=performance.now();notice.value=`已领取${item.name}，${remaining.value?'30 秒后享用完，可再领取。':'愿你今天满载开心。'}`;emit('claim',item)}
</script>
<style scoped>
.cancel-approach{position:absolute;left:18px;top:300px;border:1px solid #eadaca;border-radius:12px;padding:7px 10px;background:#fff8eddd;color:#715440;cursor:pointer;font-size:11px}
.quick-access button small{display:block;font-size:9px;opacity:.7;margin-top:3px}
.consume-time{display:block;margin-top:4px;font-size:10px;color:#94775b;font-variant-numeric:tabular-nums}
.food-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}.food-tabs button{padding:7px 12px;border:1px solid #e4d6c5;border-radius:18px;background:#fffaf2;color:#856b55;cursor:pointer;font-size:12px}.food-tabs button[aria-pressed=true]{background:#776d54;color:#fff;border-color:#776d54}
.station-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}.station{position:absolute;transform:translate(-50%,-100%);pointer-events:auto;white-space:nowrap;padding:7px 12px;border:1px solid #e6ceb0;border-radius:10px;background:#fff8e9ed;color:#715440;box-shadow:0 3px 10px #52351e20;cursor:pointer;font-size:12px}.station span{margin-right:5px}.station:hover{background:#fff}.station.qr-stand{box-sizing:border-box;padding:0;border:0;border-radius:3px;background:transparent;box-shadow:none}.station.qr-stand:hover{background:transparent}.station.qr-stand:focus-visible{outline:2px solid #806135;outline-offset:3px}.quick-access{position:absolute;opacity:.55;transition:opacity .15s;left:18px;top:82px;display:flex;flex-direction:column;gap:5px}.quick-access:hover,.quick-access:focus-within{opacity:1}.quick-access button{background:#fff8ede6;border:1px solid #eadaca;border-radius:12px;padding:7px 10px;color:#715440;cursor:pointer;font-size:11px}.collected{position:absolute;left:18px;bottom:25px;max-width:220px;display:flex;align-items:center;gap:7px;padding:9px;background:#fffbf0ed;border-radius:14px;font-size:11px}.collected img{width:36px;height:40px;object-fit:contain}.collected button{background:#eddccd;padding:6px;border-radius:8px;color:#715440;cursor:pointer}.amenity-dialog{position:fixed;inset:0;margin:auto;width:min(520px,calc(100vw - 28px));max-height:calc(100dvh - 40px);box-sizing:border-box;overflow:auto;border:1px solid #e8d9c7;border-radius:23px;padding:24px;background:#fffbf4;color:#715440;box-shadow:0 20px 90px #30221740}.amenity-dialog::backdrop{background:#302a2466;backdrop-filter:blur(3px)}header{display:flex;justify-content:space-between;align-items:center}header small{font-size:9px;letter-spacing:2px;color:#ad9278}h2{font-size:24px;font-weight:500;margin:7px 0}.close{background:#f1e5d6;color:#715440;border-radius:50%;width:34px;height:34px;font-size:22px;cursor:pointer}.welcome{font-size:13px;line-height:1.8;margin:14px 0 20px}.item-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.item-grid button{background:#f6eee2;border:1px solid #e9dcc9;border-radius:14px;padding:12px 6px;cursor:pointer;color:#715440}.item-grid img{width:100%;height:85px;object-fit:contain;display:block;margin-bottom:10px}.item-grid span{font-size:12px;display:block}.item-grid small{font-size:10px;display:block;margin-top:7px;color:#ac8468}.hint{font-size:11px;line-height:1.8;color:#9d8770}.notice{font-size:12px;color:#52745b;min-height:18px}.payment-code{display:block;width:100%;max-width:340px;height:auto;margin:auto}.save-code{display:block;text-align:center;background:#e8efdf;color:#496044;border-radius:12px;padding:12px;margin-top:16px;font-size:13px}@media(max-width:600px){.quick-access{opacity:1;top:88px;left:8px}.quick-access button{padding:6px;font-size:10px}.station{font-size:10px;padding:5px 7px}.collected{left:8px;bottom:235px;max-width:180px}.amenity-dialog{padding:18px}.item-grid{gap:7px}.item-grid img{height:68px}}
</style>

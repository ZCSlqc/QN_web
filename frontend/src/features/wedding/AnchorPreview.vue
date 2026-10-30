<template>
  <section class="anchor-preview">
    <h3>部件自身锚点 · {{label}}</h3>
    <p>拖动蓝点选择素材上的连接位置；人物上的黄色连接点保持不动。</p>
    <svg ref="svg" :viewBox="viewBox" aria-label="部件自身锚点预览" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end">
      <rect :x="origin.x-30" :y="origin.y-30" :width="part.width+60" :height="part.height+60" rx="8" fill="#eee5d7"/>
      <image :href="partUrl(part)" :x="origin.x" :y="origin.y" :width="part.width" :height="part.height"/>
      <image v-if="sleeve && showSleeve" :href="partUrl(sleeve)" :x="armAttachment.armTop.x-armAttachment.sleeveTop.x" :y="armAttachment.armTop.y-armAttachment.sleeveTop.y" :width="sleeve.width" :height="sleeve.height" opacity=".75"/>
      <g pointer-events="none" stroke="#2682ac" stroke-width="1" stroke-dasharray="3 3">
        <path :d="`M${binding.sx-18} ${binding.sy}h36 M${binding.sx} ${binding.sy-18}v36`"/>
      </g>
      <circle data-source-anchor :cx="binding.sx" :cy="binding.sy" r="7" fill="#fff" stroke="#2682ac" stroke-width="2.5" tabindex="0" role="button" aria-label="拖动自身锚点" @pointerdown.stop.prevent="start" @keydown="nudge"/>
    </svg>
    <label v-if="sleeve"><input v-model="showSleeve" type="checkbox">叠加衣袖参考</label>
    <small>尺寸 {{part.width}} × {{part.height}} · 锚点 {{binding.sx}}, {{binding.sy}}。预览仅整体放大，素材比例不变。</small>
  </section>
</template>
<script setup>
import {ref,computed,watch} from 'vue';
import {resolveParts,partUrl} from './catalog';
import armAttachment from './armAttachment.json';
const props=defineProps({appearance:Object,selected:String,binding:Object,label:String});
const emit=defineEmits(['change']);const svg=ref(null),showSleeve=ref(true);let drag=null;
const parts=computed(()=>resolveParts(props.appearance));
const slot=computed(()=>props.selected==='waist'?'pants':props.selected==='head'?'head':props.selected==='neck'?'neck':props.selected.endsWith('Arm')?'arm':props.selected.endsWith('Hand')?'hand':props.selected.endsWith('Leg')?'skinLeg':'shoes');
const part=computed(()=>parts.value[slot.value]);
const sleeve=computed(()=>slot.value==='arm'?parts.value.sleeve:null);
const origin=computed(()=>slot.value==='head'?{x:-part.value.width/2,y:-510}:slot.value==='neck'?{x:-part.value.width/2,y:0}:{x:0,y:0});
const viewBox=computed(()=>`${origin.value.x-40} ${origin.value.y-40} ${Math.max(part.value.width,sleeve.value?.width||0)+80} ${Math.max(part.value.height,sleeve.value?.height||0)+80}`);
function start(e){drag=e.pointerId;svg.value.setPointerCapture(e.pointerId);}
function move(e){if(drag!==e.pointerId)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.value.getScreenCTM().inverse());emit('change',{sx:Math.round(p.x),sy:Math.round(p.y)});}
function end(){drag=null;}
function nudge(e){const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();const n=e.shiftKey?5:1;emit('change',{sx:props.binding.sx+d[0]*n,sy:props.binding.sy+d[1]*n});}
watch(()=>props.selected,end);
</script>
<style scoped>
.anchor-preview{background:#f7f3ec;border:1px solid #d6e1e6;border-radius:12px;padding:12px}.anchor-preview h3{margin:0;font-size:14px}.anchor-preview p{margin:5px 0;font-size:12px}.anchor-preview svg{width:100%;height:220px;display:block;touch-action:none;user-select:none}.anchor-preview circle{cursor:grab}.anchor-preview small{display:block;font-size:11px;margin-top:5px}.anchor-preview label{font-size:12px}
</style>

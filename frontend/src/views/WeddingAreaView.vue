<template>
 <main class="area-page">
  <header><div><router-link to="/admin">← 管理</router-link><h1>婚礼可移动范围</h1><p>沿可走区域标记边界，人物以脚底为定位点。</p></div><router-link to="/wedding">查看婚礼 →</router-link></header>
  <div class="area-workspace">
   <section class="area-canvas-panel">
    <nav aria-label="编辑模式"><button v-for="item in modes" :key="item.id" :aria-pressed="mode===item.id" @click="mode=item.id;route=[];start=null">{{item.label}}</button><label>缩放 <input v-model.number="zoom" aria-label="底图缩放" type="range" min="1" max="3" step=".25" /></label></nav>
    <div class="area-scroll">
     <svg ref="svg" class="area-canvas" :style="{width:`${zoom*100}%`}" :viewBox="`0 0 ${area.width} ${area.height}`" role="img" aria-label="可移动范围编辑底图" @pointerdown="onCanvas" @pointermove="move" @pointerup="finish" @pointercancel="finish" @lostpointercapture="finish">
      <image :href="`/${area.image}`" :width="area.width" :height="area.height" />
      <polygon v-if="area.points.length>2" :points="polygon" :class="{invalid:error}" />
      <polyline v-else :points="polygon" class="open-boundary" />
      <polyline v-if="route.length" :points="route.map(p=>`${p.x},${p.y}`).join(' ')" class="test-route" />
      <circle v-if="start" :cx="start.x" :cy="start.y" r="10" class="route-start" />
      <g v-for="(point,i) in area.points" :key="i" class="area-node" :class="{selected:selected===i}" tabindex="0" role="button" :aria-label="`边界点 ${i+1}`" @keydown.enter="selected=i" @keydown.delete.prevent="selected=i;removePoint()" @pointerdown.stop="begin($event,i)">
       <circle :cx="point[0]" :cy="point[1]" r="10" /><text :x="point[0]+15" :y="point[1]-12">{{i+1}}</text>
      </g>
     </svg>
    </div>
    <p class="area-help">{{mode==='edit'?'拖动圆点调整边界；放大后可滚动底图。':mode==='add'?'点击底图，在当前选中点后插入新点。':'先点击起点，再点击终点。范围外的终点会贴到最近边界。'}}</p>
   </section>
   <aside>
    <h2>边界点 · {{area.points.length}}</h2>
    <label>选中点<select v-model.number="selected" aria-label="选中点"><option v-for="(_,i) in area.points" :key="i" :value="i">第 {{i+1}} 点</option></select></label>
    <div v-if="point" class="point-coordinates"><label>X<input aria-label="点位 X" type="number" :value="point[0]" min="0" :max="area.width" @change="setCoordinate(0,$event)" /></label><label>Y<input aria-label="点位 Y" type="number" :value="point[1]" min="0" :max="area.height" @change="setCoordinate(1,$event)" /></label></div>
    <div class="area-buttons"><button :disabled="!point" @click="insertPoint">边中点加点</button><button :disabled="!point" @click="removePoint">删除选中点</button><button :disabled="!history.length" @click="undo">撤销</button><button @click="reset">恢复默认</button></div>
    <p class="area-validation" :class="{error}" role="status">{{error||'边界有效，可以保存和试走'}}</p>
    <p class="area-message" aria-live="polite">{{message}}</p>
    <div class="area-buttons"><button v-if="localEditing" :disabled="!!error||saving" @click="save">{{saving?'保存中…':'保存到本机'}}</button><button class="primary" :disabled="!!error" @click="download">导出 JSON</button><button @click="fileInput.click()">导入 JSON</button><button @click="clearPoints">重新画边界</button></div>
    <input ref="fileInput" class="file-input" type="file" accept=".json,application/json" aria-label="导入范围文件" @change="importFile" />
    <p class="area-help">{{localEditing?'保存到本机会直接更新下方文件，再进入婚礼即可使用新范围。':'导出后替换下方文件，重新构建即可更新婚礼范围。'}}<code>frontend/src/features/wedding/walkable-area.json</code>。编辑草稿会自动暂存。</p>
   </aside>
  </div>
 </main>
</template>
<script setup>
import {ref,computed,watch,onUnmounted} from 'vue';
import {defaultArea,areaError,parseArea,AREA_DRAFT_KEY} from '../features/wedding/areaConfig';
import {createNavigation} from '../features/wedding/navigation';
const area=ref(defaultArea()),selected=ref(0),mode=ref('edit'),zoom=ref(1),message=ref(''),history=ref([]),svg=ref(null),fileInput=ref(null),start=ref(null),route=ref([]);
const modes=[{id:'edit',label:'调整点位'},{id:'add',label:'添加边界点'},{id:'test',label:'路线试走'}];
const localEditing=import.meta.env.DEV&&['localhost','127.0.0.1','[::1]'].includes(location.hostname),saving=ref(false);
try{const saved=localStorage.getItem(AREA_DRAFT_KEY);if(saved){area.value=parseArea(saved);message.value='已恢复本机草稿';}}catch{message.value='本机草稿无效，已载入默认范围';}
const error=computed(()=>areaError(area.value)),point=computed(()=>area.value.points[selected.value]),polygon=computed(()=>area.value.points.map(p=>p.join(',')).join(' '));
const navigation=computed(()=>error.value?null:createNavigation(area.value));
let dragging=null;
let draftTimer;
function cacheDraft(){if(!error.value)try{localStorage.setItem(AREA_DRAFT_KEY,json());}catch{/* Export remains available. */}}
watch(area,()=>{clearTimeout(draftTimer);draftTimer=setTimeout(cacheDraft,250);},{deep:true});
onUnmounted(()=>{clearTimeout(draftTimer);cacheDraft();});
function snapshot(){history.value.push(JSON.stringify(area.value));if(history.value.length>60)history.value.shift();route.value=[];start.value=null;message.value='';}
function position(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.value.getScreenCTM().inverse());return [Math.round(Math.max(0,Math.min(area.value.width,p.x))*10)/10,Math.round(Math.max(0,Math.min(area.value.height,p.y))*10)/10];}
function begin(event,i){if(mode.value==='test'){onCanvas(event);return;}selected.value=i;if(mode.value!=='edit')return;snapshot();dragging=i;svg.value.setPointerCapture(event.pointerId);}
function move(event){if(dragging!==null)area.value.points[dragging]=position(event);}
function finish(){dragging=null;}
function onCanvas(event){
 if(event.button!==0)return;
 const [x,y]=position(event);
 if(mode.value==='add'){snapshot();const at=area.value.points.length?selected.value+1:0;area.value.points.splice(at,0,[x,y]);selected.value=at;}
 else if(mode.value==='test'){
  if(error.value){message.value=error.value;return;}
  const a=area.value,toWorld=p=>({x:p.x*a.world.width/a.width,y:p.y*a.world.height/a.height}),toImage=p=>({x:p.x*a.width/a.world.width,y:p.y*a.height/a.world.height});
  if(!start.value||route.value.length){start.value=toImage(navigation.value.nearestWalkable(toWorld({x,y})));route.value=[];message.value='请选择终点';}
  else{const path=navigation.value.walkingRoute(toWorld(start.value),toWorld({x,y}));route.value=path?[start.value,...path.map(toImage)]:[];message.value=path?'路线已生成，沿有效区域绕行':'未找到可走路线';}
 }
}
function setCoordinate(axis,event){const value=Number(event.target.value);if(!Number.isFinite(value)||!point.value)return;snapshot();point.value[axis]=Math.round(Math.max(0,Math.min(axis===0?area.value.width:area.value.height,value))*10)/10;}
function removePoint(){if(!point.value)return;snapshot();area.value.points.splice(selected.value,1);selected.value=Math.max(0,selected.value-1);}
function insertPoint(){if(!point.value)return;const a=point.value,b=area.value.points[(selected.value+1)%area.value.points.length];snapshot();area.value.points.splice(++selected.value,0,a.map((v,i)=>Math.round((v+b[i])*5)/10));}
function undo(){const previous=history.value.pop();if(previous){area.value=JSON.parse(previous);selected.value=Math.min(selected.value,area.value.points.length-1);route.value=[];start.value=null;message.value='已撤销';}}
function reset(){snapshot();area.value=defaultArea();selected.value=0;mode.value='edit';}
function clearPoints(){snapshot();area.value.points=[];selected.value=0;mode.value='add';}
function json(){return JSON.stringify(area.value,null,2)+'\n';}
async function save(){
 if(error.value||saving.value||!localEditing)return;cacheDraft();saving.value=true;
 try{const response=await fetch('/__local/wedding-area',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')||''}`},body:json()});const result=await response.json();if(!response.ok)throw Error(result.detail||'保存失败');message.value='已保存到 frontend/src/features/wedding/walkable-area.json';}
 catch(e){message.value=`保存失败：${e.message}，可导出 JSON 保留调整`;}
 finally{saving.value=false;}
}
function download(){if(error.value)return;const url=URL.createObjectURL(new Blob([json()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='walkable-area.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message.value='已导出范围文件';}
async function importFile(event){const file=event.target.files[0];if(!file)return;try{if(file.size>200000)throw Error('文件过大');const next=parseArea(await file.text());snapshot();area.value=next;selected.value=0;message.value='已导入，可以继续调整';}catch(e){message.value=`导入失败：${e.message}`;}finally{event.target.value='';}}
</script>
<style scoped>
.area-page{min-height:100dvh;background:#f7f3eb;color:#53483b;padding:24px;box-sizing:border-box}.area-page header{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1700px;margin:0 auto 20px}.area-page h1{font-size:25px;margin:12px 0 8px}.area-page p{line-height:1.6}.area-page header p{margin:0;color:#847663}.area-page a{color:#846542}.area-workspace{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:20px;max-width:1700px;margin:auto}.area-canvas-panel,aside{background:#fffdf8;border:1px solid #e6ddcf;border-radius:16px;padding:16px;min-width:0}.area-canvas-panel nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.area-page button{padding:10px 12px;border:1px solid #d8ccba;border-radius:9px;background:#f6f0e5;color:#65543d;cursor:pointer;font-size:13px}.area-page button[aria-pressed=true],.area-page .primary{background:#796b4b;color:#fff}.area-page button:disabled{opacity:.4;cursor:default}.area-page button:focus-visible,.area-node:focus-visible{outline:3px solid #ad6c40}.area-canvas-panel nav label{display:flex;align-items:center;gap:8px;font-size:12px;margin-left:auto}.area-canvas-panel input[type=range]{width:100px}.area-scroll{max-height:73dvh;overflow:auto;border-radius:10px;background:#ddd3c4;touch-action:pan-x pan-y}.area-canvas{display:block;height:auto;touch-action:none}.area-canvas polygon{fill:#62be792e;stroke:#277844;stroke-width:3;vector-effect:non-scaling-stroke}.area-canvas polygon.invalid{fill:#ee73552e;stroke:#a63127}.open-boundary{fill:none;stroke:#a63127;stroke-width:4}.area-node{cursor:grab}.area-node circle{fill:#fff9ed;stroke:#386f43;stroke-width:3}.area-node.selected circle{fill:#ffdc74;stroke:#a35e27;stroke-width:4}.area-node text{font:600 20px sans-serif;fill:#172f1c;paint-order:stroke;stroke:#fff;stroke-width:4;pointer-events:none}.test-route{fill:none;stroke:#fff176;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 2px #303b24)}.route-start{fill:#ffec65;stroke:#394927;stroke-width:3}.area-page h2{font-size:17px;margin:0 0 18px}.area-page aside label{display:grid;gap:6px;font-size:13px;margin-bottom:12px}.area-page select,.area-page input[type=number]{width:100%;min-width:0;padding:9px;border:1px solid #dacebc;border-radius:8px;background:white;box-sizing:border-box;color:inherit}.point-coordinates,.area-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px}.area-help{font-size:12px;color:#887a65;overflow-wrap:anywhere;margin:14px 0 0}.area-validation{font-size:13px;color:#426747}.area-validation.error{color:#b34836}.area-message{font-size:13px;min-height:21px}.file-input{display:none}.area-page code{font-size:11px}@media(max-width:850px){.area-page{padding:16px}.area-workspace{grid-template-columns:1fr}.area-scroll{max-height:65dvh}.area-page header{align-items:flex-start}.area-page h1{font-size:21px}.area-canvas-panel,aside{padding:12px}.area-node circle{r:14}.area-canvas-panel nav label{margin-left:0}}
</style>

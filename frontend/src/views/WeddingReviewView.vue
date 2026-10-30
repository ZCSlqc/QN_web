<template>
 <main class="review-page">
  <header class="page-header">
   <div><RouterLink to="/wedding" class="back-link">← 返回婚礼</RouterLink><div class="title-line"><h1>人物动作核验</h1><span class="status-badge" :class="{free:freeRotation}">{{freeRotation?'自由转动':'角度限制中'}}</span></div><p>直接拖动人物上的旋转点，检查动作与穿搭。</p></div>
   <div class="header-actions"><button class="freedom-button" :class="{active:freeRotation}" :aria-pressed="freeRotation" @click="toggleFreedom">{{freeRotation?'恢复角度限制':'解放旋转角度'}}</button><button class="primary" @click="save">保存到本机</button></div>
  </header>
  <div class="review-layout">
   <section class="stage stage-panel">
    <div class="stage-tools"><div class="segmented" aria-label="人物朝向"><button :aria-pressed="direction==='front'" @click="direction='front'">正面</button><button :aria-pressed="direction==='back'" @click="direction='back'">背面</button></div><div class="view-options"><label><input v-model="guides" type="checkbox">旋转点</label><label><input v-model="grid" type="checkbox">网格</label><label class="zoom-control">缩放<input aria-label="画布缩放" v-model.number="zoom" type="range" min="0.7" max="1.5" step="0.05"></label></div></div>
    <svg ref="stage" class="review-canvas" viewBox="-300 -590 600 670" aria-label="人物动作核验画布" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end">
     <defs><pattern id="review-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dedbd3" stroke-width=".6"/></pattern></defs>
     <rect x="-300" y="-590" width="600" height="670" :fill="grid?'url(#review-grid)':'#faf9f5'"/>
     <g :transform="`translate(0 -260) scale(${zoom}) translate(0 260)`">
      <image v-if="snapshot" :href="snapshot" x="-300" y="-590" width="600" height="670"/>
      <g v-if="guides" class="rotation-guides">
       <g v-for="(h,key) in motionHandles" :key="key" :class="{chosen:selected===motionKey(h)}">
        <line :x1="h.pivot.x" :y1="h.pivot.y" :x2="h.tip.x" :y2="h.tip.y"/>
        <circle class="root-point" :data-motion-root="key" :cx="h.pivot.x" :cy="h.pivot.y" r="5" @pointerdown.stop.prevent="startMotion($event,key,true)"/>
        <circle class="drag-point" :data-motion="key" :cx="h.tip.x" :cy="h.tip.y" r="8" tabindex="0" role="button" :aria-label="motionLabel(h)+'旋转点'" @pointerdown.stop.prevent="startMotion($event,key)" @keydown="nudgeMotion($event,key)"/>
        <text :x="h.tip.x+12" :y="h.tip.y-9">{{motionLabel(h)}}</text>
       </g>
       <g v-for="(h,key) in handles" :key="key" :class="{chosen:selected===key}">
        <line :x1="h.pivot.x" :y1="h.pivot.y" :x2="h.tip.x" :y2="h.tip.y"/>
        <circle class="root-point" :data-point-root="key" :cx="h.pivot.x" :cy="h.pivot.y" r="5" @pointerdown.stop.prevent="startPoint($event,key,true)"/>
        <circle class="drag-point" :data-point="key" :cx="h.tip.x" :cy="h.tip.y" r="8" tabindex="0" role="button" :aria-label="reviewLabels[key]+'旋转点'" @pointerdown.stop.prevent="startPoint($event,key)" @keydown="nudgePoint($event,key)"/>
        <text :x="h.tip.x+12" :y="h.tip.y-9">{{reviewLabels[key]}}</text>
       </g>
      </g>
     </g>
    </svg>
    <div class="stage-footer"><span v-if="error" role="alert" class="error">{{error}}</span><span v-else>{{busy?'正在更新预览…':guides?'拖动圆点转动 · 方向键微调 · 手掌随小臂':'已隐藏旋转点，可直接检查完整效果'}}</span><button class="text-button" @click="reset">恢复初始姿态</button></div>
   </section>
   <aside class="control-panel">
    <nav class="panel-tabs" aria-label="核验工具"><button v-for="tab in tabs" :key="tab.id" :aria-pressed="activeTab===tab.id" @click="activeTab=tab.id">{{tab.label}}</button></nav>
    <div v-if="activeTab==='motion'" class="panel-content">
     <div class="section-heading"><h2>动作控制</h2><label class="compact-toggle"><input v-model="mirror" type="checkbox">左右联动</label></div>
     <div class="part-grid"><button v-for="(label,key) in reviewLabels" :key="key" class="part-chip" :class="{selected:selected===key}" :aria-pressed="selected===key" @click="selected=key"><span>{{label}}</span><output>{{formatAngle(controlValue(key))}}°</output></button></div>
     <section class="angle-card">
      <label class="part-select">选中部件<select aria-label="选中部件" v-model="selected"><option v-for="(label,key) in reviewLabels" :key="key" :value="key">{{label}}</option></select></label>
      <div class="angle-heading"><span>{{reviewLabels[selected]}}旋转</span><span class="range-caption">{{rangeCaption}}</span></div>
      <div class="angle-entry"><button aria-label="角度减一" @click="setControl(selected,currentAngle-1)">−</button><label><input aria-label="旋转角度" type="number" step="1" :min="angleRange?.min" :max="angleRange?.max" :value="currentAngle" @input="angleInput"><span>°</span></label><button aria-label="角度加一" @click="setControl(selected,currentAngle+1)">＋</button></div>
      <input class="angle-slider" aria-label="角度滑块" type="range" :min="angleRange?.min??-180" :max="angleRange?.max??180" :value="angleRange?currentAngle:wrapAngle(currentAngle)" @input="sliderInput">
      <div class="angle-footer"><span>{{selected.endsWith('Elbow')&&freeRotation?'可连续转圈，角度累计记录':freeRotation?'已解除动作范围限制':'按当前活动范围转动'}}</span><button class="text-button" @click="setControl(selected,selected.endsWith('Shoulder')?selectedArm.rest:0)">{{selected==='rightShoulder'?'归位到 3°':'当前归零'}}</button></div>
     </section>
     <div v-if="selected.endsWith('Shoulder')" class="axis-picker"><span>肩部转轴</span><div class="segmented"><button :aria-pressed="!selectedArm.up" @click="switchShoulder(false)">上点 · 下摆</button><button :aria-pressed="selectedArm.up" @click="switchShoulder(true)">下点 · 上举</button></div><p>切换时先归位，再镜像整条手臂。</p></div>
     <div v-if="selected==='waist'" class="axis-picker"><span>腰部转轴</span><div class="segmented"><button :aria-pressed="bindings.waist.axis===0" :disabled="waistMoving&&bindings.waist.axis!==0" @click="chooseWaist(0)">左点</button><button :aria-pressed="bindings.waist.axis===1" :disabled="waistMoving&&bindings.waist.axis!==1" @click="chooseWaist(1)">右点</button></div><p>回到 0° 后，左右转轴重新开放。</p></div>
     <section v-if="/Shoulder|Elbow/.test(selected)" class="occlusion-control" aria-label="下臂遮挡设置">
      <div class="occlusion-heading"><span>{{selected.startsWith('left')?'左':'右'}}下臂遮挡</span><small>{{direction==='front'?'正面':'背面'}}单独保存</small></div>
      <div class="segmented"><button v-for="p in layerChoices" :key="p.value" :aria-pressed="selectedLayer===p.value" @click="setArmLayer(p.value)">{{p.label}}</button></div>
      <p>小臂、手掌、下袖整体移动。{{selectedLayer==='back'?'当前置于整个人物后方。':selectedLayer==='front'?'当前置于整个人物前方。':'使用当前朝向的默认顺序。'}}</p>
     </section>
     <div class="motion-note"><span class="note-dot"/>右肩 3° 为归位；手掌固定在小臂上。解放角度后，手肘可连续转圈。</div>
     <details class="limits-detail"><summary>查看活动范围</summary><dl><div><dt>头部</dt><dd>−20° ～ 20°</dd></div><div><dt>右肩下摆 / 上举</dt><dd>3～45° / 3～13°</dd></div><div><dt>左肩下摆 / 上举</dt><dd>0～35° / 0～10°</dd></div><div><dt>手肘普通 / 上举</dt><dd>0～160° / 0～100°</dd></div><div><dt>腰部左轴 / 右轴</dt><dd>0～10° / −10～0°</dd></div><div><dt>腿部 / 鞋子</dt><dd>−11～9° / ±5°</dd></div></dl></details>
    </div>
    <div v-else-if="activeTab==='appearance'" class="panel-content">
     <div class="section-heading"><h2>穿搭检查</h2><button class="text-button" @click="wardrobe=true">完整衣橱 ↗</button></div><p class="section-intro">更换造型时保留当前动作。</p>
     <div class="wardrobe-fields">
      <label class="wide">上衣<select aria-label="上衣" v-model="appearance.shirt" @change="clearFormal"><option v-for="p in shirts" :key="p.id" :value="p.id">{{groupLabel(p.group)}} · {{styleLabel(p)}}</option></select></label>
      <fieldset class="wide choice-field"><legend>袖长</legend><label v-for="p in sleeveChoices" :key="p.value" :class="{checked:appearance.sleeve===p.value}"><input type="radio" name="sleeve" :value="p.value" v-model="appearance.sleeve" @change="clearFormal">{{p.label}}</label></fieldset>
      <label class="wide">裤装<select aria-label="裤装" v-model="appearance.pants" @change="clearBottom"><option v-for="p in trousers" :key="p.id" :value="p.id">{{groupLabel(p.group)}} · {{styleLabel(p)}}</option></select></label>
      <fieldset class="wide choice-field"><legend>裤长</legend><label v-for="p in legChoices" :key="p.value" :class="{checked:appearance.leg===p.value}"><input type="radio" name="leg" :value="p.value" v-model="appearance.leg" @change="clearBottom">{{p.label}}</label></fieldset>
      <label>鞋子<select aria-label="鞋子" v-model="appearance.shoes"><option v-for="p in shoes" :key="p.id" :value="p.id">{{p.name}}</option></select></label><label>肤色<select aria-label="肤色" v-model="appearance.skin"><option v-for="p in skins" :key="p.id" :value="p.group">{{p.group}}</option></select></label>
     </div>
     <button class="wardrobe-button" @click="wardrobe=true">打开完整衣橱<span>发型、五官、礼服与趣味头像 →</span></button><p class="subtle-note">无裤腿保留裤腰；衣袖、裤腿和鞋子随身体运动。</p>
    </div>
    <div v-else class="panel-content">
     <div class="section-heading"><h2>保存与导出</h2></div><p class="section-intro">保留这次核验的姿态、穿搭和旋转设置。</p>
     <button class="primary full-width" @click="save">保存到本机</button>
     <div class="export-grid"><button @click="exportJson">导出配置 JSON</button><button :disabled="!snapshot" @click="exportPng">导出图片 PNG</button><button :disabled="!snapshot" @click="exportSvg">导出当前 SVG</button><label class="file-button">导入配置<input aria-label="导入配置" type="file" accept=".json,application/json" @change="importJson"></label></div>
     <p class="subtle-note">SVG 包含当前人物快照与旋转点。配置文件可用于恢复这次核验。</p>
     <details class="advanced-detail"><summary>轮廓检查（高级）</summary><p>查看原 SVG 的切口、圆心与衣袖轮廓。</p><button @click="showArmLab=!showArmLab">{{showArmLab?'收起右臂示例':'右臂圆形铰接示例'}}</button></details>
    </div>
    <p v-if="message" class="save-status" role="status">{{message}}</p>
   </aside>
  </div>
  <ArmJointLab v-if="showArmLab"/>
  <WeddingWardrobe v-if="wardrobe" class="review-wardrobe" :appearance="appearance" :rigid-pose="effectivePose" :rigid-bindings="bindings" :circular-arm="{...circularArm,freeRotation}" :left-circular-arm="{...leftCircularArm,freeRotation}" nickname="人物动作核验" @preview="updateAppearance" @apply="value=>{updateAppearance(value);wardrobe=false}" @close="wardrobe=false"/>
 </main>
</template>

<script setup>
import {ref,reactive,watch,onMounted,onUnmounted,computed} from 'vue';
import {loadCharacters,CHARACTER_SCALE} from '../features/wedding/characters';
import {makeAppearance,options,styleLabel,groupLabel,normalizeAppearance} from '../features/wedding/catalog';
import WeddingWardrobe from '../features/wedding/WeddingWardrobe.vue';
import {dressShoes} from '../features/wedding/dressShoes';
import ArmJointLab from '../features/wedding/ArmJointLab.vue';
import {circularMotionHandles} from '../features/wedding/circularArm';
import {forearmLayerFor} from '../features/wedding/armOcclusion';
import waistAttachment from '../features/wedding/waistAttachment.json';
import {defaultBasePose,defaultPose,defaultBindings,normalizeBindings,rigidHandles} from '../features/wedding/rigidRig';
import {reviewLabels,reviewRange,clampReviewAngle,normalizeReviewArm,normalizeReviewBase,normalizeReviewPose,wrapAngle} from '../features/wedding/reviewPose';
const storageKey='wedding-rigid-v3';
const tabs=[{id:'motion',label:'动作'},{id:'appearance',label:'穿搭'},{id:'save',label:'保存'}];
const layerChoices=[{value:'auto',label:'自动'},{value:'front',label:'最前'},{value:'back',label:'最后'}];
const sleeveChoices=[{value:'long',label:'长袖'},{value:'shorter',label:'短袖'},{value:'none',label:'无袖'}],legChoices=[{value:'long',label:'长裤'},{value:'shorter',label:'短裤'},{value:'none',label:'无裤腿'}];
const activeTab=ref('motion'),selected=ref('rightElbow'),direction=ref('front'),guides=ref(true),grid=ref(false),zoom=ref(1),mirror=ref(false),freeRotation=ref(false);
const wardrobe=ref(false),showArmLab=ref(false),stage=ref(null),snapshot=ref(''),busy=ref(true),error=ref(''),message=ref('');
const appearance=reactive(makeAppearance()),bindings=reactive(normalizeBindings()),basePose=reactive(normalizeReviewBase()),pose=reactive(normalizeReviewPose());
const circularArm=reactive(normalizeReviewArm()),leftCircularArm=reactive(normalizeReviewArm({},false,-1));
const effectivePose=computed(()=>Object.fromEntries(Object.keys(defaultPose).map(key=>[key,key.endsWith('Hand')?0:(pose[key]||0)+(basePose[key]||0)])));
const shirts=options('shirt'),trousers=options('pants'),skins=options('head'),shoes=[...options('shoes'),...dressShoes];
const armFor=key=>key.startsWith('left')?leftCircularArm:circularArm;
const selectedArm=computed(()=>armFor(selected.value));
const selectedLayer=computed(()=>forearmLayerFor(selectedArm.value,direction.value));
function setArmLayer(value){
  selectedArm.value.forearmLayers[direction.value]=value;
  if(mirror.value)(selected.value.startsWith('left')?circularArm:leftCircularArm).forearmLayers[direction.value]=value;
}
const rangeForControl=key=>reviewRange(key,{free:freeRotation.value,up:armFor(key).up,axis:bindings.waist.axis});
const angleRange=computed(()=>rangeForControl(selected.value));
function controlValue(key){if(key.endsWith('Elbow'))return armFor(key).bend;if(key.endsWith('Shoulder'))return armFor(key).shoulder;if(key==='waist')return effectivePose.value.waist;return pose[key]||0;}
const currentAngle=computed(()=>controlValue(selected.value)),rangeCaption=computed(()=>angleRange.value?`${angleRange.value.min}° ～ ${angleRange.value.max}°`:'连续旋转');
const waistMoving=computed(()=>Math.abs(wrapAngle(effectivePose.value.waist))>.001);
const waistPins=computed(()=>waistAttachment.waist.map(p=>({x:bindings.waist.x-bindings.waist.sx+p.x,y:bindings.waist.y-bindings.waist.sy+p.y})));
const handles=computed(()=>Object.fromEntries(Object.entries(rigidHandles(effectivePose.value,bindings)).filter(([key])=>!['waist','leftArm','rightArm'].includes(key))));
const motionHandles=computed(()=>{
 const result={...circularMotionHandles(effectivePose.value,bindings,circularArm,1),...circularMotionHandles(effectivePose.value,bindings,leftCircularArm,-1)};
 for(const axis of [0,1]){if(waistMoving.value&&bindings.waist.axis!==axis)continue;const p=waistPins.value[axis],angle=effectivePose.value.waist*Math.PI/180;result[axis?'waistRight':'waistLeft']={label:axis?'腰右轴':'腰左轴',kind:'waist',axis,pivot:p,tip:{x:p.x-42*Math.sin(angle),y:p.y+42*Math.cos(angle)},sign:1,value:effectivePose.value.waist};}return result;
});
const motionKey=h=>h.kind==='waist'?'waist':`${h.side<0?'left':'right'}${h.kind==='elbow'?'Elbow':'Shoulder'}`;
const motionLabel=h=>h.kind==='shoulder'?`${h.side<0?'左':'右'}肩${h.up?'下':'上'}轴`:h.label;
const formatAngle=value=>Math.round(value*10)/10;
function setControl(key,value,linked=true){
 const angle=clampReviewAngle(value,rangeForControl(key)),arm=armFor(key);
 if(key.endsWith('Elbow'))arm.bend=angle;else if(key.endsWith('Shoulder'))arm.shoulder=angle;else if(key==='waist')pose.waist=angle-(basePose.waist||0);else pose[key]=angle;
 if(linked&&mirror.value&&/^(left|right)/.test(key))setControl(key.replace(/^(left|right)/,key.startsWith('left')?'right':'left'),angle,false);
}
function angleInput(e){if(e.target.value==='')return;setControl(selected.value,e.target.value);e.target.value=controlValue(selected.value);}
function sliderInput(e){const angle=Number(e.target.value);setControl(selected.value,angleRange.value?angle:currentAngle.value+wrapAngle(angle-wrapAngle(currentAngle.value)));}
function switchShoulder(up,key=selected.value){const change=arm=>Object.assign(arm,{up,shoulder:arm.rest,bend:0});change(armFor(key));if(mirror.value)change(key.startsWith('left')?circularArm:leftCircularArm);}
function chooseWaist(axis){if(!waistMoving.value||bindings.waist.axis===axis)bindings.waist.axis=axis;}
function toggleFreedom(){end();freeRotation.value=!freeRotation.value;if(!freeRotation.value){Object.assign(pose,normalizeReviewPose(pose,false,bindings.waist.axis,basePose));Object.assign(circularArm,normalizeReviewArm(circularArm));Object.assign(leftCircularArm,normalizeReviewArm(leftCircularArm,false,-1));}message.value=freeRotation.value?'已放开角度限制，手肘可连续旋转。':'已恢复活动范围，超出范围的角度已收回。';}
function updateAppearance(value){Object.assign(appearance,normalizeAppearance(value));}
function clearFormal(){appearance.topStyle=null;appearance.innerSleeve=appearance.sleeve;appearance.formalStyle=appearance.coatStyle||null;}
function clearBottom(){appearance.bottomStyle=null;appearance.bottomColor=null;appearance.matchedBottom=false;}
let art,canvas,version=0,disposed=false,drag=null;
function pointerWorld(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(stage.value.getScreenCTM().inverse());return {x:p.x/zoom.value,y:(p.y+260)/zoom.value-260};}
function startDrag(e,key,h,root,sign){selected.value=key;const p=pointerWorld(e),offset=root?{x:h.tip.x-p.x,y:h.tip.y-p.y}:{x:0,y:0};drag={id:e.pointerId,key,pivot:{...h.pivot},offset,sign,last:Math.atan2(p.y+offset.y-h.pivot.y,p.x+offset.x-h.pivot.x)};stage.value.setPointerCapture(e.pointerId);}
function startMotion(e,key,root=false){const h=motionHandles.value[key];if(h.kind==='waist')chooseWaist(h.axis);if(h.kind==='shoulder'&&h.up!==armFor(motionKey(h)).up)switchShoulder(h.up,motionKey(h));startDrag(e,motionKey(h),h,root,h.sign);}
function startPoint(e,key,root=false){startDrag(e,key,handles.value[key],root,handles.value[key].side);}
function move(e){if(!drag||drag.id!==e.pointerId)return;const p=pointerWorld(e);p.x+=drag.offset.x;p.y+=drag.offset.y;const angle=Math.atan2(p.y-drag.pivot.y,p.x-drag.pivot.x),delta=Math.atan2(Math.sin(angle-drag.last),Math.cos(angle-drag.last))*180/Math.PI;setControl(drag.key,Math.round((controlValue(drag.key)+delta*drag.sign)*10)/10);drag.last=angle;}
function end(){drag=null;}
function nudge(e,key){const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:1,ArrowDown:-1}[e.key];if(!delta)return;e.preventDefault();selected.value=key;setControl(key,controlValue(key)+delta*(e.shiftKey?5:1));}
function nudgePoint(e,key){nudge(e,key);}
function nudgeMotion(e,key){const h=motionHandles.value[key];if(h.kind==='waist')chooseWaist(h.axis);if(h.kind==='shoulder'&&h.up!==armFor(motionKey(h)).up)switchShoulder(h.up,motionKey(h));nudge(e,motionKey(h));}
function reset(){end();Object.assign(pose,normalizeReviewPose({},freeRotation.value,bindings.waist.axis,basePose));Object.assign(circularArm,normalizeReviewArm());Object.assign(leftCircularArm,normalizeReviewArm({},false,-1));message.value='已恢复初始姿态，穿搭已保留。';}
function payload(){return {version:3,mode:'pose-review',contourVersion:2,locked:true,poseConfirmed:true,freeRotation:freeRotation.value,bindings:normalizeBindings(bindings),basePose:{...basePose},pose:{...pose},circularArm:{...circularArm},leftCircularArm:{...leftCircularArm},appearance:normalizeAppearance(appearance),direction:direction.value};}
function applySaved(data){
 if(data?.version!==3||!data.bindings||!data.pose)throw Error('invalid review configuration');freeRotation.value=data.freeRotation===true;Object.assign(bindings,normalizeBindings(data.bindings));
 if(data.contourVersion!==2)for(const side of ['left','right'])for(const part of ['Arm','Leg','Shoe'])bindings[side+part]={...defaultBindings[side+part]};
 Object.assign(basePose,normalizeReviewBase(data.poseConfirmed===true?data.basePose:defaultBasePose));
 const saved=data.poseConfirmed===true?data.pose:Object.fromEntries(Object.keys(defaultPose).map(key=>[key,(Number(data.pose[key])||0)-(basePose[key]||0)]));Object.assign(pose,normalizeReviewPose(saved,freeRotation.value,bindings.waist.axis,basePose));
 Object.assign(circularArm,normalizeReviewArm(data.circularArm,freeRotation.value));Object.assign(leftCircularArm,normalizeReviewArm(data.leftCircularArm,freeRotation.value,-1));if(data.appearance)updateAppearance(data.appearance);direction.value=data.direction==='back'?'back':'front';
}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(payload()));message.value='已保存到本机。';}catch{message.value='本机保存失败，请导出配置。';}}
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportJson(){download(JSON.stringify(payload(),null,2),'application/json','wedding-review.json');}
function exportPng(){const a=document.createElement('a');a.href=snapshot.value;a.download='wedding-review.png';a.click();}
async function exportSvg(){await render();if(error.value||!stage.value)return;const node=stage.value.cloneNode(true);node.setAttribute('xmlns','http://www.w3.org/2000/svg');const metadata=document.createElementNS('http://www.w3.org/2000/svg','metadata');metadata.textContent=JSON.stringify(payload());node.prepend(metadata);download(new XMLSerializer().serializeToString(node),'image/svg+xml','wedding-review.svg');}
async function importJson(e){try{applySaved(JSON.parse(await e.target.files[0].text()));message.value='已恢复姿态与穿搭。';}catch{message.value='请选择有效的人物核验或旧版绑定配置。';}e.target.value='';}
async function render(){
 if(!art||disposed)return;const ticket=++version;busy.value=true;
 try{const a=await art.ensureAppearance({...appearance});if(ticket!==version||disposed)return;const c=canvas.getContext('2d');c.clearRect(0,0,600,670);c.save();c.translate(300,590);c.scale(1/CHARACTER_SCALE,1/CHARACTER_SCALE);art.draw(c,{x:0,y:0,appearance:a,direction:direction.value,rigidPose:effectivePose.value,rigidBindings:normalizeBindings(bindings),circularArm:{...circularArm,freeRotation:freeRotation.value},leftCircularArm:{...leftCircularArm,freeRotation:freeRotation.value}},0,true);c.restore();snapshot.value=canvas.toDataURL();error.value='';}
 catch{if(ticket===version)error.value='素材加载失败，请刷新页面重试。';}finally{if(ticket===version)busy.value=false;}
}
watch([pose,basePose,bindings,appearance,direction,circularArm,leftCircularArm,freeRotation],render,{deep:true});
onMounted(async()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved)applySaved(saved);}catch{message.value='已使用默认人物配置。';}canvas=document.createElement('canvas');canvas.width=600;canvas.height=670;try{art=await loadCharacters();if(disposed){art.dispose();return;}await render();}catch{busy.value=false;error.value='人物素材加载失败，请刷新重试。';}});
onUnmounted(()=>{disposed=true;version++;art?.dispose();});
</script>

<style scoped>
.review-page{--ink:#343a36;--muted:#788078;--line:#e2e5dc;--accent:#416a57;min-height:100vh;padding:24px 30px 32px;background:#f1f3ed;color:var(--ink);font:14px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;box-sizing:border-box}.review-page *{box-sizing:border-box}.page-header{max-width:1430px;margin:0 auto 22px;display:flex;align-items:center;justify-content:space-between;gap:20px}.back-link{color:var(--muted);font-size:12px;text-decoration:none}.title-line{display:flex;gap:13px;align-items:center;margin-top:7px}.title-line h1{font-size:25px;font-weight:650;letter-spacing:.02em;margin:0}.page-header p{margin:6px 0 0;color:var(--muted);font-size:13px}.status-badge{font-size:11px;padding:4px 9px;border-radius:30px;background:#e3ebdf;color:#54714e;white-space:nowrap}.status-badge.free{background:#efe3cf;color:#8b6536}.header-actions{display:flex;gap:10px;flex-wrap:wrap}.review-page button,.file-button{font:inherit;color:inherit;border:1px solid var(--line);border-radius:9px;padding:9px 13px;background:#fff;cursor:pointer;transition:background .15s,border-color .15s}.review-page button:hover,.file-button:hover{border-color:#a8bbab;background:#f5f8f2}.review-page button:focus-visible,.file-button:focus-within{outline:2px solid #7b9d88;outline-offset:3px}.review-page button:disabled{opacity:.45;cursor:default}.review-page .primary{background:var(--accent);border-color:var(--accent);color:white}.review-page .primary:hover{background:#335645}.review-page .freedom-button{background:transparent;border-color:#becbbd}.review-page .freedom-button.active{background:#f6e8d2;border-color:#d8b884;color:#8b6536}.review-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:22px;max-width:1430px;margin:auto;align-items:start}.stage-panel,.control-panel{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 6px 24px #334e3510}.stage-panel{position:sticky;top:18px}.stage-tools{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;gap:14px;border-bottom:1px solid #eeefe9}.segmented{display:inline-flex;padding:3px;border-radius:9px;background:#eef1ea;gap:3px}.review-page .segmented button{border:0;background:transparent;font-size:12px;padding:6px 12px;border-radius:6px;white-space:nowrap}.review-page .segmented button[aria-pressed=true]{background:#fff;color:var(--accent);box-shadow:0 1px 4px #293c2914}.view-options{display:flex;gap:15px;align-items:center;font-size:12px;color:var(--muted)}.view-options label{display:flex;align-items:center;gap:5px;white-space:nowrap}.review-page input[type=checkbox],.review-page input[type=radio],.review-page input[type=range]{accent-color:var(--accent)}.zoom-control input{width:65px}.review-canvas{display:block;width:100%;height:calc(100vh - 238px);min-height:450px;max-height:800px;background:#faf9f5;touch-action:none;user-select:none}.rotation-guides line{stroke:#608c86;stroke-width:1.25;stroke-dasharray:3 4;pointer-events:none;opacity:.65}.rotation-guides .root-point{fill:#608c86;stroke:#fff;stroke-width:1.5;cursor:grab}.rotation-guides .drag-point{fill:#fff;stroke:#608c86;stroke-width:2;cursor:grab}.rotation-guides text{font-size:11px;fill:#64847d;paint-order:stroke;stroke:#faf9f5;stroke-width:3px;stroke-linejoin:round;pointer-events:none}.rotation-guides .chosen .drag-point{fill:#416a57;stroke:#fff;stroke-width:2.5}.rotation-guides .chosen text{fill:#355d4b;font-weight:600}.rotation-guides circle:focus{outline:none;stroke:#ce9a5e;stroke-width:3}.stage-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 18px;font-size:11px;color:var(--muted);border-top:1px solid #eeefe9}.review-page .text-button{background:none;border:0;padding:0;font-size:12px;color:var(--accent);white-space:nowrap}.stage-footer .error{color:#ae5342}.control-panel{position:sticky;top:18px;max-height:calc(100vh - 36px);overflow:auto}.panel-tabs{position:sticky;top:0;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);background:#fff;border-bottom:1px solid var(--line);padding:7px 12px 0}.review-page .panel-tabs button{border:0;border-radius:0;background:transparent;padding:12px 5px 13px;color:var(--muted);font-size:13px;border-bottom:2px solid transparent}.review-page .panel-tabs button[aria-pressed=true]{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}.panel-content{padding:20px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}.section-heading h2{font-size:15px;font-weight:650;margin:0}.compact-toggle{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px}.part-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.review-page .part-chip{display:flex;align-items:center;justify-content:space-between;border:1px solid #e7eae2;padding:10px 11px;border-radius:8px;font-size:12px;background:#fafbf8;text-align:left}.part-chip output{color:#8b9388;font-variant-numeric:tabular-nums;font-size:11px}.review-page .part-chip.selected{background:#eaf1e8;border-color:#a5b99e;color:#31553f}.part-chip.selected output{color:#53774e}.angle-card{border:1px solid var(--line);border-radius:12px;padding:14px;margin-top:17px;background:#fcfdfa}.part-select{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:11px;margin-bottom:14px}.part-select select{flex:1;width:auto;min-width:0}.angle-heading{display:flex;align-items:center;justify-content:space-between;font-size:12px}.range-caption{font-size:10px;color:var(--muted)}.angle-entry{display:flex;justify-content:center;align-items:center;gap:18px;margin:16px 0 12px}.review-page .angle-entry>button{width:30px;height:30px;padding:0;border-radius:50%;font-size:15px;background:#f2f5ed}.angle-entry>label{display:flex;gap:3px;align-items:baseline}.angle-entry input{font-size:27px;font-weight:550;max-width:125px;width:90px;padding:0;border:0;background:none;text-align:center;color:#36583f;font-variant-numeric:tabular-nums;appearance:textfield}.angle-entry input::-webkit-inner-spin-button{appearance:none}.angle-entry span{color:var(--muted)}.angle-slider{width:100%;margin:7px 0 12px}.angle-footer{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:var(--muted)}.axis-picker{margin-top:17px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12px}.axis-picker p{flex-basis:100%;margin:0;font-size:10px;color:var(--muted)}.motion-note{margin-top:18px;display:flex;gap:7px;align-items:flex-start;font-size:10px;line-height:1.7;color:var(--muted)}.note-dot{width:5px;height:5px;border-radius:50%;background:#8ba68e;flex-shrink:0;margin-top:6px}.limits-detail{margin-top:17px;padding-top:13px;border-top:1px solid #edf0e7;color:var(--muted);font-size:11px}.review-page summary{cursor:pointer}.limits-detail dl{margin:12px 0 0}.limits-detail dl>div{display:flex;justify-content:space-between;gap:8px;margin:7px 0;font-size:10px}.limits-detail dd{margin:0;color:#53624e}.section-intro{font-size:12px;color:var(--muted);margin:-4px 0 20px}.wardrobe-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px 12px}.wardrobe-fields>label{font-size:11px;color:var(--muted)}.wide{grid-column:1/-1}.review-page select{display:block;width:100%;font:inherit;font-size:12px;color:var(--ink);padding:9px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;margin-top:6px;min-width:0}.part-select select{margin:0;font-size:11px;padding:5px 7px}.choice-field{border:0;padding:0;margin:0;display:flex;gap:6px}.choice-field legend{font-size:11px;color:var(--muted);margin-bottom:8px;padding:0}.choice-field label{position:relative;flex:1;border:1px solid var(--line);border-radius:7px;text-align:center;padding:8px 3px;font-size:11px;cursor:pointer;background:#fafbf8}.choice-field label.checked{border-color:#9ab492;color:#3d6445;background:#eaf1e8}.choice-field input{position:absolute;opacity:0;width:1px;height:1px}.choice-field label:focus-within{outline:2px solid #7b9d88;outline-offset:2px}.review-page .wardrobe-button{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:14px;margin-top:23px;background:#f0f4eb;border-color:#dbe5d3;font-size:12px;color:var(--accent)}.wardrobe-button span{font-size:10px;color:#85917c}.subtle-note{font-size:10px;color:var(--muted);line-height:1.8;margin:16px 0 0}.full-width{width:100%}.export-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}.export-grid button,.file-button{font-size:11px;text-align:center}.file-button{display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.file-button input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.advanced-detail{margin-top:27px;border-top:1px solid var(--line);padding-top:16px;font-size:11px;color:var(--muted)}.advanced-detail p{font-size:10px;margin:12px 0}.advanced-detail button{font-size:11px}.save-status{font-size:11px;background:#edf4e9;color:#527048;padding:10px 13px;border-radius:8px;margin:0 20px 20px}.review-wardrobe{position:fixed;top:16px;right:16px;bottom:16px;z-index:30;max-height:calc(100vh - 32px);width:440px;max-width:calc(100vw - 32px);box-shadow:0 18px 80px #21382b35}
.occlusion-control{margin-top:18px;border-top:1px solid var(--line);padding-top:16px}.occlusion-heading{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:9px}.occlusion-heading small{font-size:10px;color:var(--muted)}.occlusion-control .segmented{display:flex}.occlusion-control .segmented button{flex:1}.occlusion-control p{font-size:10px;color:var(--muted);line-height:1.7;margin:8px 0 0}
@media(min-width:1500px){.review-layout{grid-template-columns:minmax(0,1fr) 390px}.review-canvas{max-height:850px}}
@media(max-width:1000px){.review-page{padding:20px}.review-layout{grid-template-columns:minmax(0,1fr) 320px;gap:16px}.view-options{gap:8px}.zoom-control{display:none!important}.panel-content{padding:16px}.stage-tools{padding:12px}.stage-footer{padding:12px;font-size:10px;flex-wrap:wrap}}
@media(max-width:760px){.review-page{padding:16px 12px}.page-header{align-items:flex-start;gap:14px;margin-bottom:16px;flex-wrap:wrap}.title-line h1{font-size:22px}.page-header p{font-size:11px}.header-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.header-actions button{font-size:12px}.review-layout{grid-template-columns:1fr}.stage-panel,.control-panel{position:static}.control-panel{max-height:none}.review-canvas{height:auto;min-height:0;max-height:65vh;aspect-ratio:600/670}.stage-tools{gap:8px}.view-options{font-size:11px}.stage-footer{flex-wrap:nowrap}.panel-content{padding:18px}.panel-tabs{position:static}.review-wardrobe{inset:10px;max-width:calc(100vw - 20px);width:auto;max-height:calc(100vh - 20px)}}
</style>

<template>
 <section class="arm-lab">
  <header><div><h2>右臂圆形铰接 · SVG 示例</h2><p>肉臂、衣袖各有内切圆。两条切割直径共线，下段分别绕各自圆心同步转动。</p></div><button @click="exportSvg">导出当前 SVG</button></header>
  <div class="lab-layout">
   <svg ref="svg" viewBox="-40 -160 350 430" aria-label="右臂圆形铰接示例" @pointermove="move" @pointerup="drag=false" @pointercancel="drag=false">
    <defs>
     <clipPath id="arm-upper"><path :d="half(-1)"/><circle :cx="cx" :cy="cy" :r="radius"/></clipPath>
     <clipPath id="arm-lower"><path :d="half(1)"/><circle :cx="cx" :cy="cy" :r="radius"/></clipPath>
     <clipPath id="sleeve-upper"><path :d="half(-1,sleeveCenter)"/><circle :cx="sleeveCenter.x" :cy="sleeveCenter.y" :r="sleeveRadius"/></clipPath>
     <clipPath id="sleeve-lower"><path :d="half(1,sleeveCenter)"/><circle :cx="sleeveCenter.x" :cy="sleeveCenter.y" :r="sleeveRadius"/></clipPath>
    </defs>
    <rect x="-40" y="-160" width="350" height="430" fill="#eee8de"/>
    <g v-if="guides" data-mirror-guide pointer-events="none">
      <path :d="mirrorAxis" stroke="#2682ac" stroke-width="1.2" stroke-dasharray="4 3" fill="none"/>
      <circle :cx="mirrorCenter.x" :cy="mirrorCenter.y" r="4" fill="#2682ac"/>
      <line :x1="mirrorTop.x" :y1="mirrorTop.y" :x2="mirrorPivot.x" :y2="mirrorPivot.y" stroke="#527a69" stroke-width="2"/>
      <circle :cx="mirrorTop.x" :cy="mirrorTop.y" :r="mirrored?3:5" fill="#527a69"/>
      <circle :cx="mirrorPivot.x" :cy="mirrorPivot.y" :r="mirrored?5:3" fill="#527a69"/>
      <text :x="mirrorTop.x-27" :y="mirrorTop.y-9" font-size="9" fill="#236b8b">上连接点</text>
      <text :x="mirrorPivot.x-27" :y="mirrorPivot.y+15" font-size="9" fill="#236b8b">下连接点</text>
    </g>
    <g :transform="shoulderTransform" data-shoulder-motion>
    <g ref="armGroup" :transform="mirrorTransform" data-whole-arm :data-mirrored="mirrored">
    <g v-if="!sleeve||xray" data-upper-skin>
     <circle :cx="cx" :cy="cy" :r="radius" fill="#FFE0B1"/>
     <g clip-path="url(#arm-upper)"><g transform="scale(3) translate(-131.51982 -63.8)"><path v-for="(p,i) in paths.skin" :key="i" :d="p.d" :fill="p.fill"/></g></g>
    </g>
    <g v-if="sleeve" data-upper-sleeve :opacity="xray?.55:1">
     <circle :cx="sleeveCenter.x" :cy="sleeveCenter.y" :r="sleeveRadius" fill="#3498db"/>
     <g clip-path="url(#sleeve-upper)"><g transform="translate(-1.77 0) scale(3) translate(-278.07663 -25.35)"><path v-for="(p,i) in paths.sleeve" :key="i" :d="p.d" :fill="sleeveColor(p.fill)"/></g></g>
    </g>
    <g :transform="`rotate(${angle} ${cx} ${cy})`" data-lower-arm>
     <circle v-if="!sleeve||xray" :cx="cx" :cy="cy" :r="radius" fill="#FFE0B1"/>
     <g v-if="!sleeve||xray" clip-path="url(#arm-lower)"><g transform="scale(3) translate(-131.51982 -63.8)"><path v-for="(p,i) in paths.skin" :key="i" :d="p.d" :fill="p.fill"/></g></g>
     <g :transform="`translate(${attachment.wrist.x} ${attachment.wrist.y}) rotate(${attachment.handAngle}) translate(${-attachment.handPivot.x} ${-attachment.handPivot.y}) scale(3) translate(-130.9851 -29.5777)`" data-hand><path v-for="(p,i) in paths.hand" :key="i" :d="p.d" :fill="p.fill"/></g>
    </g>
     <g v-if="sleeve" data-lower-sleeve :transform="`rotate(${angle} ${sleeveCenter.x} ${sleeveCenter.y})`" :opacity="xray?.55:1">
      <circle :cx="sleeveCenter.x" :cy="sleeveCenter.y" :r="sleeveRadius" fill="#3498db"/>
      <g clip-path="url(#sleeve-lower)"><g transform="translate(-1.77 0) scale(3) translate(-278.07663 -25.35)"><path v-for="(p,i) in paths.sleeve" :key="i" :d="p.d" :fill="sleeveColor(p.fill)"/></g></g>
     </g>
    <g v-if="guides" data-guides>
     <path :d="cutLine" fill="none" stroke="#c56c54" stroke-dasharray="4 3" stroke-width="1" pointer-events="none"/>
     <circle data-joint-circle="skin" :cx="cx" :cy="cy" :r="radius" fill="none" stroke="#a54d39" stroke-width="1.2" stroke-dasharray="3 2" pointer-events="none"/>
     <circle v-if="sleeve" data-joint-circle="sleeve" :cx="sleeveCenter.x" :cy="sleeveCenter.y" :r="sleeveRadius" fill="none" stroke="#267ca5" stroke-width="1.2" stroke-dasharray="3 2" pointer-events="none"/>
     <circle v-if="sleeve" :cx="sleeveCenter.x" :cy="sleeveCenter.y" r="3" fill="#267ca5"/>
     <circle v-for="(p,i) in skinDiameter" :key="i" :cx="p.x" :cy="p.y" r="2.5" fill="#a54d39" pointer-events="none"/>
     <circle v-for="(p,i) in sleeve?sleeveDiameter:[]" :key="`sleeve-${i}`" :cx="p.x" :cy="p.y" r="2.5" fill="#267ca5" pointer-events="none"/>
     <circle :cx="cx" :cy="cy" r="5" fill="#fff" stroke="#a54d39" stroke-width="2" aria-label="圆心" @pointerdown.prevent="start"/>
     <path :d="`M${cx+5} ${cy-3}l24 -15h37`" fill="none" stroke="#a54d39" stroke-width=".8" pointer-events="none"/>
     <text :x="cx+30" :y="cy-21" font-size="9" fill="#a54d39">肉臂圆心</text>
     <path v-if="sleeve" :d="`M${sleeveCenter.x-3} ${sleeveCenter.y+3}l-25 20h-38`" fill="none" stroke="#267ca5" stroke-width=".8" pointer-events="none"/>
     <text v-if="sleeve" :x="sleeveCenter.x-66" :y="sleeveCenter.y+34" font-size="9" fill="#267ca5">衣袖圆心</text>
    </g>
    </g>
    </g>
   </svg>
   <div class="lab-controls">
    <label>肩部铰接方式<select aria-label="肩部铰接方式" :value="mirrored?'up':'down'" @change="switchShoulder($event.target.value)"><option value="down">上角点为轴 · 往下摆</option><option value="up">下角点为轴 · 镜像往上举</option></select></label>
    <p>切换时先归零肩角和弯曲角，再整臂镜像。绿色两点代表与衣服连接的两个铰接点。</p>
    <label>{{mirrored?'上举':'下摆'}}角度 {{shoulderAngle}}°<input aria-label="示例肩部角度" v-model.number="shoulderAngle" type="range" min="0" :max="mirrored?10:35"></label>
    <label>弯曲角度 {{angle}}°<input aria-label="示例弯曲角度" v-model.number="angle" type="number" step="1"></label>
    <div class="pair"><label>圆心 X<input aria-label="示例圆心 X" v-model.number="cx" type="number" min="40" max="145"></label><label>圆心 Y<input aria-label="示例圆心 Y" v-model.number="cy" type="number" min="15" max="115"></label></div>
    <label>肉臂半径 {{radius.toFixed(2)}}<input aria-label="示例接头半径" v-model.number="radius" type="range" min="12" max="32" step=".1"></label>
    <label>衣袖半径 {{sleeveRadius.toFixed(2)}}<input aria-label="示例衣袖半径" v-model.number="sleeveRadius" type="range" :min="radius+.1" max="38" step=".1"></label>
    <label>切割方向 {{cut.toFixed(2)}}°<input aria-label="示例切线方向" v-model.number="cut" type="range" min="0" max="90" step=".1"></label>
    <div class="pair"><label><input v-model="sleeve" type="checkbox">显示长袖</label><label><input v-model="guides" type="checkbox">显示圆与切线</label><label><input v-model="xray" type="checkbox">透视衣袖</label></div>
    <button @click="switchShoulder('down');cx=joint.x;cy=joint.y;radius=joint.radius;sleeveRadius=joint.sleeve.radius;cut=joint.cut">恢复示例</button>
    <p>两个圆分别与原轮廓相切，袖圆大于肉臂圆；圆心不同，切割直径共线。手掌固定跟随肉臂，衣袖围绕自己的圆心同步弯曲。</p>
   </div>
  </div>
 </section>
</template>
<script setup>
import {ref,computed} from 'vue';
import paths from './armJointPaths.json';
import joint from './armCircle.json';
import attachment from './armAttachment.json';
const svg=ref(null),cx=ref(joint.x),cy=ref(joint.y),radius=ref(joint.radius),sleeveRadius=ref(joint.sleeve.radius),cut=ref(joint.cut),angle=ref(0),sleeve=ref(true),guides=ref(true),xray=ref(false);let drag=false;
const armGroup=ref(null),mirrored=ref(false);
const shoulderAngle=ref(0);
function switchShoulder(mode){drag=false;angle.value=0;shoulderAngle.value=0;mirrored.value=mode==='up';}
// Original upper-sleeve shoulder-edge vertices, in this preview's native coordinates.
const mirrorTop={x:(280.35-278.07663)*3-1.77,y:0};
const mirrorPivot={x:(285.75-278.07663)*3-1.77,y:(52.7-25.35)*3};
const mirrorCenter={x:(mirrorTop.x+mirrorPivot.x)/2,y:(mirrorTop.y+mirrorPivot.y)/2};
const edge={x:mirrorPivot.x-mirrorTop.x,y:mirrorPivot.y-mirrorTop.y};
const edgeLength=Math.hypot(edge.x,edge.y),axis={x:edge.y/edgeLength,y:-edge.x/edgeLength};
const reflection={a:2*axis.x*axis.x-1,b:2*axis.x*axis.y,c:2*axis.x*axis.y,d:2*axis.y*axis.y-1};
reflection.e=mirrorCenter.x-reflection.a*mirrorCenter.x-reflection.c*mirrorCenter.y;
reflection.f=mirrorCenter.y-reflection.b*mirrorCenter.x-reflection.d*mirrorCenter.y;
const mirrorTransform=computed(()=>mirrored.value?`matrix(${reflection.a} ${reflection.b} ${reflection.c} ${reflection.d} ${reflection.e} ${reflection.f})`:'matrix(1 0 0 1 0 0)');
const shoulderTransform=computed(()=>{const p=mirrored.value?mirrorPivot:mirrorTop;return `rotate(${mirrored.value?-shoulderAngle.value:shoulderAngle.value} ${p.x} ${p.y})`;});
const mirrorAxis=`M${mirrorCenter.x-axis.x*200} ${mirrorCenter.y-axis.y*200} L${mirrorCenter.x+axis.x*240} ${mirrorCenter.y+axis.y*240}`;
const normal=computed(()=>({x:Math.cos(cut.value*Math.PI/180),y:Math.sin(cut.value*Math.PI/180)}));
const sleeveOffset=(joint.sleeve.x-joint.x)*joint.diameterLine.direction.x+(joint.sleeve.y-joint.y)*joint.diameterLine.direction.y;
const sleeveCenter=computed(()=>({x:cx.value-normal.value.y*sleeveOffset,y:cy.value+normal.value.x*sleeveOffset}));
function diameter(center,r){const n=normal.value;return [-1,1].map(side=>({x:center.x-side*n.y*r,y:center.y+side*n.x*r}));}
const skinDiameter=computed(()=>diameter({x:cx.value,y:cy.value},radius.value));
const sleeveDiameter=computed(()=>diameter(sleeveCenter.value,sleeveRadius.value));
function half(side,center={x:cx.value,y:cy.value}){const n=normal.value,t={x:-n.y,y:n.x},a={x:center.x-t.x*500,y:center.y-t.y*500},b={x:center.x+t.x*500,y:center.y+t.y*500};return `M${a.x} ${a.y} L${b.x} ${b.y} L${b.x+side*n.x*500} ${b.y+side*n.y*500} L${a.x+side*n.x*500} ${a.y+side*n.y*500}Z`;}
const cutLine=computed(()=>{const n=normal.value;return `M${cx.value+n.y*48} ${cy.value-n.x*48} L${cx.value-n.y*48} ${cy.value+n.x*48}`;});
const sleeveColor=c=>c==='#EEEEEE'?'#3498db':c==='#D2D2D2'?'#2a81bb':'#4aa7df';
function start(e){drag=true;svg.value.setPointerCapture(e.pointerId);}
function move(e){if(!drag)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(armGroup.value.getScreenCTM().inverse());cx.value=Math.max(40,Math.min(145,Math.round(p.x)));cy.value=Math.max(15,Math.min(115,Math.round(p.y)));}
function exportSvg(){const node=svg.value.cloneNode(true);node.setAttribute('xmlns','http://www.w3.org/2000/svg');node.querySelector('[data-guides]')?.remove();const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(node)],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='right-arm-circular-joint.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
</script>
<style scoped>
.arm-lab{padding:18px;background:#fffdf8;border:1px solid #dfd3c4;border-radius:14px;margin:18px auto;max-width:1400px}.arm-lab header{display:flex;justify-content:space-between;align-items:center}.arm-lab h2{margin:0}.lab-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px}.lab-layout svg{width:100%;height:440px;touch-action:none}.lab-controls{display:grid;gap:12px;align-content:start}.lab-controls label{display:block}.lab-controls input[type=range]{width:100%}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pair input[type=number]{width:100%;box-sizing:border-box}.arm-lab p{font-size:12px;color:#867362}.arm-lab button{padding:8px;border:1px solid #d7c4af;background:#f0e3d3;border-radius:8px}.arm-lab circle[aria-label]{cursor:grab}@media(max-width:800px){.lab-layout{grid-template-columns:1fr}.lab-layout svg{height:340px}}
</style>

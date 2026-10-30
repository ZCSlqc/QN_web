<template><div ref="host" class="clothing-preview" :aria-busy="loading"><canvas ref="canvas" :width="220" :height="height" role="img" aria-label="服装预览" :data-kind="kind"/><small v-if="error" role="alert">暂时没有加载好</small></div></template>
<script setup>
import {ref,computed,watch,onMounted,onUnmounted} from 'vue';
import {loadCharacters} from './characters';
import {normalizeAppearance} from './catalog';
const props=defineProps({appearance:Object,kind:{type:String,default:'sets'}}),host=ref(null),canvas=ref(null),loading=ref(false),error=ref(false);
const height=computed(()=>props.kind==='sets'?230:props.kind==='pants'?200:160);
let art,observer,disposed=false,version=0;
async function render(){
 if(!art||!canvas.value)return;const current=++version;loading.value=true;
 try{
  const value=props.kind==='shirt'?{...props.appearance,coatStyle:null}:props.appearance;
  const appearance=await art.ensureClothesAppearance(normalizeAppearance(value));if(disposed||current!==version)return;
  const ctx=canvas.value.getContext('2d');ctx.clearRect(0,0,220,height.value);
  const bounds=props.kind==='sets'?{y:-170,w:340,h:400}:props.kind==='pants'?{y:-96,w:300,h:215}:props.kind==='shoes'?{x:47,y:21,w:104,h:52}:{y:-245,w:340,h:250};
  const scale=Math.min(200/bounds.w,(height.value-16)/bounds.h);
  ctx.save();ctx.translate(110,height.value/2);ctx.scale(scale,scale);ctx.translate(-(bounds.x||0),-bounds.y);art.drawClothes(ctx,appearance,props.kind);ctx.restore();
  canvas.value.dataset.appearance=JSON.stringify(appearance);error.value=false;
 }catch{if(!disposed&&current===version)error.value=true;}finally{if(!disposed&&current===version)loading.value=false;}
}
watch(()=>[props.appearance,props.kind],render,{deep:true});
onMounted(()=>{
 const start=async()=>{observer?.disconnect();if(disposed)return;art=await loadCharacters();if(disposed){art.dispose();return;}void render();};
 if(typeof IntersectionObserver==='undefined'){void start();return;}
 observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void start();},{rootMargin:'80px'});observer.observe(host.value);
});
onUnmounted(()=>{disposed=true;version++;observer?.disconnect();art?.dispose();});
</script>
<style scoped>
.clothing-preview{display:grid;place-items:center;position:relative;min-height:145px;border-radius:10px;background:#f5eee4}.clothing-preview canvas{display:block;width:100%;height:145px;object-fit:contain}.clothing-preview small{position:absolute;bottom:3px;font-size:10px;color:#a45151}
</style>

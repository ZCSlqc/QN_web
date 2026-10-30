<template><canvas ref="canvas" width="150" height="170" aria-label="五官搭配预览" :aria-busy="busy" /></template>
<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { normalizeAppearance, resolveParts, partUrl } from './catalog';
import { drawFace } from './faceLayouts';
const props=defineProps({appearance:Object});
const canvas=ref(null),busy=ref(true);let version=0;
async function render() {
  const ticket=++version;busy.value=true;
  try {
    const a=normalizeAppearance(props.appearance),parts=resolveParts(a),images=new Map();
    await Promise.all(['eyes','eyebrows','nose','mouth'].map(async key=>{
      const p=parts[key],img=new Image();img.src=partUrl(p);await img.decode();images.set(p.id,img);
    }));
    if(ticket!==version||!canvas.value)return;
    const c=canvas.value.getContext('2d');c.clearRect(0,0,150,170);
    c.save();c.translate(75,485);drawFace(c,images,parts,a);c.restore();
  } catch { if(ticket===version&&canvas.value)canvas.value.getContext('2d').clearRect(0,0,150,170); }
  finally {if(ticket===version)busy.value=false;}
}
watch(()=>props.appearance,render,{deep:true});onMounted(render);onUnmounted(()=>version++);
</script>

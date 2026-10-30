<template>
  <div class="character-preview" :aria-busy="loading">
    <canvas
      ref="canvas"
      width="220"
      height="230"
      role="img"
      aria-label="造型预览"
    ></canvas
    ><small v-if="loading" role="status">正在试穿…</small
    ><small v-else-if="error" role="alert"
      >这件素材暂时没有加载好，换一件试试。</small
    >
  </div>
</template>
<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { loadCharacters } from "./characters";
const props = defineProps({ appearance: Object, rigidPose: Object, rigidBindings: Object, circularArm: Object, leftCircularArm: Object });
const canvas = ref(null),
  error = ref(false),
  loading = ref(true);
let art,
  disposed = false,
  version = 0;
async function render() {
  if (!art || !canvas.value) return;
  const current = ++version;
  loading.value = true;
  try {
    const appearance = await art.ensureAppearance(props.appearance);
    if (disposed || current !== version) return;
    const ctx = canvas.value.getContext("2d");
    ctx.clearRect(0, 0, 220, 230);
    ctx.save();
    ctx.scale(1.35, 1.35);
    art.draw(ctx, { x: 81, y: 163, appearance, direction: "front", rigidPose: props.rigidPose, rigidBindings: props.rigidBindings, circularArm:props.circularArm, leftCircularArm:props.leftCircularArm }, 0, true);
    ctx.restore();
    error.value = false;
    canvas.value.dataset.appearance = JSON.stringify(appearance);
  } catch {
    if (!disposed && current === version) error.value = true;
  } finally {
    if (!disposed && current === version) loading.value = false;
  }
}
watch(() => props.appearance, render, { deep: true });
watch(() => props.rigidPose, render, { deep: true });
watch(() => [props.circularArm,props.leftCircularArm], render, {deep:true});
watch(() => props.rigidBindings, render, { deep: true });
onMounted(async () => {
  art = await loadCharacters();
  if (disposed) {
    art.dispose();
    return;
  }
  void render();
});
onUnmounted(() => {
  disposed = true;
  version++;
  art?.dispose();
});
</script>
<style scoped>
.character-preview {
  position: relative;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse, #fffaf2, #f0e6d8);
  border-radius: 14px;
  min-height: 180px;
}
.character-preview canvas {
  width: 180px;
  height: 188px;
  object-fit: contain;
}
.character-preview small {
  position: absolute;
  bottom: 3px;
  font-size: 11px;
  color: #a45151;
  text-align: center;
}
</style>

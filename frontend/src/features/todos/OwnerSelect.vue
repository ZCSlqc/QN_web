<template>
  <div>
    <select :id="id" :value="modelValue" aria-label="贡献人" :disabled="disabled || loading" required @change="$emit('update:modelValue', $event.target.value)">
      <option disabled value="">{{ loading ? '正在读取主人…' : '请选择贡献人' }}</option>
      <option v-if="legacyValue" :value="modelValue" disabled>{{ modelValue }}（历史记录）</option>
      <option v-for="owner in owners" :key="owner.username" :value="owner.username">{{ owner.display_name }}</option>
    </select>
    <p v-if="error" role="alert">主人列表加载失败 <button type="button" :disabled="disabled" @click="load">重试</button></p>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import request from '../../utils/request'
const props = defineProps({ id: String, modelValue: String, disabled: Boolean, defaultCurrent: Boolean })
const emit = defineEmits(['update:modelValue'])
const owners = ref([]), loading = ref(true), error = ref(false)
const controller = new AbortController()
const legacyValue = computed(() => props.modelValue && !owners.value.some(owner => owner.username === props.modelValue))
async function load() {
  loading.value = true; error.value = false
  try {
    const { data } = await request.get('/admin/owners', { signal: controller.signal })
    owners.value = data.data
    if (props.defaultCurrent && !props.modelValue && owners.value.some(owner => owner.username === data.current_username)) emit('update:modelValue', data.current_username)
  } catch { if (!controller.signal.aborted) error.value = true }
  finally { loading.value = false }
}
onMounted(load)
onUnmounted(() => controller.abort())
</script>
<style scoped>
select { width: 100%; padding: 10px 12px; border: 1.5px solid var(--color-rose-light); border-radius: var(--radius-sm); background: #fff; color: var(--color-text); font: 16px var(--font-body); }
p { font-size: 13px; color: var(--color-rose-dark); margin-top: 8px; }
button { background: none; color: inherit; text-decoration: underline; }
</style>

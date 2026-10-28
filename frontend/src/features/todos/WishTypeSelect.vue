<template>
  <select :id="id" :value="modelValue" :disabled="disabled" aria-label="类型" required @change="$emit('update:modelValue', $event.target.value)">
    <option disabled value="">请选择类型</option>
    <option v-for="type in options" :key="type" :value="type">{{ type }}</option>
  </select>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ id: String, modelValue: String, disabled: Boolean })
defineEmits(['update:modelValue'])
const types = ['旅行', '美食', '电视剧', '电影', '综艺', '日常', '其他']
const options = computed(() => props.modelValue && !types.includes(props.modelValue) ? [...types, props.modelValue] : types)
</script>

<style scoped>
select { width: 100%; padding: 10px 12px; border: 1.5px solid var(--color-rose-light); border-radius: var(--radius-sm); background: #fff; color: var(--color-text); font-family: var(--font-body); font-size: 16px; }
select:focus { border-color: var(--color-rose); }
</style>

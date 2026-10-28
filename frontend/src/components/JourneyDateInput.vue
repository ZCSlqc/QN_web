<template>
  <ElConfigProvider :locale="zhCn">
  <ElDatePicker :id="id" :model-value="modelValue || null" type="date" style="width: 100%"
    format="YYYY/MM/DD" value-format="YYYY-MM-DD" placeholder="YYYY/MM/DD"
    :disabled="disabled" :disabled-date="disabledDate" :editable="true"
    @update:model-value="$emit('update:modelValue', $event || '')" />
  </ElConfigProvider>
</template>

<script setup>
import { ElConfigProvider, ElDatePicker } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/es/components/date-picker/style/css'
const props = defineProps({ id: String, modelValue: String, disabled: Boolean, min: String })
defineEmits(['update:modelValue'])
function disabledDate(date) {
  if (!props.min) return false
  const minimum = new Date(`${props.min}T00:00:00`)
  return date < minimum
}
</script>

<style scoped>
.el-date-editor { width: 100%; }
</style>

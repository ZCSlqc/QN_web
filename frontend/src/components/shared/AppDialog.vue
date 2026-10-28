<template>
  <ElDialog :model-value="modelValue" :title="title" :show-close="false"
    :close-on-click-modal="!busy" :close-on-press-escape="!busy"
    append-to-body destroy-on-close align-center :width="width" class="app-dialog"
    @update:model-value="$emit('update:modelValue', $event)">
    <slot />
  </ElDialog>
</template>

<script setup>
import { ElDialog } from 'element-plus'
defineProps({ modelValue: Boolean, title: String, busy: Boolean, width: { type: String, default: '460px' } })
defineEmits(['update:modelValue'])
</script>

<style>
.app-dialog { padding: 0; max-width: calc(100vw - 32px); border-radius: 20px; overflow: hidden; }
.app-dialog .el-dialog__header { display: none; }
.app-dialog .el-dialog__body { padding: 0; max-height: 85vh; max-height: 85dvh; overflow-y: auto; }
.app-dialog .modal-card, .app-dialog .journey-modal-card { width: 100% !important; max-width: none !important; box-shadow: none !important; }
</style>

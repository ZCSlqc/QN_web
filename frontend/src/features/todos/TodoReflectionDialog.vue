<template>
  <AppDialog :model-value="!!item" :title="completing ? '完成心愿' : '完成感想'" :busy="busy" @update:model-value="value => { if (!value && !busy) emit('close') }">
    <form class="reflection-form" @submit.prevent="save">
      <header><h3>{{ completing ? '又完成了一件想做的事' : '记下这一刻' }}</h3><button type="button" :disabled="busy" aria-label="关闭感想弹窗" @click="emit('close')">✕</button></header>
      <p class="reflection-name">{{ item?.entry }}</p>
      <label for="todo-reflection">完成感想 <span>（选填）</span></label>
      <textarea id="todo-reflection" v-model="text" maxlength="2000" rows="5" :disabled="busy" placeholder="当时的心情、发生的小事，写几句就好…"></textarea>
      <p class="reflection-hint">不写也可以，以后想起来还能补上。<span>{{ text.length }}/2000</span></p>
      <p v-if="error" class="reflection-error" role="alert">{{ error }}</p>
      <footer><button type="button" :disabled="busy" @click="emit('close')">取消</button><button type="submit" class="primary" :disabled="busy">{{ busy ? '保存中…' : completing ? '完成心愿' : '保存感想' }}</button></footer>
    </form>
  </AppDialog>
</template>
<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppDialog from '../../components/shared/AppDialog.vue'
import request from '../../utils/request'
const props = defineProps({ item: Object, completing: Boolean })
const emit = defineEmits(['close', 'saved'])
const text = ref(''), busy = ref(false), error = ref('')
const controller = new AbortController()
let disposed = false
watch(() => props.item, item => { text.value = item?.reflection || ''; error.value = '' }, { immediate: true })
async function save() {
  if (busy.value || !props.item) return
  busy.value = true; error.value = ''
  const data = new FormData(); data.append('reflection', text.value.trim())
  try {
    if (props.completing) {
      data.append('done', 'true')
      data.append('replace_reflection', 'true')
      await request.post(`/admin/todos/${props.item.id}/status`, data, { signal: controller.signal })
    } else await request.put(`/admin/todos/${props.item.id}/reflection`, data, { signal: controller.signal })
    if (disposed) return
    ElMessage.success(props.completing ? '完成了一项心愿！' : '感想已保存')
    emit('saved'); emit('close')
  } catch (e) { if (!disposed) error.value = e.response?.data?.detail || '保存失败，文字已保留，请重试' }
  finally { busy.value = false }
}
onUnmounted(() => { disposed = true; controller.abort() })
</script>
<style scoped>
.reflection-form { padding: 24px; }
header, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h3 { font-size: 19px; font-weight: 500; }
header button { background: transparent; color: var(--color-text-light); padding: 8px; }
.reflection-name { color: var(--color-rose-dark); margin: 18px 0; overflow-wrap: anywhere; }
label { display: block; margin-bottom: 10px; font-size: 14px; }
label span, .reflection-hint { color: var(--color-text-light); }
textarea { width: 100%; resize: vertical; border: 1px solid var(--color-rose-light); border-radius: 12px; padding: 12px; font: inherit; font-size: 16px; line-height: 1.8; }
.reflection-hint { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 8px; font-size: 12px; }
.reflection-error { color: #ad324b; font-size: 13px; margin: 12px 0; }
footer { justify-content: flex-end; margin-top: 24px; }
footer button { padding: 10px 20px; border-radius: 24px; background: var(--color-rose-soft); color: var(--color-rose-dark); }
footer .primary { background: var(--color-rose-dark); color: white; }
</style>

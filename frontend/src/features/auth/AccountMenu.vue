<template>
  <button class="account-button" @click="visible = true">账号</button>
  <AppDialog v-model="visible" title="账号设置" :busy="busy">
    <div class="account-panel">
      <form class="nickname-form" @submit.prevent="saveNickname">
        <h3>个人昵称</h3>
        <label for="account-nickname">昵称（最多20字）</label>
        <input id="account-nickname" v-model="nickname" maxlength="20" :disabled="busy" placeholder="不填则显示登录用户名" />
        <p>昵称用于展示，不改变登录用户名或权限。</p>
        <p v-if="nicknameError" class="error" role="alert">{{ nicknameError }}</p>
        <button type="submit" :disabled="busy">保存昵称</button>
      </form>
      <form @submit.prevent="changePassword">
      <h3>账号设置</h3>
      <label for="account-current-password">当前密码</label><input id="account-current-password" v-model="currentPassword" type="password" autocomplete="current-password" :disabled="busy" required />
      <label for="account-new-password">新密码</label><input id="account-new-password" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" :disabled="busy" required />
      <label for="account-confirm-password">确认新密码</label><input id="account-confirm-password" v-model="confirmation" type="password" autocomplete="new-password" :disabled="busy" required />
      <p>修改密码后，所有设备都需要重新登录。</p>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <div class="account-actions"><button type="button" :disabled="busy" @click="visible = false">取消</button><button type="submit" :disabled="busy">修改密码</button></div>
      <button type="button" class="logout" :disabled="busy" @click="logout">退出登录</button>
      </form>
    </div>
  </AppDialog>
</template>
<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppDialog from '../../components/shared/AppDialog.vue'
import request from '../../utils/request'
const router = useRouter()
const visible = ref(false), busy = ref(false), error = ref('')
const nickname = ref(''), nicknameError = ref('')
const currentPassword = ref(''), newPassword = ref(''), confirmation = ref('')
watch(visible, async open => {
  currentPassword.value = ''; newPassword.value = ''; confirmation.value = ''; error.value = ''; nicknameError.value = ''
  if (open) {
    busy.value = true
    try { const res = await request.get('/me'); nickname.value = res.data.nickname || '' }
    catch { nicknameError.value = '昵称暂时未能读取，请关闭后重试' }
    finally { busy.value = false }
  }
})
async function saveNickname() {
  if (busy.value) return
  busy.value = true; nicknameError.value = ''
  const data = new FormData(); data.append('nickname', nickname.value.trim())
  try {
    await request.put('/account/nickname', data)
    window.dispatchEvent(new Event('profile-updated'))
    ElMessage.success('昵称已保存')
  } catch (e) { nicknameError.value = e.response?.data?.detail || '保存失败，请重试' }
  finally { busy.value = false }
}
async function clearSession() {
  visible.value = false
  localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('need_blessing')
  window.dispatchEvent(new Event('auth-expired'))
  await router.replace('/login')
}
async function logout() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await request.post('/logout'); await clearSession() }
  catch (e) { error.value = e.response?.data?.detail || '退出失败，请重试' }
  finally { busy.value = false }
}
async function changePassword() {
  if (busy.value) return
  if (newPassword.value !== confirmation.value) { error.value = '两次新密码不一致'; return }
  busy.value = true; error.value = ''
  const body = new FormData(); body.append('current_password', currentPassword.value); body.append('new_password', newPassword.value)
  try { await request.post('/account/password', body); ElMessage.success('密码已修改，请重新登录'); await clearSession() }
  catch (e) { error.value = e.response?.data?.detail || '修改失败，请重试' }
  finally { busy.value = false }
}
</script>
<style scoped>
.account-button { background: transparent; color: inherit; font-size: 13px; padding: 8px; border-radius: 12px; }
.account-panel { padding: 24px; }
.account-panel h3 { margin-bottom: 20px; }
.account-panel label { display: block; margin: 14px 0 8px; font-size: 14px; }
.account-panel input { width: 100%; padding: 10px; border: 1px solid var(--color-rose-light); border-radius: 8px; font-size: 16px; }
.account-panel p { color: var(--color-text-light); font-size: 12px; margin: 12px 0; }
.account-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.account-panel button { padding: 9px 16px; border-radius: 20px; background: var(--color-rose-soft); color: var(--color-rose-dark); }
.account-panel .logout { width: 100%; margin-top: 20px; }
.account-panel .error { color: #ad324b; }
</style>

<style scoped>
.nickname-form { padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px solid var(--color-rose-light); }
</style>

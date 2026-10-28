<template>
  <div class="admin-page">
    <SiteNavigation light :is-admin="authorized" :has-mailbox="hasMailbox" :current-username="currentUsername" @mailbox-unavailable="hasMailbox = false" />
    <main class="admin-body">
      <p v-if="checking" class="state-box" role="status">正在确认管理权限…</p>
      <div v-else-if="authError" class="state-box" role="alert">暂时无法确认权限 <button @click="initialize">重试</button></div>
      <template v-else-if="authorized">
        <div class="admin-welcome">
          <div><h3>欢迎你{{ currentUsername }}，打理我们的小世界</h3><p>整理留言、心愿，也照顾好每一位来访的朋友。</p></div>
          <div class="quick-links"><router-link to="/journey">管理旅程 →</router-link><router-link to="/index#album">管理相册 →</router-link></div>
        </div>
        <nav class="tab-bar" aria-label="管理栏目">
          <button v-for="item in tabs" :key="item.key" :class="{ active: tab === item.key }" :aria-pressed="tab === item.key" :disabled="busy" @click="selectTab(item.key)">{{ item.label }}</button>
        </nav>
        <RegistrationSettings v-if="tab === 'settings'" @unauthorized="leaveAdmin" />
        <section v-else class="management-panel" :aria-busy="states[tab].loading || busy">
          <div class="panel-toolbar">
            <div v-if="tab === 'todos'" class="todo-switch" aria-label="待办状态">
              <button :class="{ active: !showDone }" :disabled="busy" @click="switchTodos(false)">未完成</button>
              <button :class="{ active: showDone }" :disabled="busy" @click="switchTodos(true)">已完成</button>
            </div>
            <input v-if="tab === 'users'" v-model="userSearch" type="search" placeholder="搜索用户名或昵称…" aria-label="搜索用户名" />
            <span v-else-if="tab === 'blessings'" class="panel-count">{{ blessings.length }} 条祝福</span>
            <button class="refresh" :disabled="busy || states[tab].loading" @click="loadTab(tab)">刷新</button>
          </div>
          <p v-if="states[tab].loading" class="state-box" role="status">正在加载…</p>
          <div v-else-if="states[tab].error" class="state-box error" role="alert">{{ states[tab].error }} <button @click="loadTab(tab)">重试</button></div>
          <div v-else class="table-wrap">
            <table v-if="tab === 'users'">
              <thead><tr><th>用户名</th><th>昵称</th><th>身份</th><th>注册时间</th><th>登录次数</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.id">
                  <td>{{ user.username }}</td><td>{{ user.nickname || '—' }}</td><td><span class="badge" :class="{ owner: user.is_admin }">{{ user.is_admin ? '主人' : '访客' }}</span></td>
                  <td>{{ user.userdate }}</td><td>{{ user.login_count }}</td>
                  <td><div class="row-actions"><button class="btn-sm" :disabled="busy" @click="resetPassword(user)">重置密码</button><span v-if="user.is_admin" class="muted">受保护</span><button v-else class="btn-sm danger" :disabled="busy" @click="deleteUser(user)">删除</button></div></td>
                </tr>
                <tr v-if="!filteredUsers.length"><td colspan="6" class="empty">{{ userSearch ? '没有找到这个名字' : '暂无用户' }}</td></tr>
              </tbody>
            </table>
            <table v-else-if="tab === 'blessings'">
              <thead><tr><th>祝福</th><th>作者</th><th>时间</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="blessing in blessings" :key="blessing.id">
                  <td class="blessing-content"><p :class="{ collapsed: !expanded.has(blessing.id) }">{{ blessing.content }}</p><button class="text-button" :aria-expanded="expanded.has(blessing.id)" @click="toggleBlessing(blessing.id)">{{ expanded.has(blessing.id) ? '收起' : '展开全文' }}</button></td>
                  <td>{{ blessing.author }}</td><td>{{ blessing.created_at }}</td>
                  <td><button class="btn-sm danger" :disabled="busy" @click="deleteBlessing(blessing)">删除</button></td>
                </tr>
                <tr v-if="!blessings.length"><td colspan="4" class="empty">暂无祝福</td></tr>
              </tbody>
            </table>
            <table v-else>
              <thead><tr><th>心愿</th><th>类型</th><th>贡献人</th><th>{{ showDone ? '完成时间' : '创建时间' }}</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="todo in todos" :key="todo.id">
                  <td>{{ todo.entry }}<p v-if="showDone && todo.reflection" class="todo-reflection">{{ todo.reflection }}</p></td><td>{{ todo.type }}</td><td>{{ todo.user_display || todo.user }}</td><td>{{ showDone ? todo.end_date : todo.start_date }}</td>
                  <td><div class="row-actions"><button class="btn-sm" :disabled="busy" @click="openEdit(todo)">编辑</button><button v-if="showDone" class="btn-sm" :disabled="busy" @click="reflectionItem = { ...todo }; completingReflection = false">感想</button><button class="btn-sm" :disabled="busy" @click="setTodoStatus(todo)">{{ showDone ? '恢复待办' : '完成' }}</button><button class="btn-sm danger" :disabled="busy" @click="deleteTodo(todo)">删除</button></div></td>
                </tr>
                <tr v-if="!todos.length"><td colspan="5" class="empty">{{ showDone ? '还没有已完成的心愿' : '暂时没有待办心愿' }}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>
    <TodoReflectionDialog v-if="authorized" :item="reflectionItem" :completing="completingReflection" @close="reflectionItem = null" @saved="loadTab('todos')" />
    <AppDialog v-model="editing" title="编辑心愿" :busy="busy">
      <form class="todo-editor" @submit.prevent="saveTodo">
        <h3>编辑心愿</h3>
        <label for="admin-todo-entry">名称</label><input id="admin-todo-entry" v-model="draft.entry" maxlength="200" required :disabled="busy" />
        <label for="admin-todo-type">类型</label><WishTypeSelect id="admin-todo-type" v-model="draft.type" :disabled="busy" />
        <label for="admin-todo-user">贡献人</label><OwnerSelect id="admin-todo-user" v-model="draft.user" :disabled="busy" />
        <p v-if="editError" class="error" role="alert">{{ editError }}</p>
        <footer><button type="button" :disabled="busy" @click="editing = false">取消</button><button class="primary" type="submit" :disabled="busy">{{ busy ? '保存中…' : '保存' }}</button></footer>
      </form>
    </AppDialog>
  </div>
</template>

<script setup>
import { recentProfile } from '../features/auth/pageAccess'
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import AppDialog from '../components/shared/AppDialog.vue'
import SiteNavigation from '../components/shared/SiteNavigation.vue'
import TodoReflectionDialog from '../features/todos/TodoReflectionDialog.vue'
import WishTypeSelect from '../features/todos/WishTypeSelect.vue'
import OwnerSelect from '../features/todos/OwnerSelect.vue'
import RegistrationSettings from '../features/admin/RegistrationSettings.vue'

const router = useRouter()
const tabs = [{ key: 'users', label: '用户管理' }, { key: 'blessings', label: '祝福管理' }, { key: 'todos', label: '待办管理' }, { key: 'settings', label: '网站设置' }]
const tab = ref('users')
const currentUsername = ref('')
const hasMailbox = ref(false)
const checking = ref(true)
const authError = ref(false)
const authorized = ref(false)
const users = ref([])
const blessings = ref([])
const todos = ref([])
const showDone = ref(false)
const userSearch = ref('')
const expanded = ref(new Set())
const busy = ref(false)
const editing = ref(false)
const reflectionItem = ref(null)
const completingReflection = ref(false)
const editError = ref('')
const draft = reactive({ id: null, entry: '', type: '', user: '' })
const states = reactive(Object.fromEntries(['users', 'blessings', 'todos'].map(key => [key, { loading: false, error: '', loaded: false, generation: 0 }])))
const filteredUsers = computed(() => users.value.filter(user => `${user.username} ${user.nickname || ''}`.toLowerCase().includes(userSearch.value.trim().toLowerCase())))
const controller = new AbortController()
let disposed = false
function errorText(error) { return typeof error.response?.data?.detail === 'string' ? error.response.data.detail : '暂时无法完成操作，请稍后重试' }
function leaveAdmin() {
  authorized.value = false; editing.value = false; hasMailbox.value = false; currentUsername.value = ''
  if (!disposed) void router.replace('/index')
}
function checkAuth(error) { if ([401, 403].includes(error.response?.status)) leaveAdmin() }
async function initialize() {
  checking.value = true; authError.value = false
  try {
    const res = (recentProfile() ? { data: recentProfile() } : await request.get('/me', { signal: controller.signal }))
    if (disposed) return
    if (!res.data.is_admin) { leaveAdmin(); return }
    authorized.value = true; currentUsername.value = res.data.display_name || res.data.username; hasMailbox.value = res.data.has_mailbox === true
    await loadTab(tab.value)
  } catch (error) { if (!disposed) { authError.value = true; checkAuth(error) } }
  finally { if (!disposed) checking.value = false }
}
async function loadTab(key) {
  if (!authorized.value || key === 'settings') return
  const state = states[key], generation = ++state.generation
  state.loading = true; state.error = ''
  const url = key === 'todos' ? '/admin/todos' : `/admin/${key}`
  try {
    const res = await request.get(url, { params: key === 'todos' ? { done: showDone.value } : undefined, signal: controller.signal })
    if (disposed || generation !== state.generation) return
    if (key === 'users') users.value = res.data.data
    if (key === 'blessings') blessings.value = res.data.data
    if (key === 'todos') todos.value = res.data.data
    state.loaded = true
  } catch (error) { if (!disposed && generation === state.generation) { state.error = errorText(error); checkAuth(error) } }
  finally { if (!disposed && generation === state.generation) state.loading = false }
}
function selectTab(key) { tab.value = key; if (key !== 'settings' && !states[key].loaded) void loadTab(key) }
function switchTodos(done) { if (showDone.value === done) return; showDone.value = done; void loadTab('todos') }
function toggleBlessing(id) { const next = new Set(expanded.value); if (next.has(id)) next.delete(id); else next.add(id); expanded.value = next }
function form(values) { const body = new FormData(); Object.entries(values).forEach(([key, value]) => body.append(key, value)); return body }
async function mutate(prompt, callback, key, success) {
  if (busy.value || !authorized.value) return
  busy.value = true
  try {
    await ElMessageBox.confirm(prompt, '操作确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await callback()
    if (disposed) return
    ElMessage.success(success)
    await loadTab(key)
  } catch (error) { if (!disposed && error !== 'cancel' && error !== 'close') { ElMessage.error(errorText(error)); checkAuth(error) } }
  finally { busy.value = false }
}
async function resetPassword(user) {
  if (busy.value || !authorized.value) return
  busy.value = true
  try {
    await ElMessageBox.confirm(`将「${user.username}」的密码覆盖为当前分享码？该用户已登录的设备将退出。`, '重置密码', { confirmButtonText: '重置', cancelButtonText: '取消', type: 'warning' })
    const { data } = await request.post(`/admin/users/${user.id}/reset-password`, null, { signal: controller.signal })
    if (disposed) return
    ElMessage.success('密码已重置为当前分享码')
    if (data.self_reset) {
      localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('need_blessing')
      window.dispatchEvent(new Event('auth-expired'))
      await router.replace('/login')
    }
  } catch (error) {
    if (!disposed && error !== 'cancel' && error !== 'close') { ElMessage.error(errorText(error)); checkAuth(error) }
  } finally { busy.value = false }
}
function deleteUser(user) {
  if (user.is_admin) return
  return mutate(`确定删除用户「${user.username}」？`, () => request.post('/admin/users/delete', form({ username: user.username }), { signal: controller.signal }), 'users', '用户已删除')
}
function deleteBlessing(blessing) { return mutate('确定删除这条祝福？', () => request.post('/admin/blessings/delete', form({ id: blessing.id }), { signal: controller.signal }), 'blessings', '祝福已删除') }
function deleteTodo(todo) { return mutate(`确定删除「${todo.entry}」？删除后无法恢复。`, () => request.delete(`/admin/todos/${todo.id}`, { signal: controller.signal }), 'todos', '心愿已删除') }
function setTodoStatus(todo) {
  if (!showDone.value) { reflectionItem.value = { ...todo }; completingReflection.value = true; return }
  const done = false
  return mutate(done ? `把「${todo.entry}」标为已完成？` : `把「${todo.entry}」恢复为待办？`, () => request.post(`/admin/todos/${todo.id}/status`, form({ done: String(done) }), { signal: controller.signal }), 'todos', done ? '心愿已完成' : '已恢复为待办')
}
function openEdit(todo) { Object.assign(draft, { id: todo.id, entry: todo.entry, type: todo.type, user: todo.user }); editError.value = ''; editing.value = true }
async function saveTodo() {
  if (busy.value || !authorized.value) return
  if (![draft.entry, draft.type, draft.user].every(value => value.trim())) { editError.value = '请完整填写名称、类型和贡献人'; return }
  busy.value = true; editError.value = ''
  try {
    await request.put(`/admin/todos/${draft.id}`, form({ entry: draft.entry.trim(), type: draft.type.trim(), user: draft.user.trim() }), { signal: controller.signal })
    if (disposed) return
    editing.value = false; ElMessage.success('心愿已保存'); await loadTab('todos')
  } catch (error) { if (!disposed) { editError.value = errorText(error); checkAuth(error) } }
  finally { busy.value = false }
}
async function refreshProfile() {
  try { const res = (recentProfile() ? { data: recentProfile() } : await request.get('/me', { signal: controller.signal })); currentUsername.value = res.data.display_name || res.data.username; if (tab.value === 'users') await loadTab('users') }
  catch (error) { checkAuth(error) }
}
onMounted(() => { window.addEventListener('auth-expired', leaveAdmin); window.addEventListener('profile-updated', refreshProfile); void initialize() })
onUnmounted(() => { disposed = true; controller.abort(); window.removeEventListener('auth-expired', leaveAdmin); window.removeEventListener('profile-updated', refreshProfile) })
</script>

<style scoped>
.admin-page { min-height: 100vh; background: var(--color-cream); }
.back-link, .quick-links a { color: var(--color-rose-dark); }
.admin-body { max-width: 1120px; margin: 0 auto; padding: 104px 24px 32px; }
.admin-welcome { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.admin-welcome h3 { font-size: 24px; font-weight: 500; margin-bottom: 8px; }
.admin-welcome p, .muted, .panel-count { color: var(--color-text-light); font-size: 13px; }
.quick-links { display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; }
.tab-bar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 24px; border-radius: 14px; overflow: hidden; }
.tab-bar button { padding: 14px 8px; background: #fff; color: var(--color-text-light); font-size: 14px; border-bottom: 2px solid transparent; }
.tab-bar button.active { color: var(--color-rose-dark); border-color: var(--color-rose); background: #fff5f7; }
.management-panel { background: #fff; border-radius: 18px; box-shadow: var(--shadow-sm); overflow: hidden; }
.panel-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 20px; border-bottom: 1px solid #f6edef; }
.panel-toolbar input { width: min(100%, 300px); padding: 10px 14px; border: 1px solid var(--color-rose-light); border-radius: 10px; font-size: 16px; }
button { transition: background .2s; }
.refresh, .state-box button, .todo-switch button, .todo-editor button { padding: 8px 16px; border-radius: 20px; background: var(--color-rose-soft); color: var(--color-rose-dark); }
.todo-switch { display: flex; gap: 8px; }
.todo-switch button.active { background: var(--color-rose-dark); color: #fff; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 14px 16px; text-align: left; font-size: 14px; border-bottom: 1px solid #f5f0f1; }
th { color: var(--color-text-light); font-weight: 500; background: #fdfbfc; white-space: nowrap; }
td { overflow-wrap: anywhere; }
.badge { display: inline-block; white-space: nowrap; font-size: 12px; padding: 3px 9px; border-radius: 12px; background: #f5f2f3; }
.badge.owner { color: var(--color-rose-dark); background: var(--color-rose-soft); }
.btn-sm { padding: 6px 12px; border-radius: 8px; font-size: 12px; background: var(--color-rose-soft); color: var(--color-rose-dark); white-space: nowrap; }
.btn-sm.danger { background: #fef0f0; color: #ae4d59; }
.row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.empty, .state-box { padding: 32px; text-align: center; color: var(--color-text-light); }
.blessing-content { min-width: 220px; max-width: 480px; }
.blessing-content p { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; }
.blessing-content p.collapsed { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.text-button { padding: 6px 0; color: var(--color-rose-dark); background: transparent; font-size: 12px; }
.todo-editor { padding: 24px; }
.todo-editor h3 { margin-bottom: 20px; }
.todo-editor label { display: block; margin: 14px 0 8px; font-size: 14px; }
.todo-editor input { width: 100%; padding: 12px; border: 1px solid var(--color-rose-light); border-radius: 10px; font-size: 16px; }
.todo-editor footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.todo-editor button.primary { background: var(--color-rose-dark); color: #fff; }
.error { color: #ad324b; line-height: 1.7; margin-top: 12px; }
@media (max-width: 640px) {
  .admin-body { padding: 92px 16px 24px; }
  .admin-welcome { align-items: flex-start; flex-direction: column; }
  .tab-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  th, td { padding: 12px; }
  table { min-width: 580px; }
}
</style>

<style scoped>
.todo-reflection { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--color-text-light); font-size: 13px; line-height: 1.8; margin-top: 8px; }
</style>

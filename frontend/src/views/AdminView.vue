<template>
  <div class="admin-page">
    <!-- 顶栏 -->
    <header class="admin-topbar">
      <router-link to="/index" class="back-link">← 返回主页</router-link>
      <h2>管理后台</h2>
      <span class="admin-user">{{ currentUsername }}</span>
    </header>

    <div class="admin-body">
      <!-- 标签切换 -->
      <div class="tab-bar">
        <button :class="{ active: tab === 'users' }" @click="tab = 'users'">用户管理</button>
        <button :class="{ active: tab === 'blessings' }" @click="tab = 'blessings'">祝福管理</button>
        <button :class="{ active: tab === 'todos' }" @click="tab = 'todos'">待办管理</button>
      </div>

      <!-- 用户表 -->
      <div v-if="tab === 'users'" class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>用户名</th><th>注册时间</th><th>登录次数</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="(u, idx) in users" :key="u.id">
              <td>{{ idx + 1 }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.userdate }}</td>
              <td>{{ u.login_count }}</td>
              <td>
                <button class="btn-sm del" @click="deleteUser(u)">删除</button>
              </td>
            </tr>
            <tr v-if="users.length === 0"><td colspan="5" class="empty">暂无用户</td></tr>
          </tbody>
        </table>
      </div>

      <!-- 祝福表 -->
      <div v-if="tab === 'blessings'" class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>内容</th><th>作者</th><th>时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in blessings" :key="b.id">
              <td>{{ idx + 1 }}</td>
              <td class="content-cell">{{ b.content }}</td>
              <td>{{ b.author }}</td>
              <td>{{ b.created_at }}</td>
              <td>
                <button class="btn-sm del" @click="deleteBlessing(b)">删除</button>
              </td>
            </tr>
            <tr v-if="blessings.length === 0"><td colspan="5" class="empty">暂无祝福</td></tr>
          </tbody>
        </table>
      </div>

      <!-- 待办表 -->
      <div v-if="tab === 'todos'" class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>名称</th><th>类型</th><th>贡献人</th><th>起始日</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="(t, idx) in todoList" :key="t.entry">
              <td>{{ idx + 1 }}</td>
              <td>{{ t.entry }}</td>
              <td>{{ t.type }}</td>
              <td>{{ t.user }}</td>
              <td>{{ t.start_date }}</td>
              <td>
                <button class="btn-sm del" @click="deleteTodo(t)">删除</button>
              </td>
            </tr>
            <tr v-if="todoList.length === 0"><td colspan="6" class="empty">暂无待办</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const tab = ref('users')
const currentUsername = ref('')
const users = ref([])
const blessings = ref([])
const todoList = ref([])

function getHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function checkAdmin() {
  try {
    const res = await axios.get('/me', { headers: getHeaders() })
    if (!res.data.is_admin) {
      ElMessage.error('无管理权限')
      router.push('/index')
      return
    }
    currentUsername.value = res.data.username || ''
  } catch (e) {
    router.push('/index')
  }
}

async function fetchUsers() {
  try {
    const res = await axios.get('/admin/users', { headers: getHeaders() })
    users.value = res.data.data || []
  } catch (e) { ElMessage.error('获取用户列表失败') }
}

async function fetchBlessings() {
  try {
    const res = await axios.get('/admin/blessings', { headers: getHeaders() })
    blessings.value = res.data.data || []
  } catch (e) { ElMessage.error('获取祝福列表失败') }
}

async function fetchTodos() {
  try {
    const res = await axios.get('/table_data')
    todoList.value = res.data.data || []
  } catch (e) { ElMessage.error('获取待办列表失败') }
}

async function deleteUser(u) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${u.username}」？`, '删除确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    })
    const fd = new FormData(); fd.append('username', u.username)
    await axios.post('/admin/users/delete', fd, { headers: getHeaders() })
    users.value = users.value.filter(x => x.id !== u.id)
    ElMessage.success('已删除')
  } catch (e) { /* cancel */ }
}

async function deleteBlessing(b) {
  try {
    await ElMessageBox.confirm('确定删除这条祝福？', '删除确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    })
    const fd = new FormData(); fd.append('id', String(b.id))
    await axios.post('/admin/blessings/delete', fd, { headers: getHeaders() })
    blessings.value = blessings.value.filter(x => x.id !== b.id)
    ElMessage.success('已删除')
  } catch (e) { /* cancel */ }
}

async function deleteTodo(t) {
  try {
    await ElMessageBox.confirm(`确定删除「${t.entry}」？`, '删除确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    })
    const fd = new FormData(); fd.append('entry', t.entry)
    await axios.post('/table_delete', fd, { headers: getHeaders() })
    todoList.value = todoList.value.filter(x => x.entry !== t.entry)
    ElMessage.success('已删除')
  } catch (e) { /* cancel */ }
}

onMounted(async () => {
  await checkAdmin()
  fetchUsers()
  fetchBlessings()
  fetchTodos()
})
</script>

<style scoped>
.admin-page { min-height: 100vh; background: var(--color-cream); }
.admin-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 32px; background: #fff;
  border-bottom: 1px solid #f0e8ea; position: sticky; top: 0; z-index: 100;
}
.back-link { font-size: 14px; color: var(--color-rose); text-decoration: none; }
.back-link:hover { opacity: 0.7; }
.admin-topbar h2 { font-family: var(--font-display); font-size: 18px; color: var(--color-text); }
.admin-user { font-size: 13px; color: var(--color-text-light); }

.admin-body { max-width: 1000px; margin: 0 auto; padding: 24px; }

.tab-bar { display: flex; gap: 0; margin-bottom: 20px; border-radius: var(--radius-md); overflow: hidden; }
.tab-bar button {
  flex: 1; padding: 12px 0; border: none; background: #fff;
  font-size: 14px; color: var(--color-text-light); cursor: pointer;
  border-bottom: 2px solid transparent; transition: all var(--transition-fast);
}
.tab-bar button.active { color: var(--color-rose); border-bottom-color: var(--color-rose); font-weight: 600; }
.tab-bar button:hover { background: #fdf8f9; }

.table-wrap { background: #fff; border-radius: var(--radius-md); overflow-x: auto; box-shadow: var(--shadow-sm); }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; font-size: 14px; border-bottom: 1px solid #f5f0f1; }
th { color: var(--color-text-light); font-weight: 500; font-size: 13px; background: #fdfbfc; }
td { color: var(--color-text); }
.content-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { text-align: center; color: var(--color-text-light); padding: 32px; }

.btn-sm { padding: 5px 14px; border-radius: var(--radius-sm); font-size: 12px; border: none; cursor: pointer; }
.btn-sm.del { background: #fef0f0; color: #d47878; }
.btn-sm.del:hover { background: #fde0e0; }
</style>

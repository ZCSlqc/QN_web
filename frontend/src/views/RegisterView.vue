<template>
  <div class="auth-page bg-romantic">
    <div class="floating-decor">
      <span v-for="n in 8" :key="n" class="float-heart" :style="heartStyle(n)">❤</span>
    </div>

    <div class="auth-card glass-card animate-fade-in-up">
      <div class="auth-header">
        <div class="auth-icon">🌸</div>
        <h2>你好，初次见面分外眼熟</h2>
        <p>注册成为我们故事的一部分</p>
      </div>

      <div class="auth-form">
        <div class="input-group">
          <span class="input-icon">👤</span>
          <input v-model="form.username" type="text" placeholder="请输入你的名字" />
        </div>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input v-model="form.userpwd" type="password" placeholder="请输入密码" />
        </div>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input v-model="form.userpwd2" type="password" placeholder="请再次输入密码" />
        </div>

        <div class="input-group">
          <span class="input-icon">🎫</span>
          <input
            v-model="form.checkcode"
            type="text"
            placeholder="请输入授权码"
            @keyup.enter="handleRegister"
          />
        </div>

        <button class="btn-rose" :disabled="loading" @click="handleRegister">
          <span v-if="loading">注册中...</span>
          <span v-else>注 册</span>
        </button>

        <router-link to="/login" class="auth-link">已有账号？去登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const form = reactive({ username: '', userpwd: '', userpwd2: '', checkcode: '' })
const loading = ref(false)

function heartStyle(n) {
  const left = (n / 8) * 100
  return {
    left: `${left + (Math.random() - 0.5) * 15}%`,
    animationDelay: `${n * 0.6}s`,
    animationDuration: `${4 + Math.random() * 3}s`,
    fontSize: `${14 + Math.random() * 18}px`,
    opacity: 0.15 + Math.random() * 0.15,
  }
}

async function handleRegister() {
  if (!form.username) { ElMessage.warning('请输入名字'); return }
  if (!form.userpwd) { ElMessage.warning('请输入密码'); return }
  if (!form.userpwd2) { ElMessage.warning('请确认密码'); return }
  if (!form.checkcode) { ElMessage.warning('请输入授权码'); return }

  if (form.userpwd !== form.userpwd2) {
    ElMessage.error('两次密码输入不一致')
    return
  }
  if (form.checkcode !== 'ZDNlqc') {
    ElMessage.error('授权码错误')
    form.checkcode = ''
    return
  }

  loading.value = true
  try {
    const fd = new FormData()
    fd.append('username', form.username)
    fd.append('userpwd', form.userpwd)
    fd.append('checkcode', form.checkcode)

    const res = await axios.post('/register_process', fd)
    const data = res.data

    if (data.flag === 1) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', form.username)
      localStorage.setItem('need_blessing', '1')
      ElMessage.success('注册成功！欢迎加入 💕')
      router.push('/index')
    } else if (data.flag === -1) {
      ElMessage.error('用户名已存在，换一个试试')
    }
  } catch (e) {
    ElMessage.error('服务器连接失败，请检查后端是否启动')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.floating-decor { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.float-heart {
  position: absolute;
  bottom: -20px;
  animation: float-up 6s ease-in infinite;
  color: var(--color-rose);
  user-select: none;
}
@keyframes float-up {
  0%   { transform: translateY(0) rotate(0deg) scale(0.8); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translateY(-105vh) rotate(360deg) scale(1.1); opacity: 0; }
}
.auth-card {
  position: relative;
  z-index: 1;
  width: 400px;
  padding: 48px 36px 36px;
}
@media (max-width: 440px) {
  .auth-card { width: 92vw; padding: 36px 24px 28px; }
}
.auth-header { text-align: center; margin-bottom: 32px; }
.auth-icon { font-size: 48px; margin-bottom: 12px; }
.auth-header h2 {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--color-text);
  margin-bottom: 6px;
  letter-spacing: 1px;
}
.auth-header p { font-size: 13px; color: var(--color-text-light); }
.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
  border-bottom: 1.5px solid #e8d5da;
  transition: border-color var(--transition-fast);
  padding: 4px 0;
}
.input-group:focus-within { border-bottom-color: var(--color-rose); }
.input-icon { font-size: 17px; margin-right: 10px; flex-shrink: 0; }
.input-group input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--color-text);
  padding: 10px 0;
  font-family: var(--font-body);
}
.input-group input::placeholder { color: #c4b0b5; }
.btn-rose {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, var(--color-rose), var(--color-rose-dark));
  color: #fff;
  border-radius: var(--radius-full);
  font-size: 16px;
  letter-spacing: 3px;
  margin-top: 28px;
  box-shadow: var(--shadow-button);
  transition: all var(--transition-smooth);
}
.btn-rose:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(212, 120, 143, 0.40); }
.btn-rose:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.auth-link { display: block; text-align: center; font-size: 13px; color: var(--color-rose); margin-top: 18px; transition: opacity var(--transition-fast); }
.auth-link:hover { opacity: 0.7; }
</style>

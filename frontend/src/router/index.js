// ============================================================
// Vue Router 路由配置
// 三个页面：登录 / 注册 / 主页
// ============================================================

import { createRouter, createWebHistory } from 'vue-router'

// 懒加载：只有访问对应路由时才加载组件，加快首屏速度
const Login    = () => import('../views/LoginView.vue')
const Register = () => import('../views/RegisterView.vue')
const Index    = () => import('../views/IndexView.vue')
const Admin    = () => import('../views/AdminView.vue')
const Journey  = () => import('../views/JourneyView.vue')

const routes = [
  { path: '/',         redirect: '/login' },
  { path: '/login',    name: 'Login',    component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/index',    name: 'Index',    component: Index },
  { path: '/journey',  name: 'Journey',  component: Journey },
  { path: '/admin',    name: 'Admin',    component: Admin },
]

const router = createRouter({
  history: createWebHistory(),  // 使用 HTML5 History 模式（无 # 号）
  routes,
  // 路由切换后滚动到顶部
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router

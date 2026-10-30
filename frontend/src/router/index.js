// ============================================================
// Vue Router 路由配置
// 三个页面：登录 / 注册 / 主页
// ============================================================

import { createRouter, createWebHistory } from 'vue-router'
import request from '../utils/request'
import { setPageAccess, canVisitPage } from '../features/auth/pageAccess'

// Ordinary-user page access comes from .env via /me.
const AUTH_PAGES = new Set(['/login', '/register'])

// 懒加载：只有访问对应路由时才加载组件，加快首屏速度
const Login    = () => import('../views/LoginView.vue')
const Register = () => import('../views/RegisterView.vue')
const Index    = () => import('../views/IndexView.vue')
const Admin    = () => import('../views/AdminView.vue')
const Journey  = () => import('../views/JourneyView.vue')
const Pet      = () => import('../views/PetView.vue')

const routes = [
  { path: '/',         redirect: '/login' },
  { path: '/login',    name: 'Login',    component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/index',    name: 'Index',    component: Index },
  { path: '/journey',  name: 'Journey',  component: Journey },
  { path: '/wedding', name: 'Wedding', component: () => import('../views/WeddingView.vue') },
  { path: '/wedding/rig', name: 'WeddingRig', component: () => import('../views/WeddingRigView.vue'), meta:{adminOnly:true} },
  { path: '/pet',      name: 'Pet',      component: Pet },
  { path: '/admin',    name: 'Admin',    component: Admin },
  { path: '/:pathMatch(.*)*', redirect: '/index' },
]

const router = createRouter({
  history: createWebHistory(),  // 使用 HTML5 History 模式（无 # 号）
  routes,
  // 路由切换后滚动到顶部
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 80 }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const token = localStorage.getItem('token')
  const authPage = AUTH_PAGES.has(to.path)
  if (!token) { setPageAccess(null); return authPage ? true : { path: '/login', replace: true } }
  try {
    const { data } = await request.get('/me')
    if (localStorage.getItem('token') !== token) return { path: '/login', replace: true }
    if (!data.username) {
      localStorage.removeItem('token'); setPageAccess(null)
      return authPage ? true : { path: '/login', replace: true }
    }
    setPageAccess(data)
    if(to.meta.adminOnly&&data.is_admin!==true)return {path:'/index',replace:true}
    if (authPage || (to.path !== '/index' && !canVisitPage(to.path === '/wedding/rig' ? '/wedding' : to.path, data.is_admin))) return { path: '/index', replace: true }
    return true
  } catch {
    setPageAccess(null)
    if (!localStorage.getItem('token')) return authPage ? true : { path: '/login', replace: true }
    return to.path === '/index' ? true : { path: '/index', replace: true }
  }
})

window.addEventListener('auth-expired', () => {
  if (!AUTH_PAGES.has(router.currentRoute.value.path)) void router.replace('/login')
})

export default router

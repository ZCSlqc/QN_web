// ============================================================
// Vite 配置文件
// 配置开发服务器、代理转发、Vue插件
// ============================================================
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { staticTransfer } from './scripts/static-transfer.mjs'
import { publicCache } from './scripts/public-cache.mjs'

export default defineConfig(({ mode }) => {
  // Read server-side configuration without exposing it as VITE_* client variables.
  const env = loadEnv(mode, fileURLToPath(new URL('../', import.meta.url)), 'QN_')
  const port = (name, fallback) => {
    const value = Number(process.env[name] || env[name] || fallback)
    if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`${name} must be a valid port`)
    return value
  }
  return {
  plugins: [vue(), staticTransfer(), publicCache()],

  resolve: {
    alias: {
      // 配置 @ 指向 src 目录，方便导入文件
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    // Avoid localhost resolving to IPv6-only ::1 on Windows.
    host: '127.0.0.1',
    allowedHosts: (process.env.QN_ALLOWED_HOSTS || env.QN_ALLOWED_HOSTS || '').split(',').map(host => host.trim()).filter(Boolean),
    port: port('QN_FRONTEND_PORT', 7721),
    strictPort: true,  // 前端开发服务器端口
    open: false,  // 启动后自动打开浏览器

    // Keep SPA routes such as /admin separate from API requests.
    proxy: {
      '/api': {
        target: process.env.QN_API_TARGET || env.QN_API_TARGET || `http://127.0.0.1:${port('QN_BACKEND_PORT', 1277)}`,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  }
})

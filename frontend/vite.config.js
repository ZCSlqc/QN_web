// ============================================================
// Vite 配置文件
// 配置开发服务器、代理转发、Vue插件
// ============================================================
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      // 配置 @ 指向 src 目录，方便导入文件
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 7721,  // 前端开发服务器端口
    open: true,  // 启动后自动打开浏览器

    // 代理配置：所有 /login_process /table_* /me /blessings /health 等转发到后端
    proxy: {
      '/login_process':    { target: 'http://localhost:8000', changeOrigin: true },
      '/register_process': { target: 'http://localhost:8000', changeOrigin: true },
      '/table_data':       { target: 'http://localhost:8000', changeOrigin: true },
      '/table_add':        { target: 'http://localhost:8000', changeOrigin: true },
      '/table_change':     { target: 'http://localhost:8000', changeOrigin: true },
      '/table_delete':     { target: 'http://localhost:8000', changeOrigin: true },
      '/table_done':       { target: 'http://localhost:8000', changeOrigin: true },
      '/table_done_list':  { target: 'http://localhost:8000', changeOrigin: true },
      '/me':               { target: 'http://localhost:8000', changeOrigin: true },
      '/blessings':        { target: 'http://localhost:8000', changeOrigin: true },
      '/health':           { target: 'http://localhost:8000', changeOrigin: true },
      '/admin':            { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})

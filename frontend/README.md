# 前端

Vue 3 + Vite。`npm run dev` 开发，`npm run build` 构建，`npm run preview` 预览产物。

对外穿透使用 `npm run build` 后运行 `npm run serve`（Node.js 20.12+，当前环境24）。正式入口读取根目录 `.env`，监听 `127.0.0.1:QN_FRONTEND_PORT`，将 `/api` 转发到后端；与开发服务占用同一个端口，切换前先停止开发前端。
正式入口不提供开发模块或HMR，支持SPA深链接、Brotli/gzip、构建文件长期缓存、公开图片条件缓存和音乐Range请求。私密API响应保持后端的缓存策略。
代码更新后重新构建；静态文件直接从 `dist` 读取，不能依赖开发热重载。

- `src/views/`：路由页面，组织布局及业务组合。
- `src/features/`：按业务归类组件、状态逻辑和加载器。
- `src/components/shared/`：跨业务组件，不依赖特定页面。
- `src/composables/`：通用生命周期功能，如樱花动画。
- `src/utils/`：HTTP等基础工具。
- `src/assets/`：字体及全局样式；`public/`：静态图片、音乐、地图数据。
- `test/`：测试及共享夹具，统一 `test_<业务>.mjs`。

业务组件引用共享弹窗，不复制弹窗实现。异步页面组件离开后取消请求，写操作以稳定ID定位。编辑表单必须复制数组，不能直接修改列表记录的引用。

中文栏目标题使用 Songti SC/SimSun，故事标题和正文使用普通中文字体。英文花体保留。不要重新引入大体积中文装饰字体来覆盖这个选择。

## 固定素材目录

原稿集中在根目录 `asset/`，发布版在 `frontend/public/`，两边按 `backgrounds`、`avatars`、`pets/liuyi`、`feedback`、`audio`、`maps/china`、`branding` 分类。原稿不随前端构建发布。
背景使用用途命名，如 `backgrounds/home-cover.webp`；头像使用 `avatars/qiqi.webp`。图片真实格式不改，只统一展示版本的命名。
`npm run assets:optimize` 根据 `asset/manifest.json` 重新生成全部发布素材；`node scripts/optimize-images.cjs --check` 验证源文件及发布文件。具体结构见根目录 `asset/README.md`。

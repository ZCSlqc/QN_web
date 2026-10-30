# 前端

Vue 3 + Vite。`npm run dev` 开发，`npm run build` 构建，`npm run preview` 预览产物。

对外穿透使用 `npm run build` 后运行 `npm run serve`（Node.js 20.12+，当前环境24）。正式入口读取根目录 `.env`，监听 `127.0.0.1:QN_FRONTEND_PORT`，将 `/api` 转发到后端；与开发服务占用同一个端口，切换前先停止开发前端。

本机开发：在 `frontend` 目录运行 `npm run dev`，默认地址为 `http://127.0.0.1:7721`。人物动作核验页为 `/wedding/rig`，登录管理员后可从后台“人物核验”进入；普通用户不能访问，`/rip` 未注册。显式监听 IPv4，避免 Windows 将 localhost 解析到仅 IPv6 的 ::1。端口被占用时会明确报错，不自动换端口；后端需另行启动。
正式入口不提供开发模块或HMR，支持SPA深链接、Brotli/gzip、构建文件长期缓存、公开图片条件缓存和音乐Range请求。私密API响应保持后端的缓存策略。
`npm run build` 会自动执行 `postbuild`，为HTML、JS、CSS和地图等文本资源生成 `.br` / `.gz` 文件，正式入口优先读取这些文件，避免每个请求重复压缩。原图和音频不重新编码。
压缩脚本复用仍有效的压缩文件。开发与预览服务对 `index`、`pet`、`journey`、`wedding`、`shared` 下的公开图片使用 ETag 条件缓存，对地图和 SVG 使用 gzip；Vite 模块导入与 API 请求仍由各自服务处理。资源内容不变时重建会保留发布文件修改时间；正式构建的 public 副本也继承源文件时间，避免每次发版让图片缓存失效。
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

维护源集中在根目录 `asset/`，发布版在 `frontend/public/`，两边按 `index`、`pet`、`journey`、`wedding`、`shared` 分类。背景使用用途命名，如 `index/background/home-cover.webp`；头像使用 `index/avatars/qiqi.webp`。位图主要使用 WebP，需裁切的源图保留原尺寸与透明通道；原版人物 SVG、绑定数据与授权留在源库。
`npm run assets:rebuild` 从源库重建全部衍生素材并发布；`npm run assets:optimize` 按 `asset/manifest.json` 同步已定稿资源并移除发布目录中的多余文件；`npm run assets:check` 检查内容一致且不存在未登记文件。public 不存放原稿、示例图、编辑图集和废弃中间资源。具体结构见根目录 `asset/README.md`。

# 前端

Vue 3 + Vite。`npm run dev` 开发，`npm run build` 构建，`npm run preview` 预览产物。

- `src/views/`：路由页面，组织布局及业务组合。
- `src/features/`：按业务归类组件、状态逻辑和加载器。
- `src/components/shared/`：跨业务组件，不依赖特定页面。
- `src/composables/`：通用生命周期功能，如樱花动画。
- `src/utils/`：HTTP等基础工具。
- `src/assets/`：字体及全局样式；`public/`：静态图片、音乐、地图数据。
- `test/`：测试及共享夹具，统一 `test_<业务>.mjs`。

业务组件引用共享弹窗，不复制弹窗实现。异步页面组件离开后取消请求，写操作以稳定ID定位。编辑表单必须复制数组，不能直接修改列表记录的引用。

中文栏目标题使用 Songti SC/SimSun，故事标题和正文使用普通中文字体。英文花体保留。不要重新引入大体积中文装饰字体来覆盖这个选择。

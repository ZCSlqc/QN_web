# 前端测试

测试代码位于 `test/e2e/`，共享的 API 数据和拦截逻辑位于 `test/fixtures/`。

```bash
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
```

默认启动独立 Vite 服务（7731端口）。所有 `/api/*` 请求都使用测试数据，外部地图请求被拦截，不访问或修改真实数据库、账号、照片及 `.env`。

- `test_home.mjs`：字体、首屏樱花、祝福5秒切换和暂停。
- `test_album.mjs`：原有照片编辑删除、失败重试、竖图补位、上传、预览、空相册和轮播交叉淡入。
- `test_journey.mjs`：半级滚轮缩放、地图备用显示、叠色和日期。
- `test_admin.mjs`：用户搜索、角色保护、待办操作、分享码设置。
- `test_story.mjs`：故事编辑和自适应高度。
- `test_mailbox.mjs`：信封入口、未读角标、逐封阅读、发送失败重试、草稿保护、留言及手机布局。

可用 `QN_TEST_PORT` 更换测试端口。使用本机已有 Chrome 时，通过 `CHROMIUM_EXECUTABLE_PATH` 指定路径，测试代码不绑定某台电脑。

截图、失败追踪及 HTML 报告输出到根目录 `artifacts/frontend-test-results/` 和 `artifacts/frontend-test-report/`，不提交到 Git。

```bash
npm run test:e2e -- --headed
npm run test:e2e -- test_album.mjs
```

## 真实后端集成测试

运行 `npm run test:integration`。自动创建临时数据库、配置和账号，端口8015/7745，不复用正在运行的服务；退出后清理。可用 `QN_TEST_PYTHON` 指定安装了后端依赖的Python。不要使用真实账号或真实数据库。

测试文件统一为 `test_<业务>.mjs`；报告目录按运行时间和进程ID隔离，避免同时运行时覆盖追踪文件。

`test_pet_wallets.mjs` 覆盖管理员简洁背包、访客互动区、直接打开祝福弹窗、跨刷新/账号隔离的投喂确认，以及用户管理昵称列。

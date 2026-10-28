# qiqi & nini 情侣空间

FastAPI + SQLite + Vue 3，包含爱情故事、祝福、相册、心愿、旅行足迹、私密信箱和管理后台。

## 目录

```text
backend/
  main.py                # 应用装配与生命周期，不放业务实现
  app/core/              # 配置、数据库、身份认证、限流
  app/api/               # 按业务拆分的 HTTP 路由
  app/services/          # 业务规则、数据校验、文件清理
  scripts/               # 初始化账号、导入、清理、备份
  test/                  # 后端测试，test_<业务>.py
  .env                   # 本地配置，不提交 Git
  couple.db              # 真实数据，不提交 Git
frontend/
  src/views/             # 路由页面
  src/features/          # 按业务归类的组件和逻辑
  src/components/shared/ # 通用弹窗等跨业务组件
  src/composables/        # 通用生命周期逻辑
  src/utils/             # 请求等基础工具
  test/e2e/              # 模拟 API 的交互测试，test_<业务>.mjs
  test/integration/      # 真实临时后端端到端测试
  test/fixtures/         # 测试数据及请求拦截
scripts/dev.py           # 跨平台开发启动器
artifacts/               # 测试报告、临时文件、备份，不提交 Git
旅行记录.md              # 旅行记录来源文档
```

各目录 README 描述模块边界和运行方式，重构记录见 [docs/REFACTOR.md](docs/REFACTOR.md)。

## 本地启动

要求 Python 3.10+、Node.js 20.9+、uv。

```bash
uv venv .venv
uv pip install --python .venv/Scripts/python.exe -r backend/requirements.txt -r backend/requirements-dev.txt
cd frontend
npm ci
cd ..
```

Linux/macOS 将 Python 路径改为 `.venv/bin/python`。

已有本地 `.env` 不要覆盖；新环境复制 `.env.example` 为 `.env` 并填写配置。

```dotenv
QN_ADMIN_USERS='["管理员用户名1", "管理员用户名2"]'
QN_CHECK_CODE=your-registration-share-code
QN_BACKEND_PORT=1277
QN_FRONTEND_PORT=7721
```

预留的管理员/情侣账号不能在公开注册页注册。首次部署通过本地命令创建，密码通过交互输入：

```bash
cd backend
uv run python scripts/create_account.py "管理员用户名1"
uv run python run.py
```

另一个终端运行 `cd frontend && npm run dev`，访问 `http://localhost:7721`。

也可以在根目录执行 `python scripts/dev.py`（使用项目 `.venv` 启动后端）；Linux/macOS 可执行 `./start.sh`。启动器在前台运行，Ctrl+C 只停止自己创建的后端和前端进程。端口被占用时直接退出，不杀其他项目进程。支持 `--backend-port`、`--frontend-port`。旧 `stop.sh` 仅提示操作方式，不再按进程名称批量停止服务。

## 页面

| 地址 | 功能 |
| --- | --- |
| `/login`、`/register` | 登录、用分享码注册 |
| `/index` | 故事、祝福、心愿、相册、纪念日、首屏樱花 |
| `/journey` | 足迹地图、到访记录、预定旅程 |
| `/admin` | 用户、祝福、待办、分享码管理 |

账号入口在首页 LOVE 旁，支持退出登录和修改密码。退出会撤销当前令牌；改密后所有旧令牌失效。已有账号密码不受本次重构影响。

## 业务规则

- **旅程**：一条记录对应一次行程，`name` 和 `adcodes` 是顺序一致的数组；`checkin_points` 为景点/地区，`event` 为大事件，`notes` 为唯一备注字段。无单数 `adcode`、无 `impression`。
- **地图**：OpenFreeMap 详细底图，失败自动切换本地 GeoJSON；城市填充从40%起，每多一次加3个百分点，最高70%。省级底色保留，直辖市/港澳同样绘制省和市两层。全国外轮廓为 `#987080`、0.7px。桌面750px、手机540px；滚轮200灵敏度、半级缩放。
- **省市选择**：先省后市，可跨省添加多个城市；直辖市、香港和澳门两级同名。取消编辑不修改原数据。
- **照片**：所有原有和新上传照片统一编辑。原有照片仅从相册移除，保留素材；上传照片先隐藏，再清理文件，清理失败可重试。启动自动重试，亦可运行 `backend/scripts/cleanup_photos.py`。新增旅程和上传支持 request_key 防止超时重试重复写入。
- **祝福**：无边框，上下渐隐，每条停留5秒，悬停/后台暂停，单条保持静态。
- **字体**：英文花体保留；“爱的相册”“爱的旅程”等栏目中文标题用系统宋体风格，故事标题和正文用普通中文字体。大体积中文装饰字体不再加载。
- **心愿**：首页与后台统一按 ID 增删改和切换完成状态，共用校验。旧名称接口仅作适配，同样校验且不存在时返回404。
- **私密信箱**：只对 `QN_ADMIN_USERS` 中两位主人开放，与管理权限使用同一身份来源。打开正文才算已读，留言提醒独立；离页/刷新有草稿提醒，失败重试不重复投递。每30秒刷新状态。
- **分享码**：后台“网站设置”可查看、复制、生成和修改；文件模式保存立即生效，进程环境变量管理时只读。未设置分享码时关闭注册。

## 配置与数据

后端配置位于 `backend/app/core/settings.py`，读取 `.env`；进程环境变量优先。管理员和信箱名单修改后重启；文件管理的分享码实时读取。

| 变量 | 用途 |
| --- | --- |
| `QN_ADMIN_USERS` | 管理员用户名数组或逗号分隔名单 |
| `QN_CHECK_CODE` | 注册分享码，无硬编码默认值 |
| `QN_SECRET_KEY` | JWT 密钥；未配置时使用持久化 `.secret_key` |
| `QN_DB_PATH` | 数据库路径，默认 `backend/couple.db` |
| `QN_UPLOAD_DIR` | 上传照片目录，默认 `backend/uploads` |
| `QN_ENV_FILE` | 外部配置文件路径 |
| `QN_BACKEND_PORT` | 后端端口，默认 `1277` |
| `QN_FRONTEND_PORT` | 前端端口，默认 `7721` |
| `QN_API_TARGET` | Vite 开发代理目标，默认 `http://127.0.0.1:1277` |

真实 `.db`、上传文件、密钥和 `.env` 均不进入 Git。Git 显示 `backend/couple.db` 删除表示取消跟踪，磁盘数据仍保留。新机器不能依靠 Git 获取真实数据库，需要从私有备份恢复。

```bash
# 根目录执行，备份包含数据库、上传文件及密钥，务必私密保存
.venv/Scripts/python.exe backend/scripts/backup_data.py
# 导入只验证；显式 --replace 才备份并覆盖旅程表
.venv/Scripts/python.exe backend/scripts/import_journeys.py
.venv/Scripts/python.exe backend/scripts/import_journeys.py --replace
```

SQLite 使用 WAL、外键校验和15秒忙等待。在线备份使用 SQLite backup API；要得到图片和数据库完全一致的备份，暂停上传后再备份。生产恢复时停止服务并恢复数据库、上传目录、密钥及配置。

## 验证

```bash
python -m pytest backend/test -q
cd frontend
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:integration
```

测试命名统一 `test_<业务>`，后端扩展名 `.py`，前端扩展名 `.mjs`。单元/交互测试与真实集成测试分别维护，均不修改实际数据库。详见 [backend/test/README.md](backend/test/README.md) 和 [frontend/test/README.md](frontend/test/README.md)。

## 部署

### 本地电脑通过 Sakura Frp 提供正式构建版

停止原来的开发前后端后，分别启动两个终端：

```bash
cd backend
uv run python run.py --production
```

```bash
cd frontend
npm run build
npm run serve
```

两端继续读取根目录 `.env` 中的 `QN_BACKEND_PORT=1277` 和 `QN_FRONTEND_PORT=7721`。前端正式服务要求 Node.js 20.12+。
Sakura Frp 本地目标保持 `127.0.0.1:7721`，自动HTTPS负责外部TLS；`QN_ALLOWED_HOSTS` 填实际外部域名，不含协议或端口。
正式入口仅提供构建目录、支持页面刷新、压缩、缓存和音频分段请求；不启动 Vite 开发服务。修改页面后需重新执行 `npm run build`。

### 云服务器

前端 `npm run build` 输出 `frontend/dist`；后端使用 uvicorn 或进程管理器，不带 `--reload`。配置 HTTPS 并反向代理 `/api/`：

```nginx
root /path/to/frontend/dist;
index index.html;
location / { try_files $uri $uri/ /index.html; }
location /api/ {
    client_max_body_size 20m;
    proxy_pass http://127.0.0.1:1277/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

只信任实际反向代理的转发头，不要让公网客户端伪造来源。登录每IP每分钟20次，注册和祝福每分钟10次；多进程共用SQLite计数。相册及旅程照片统一保存在后端上传目录，部署需同时恢复数据库和 `backend/uploads/`，不能只复制前端代码。地图 Worker 随整个 dist 一起发布。

后端接口文档：`http://localhost:1277/docs`。


## 心愿完成感想

首页 Things To Do 和后台待办的“完成”会打开感想弹窗：选填、最多2000字，可留空直接完成。已完成列表直接显示感想，管理员可点击“写点感想/修改感想”后补或修改；后台已完成列表也能查看、修改。照片仍只在独立相册管理，不与心愿关联，不包含宠物或奖励功能。

数据保存在 `things.reflection`，旧记录自动初始化为空。完成状态与感想在同一次数据库更新中保存；取消不改数据，保存失败保留输入。恢复待办时保留原感想，后续完成可继续修改。单独修改感想不改变原完成时间。

- `POST /admin/todos/{id}/status`：`done`，可选 `reflection`；界面使用 `replace_reflection=true` 明确保存包含空白在内的新感想。未传感想时保留旧内容。
- `PUT /admin/todos/{id}/reflection`：编辑已完成事项的感想，传空字符串可清空，未完成事项返回409。

相关实现：`backend/app/services/todos.py`、`frontend/src/features/todos/TodoReflectionDialog.vue`。验证见 `backend/test/test_todo_reflection.py` 和 `frontend/test/e2e/test_todo_reflection.mjs`。

相册右下角轮播的四个小格各自可点击，直接预览当前对应的原图；淡入期间以不透明度达到50%的新图为主，否则打开旧图。四格均独立圆角（含中央交汇处），提示标签不拦截点击。已完成心愿保留名称、标签、时间和操作的首行，仅在有感想时另起一行展示。


## 爱的小窝 /cat

导航新增“爱的小窝”，独立页面“六一的小窝”。第一版启用六一，写实版按三视图生成，插画版按六一A制作，均为透明背景图片，可在页面切换比选。默认写实，风格选择仅保存在当前浏览器。

- 旧版初始余额按当前规则保留；每次后端启动时，每位管理员的猫条、猫粮、罐头分别补足至1；更多食物由记录活动获得。
- 情侣双方共用食物，仅 `QN_ADMIN_USERS` 两位现有主人账号可使用共同背包；其他获准访问页面的用户只能摸摸头、逗一逗。
- 普通用户导航遵循现有 `QN_USER_PAGE_ALLOWLIST`，需要允许 `/cat` 才显示入口；本次未擅自扩大原有页面白名单。
- 摸头/逗猫是本地互动；投喂事务性扣除一份食物并写流水，幂等标识避免超时重试重复扣除。最近20条投喂显示在“小日常”。
- 不因离线扣分、不惩罚；当前已接入新照片、首次完成心愿和已完成旅程的奖励，历史数据不批量结算。
- 数据表：`pets`、`pet_member_inventory`、`pet_user_inventory`、`pet_ledger`。无需第三方API、无需额外Python依赖。

详见 [宠物模块说明](frontend/src/features/pet/README.md) 和 [猫咪素材说明](docs/pet-assets.md)。测试分别为 `backend/test/test_pet.py`、`frontend/test/e2e/test_pet.mjs`。


## 宠物背包与昵称（当前规则）

“摸摸头、逗一逗、访客领取猫条和投喂”在同一互动区。管理员不参与留言奖励；管理员情侣拥有独立背包，合计展示，内部按人记账，先扣自己、不够再扣另一半。

- 新照片→猫条；首次完成心愿→猫粮；保存已完成旅程→罐头。每个来源只发一次，历史记录不批量补发。
- 访客每天首条首页祝福获得1根个人猫条，按北京时间计算；“去送祝福”直接打开祝福弹窗。
- 未确认投喂用账号隔离的 sessionStorage 保存标识，刷新可继续确认，重试不重复扣粮。
- 旧共用余额和两位管理员以前获得的个人猫条保留并转入对应背包，有调整流水；每次启动时每位管理员三种食物各补足至1（不累加）。
- 用户可在“账号→个人昵称”设置昵称（最多20字，不填回退用户名）；后台用户名后增加昵称列。昵称只用于展示，不参与鉴权。琪琪/妮妮是两位现有情侣账号的默认昵称。

详情及边界规则见 [宠物模块 README](frontend/src/features/pet/README.md)。`PUT /account/nickname` 更新昵称；业务记录通过原有账号ID/用户名关联展示名，修改昵称不会转移记录或食物。

宠物页已按爱的旅程统一版式，并使用独立的安静、眯眼、伸爪、低头姿态；取消整图抖动。食物图标分别为猫条包装、猫粮碗和拉环罐头。动作逻辑、姿态组件和样式集中在 `frontend/src/features/pet/`。

宠物界面图标已替换为 `docs/` 提供的三张原图，并以 `cat-treat.png`、`cat-food.png`、`cat-can.png` 放入 `frontend/public/pets/liuyi/icons/`。投喂场景另用写实空碗、满粮碗、开罐罐头和猫条，图片位于 `frontend/public/pets/liuyi/food/`。

六一支持闲置散步、点击地面移动、回窝枕爪睡觉（zzZ）、第一人称真实手摸摸、手持逗猫棒和地面玩具老鼠。不提供休息按钮，清醒60–90秒后自主回窝，睡60–90秒后自动醒来；点击睡猫或互动可唤醒。两种形象共享位置与动作节奏，切换不重置；移动端限制活动范围，离开视口或隐藏页面暂停动态行为。实现集中在宠物模块，浏览器验证见 `frontend/test/e2e/test_pet_life.mjs`，素材与生成说明见 `docs/pet-assets.md`。

小窝支持管理员在窗边切换共享晴雨天气（数据库持久化，其他页面约30秒内同步），便签随天气与昼夜变化。作息离开场景后保留剩余时间，已扣粮的进食流程回来继续。天气接口为 `PUT /pet/weather`；首次使用需重启后端自动创建设置表，详见宠物模块 README。

食物奖励支持弹窗关闭后飞入导航“爱的小窝”的到账动画，多张照片合并显示+N；访客祝福也使用同一反馈。情侣双方每天首封新信各奖励1根猫条（北京时间），重试、评论与接收不重复奖励，计入共同背包。实现和验证见宠物模块 README。

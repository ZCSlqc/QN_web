# qiqi & nini 情侣网页

基于 **FastAPI** + **Vue 3** 的全栈情侣空间，包含祝福留言、待办清单、纪念日计时器、相册轮播、背景音乐等功能。

---

## 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 后端框架 | FastAPI | Python 异步 Web 框架 |
| 数据库 | SQLite | 文件数据库，零配置 |
| 鉴权 | JWT (python-jose) | Bearer Token，默认 7 天有效期 |
| 密码 | bcrypt | 哈希存储，兼容旧明文密码自动升级 |
| 前端框架 | Vue 3 | Composition API |
| UI 库 | Element Plus | 弹窗、消息提示 |
| 构建工具 | Vite | 开发服务器 + 代理 |
| 包管理 | uv (Python) / npm (Node) | — |

---

## 快速启动

### 环境要求

- Python 3.10+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/)（Python 包管理器）

```
pkill -f uvicorn
pkill -f vite

cd QN_web/backend && source ../.venv/bin/activate && nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /root/web-fastapi.log 2>&1 &
cd QN_web/frontend && nohup npm run dev -- --host 0.0.0.0 --port 7721 > /root/web-vue.log 2>&1 &
```

### 1. 启动后端

```bash
cd backend

# 首次安装依赖
uv pip install -r requirements.txt

# 启动开发服务器（端口 8000，热重载）
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

后端启动后访问 <http://localhost:8000>，接口文档在 <http://localhost:8000/docs>。

### 2. 启动前端

```bash
cd frontend

# 首次安装依赖
npm install

# 启动开发服务器（端口 7721）
npm run dev
```

前端启动后访问 <http://localhost:7721>。

---

## 页面与功能

| 地址 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | 登录 | 用户名 + 密码，无需授权码 |
| `/register` | 注册 | 用户名 + 密码 + 授权码 |
| `/index` | 主页 | Hero、祝福、待办、计时器、相册、音乐 |
| `/admin` | 管理 | 仅管理员可见，用户/祝福/待办管理 |

### 主页区块

- **Hero 首页** — 花瓣飘落动画 + 导航栏 + 音乐播放器入口
- **爱的故事** — qiqi & nini 头像摇头动画 + 祝福寄语字幕（垂直滚动，点击可留言）+ 爱情故事文案 + 待办卡片 + 已完成列表
- **纪念日计时器** — 自 2021-06-24 起的天/时/分/秒实时倒计时
- **爱的相册** — 3×3 九宫格布局，左上大图合并，右下四格自动轮播
- **横幅** — 浪漫文案
- **音乐播放器** — 本地 `City_Of_Stars.mp3`，右上角悬浮按钮

### 祝福弹窗

首次登录或注册时，自动弹出祝福寄语框。填写或点击"稍后再说"后不再弹出。包括管理员在内所有用户首次登录都会看到。

点击祝福字幕滚动区域也可以随时留言。

### 待办与已完成

- **待办**：管理员可新增/修改/完成/删除，游客只读
- **已完成**：标记完成后移至下方已完成列表（保留在数据库中），带垂直滚动条。已完成列表中的"删除"按钮才真正从数据库删除

### 管理员

管理员账号：**李琪淳** / **郑丹妮**

管理员权限：
- 新增/修改/完成/删除待办事项
- 导航栏显示"管理"入口
- 管理后台：用户管理、祝福管理、待办管理（含登录次数统计）

### 相册右下角轮播

四等分格子，每个格子 6 秒完整周期（淡入 1.5s → 停留 3s → 淡出 1.5s），每次跳过 3 张图片（+4），四个格子依次错开 1 秒起步。白色背景与分隔。

---

## 项目结构

```text
QN_web/
├── backend/
│   ├── main.py              ← 所有 API 接口（单文件）
│   ├── requirements.txt     ← Python 依赖
│   ├── couple.db            ← SQLite 数据库（首次启动自动生成）
│   └── config/
│       └── settings.py      ← 密钥、授权码、数据库路径等配置
├── frontend/
│   ├── index.html           ← HTML 入口
│   ├── vite.config.js       ← Vite 配置（含 API 代理）
│   ├── package.json         ← Node 依赖与脚本
│   ├── public/              ← 静态资源
│   │   ├── 网页封面.ico
│   │   ├── img/             ← 头像 (qiqi.png, nini.png)
│   │   ├── background/      ← 页面背景图
│   │   ├── album/           ← 相册图片
│   │   └── audio/           ← 背景音乐
│   └── src/
│       ├── main.js          ← Vue 入口
│       ├── App.vue          ← 根组件
│       ├── router/index.js  ← 路由配置
│       ├── utils/request.js ← Axios 封装
│       ├── views/
│       │   ├── LoginView.vue
│       │   ├── RegisterView.vue
│       │   ├── IndexView.vue    ← 主页（核心页面）
│       │   └── AdminView.vue    ← 管理后台
│       └── assets/
│           └── css/
│               ├── theme.css    ← 全局主题变量与动画
│               ├── bootstrap.css
│               └── fonts.css    ← 字体定义
└── README.md
```

---

## API 接口

所有 POST 接口使用 `Form` 编码（`application/x-www-form-urlencoded`）。

| 接口 | 方法 | 鉴权 | 功能 |
| --- | --- | --- | --- |
| `/health` | GET | 无 | 健康检查 |
| `/login_process` | POST | 无 | 用户登录，返回 JWT + login_count |
| `/register_process` | POST | 无 | 用户注册，返回 JWT |
| `/me` | GET | Bearer Token | 当前用户信息、是否管理员、登录次数 |
| `/blessings` | GET | 无 | 获取祝福列表（最近 50 条） |
| `/blessings` | POST | 可选 | 提交祝福（未登录显示"匿名"） |
| `/table_data` | GET | 无 | 获取待办列表 |
| `/table_done_list` | GET | 无 | 获取已完成列表 |
| `/table_add` | POST | 管理员 | 新增待办 |
| `/table_change` | POST | 管理员 | 修改待办（支持改名） |
| `/table_delete` | POST | 管理员 | 真删除待办（从数据库移除） |
| `/table_done` | POST | 管理员 | 标记完成（保留数据库，移至已完成列表） |
| `/admin/users` | GET | 管理员 | 用户列表（含注册时间、登录次数） |
| `/admin/users/delete` | POST | 管理员 | 删除用户 |
| `/admin/blessings` | GET | 管理员 | 全部祝福列表 |
| `/admin/blessings/delete` | POST | 管理员 | 删除指定祝福 |

### 登录/注册响应字段

```json
{
  "status": "success",
  "flag": 1,
  "msg": "登录成功",
  "token": "eyJ...",
  "login_count": 0
}
```

- `flag`：1 成功，-1 用户不存在/已存在，-2 密码错误，-3 授权码错误
- `login_count`：本次登录之前的登录次数（0 表示首次登录，前端据此弹出祝福弹窗）

---

## 数据库

SQLite 文件数据库，路径 `backend/couple.db`，首次启动自动建表与迁移。

### 表结构

- **user** — `id`, `username`, `userpwd` (bcrypt), `userdate`, `login_count`
- **things** — `id`, `entry` (名称), `types` (类型), `user` (贡献人), `start_date`, `end_date`, `done`
- **blessings** — `id`, `content`, `author`, `created_at`

---

## 配置

所有可配置项集中在 `backend/config/settings.py`：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `SECRET_KEY` | — | JWT 签名密钥 |
| `CHECK_CODE` | `ZDNlqc` | 注册需要的授权码 |
| `ACCESS_TOKEN_EXPIRE_HOURS` | `168`（7 天） | Token 有效期 |
| `SERVER_HOST` | `0.0.0.0` | 后端监听地址 |
| `SERVER_PORT` | `8000` | 后端监听端口 |
| `DB_PATH` | `couple.db` | SQLite 数据库文件路径 |
| `CORS_ORIGINS` | `["*"]` | 允许的跨域来源 |

---

## 自定义修改

### 更换背景图

替换 `frontend/public/background/` 目录下的对应文件：

- `bg-flower.jpg` — Hero 首页
- `1.jpeg` — 故事区块
- `2.jpg` — 纪念日区块
- `3.jpg` — 横幅区块

### 更换相册图片

图片放在 `frontend/public/album/`，然后修改 `IndexView.vue` 中 `gridPhotos` 和 `cornerPhotos` 数组。

### 修改纪念日起始日

修改 `IndexView.vue` 中 `TOGETHER_DATE` 变量的值（格式 `YYYY-MM-DD`）。

### 修改爱情故事文案

编辑 `IndexView.vue` 中 `story-image__text` 区块的文本内容。

### 更换音乐

替换 `frontend/public/audio/City_Of_Stars.mp3`，或在 `IndexView.vue` 中修改 `<audio>` 标签的 `src`。

### 修改主题色

编辑 `frontend/src/assets/css/theme.css` 中的 CSS 变量（玫瑰粉/金色/奶油色）。

---

## 生产部署

### 1. 前端打包

```bash
cd frontend
npm run build
```

静态文件输出到 `dist/` 目录。

### 2. 后端服务（systemd）

```ini
# /etc/systemd/system/qn-web.service
[Unit]
Description=qiqi & nini Web API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qn-web.service
```

### 3. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    # Vue Router history 模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /login_process    { proxy_pass http://127.0.0.1:8000; }
    location /register_process { proxy_pass http://127.0.0.1:8000; }
    location /table_data       { proxy_pass http://127.0.0.1:8000; }
    location /table_done_list  { proxy_pass http://127.0.0.1:8000; }
    location /table_add        { proxy_pass http://127.0.0.1:8000; }
    location /table_change     { proxy_pass http://127.0.0.1:8000; }
    location /table_delete     { proxy_pass http://127.0.0.1:8000; }
    location /table_done       { proxy_pass http://127.0.0.1:8000; }
    location /me               { proxy_pass http://127.0.0.1:8000; }
    location /blessings        { proxy_pass http://127.0.0.1:8000; }
    location /health           { proxy_pass http://127.0.0.1:8000; }
    location /admin            { proxy_pass http://127.0.0.1:8000; }
}
```

```bash
sudo nginx -t && sudo nginx -s reload
```

---

© 2021 qiqi & nini
# QN_web

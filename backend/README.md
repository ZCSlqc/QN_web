# 后端

`main.py` 仅装配路由、中间件、启动生命周期。运行 `uv run python run.py`，从项目根目录 `.env` 读取 `QN_BACKEND_PORT`（默认1277）。

| 目录 | 职责 |
| --- | --- |
| `app/core` | 配置、连接、建表、认证、限流 |
| `app/api` | 参数解析、权限依赖、HTTP响应，按业务文件划分 |
| `app/services` | 业务规则、共用校验、文件及目录管理 |
| `scripts` | 人工运行的运维命令 |
| `test` | pytest 隔离测试与真实集成测试后端启动器 |

依赖方向为 API → service/core；service 不导入 API。不要在导入模块时自动改数据库；数据库初始化与照片清理只在应用 lifespan 执行，运维命令显式调用。

业务数据、配置和上传目录留在 backend 根目录或外部路径，不随代码目录移动。新增 API 模块需在 main.py 注册，通用规则放 services。

照片存储使用 `uploads/albums/照片UUID/` 和 `uploads/journeys/旅程UUID/照片UUID/`。目录内为 `original.jpg/png/webp`、`thumbnail.webp` 及按需生成的 `small.webp`、`cover.webp`、`display.webp`。`photos.original_name` 保存原始文件名，`storage_dir` 和 `filename` 保存相对上传根目录的路径，API地址仍以照片UUID定位。
照片只使用 UUID 目录，不从 frontend/public 自动导入。source 仅保留已有照片来源和展示顺序信息，不决定文件存储方式。删除所有照片均清理其 UUID 目录；空库相册为空。

启动补粮在 lifespan 的数据库初始化之后执行：每位已注册 `.env` 管理员三种食物各补足1，已有较多库存保留；不作用于访客，也不计作投喂记录。重置命令和备份说明见 scripts/README.md。

## 最终数据库结构

猫咪状态读取与历史读取均检查 `/pet` 白名单。`GET /pet` 固定返回最近3条，`GET /pet/activity?cursor=记录UUID` 每页20条，普通轮询不重复下载完整历史。状态查询使用只读事务。
旅程页面通过 `GET /journeys?summary=true` 获取摘要及前两张封面，`GET /journeys/{id}` 获取完整内容，`GET /journey-search?q=...` 对完整文本搜索并只返回匹配ID。
删除由预定转换的旅程时同时移除对应预定行，并在幂等记录中保留 `deleted_plan_conversion` 标记，后续重复转换返回410，不重建已删除旅程。

`app/core/schema.sql` 直接声明最终UUID表结构；`init_db()` 只创建缺失的最终表、索引以及单例故事/宠物，不执行旧ID转换、补列、旧库存转换或相册导入。
`uuid_ids.py` 仅保留UUID常量和插入结果读取助手。用户身份只来源于QN_ADMIN_USERS，数据库不再保留无效的role字段。SQLite内部rowid只用于同一时间的稳定排序，不是公开ID。

当前业务仍保留：账号token版本与已退出凭证、领奖记录和幂等请求、主人分账户背包、访客猫条、启动补足、照片内容哈希、顺序和原始文件名。历史零奖励标记也保留，防止旧照片/心愿/旅程再次领奖。`pet_blessing_rewards.blessing_id` 为TEXT UUID。

现库为最终结构；不要用旧数据库直接覆盖。日常备份默认写到项目旁的 `QN_web_backups/`，恢复应同时还原最终版数据库和uploads。过渡脚本、旧库和原始照片备份已归档到项目外，不随代码发布。固定网页素材的现用原稿仍由根目录asset管理。

## 婚礼猫咪 NPC

新增 `wedding_cat_npcs` 表，启动时创建并仅插入缺失记录，不覆盖已有性格参数。五只默认配置见 `app/core/wedding_cats.json`。NPC配置与原有宠物背包、投喂记录独立；不会创建额外的投喂宠物或修改库存。

- `GET /wedding/cats`：需要婚礼页访问权限，返回五只猫的性格、四类活动权重、速度、单次探索半径、休息时长、初始位置。响应不缓存。
- `PATCH /wedding/cats/{id}`：仅管理员；JSON允许 personality、rest_weight、explore_weight、social_weight、approach_weight、speed、roam_radius、rest_min、rest_max。合并后的四权重之和必须为100，休息范围需有序；拒绝空值、未知字段、越界值。部分修改在同一事务内校验和提交。

例如花花增加探索倾向：`{"rest_weight":10,"explore_weight":45}`（社交35、靠近10保持现值）。修改后刷新婚礼页生效。当前未新增管理面板；可通过管理员接口调整。

持久化的是NPC设定；逐帧位置、路径、动作和短暂跟随状态在客户端模拟，不产生持续写库，也不代表多人实时同步。

测试：`python -m pytest backend/test/test_wedding_cats.py -q`（从项目根目录执行）。

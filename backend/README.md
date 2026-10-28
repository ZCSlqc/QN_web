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

`app/core/schema.sql` 直接声明最终UUID表结构；`init_db()` 只创建缺失的最终表、索引以及单例故事/宠物，不执行旧ID转换、补列、旧库存转换或相册导入。
`uuid_ids.py` 仅保留UUID常量和插入结果读取助手。用户身份只来源于QN_ADMIN_USERS，数据库不再保留无效的role字段。SQLite内部rowid只用于同一时间的稳定排序，不是公开ID。

当前业务仍保留：账号token版本与已退出凭证、领奖记录和幂等请求、主人分账户背包、访客猫条、启动补足、照片内容哈希、顺序和原始文件名。历史零奖励标记也保留，防止旧照片/心愿/旅程再次领奖。`pet_blessing_rewards.blessing_id` 为TEXT UUID。

现库为最终结构；不要用旧数据库直接覆盖。日常备份默认写到项目旁的 `QN_web_backups/`，恢复应同时还原最终版数据库和uploads。过渡脚本、旧库和原始照片备份已归档到项目外，不随代码发布。固定网页素材的现用原稿仍由根目录asset管理。

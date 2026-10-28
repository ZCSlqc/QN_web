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

启动补粮在 lifespan 的数据库初始化之后执行：每位已注册 `.env` 管理员三种食物各补足1，已有较多库存保留；不作用于访客，也不计作投喂记录。重置命令和备份说明见 scripts/README.md。

# 基础设施

- `settings.py`：仅从进程环境和 `.env` 读取配置，路径始终相对 backend。
- `database.py`：数据库连接、事务、建表、WAL、外键与忙等待；失败自动回滚/关闭。
- `security.py`：密码哈希、JWT、登录身份和管理员校验。JWT包含账号ID、令牌版本和独立jti。
- `rate_limit.py`：按请求来源IP和操作分桶，SQLite共享计数，多进程一致。

不在此放具体页面业务。生产修改数据库前先执行备份命令。

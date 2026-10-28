# 运维命令

在项目根目录使用 `.venv/Scripts/python.exe backend/scripts/<脚本>.py`，或进入 backend 后用 `uv run python scripts/<脚本>.py`。

| 脚本 | 操作 |
| --- | --- |
| `create_account.py 用户名` | 创建 `.env` 中预留的管理员/情侣账号；交互输入密码，不覆盖已有账号 |
| `manage_admin.py 用户名` | 将已注册账号加入 `.env` 管理员名单，重启生效 |
| `import_journeys.py` | 检查 Markdown 和城市代码；`--replace` 才备份并全量覆盖旅程 |
| `cleanup_photos.py` | 重试已移除照片的磁盘文件清理 |
| `backup_data.py` | 私有备份数据库、上传目录和部署密钥，可用 `--output` 指定备份父目录 |

导入仅替换 journeys，其他表不动。已有旅程照片或已转换预定引用旅程时拒绝全量替换，避免产生悬空关联。照片资源管理和数据备份的输出不应加入 Git；旧结构转换脚本已移除，日常备份保存在项目外。

## 信箱与背包重置

`python backend/scripts/reset_pet_mailbox.py --apply` 先生成经过完整性检查的SQLite备份（默认项目旁QN_web_backups），再在同一事务清空信件、留言、阅读状态、投喂流水及所有用户库存，并删除写信每日奖励记录。保留照片/心愿/旅程/访客祝福领取标记以及其他业务表。脚本对其他表进行指纹比对；无需重建数据库。

`--database` 可显式指定数据库，`--backup-dir` 可指定备份目录。重置后库存为0；下次服务启动通过 `replenish_startup_food()` 将每位已注册管理员的三种库存各补足1。两个管理员的共同背包下限为猫条2、猫粮2、罐头2；读取接口不会补粮。

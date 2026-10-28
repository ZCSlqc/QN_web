# 后端测试

在项目根目录执行：

```bash
uv run --with-requirements backend/requirements.txt --with-requirements backend/requirements-dev.txt python -m pytest backend/test -q
```

或在已安装依赖的 Python 环境执行 `python -m pytest backend/test -q`。

每个测试使用独立临时数据库、上传目录、图片目录和环境配置，不读取或修改生产 `couple.db` 和 `.env`。公共 fixture 在 `conftest.py`，请求辅助函数在 `helpers.py`。

- `test_auth.py`：登录、注册、管理员名单与账号失效。
- `test_journeys.py`：旅程增删改查、多城市数组、直辖市及港澳。
- `test_photos.py`：上传、校验、权限、缩略图及删除。
- `test_album_catalog.py`：旧相册登记、删除后不复活、保留原始文件。
- `test_story.py`：故事保存、冲突和内容校验。
- `test_admin.py`：管理功能、分享码文件写入、权限和待办。
- `test_mailbox.py`：双方身份隔离、收发未读、独立留言阅读位置、幂等投递、分页、账号重注册和配对变更。

`test_regressions.py` 覆盖预留账号、文件清理失败、待办一致性、退出/改密及限流。`run_server.py` 只用于前端真实集成测试，所有数据均为临时。

`test_journey_plans.py` 覆盖预定旅程；`test_dev_launcher.py` 验证端口占用时不停止其他进程。测试函数统一使用 `test_<行为>`。

`test_profiles.py` 验证昵称默认值、编辑、账号身份不变和历史记录展示；`test_pet.py` 验证自己的库存优先扣除、对方补足、并发、管理员无留言奖励和活动来源防重复。

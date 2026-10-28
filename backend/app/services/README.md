# 业务服务

`todos.py` 统一首页/后台心愿规则；`journeys.py` 校验城市数组；`album.py` 登记原有相册；`photo_cleanup.py` 重试已隐藏上传照片的文件清理；`registration.py` 读写分享码；`idempotency.py` 防止重试重复新增；`story.py` 默认故事；`mailbox_schema.py` 信箱表定义。

删除上传照片的顺序：数据库标记隐藏 → 删除文件 → 删除隐藏记录。文件清理失败仍返回已从相册移除，记录留作重试，不再把已消失的照片报告成“删除失败”。

`profiles.py` 统一昵称回退和记录展示；`rewards.py` 处理访客每日祝福猫条；`pet_wallets.py` 处理管理员情侣分账户库存、合计展示和三类来源的一次性奖励。奖励必须在对应内容写入的同一事务调用，不能另起事务或异步补发。

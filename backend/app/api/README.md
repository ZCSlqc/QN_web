# API 路由

`auth.py` 登录/注册/退出/改密；`photos.py` 相册；`journeys.py` 足迹与预定旅程；`story.py` 故事；`blessings.py` 祝福；`todos.py` 心愿；`admin.py` 后台设置及账号管理；`mailbox.py` 私密信箱。

保持前端使用的路径稳定。管理员接口使用 require_admin，信箱按两人身份和账号ID独立授权。不要把纯输入校验、共用待办规则复制到多个路由中。

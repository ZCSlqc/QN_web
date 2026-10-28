# 前端业务目录

| 目录 | 内容 |
| --- | --- |
| `album` | 相册展示/上传/编辑、四格轮播 |
| `auth` | 账号退出和修改密码 |
| `admin` | 注册分享码设置 |
| `blessings` | 5秒停留的祝福轮播 |
| `journey` | 地图资源缓存、OpenFreeMap加载器 |
| `mailbox` | 两人私密信箱 |
| `music` | 跨页面保持播放状态的音乐组件 |
| `story` | 可编辑故事 |
| `todos` | 首页心愿逻辑，调用与后台相同的ID接口 |

新增功能先归入对应业务目录。只有跨多个业务复用的组件才放 `components/shared`。页面布局仍在 views。

# 项目级脚本

`python scripts/dev.py` 启动项目开发服务，要求项目已有 `.venv` 和前端 `node_modules`。

在前台运行；Ctrl+C 或终止启动器会清理它创建的两个子进程树。端口占用时失败退出，不尝试杀掉占用进程。只在服务真正返回HTTP 200后打印就绪信息。

Linux/macOS 根目录 start.sh 是此脚本的薄封装。Windows也可直接使用 Python。后端维护命令在 backend/scripts，前端资源生成脚本在 frontend/scripts。

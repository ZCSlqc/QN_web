#!/bin/bash

# 一键启动 qiqi & nini 情侣网页前后端

echo "正在启动 qiqi & nini 情侣网页..."

# 停止可能存在的旧进程
sudo pkill -f "uvicorn"
sudo pkill -f "vite"

# 等待进程完全停止
sleep 2

# 启动后端
echo "启动后端服务 (8000端口)..."
# 先进入backend目录，再激活虚拟环境（虚拟环境在项目根目录）
cd backend
source ../.venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > web-fastapi.log 2>&1 &
BACKEND_PID=$!
echo "后端进程 PID: $BACKEND_PID"

# 等待后端启动
sleep 3

# 启动前端
echo "启动前端服务 (7721端口)..."
cd ../frontend
nohup npm run dev -- --host 0.0.0.0 --port 7721 < /dev/null > web-vue.log 2>&1 &
FRONTEND_PID=$!
echo "前端进程 PID: $FRONTEND_PID"

echo ""
echo "✨ 启动完成！"
echo "后端 API: http://localhost:8000"
echo "前端页面: http://localhost:7721"
echo "日志文件: web-fastapi.log, web-vue.log (在项目根目录下)"
echo ""
echo "按 Ctrl+C 停止所有服务"
#!/bin/bash
# ============================================================
# qiqi & nini 情侣网页 — 一键启动脚本
# 后端 FastAPI :8000  |  前端 Vite :7721
# ============================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/.venv"

echo "========================================"
echo "  qiqi & nini 情侣网页"
echo "========================================"

# ── 停止旧进程 ──────────────────────────────────────────
echo "[1/4] 清理旧进程..."
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# ── 检查虚拟环境 ────────────────────────────────────────
if [ ! -f "$VENV_DIR/bin/activate" ]; then
  echo "[!] 未找到虚拟环境 $VENV_DIR"
  echo "    请先创建: python3 -m venv .venv && source .venv/bin/activate && uv pip install -r backend/requirements.txt"
  exit 1
fi

# ── 检查前端依赖 ────────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "[!] 未找到 node_modules，正在安装前端依赖..."
  cd "$FRONTEND_DIR"
  npm install
fi

# ── 启动后端 ────────────────────────────────────────────
echo "[2/4] 启动后端 FastAPI (端口 8000)..."
cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > "$ROOT_DIR/web-fastapi.log" 2>&1 &
echo "      后端 PID: $!"

# ── 等待后端就绪 ────────────────────────────────────────
echo "[3/4] 等待后端就绪..."
for i in $(seq 1 10); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "      后端已就绪 ✓"
    break
  fi
  sleep 1
done

# ── 启动前端 ────────────────────────────────────────────
echo "[4/4] 启动前端 Vite (端口 7721)..."
cd "$FRONTEND_DIR"
nohup npm run dev -- --host 0.0.0.0 --port 7721 < /dev/null > "$ROOT_DIR/web-vue.log" 2>&1 &
echo "      前端 PID: $!"

echo ""
echo "========================================"
echo "  启动完成！"
echo "  后端 API : http://localhost:8000"
echo "  API 文档 : http://localhost:8000/docs"
echo "  前端页面 : http://localhost:7721"
echo "  日志文件 : web-fastapi.log / web-vue.log"
echo "========================================"
echo ""
echo "  页面路由:"
echo "    /login     — 登录"
echo "    /register  — 注册"
echo "    /index     — 主页 (故事/相册/计时器)"
echo "    /journey   — 爱的旅程 (地图点亮)"
echo "    /admin     — 管理后台"
echo ""

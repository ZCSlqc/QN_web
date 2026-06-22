#!/bin/bash

# ============================================================
# qiqi & nini 情侣网页 — 一键停止脚本
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID_FILE="$ROOT_DIR/.backend.pid"
FRONTEND_PID_FILE="$ROOT_DIR/.frontend.pid"

echo "========================================"
echo "  停止服务"
echo "========================================"

# ── 停止后端 ────────────────────────────────────────────
if [ -f "$BACKEND_PID_FILE" ]; then
    PID=$(cat "$BACKEND_PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "[1/2] 停止后端 (PID: $PID)..."
        kill "$PID"
        sleep 1
        # 强制杀掉残留
        kill -9 "$PID" 2>/dev/null || true
        echo "      后端已停止 ✓"
    else
        echo "[1/2] 后端进程不存在，清理 PID 文件"
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo "[1/2] 未找到后端 PID 文件，按名称查找..."
    pkill -f "uvicorn main:app" 2>/dev/null || true
    echo "      后端已停止 ✓"
fi

# ── 停止前端 ────────────────────────────────────────────
if [ -f "$FRONTEND_PID_FILE" ]; then
    PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "[2/2] 停止前端 (PID: $PID)..."
        kill "$PID"
        sleep 1
        kill -9 "$PID" 2>/dev/null || true
        echo "      前端已停止 ✓"
    else
        echo "[2/2] 前端进程不存在，清理 PID 文件"
    fi
    rm -f "$FRONTEND_PID_FILE"
else
    echo "[2/2] 未找到前端 PID 文件，按名称查找..."
    pkill -f "vite" 2>/dev/null || true
    echo "      前端已停止 ✓"
fi

# ── 兜底：确保全部杀掉 ──────────────────────────────────
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

sleep 1
echo ""
echo "========================================"
echo "  所有服务已停止"
echo "========================================"

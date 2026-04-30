"""
qiqi & nini 情侣网页 API
FastAPI + SQLite + JWT 鉴权
"""
import sqlite3
import datetime
from contextlib import contextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt

from config.settings import settings

# ── 密码哈希 & JWT ──────────────────────────────────────────

security = HTTPBearer(auto_error=False)

ADMIN_LIST = {"李琪淳", "郑丹妮"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """验证密码，兼容旧版明文密码"""
    if hashed.startswith("$2"):
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    # 兼容旧明文密码
    return plain == hashed


def is_old_password(hashed: str) -> bool:
    """判断密码是否为旧版明文"""
    return not hashed.startswith("$2")


def create_token(username: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(
        hours=settings.ACCESS_TOKEN_EXPIRE_HOURS
    )
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    if credentials is None:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload.get("sub")
    except JWTError:
        return None


def require_admin(
    current_user: Optional[str] = Depends(get_current_user),
) -> str:
    """要求管理员权限，访客调用则拒绝"""
    if current_user not in ADMIN_LIST:
        raise HTTPException(status_code=403, detail="仅管理员可以操作")
    return current_user


# ── 数据库工具 ──────────────────────────────────────────────

DB_PATH = settings.DB_PATH


def bj_time() -> str:
    return (
        datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    ).strftime("%Y-%m-%d %H:%M:%S")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS user (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT    NOT NULL UNIQUE,
                userpwd  TEXT    NOT NULL,
                userdate TEXT    NOT NULL
            );
            CREATE TABLE IF NOT EXISTS things (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                entry      TEXT    NOT NULL UNIQUE,
                types      TEXT    NOT NULL,
                user       TEXT    NOT NULL,
                start_date TEXT    NOT NULL,
                end_date   TEXT,
                done       INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS blessings (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                content    TEXT    NOT NULL,
                author     TEXT    NOT NULL,
                created_at TEXT    NOT NULL
            );
            CREATE TABLE IF NOT EXISTS journeys (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                adcode         TEXT    NOT NULL,
                name           TEXT    NOT NULL,
                departure_date TEXT,
                return_date    TEXT,
                impression     TEXT,
                notes          TEXT,
                created_at     TEXT    NOT NULL,
                updated_at     TEXT    NOT NULL
            );
        """)
        # 迁移：为旧表添加 login_count 列
        try:
            conn.execute("ALTER TABLE user ADD COLUMN login_count INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass  # 列已存在
        # 修复旧数据的 NULL 值
        conn.execute("UPDATE user SET login_count = 0 WHERE login_count IS NULL")


init_db()

# ── 内存缓存 ────────────────────────────────────────────────

todo_data: list = []
done_data: list = []


def refresh_data():
    global todo_data, done_data
    with get_db() as conn:
        rows = conn.execute(
            "SELECT entry, types, user, start_date, end_date, done FROM things ORDER BY id DESC"
        ).fetchall()
    todo_data.clear()
    done_data.clear()
    for r in rows:
        item = {
            "start_date": r["start_date"],
            "entry": r["entry"],
            "type": r["types"],
            "user": r["user"],
        }
        if r["done"]:
            item["end_date"] = r["end_date"] or ""
            done_data.append(item)
        else:
            todo_data.append(item)


refresh_data()

# ── FastAPI 应用 ────────────────────────────────────────────

app = FastAPI(
    title="qiqi & nini 情侣网页 API",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)


# ── 健康检查 ────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "msg": "qiqi & nini 后端服务运行正常 💕"}


# ── 当前用户信息 ──────────────────────────────────────────

@app.get("/me")
async def me(current_user: Optional[str] = Depends(get_current_user)):
    """返回当前登录用户、是否管理员、登录次数"""
    login_count = 0
    is_admin = current_user in ADMIN_LIST if current_user else False
    if current_user:
        with get_db() as conn:
            row = conn.execute(
                "SELECT login_count FROM user WHERE username=?", (current_user,)
            ).fetchone()
            if row:
                login_count = row["login_count"]
    return {
        "username": current_user,
        "is_admin": is_admin,
        "login_count": login_count,
    }


# ── 用户认证 ────────────────────────────────────────────────

@app.post("/login_process")
async def login_process(
    username: str = Form(...),
    userpwd: str = Form(...),
    checkcode: str = Form(""),
):
    if checkcode and checkcode != settings.CHECK_CODE:
        return JSONResponse({"status": "failed", "flag": -3, "msg": "授权码错误"})

    with get_db() as conn:
        row = conn.execute(
            "SELECT userpwd, login_count FROM user WHERE username=?", (username,)
        ).fetchone()

    if row is None:
        return JSONResponse({"status": "failed", "flag": -1, "msg": "用户名不存在"})
    if not verify_password(userpwd, row["userpwd"]):
        return JSONResponse({"status": "failed", "flag": -2, "msg": "密码错误"})

    # 旧明文密码自动升级为 bcrypt
    if is_old_password(row["userpwd"]):
        with get_db() as conn:
            conn.execute(
                "UPDATE user SET userpwd=? WHERE username=?",
                (hash_password(userpwd), username),
            )

    login_count_before = row["login_count"] or 0

    # 登录次数 +1
    with get_db() as conn:
        conn.execute(
            "UPDATE user SET login_count = login_count + 1 WHERE username=?",
            (username,),
        )

    token = create_token(username)
    return JSONResponse(
        {"status": "success", "flag": 1, "msg": "登录成功", "token": token, "login_count": login_count_before}
    )


@app.post("/register_process")
async def register_process(
    username: str = Form(...),
    userpwd: str = Form(...),
    checkcode: str = Form(...),
):
    if checkcode != settings.CHECK_CODE:
        return JSONResponse({"status": "failed", "flag": -3, "msg": "授权码错误"})

    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM user WHERE username=?", (username,)
        ).fetchone()
        if exists:
            return JSONResponse({"status": "failed", "flag": -1, "msg": "用户名已存在"})
        conn.execute(
            "INSERT INTO user (username, userpwd, userdate) VALUES (?, ?, ?)",
            (username, hash_password(userpwd), bj_time()),
        )

    token = create_token(username)
    return JSONResponse(
        {"status": "success", "flag": 1, "msg": "注册成功", "token": token, "login_count": 0}
    )


# ── 祝福寄语 ────────────────────────────────────────────────

@app.get("/blessings")
async def get_blessings():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT content, author, created_at FROM blessings ORDER BY id DESC LIMIT 50"
        ).fetchall()
    return JSONResponse({
        "data": [{"content": r["content"], "author": r["author"], "created_at": r["created_at"]} for r in rows]
    })


@app.post("/blessings")
async def add_blessing(
    content: str = Form(...),
    current_user: Optional[str] = Depends(get_current_user),
):
    author = current_user or "匿名"
    if not content.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")
    with get_db() as conn:
        conn.execute(
            "INSERT INTO blessings (content, author, created_at) VALUES (?, ?, ?)",
            (content.strip(), author, bj_time()),
        )
    return JSONResponse({"status": "success"})


# ── 旅程记录 ────────────────────────────────────────────────


@app.get("/journeys")
async def get_journeys():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, adcode, name, departure_date, return_date, impression, notes, created_at, updated_at FROM journeys ORDER BY id DESC"
        ).fetchall()
    return JSONResponse({
        "data": [
            {
                "id": r["id"], "adcode": r["adcode"], "name": r["name"],
                "departure_date": r["departure_date"], "return_date": r["return_date"],
                "impression": r["impression"], "notes": r["notes"],
                "created_at": r["created_at"], "updated_at": r["updated_at"],
            }
            for r in rows
        ],
    })


@app.post("/journeys")
async def add_journey(
    adcode: str = Form(...),
    name: str = Form(...),
    departure_date: str = Form(""),
    return_date: str = Form(""),
    impression: str = Form(""),
    notes: str = Form(""),
):
    now = bj_time()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO journeys (adcode, name, departure_date, return_date, impression, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (adcode, name, departure_date, return_date, impression, notes, now, now),
        )
    return JSONResponse({"status": "success"})


@app.put("/journeys/{journey_id}")
async def update_journey(
    journey_id: int,
    adcode: str = Form(...),
    name: str = Form(...),
    departure_date: str = Form(""),
    return_date: str = Form(""),
    impression: str = Form(""),
    notes: str = Form(""),
):
    now = bj_time()
    with get_db() as conn:
        conn.execute(
            "UPDATE journeys SET adcode=?, name=?, departure_date=?, return_date=?, impression=?, notes=?, updated_at=? WHERE id=?",
            (adcode, name, departure_date, return_date, impression, notes, now, journey_id),
        )
    return JSONResponse({"status": "success"})


@app.delete("/journeys/{journey_id}")
async def delete_journey(journey_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM journeys WHERE id=?", (journey_id,))
    return JSONResponse({"status": "success"})


# ── 待办事项 ────────────────────────────────────────────────

@app.get("/table_data")
async def table_data():
    return JSONResponse({"data": todo_data})


@app.post("/table_add")
async def table_add(
    entry: str = Form(...),
    type: str = Form(...),
    user: str = Form(None),
    current_user: str = Depends(require_admin),
):
    if user is None:
        user = current_user

    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM things WHERE entry=?", (entry,)
        ).fetchone()
        if exists:
            return JSONResponse({"data": [{"entry": -1}]})
        conn.execute(
            "INSERT INTO things (entry, types, user, start_date, done) VALUES (?, ?, ?, ?, 0)",
            (entry, type, user, bj_time()),
        )
    refresh_data()
    return JSONResponse({"data": todo_data})


@app.post("/table_change")
async def table_change(
    entry_old: str = Form(...),
    entry: str = Form(...),
    type: str = Form(...),
    user: str = Form(...),
    start_date: str = Form(...),
    current_user: str = Depends(require_admin),
):
    try:
        datetime.datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误")

    with get_db() as conn:
        if entry_old != entry:
            exists = conn.execute(
                "SELECT 1 FROM things WHERE entry=?", (entry,)
            ).fetchone()
            if exists:
                return JSONResponse({"data": [{"entry": -1}]})
        conn.execute(
            "UPDATE things SET entry=?, types=?, user=?, start_date=? WHERE entry=?",
            (entry, type, user, start_date, entry_old),
        )
    refresh_data()
    return JSONResponse({"data": todo_data})


@app.post("/table_delete")
async def table_delete(
    entry: str = Form(...),
    current_user: str = Depends(require_admin),
):
    with get_db() as conn:
        conn.execute("DELETE FROM things WHERE entry=?", (entry,))
    refresh_data()
    return JSONResponse({})


@app.post("/table_done")
async def table_done(
    entry: str = Form(...),
    current_user: str = Depends(require_admin),
):
    with get_db() as conn:
        conn.execute(
            "UPDATE things SET done=1, end_date=? WHERE entry=?",
            (bj_time(), entry),
        )
    refresh_data()
    return JSONResponse({})


@app.get("/table_done_list")
async def table_done_list():
    return JSONResponse({"data": done_data})


# ── 管理后台（仅管理员）─────────────────────────────────────

@app.get("/admin/users")
async def admin_users(current_user: str = Depends(require_admin)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, username, userdate, login_count FROM user ORDER BY id DESC"
        ).fetchall()
    return JSONResponse({
        "data": [{"id": r["id"], "username": r["username"], "userdate": r["userdate"], "login_count": r["login_count"]} for r in rows]
    })


@app.post("/admin/users/delete")
async def admin_user_delete(
    username: str = Form(...),
    current_user: str = Depends(require_admin),
):
    with get_db() as conn:
        conn.execute("DELETE FROM user WHERE username=?", (username,))
    return JSONResponse({"status": "success"})


@app.post("/admin/blessings/delete")
async def admin_blessing_delete(
    id: int = Form(...),
    current_user: str = Depends(require_admin),
):
    with get_db() as conn:
        conn.execute("DELETE FROM blessings WHERE id=?", (id,))
    return JSONResponse({"status": "success"})


@app.get("/admin/blessings")
async def admin_blessings(current_user: str = Depends(require_admin)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, content, author, created_at FROM blessings ORDER BY id DESC"
        ).fetchall()
    return JSONResponse({
        "data": [{"id": r["id"], "content": r["content"], "author": r["author"], "created_at": r["created_at"]} for r in rows]
    })


# ── 启动入口 ────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=True,
    )

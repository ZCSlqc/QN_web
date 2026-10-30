import sqlite3
import hashlib
import time
from jose import jwt
from typing import Optional
from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from app.core.settings import settings
from app.core.database import get_db, bj_time
from app.core.security import get_current_user, hash_password, verify_password, create_token
from app.services.registration import registration_code
from app.core.security import security
from app.core.rate_limit import limit

router = APIRouter()


@router.get("/me")
def me(current_user: Optional[str] = Depends(get_current_user)):
    """返回当前登录用户、是否管理员、登录次数"""
    login_count = 0
    is_admin = False
    nickname = ''
    if current_user:
        with get_db() as conn:
            row = conn.execute(
                "SELECT login_count,nickname FROM user WHERE username=?", (current_user,)
            ).fetchone()
            if row:
                login_count = row["login_count"]
                nickname = row["nickname"]
                is_admin = current_user in settings.ADMIN_USERS
    return {
        "username": current_user,
        "nickname": nickname,
        "display_name": nickname or current_user,
        "is_admin": is_admin,
        "wedding_role": ('groom' if current_user == settings.WEDDING_GROOM_USER else 'bride' if current_user == settings.WEDDING_BRIDE_USER else None) if is_admin else None,
        "allowed_pages": sorted(settings.USER_PAGE_ALLOWLIST) if current_user else [],
        "has_mailbox": bool(current_user and len(settings.ADMIN_USERS) == 2 and current_user in settings.ADMIN_USERS),
        "login_count": login_count,
    }


@router.post("/login_process", dependencies=[Depends(limit('login', 20))])
def login_process(
    username: str = Form(...),
    userpwd: str = Form(...),
    checkcode: str = Form(""),
):
    if checkcode and checkcode != registration_code():
        return JSONResponse({"status": "failed", "flag": -3, "msg": "注册分享码错误"})

    with get_db() as conn:
        row = conn.execute(
            "SELECT userpwd, login_count FROM user WHERE username=?", (username,)
        ).fetchone()

    if row is None:
        return JSONResponse({"status": "failed", "flag": -1, "msg": "用户名不存在"})
    if not verify_password(userpwd, row["userpwd"]):
        return JSONResponse({"status": "failed", "flag": -2, "msg": "密码错误"})

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


@router.post("/register_process", dependencies=[Depends(limit('register', 10))])
def register_process(
    username: str = Form(...),
    userpwd: str = Form(...),
    checkcode: str = Form(...),
):
    code = registration_code()
    if not code:
        raise HTTPException(status_code=503, detail="暂未开放注册，请联系管理员配置分享码")
    if checkcode != code:
        return JSONResponse({"status": "failed", "flag": -3, "msg": "注册分享码错误"})

    username = username.strip()
    if username in settings.ADMIN_USERS:
        raise HTTPException(403, detail='该用户名为预留账号，请联系站点所有者创建')
    if not username or len(username) > 50 or not userpwd.strip() or len(userpwd.encode()) > 72:
        raise HTTPException(status_code=400, detail="姓名需为1至50字，密码不能为空且不能超过72字节")

    with get_db() as conn:
        conn.execute("BEGIN IMMEDIATE")
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




@router.post('/logout')
def logout(current_user=Depends(get_current_user), credentials=Depends(security)):
    if not current_user:
        raise HTTPException(401, '请先登录')
    payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    with get_db() as conn:
        conn.execute('DELETE FROM revoked_tokens WHERE expires_at<?', (int(time.time()),))
        conn.execute('INSERT OR REPLACE INTO revoked_tokens(token_hash,expires_at) VALUES (?,?)',
                     (hashlib.sha256(credentials.credentials.encode()).hexdigest(), payload['exp']))
    return {'status': 'success'}


@router.post('/account/password', dependencies=[Depends(limit('password', 10))])
def change_password(current_password: str = Form(...), new_password: str = Form(...), current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(401, '请先登录')
    if len(new_password) < 8 or len(new_password.encode()) > 72 or not new_password.strip():
        raise HTTPException(400, '新密码至少8个字符，且不超过72个UTF-8字节')
    with get_db() as conn:
        row = conn.execute('SELECT userpwd FROM user WHERE username=?', (current_user,)).fetchone()
    if not row or not verify_password(current_password, row['userpwd']):
        raise HTTPException(400, '当前密码不正确')
    hashed = hash_password(new_password)
    with get_db() as conn:
        result = conn.execute('UPDATE user SET userpwd=?,token_version=token_version+1 WHERE username=? AND userpwd=?', (hashed, current_user, row['userpwd']))
        if not result.rowcount:
            raise HTTPException(409, '密码已被修改，请重新登录')
    return {'status': 'success'}


@router.put('/account/nickname')
def change_nickname(nickname: str = Form(''), current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(401, '请先登录')
    nickname = nickname.strip()
    if len(nickname) > 20 or any(ord(char) < 32 or ord(char) == 127 for char in nickname):
        raise HTTPException(400, '昵称最多20字，不能包含换行或控制字符')
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        if nickname and conn.execute('SELECT 1 FROM user WHERE username<>? AND (nickname=? COLLATE NOCASE OR username=? COLLATE NOCASE)', (current_user, nickname, nickname)).fetchone():
            raise HTTPException(409, '这个昵称已有人使用，请换一个')
        conn.execute('UPDATE user SET nickname=? WHERE username=?', (nickname, current_user))
    return {'nickname': nickname, 'display_name': nickname or current_user}

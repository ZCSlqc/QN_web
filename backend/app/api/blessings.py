from app.core.uuid_ids import inserted_id
from typing import Optional
from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from app.core.database import get_db, bj_time
from app.core.security import get_current_user, require_admin
from app.core.rate_limit import limit
from app.services.idempotency import lookup, remember
from app.services.profiles import display_name
from app.services.rewards import grant_blessing_treat, blessing_receipt

router = APIRouter()


@router.get("/blessings")
def get_blessings():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id,content,author,author_id,created_at FROM blessings ORDER BY created_at DESC, rowid DESC LIMIT 50"
        ).fetchall()
        rows = [dict(row) | {'author': display_name(conn, user_id=row['author_id'], fallback=row['author']) if row['author_id'] else row['author']} for row in rows]
    return JSONResponse({
        "data": [{"content": r["content"], "author": r["author"], "created_at": r["created_at"]} for r in rows]
    })


@router.post("/blessings", dependencies=[Depends(limit('blessings', 10))])
def add_blessing(
    content: str = Form(...),
    request_key: str = Form(''),
    current_user: Optional[str] = Depends(get_current_user),
):
    author = current_user or "匿名"
    if not content.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")
    if len(content.strip()) > 300:
        raise HTTPException(status_code=400, detail="祝福不能超过300字")
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        now = bj_time()
        user_id = None
        if current_user:
            user = conn.execute('SELECT id FROM user WHERE username=?', (current_user,)).fetchone()
            if not user:
                raise HTTPException(401, '账号已失效，请重新登录')
            user_id = user['id']
        existing, marker = lookup(conn, 'blessing', current_user, request_key, content.strip().encode()) if current_user else (None, None)
        if existing is not None:
            return JSONResponse(blessing_receipt(conn, user_id, existing, now, replayed=True))
        blessing = conn.execute(
            "INSERT INTO blessings (content, author, created_at, author_id) VALUES (?, ?, ?, ?)",
            (content.strip(), author, now, user_id),
        )
        reward = grant_blessing_treat(conn, user_id, inserted_id(conn, blessing, 'blessings'), now)
        remember(conn, marker, inserted_id(conn, blessing, 'blessings'))
        return JSONResponse(blessing_receipt(conn, user_id, inserted_id(conn, blessing, 'blessings'), now, awarded=reward))


@router.post("/admin/blessings/delete")
def admin_blessing_delete(
    id: str = Form(...),
    current_user: str = Depends(require_admin),
):
    with get_db() as conn:
        conn.execute("DELETE FROM blessings WHERE id=?", (id,))
    return JSONResponse({"status": "success"})


@router.get("/admin/blessings")
def admin_blessings(current_user: str = Depends(require_admin)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id,content,author,author_id,created_at FROM blessings ORDER BY created_at DESC, rowid DESC"
        ).fetchall()
        rows = [dict(row) | {'author': display_name(conn, user_id=row['author_id'], fallback=row['author']) if row['author_id'] else row['author']} for row in rows]
    return JSONResponse({
        "data": [{"id": r["id"], "content": r["content"], "author": r["author"], "created_at": r["created_at"]} for r in rows]
    })

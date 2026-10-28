from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from app.core.settings import settings
from app.core.database import get_db
from app.core.security import require_admin, hash_password
from app.services.registration import registration_state, update_registration_code, registration_code

router = APIRouter()


@router.get("/admin/settings/registration")
def get_registration_settings(reveal: bool = False, current_user: str = Depends(require_admin)):
    return JSONResponse(registration_state(reveal), headers={"Cache-Control": "no-store"})


@router.put("/admin/settings/registration")
def save_registration_settings(
    code: str = Form(...), revision: str = Form(...), current_user: str = Depends(require_admin),
):
    # Serialize admin edits across workers; revision prevents stale forms overwriting a newer code.
    with get_db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        result = update_registration_code(code, revision)
    return JSONResponse(result, headers={"Cache-Control": "no-store"})


@router.get("/admin/users")
def admin_users(current_user: str = Depends(require_admin)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, username, nickname, userdate, login_count FROM user ORDER BY userdate ASC, id ASC"
        ).fetchall()
    rows = sorted(rows, key=lambda row: row['username'] not in settings.ADMIN_USERS)
    return JSONResponse({
        "data": [{"id": r["id"], "username": r["username"], "nickname": r["nickname"], "display_name": r["nickname"] or r["username"], "userdate": r["userdate"], "login_count": r["login_count"], "is_admin": r["username"] in settings.ADMIN_USERS} for r in rows]
    })


@router.get('/admin/owners')
def owner_options(current_user: str = Depends(require_admin)):
    with get_db() as conn:
        rows = conn.execute('SELECT username,nickname FROM user ORDER BY userdate ASC,id ASC').fetchall()
    return {'data': [{'username': r['username'], 'display_name': r['nickname'] or r['username']} for r in rows if r['username'] in settings.ADMIN_USERS], 'current_username': current_user}


@router.post("/admin/users/delete")
def admin_user_delete(
    username: str = Form(...),
    current_user: str = Depends(require_admin),
):
    with get_db() as conn:
        if username in settings.ADMIN_USERS:
            raise HTTPException(status_code=400, detail="不能删除主人账号")
        conn.execute("DELETE FROM user WHERE username=?", (username,))
    return JSONResponse({"status": "success"})


@router.post('/admin/users/{user_id}/reset-password')
def reset_user_password(user_id: str, current_user: str = Depends(require_admin)):
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        user = conn.execute('SELECT username FROM user WHERE id=?', (user_id,)).fetchone()
        if not user:
            raise HTTPException(404, '用户不存在')
        code = registration_code()
        if not code or len(code.encode('utf-8')) > 72:
            raise HTTPException(400, '请先配置有效的分享码，再重置密码')
        conn.execute('UPDATE user SET userpwd=?,token_version=token_version+1 WHERE id=?', (hash_password(code), user_id))
    return JSONResponse({'status': 'success', 'self_reset': user['username'] == current_user}, headers={'Cache-Control': 'no-store'})

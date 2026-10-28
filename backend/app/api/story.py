from fastapi import APIRouter, Depends, Form, HTTPException
from app.core.database import get_db, bj_time
from app.core.security import require_admin

router = APIRouter()


@router.get("/story")
def get_story():
    with get_db() as conn:
        row = conn.execute("SELECT title,content,version,updated_at FROM love_story WHERE id='f7c108a7-0736-4d9e-82cd-2975cc5a2824'").fetchone()
    return {"data": dict(row)}


@router.put("/story")
def update_story(
    title: str = Form(...), content: str = Form(...), version: int = Form(...),
    current_user: str = Depends(require_admin),
):
    title = title.strip()
    content = content.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not title or len(title) > 80:
        raise HTTPException(status_code=400, detail="标题需为1至80字")
    if not content or len(content) > 5000:
        raise HTTPException(status_code=400, detail="故事正文需为1至5000字")
    with get_db() as conn:
        result = conn.execute(
            "UPDATE love_story SET title=?,content=?,version=version+1,updated_at=? WHERE id='f7c108a7-0736-4d9e-82cd-2975cc5a2824' AND version=?",
            (title, content, bj_time(), version),
        )
        if not result.rowcount:
            raise HTTPException(status_code=409, detail="故事已被另一位管理员更新。请先保留你的草稿，再读取最新内容。")
        row = conn.execute("SELECT title,content,version,updated_at FROM love_story WHERE id='f7c108a7-0736-4d9e-82cd-2975cc5a2824'").fetchone()
    return {"data": dict(row)}

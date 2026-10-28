from fastapi import APIRouter, Depends, Form, HTTPException
from typing import Optional
from fastapi.responses import JSONResponse
from app.core.database import get_db
from app.core.security import require_admin
from app.services.todos import list_todos, save_todo, set_status, delete_todo, save_reflection

router = APIRouter()


@router.get("/table_data")
def table_data():
    return JSONResponse({"data": list_todos(False)})


@router.post("/table_add")
def table_add(entry: str = Form(...), type: str = Form(...), user: str = Form(None), current_user: str = Depends(require_admin)):
    save_todo(entry, type, user or current_user)
    return {'data': list_todos(False)}


def legacy_id(entry):
    with get_db() as conn:
        row = conn.execute('SELECT id FROM things WHERE entry=?', (entry,)).fetchone()
    if not row:
        raise HTTPException(404, '待办不存在，请刷新列表')
    return row['id']


@router.post('/table_change')
def table_change(entry_old: str = Form(...), entry: str = Form(...), type: str = Form(...), user: str = Form(...), current_user: str = Depends(require_admin)):
    save_todo(entry, type, user, legacy_id(entry_old))
    return {'data': list_todos(False)}


@router.post('/table_delete')
def table_delete(entry: str = Form(...), current_user: str = Depends(require_admin)):
    delete_todo(legacy_id(entry))
    return {'status': 'success'}


@router.post('/table_done')
def table_done(entry: str = Form(...), current_user: str = Depends(require_admin)):
    awarded = set_status(legacy_id(entry), True, actor=current_user)
    return {'status': 'success', 'food_reward': {'food': 'kibble', 'amount': awarded}}


@router.get('/table_done_list')
def table_done_list():
    return {'data': list_todos(True)}


@router.get("/admin/todos")
def admin_todos(done: bool = False, current_user: str = Depends(require_admin)):
    return {"data": list_todos(done)}


@router.post('/admin/todos')
def admin_add_todo(entry: str = Form(...), type: str = Form(...), user: str = Form(...), current_user: str = Depends(require_admin)):
    return {'id': save_todo(entry, type, user)}


@router.put('/admin/todos/{todo_id}')
def admin_edit_todo(todo_id: str, entry: str = Form(...), type: str = Form(...), user: str = Form(...), current_user: str = Depends(require_admin)):
    save_todo(entry, type, user, todo_id)
    return {'status': 'success'}


@router.post('/admin/todos/{todo_id}/status')
def admin_set_todo_status(todo_id: str, done: bool = Form(...), reflection: Optional[str] = Form(None), replace_reflection: bool = Form(False), current_user: str = Depends(require_admin)):
    awarded = set_status(todo_id, done, (reflection or '') if replace_reflection else reflection, actor=current_user)
    return {'status': 'success', 'food_reward': {'food': 'kibble', 'amount': awarded}}


@router.put('/admin/todos/{todo_id}/reflection')
def admin_save_reflection(todo_id: str, reflection: str = Form(''), current_user: str = Depends(require_admin)):
    save_reflection(todo_id, reflection)
    return {'status': 'success'}


@router.delete('/admin/todos/{todo_id}')
def admin_delete_todo(todo_id: str, current_user: str = Depends(require_admin)):
    delete_todo(todo_id)
    return {'status': 'success'}

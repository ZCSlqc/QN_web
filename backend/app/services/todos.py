from app.core.uuid_ids import inserted_id
"""Shared todo operations used by both the homepage and administration UI."""
import sqlite3
from fastapi import HTTPException
from app.services.profiles import name_map
from app.services.pet_wallets import grant_activity_food
from app.core.database import get_db, bj_time
from app.core.settings import settings


def validate(entry, kind, user):
    values = (entry.strip(), kind.strip(), user.strip())
    if any(not value or len(value) > limit for value, limit in zip(values, (200, 50, 50))):
        raise HTTPException(400, '请填写名称（最多200字）、类型和贡献人（各最多50字）')
    return values


def list_todos(done):
    with get_db() as conn:
        names = name_map(conn)
        return [dict(row) | {'user_display': names.get(row['user'], row['user'])} for row in conn.execute('SELECT id,entry,types AS type,user,start_date,end_date,reflection FROM things WHERE done=? ORDER BY start_date DESC, rowid DESC', (int(done),))]


def save_todo(entry, kind, user, todo_id=None):
    values = validate(entry, kind, user)
    with get_db() as conn:
        previous = conn.execute('SELECT user FROM things WHERE id=?', (todo_id,)).fetchone() if todo_id else None
        if previous and values[2] == previous['user']:
            # Historical contributor text remains unchanged when editing other fields.
            pass
        else:
            candidates = conn.execute('SELECT username FROM user WHERE username=? OR nickname=?', (values[2], values[2])).fetchall()
            owners = [row['username'] for row in candidates if row['username'] in settings.ADMIN_USERS]
            if values[2] in owners:
                owners = [values[2]]
            if len(owners) != 1:
                raise HTTPException(400, '请从主人列表中选择贡献人')
            values = (values[0], values[1], owners[0])
        try:
            if todo_id is None:
                result = conn.execute('INSERT INTO things(entry,types,user,start_date,done) VALUES (?,?,?,?,0)', (*values, bj_time()))
                return inserted_id(conn, result, 'things')
            if not conn.execute('UPDATE things SET entry=?,types=?,user=? WHERE id=?', (*values, todo_id)).rowcount:
                raise HTTPException(404, '待办不存在，请刷新列表')
            return todo_id
        except sqlite3.IntegrityError:
            raise HTTPException(409, '已有同名待办，请换个名称')


def validate_reflection(value):
    if value is None:
        return None
    value = value.replace('\r\n', '\n').replace('\r', '\n').strip()
    if len(value) > 2000:
        raise HTTPException(400, '感想不能超过2000字')
    return value


def set_status(todo_id, done, reflection=None, actor=None):
    reflection = validate_reflection(reflection)
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        result = conn.execute('UPDATE things SET done=?,end_date=CASE WHEN ? THEN COALESCE(end_date,?) ELSE NULL END,reflection=COALESCE(?,reflection) WHERE id=?', (int(done), int(done), bj_time(), reflection if done else None, todo_id))
        if not result.rowcount:
            raise HTTPException(404, '待办不存在，请刷新列表')
        if done and actor:
            return grant_activity_food(conn, actor, 'todo', todo_id, bj_time())
        return 0


def save_reflection(todo_id, reflection):
    reflection = validate_reflection(reflection)
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute('SELECT done FROM things WHERE id=?', (todo_id,)).fetchone()
        if not row:
            raise HTTPException(404, '心愿不存在，请刷新列表')
        if not row['done']:
            raise HTTPException(409, '心愿已恢复为待办，完成后再记录感想')
        conn.execute('UPDATE things SET reflection=? WHERE id=? AND done=1', (reflection, todo_id))


def delete_todo(todo_id):
    with get_db() as conn:
        if not conn.execute('DELETE FROM things WHERE id=?', (todo_id,)).rowcount:
            raise HTTPException(404, '待办不存在，请刷新列表')

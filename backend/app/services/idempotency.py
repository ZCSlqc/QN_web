import hashlib
import re
from fastapi import HTTPException


def lookup(conn, operation, username, key, payload):
    if not key:
        return None, None
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,80}', key):
        raise HTTPException(400, '提交标识无效，请刷新页面重试')
    user_id = conn.execute('SELECT id FROM user WHERE username=?', (username,)).fetchone()[0]
    fingerprint = hashlib.sha256(payload).hexdigest()
    row = conn.execute('SELECT * FROM idempotent_operations WHERE operation=? AND user_id=? AND request_key=?', (operation, user_id, key)).fetchone()
    if row and row['fingerprint'] != fingerprint:
        raise HTTPException(409, '上一次提交已保存，请刷新列表确认后再编辑')
    return (row['result_id'] if row else None), (operation, user_id, key, fingerprint)


def remember(conn, marker, result_id):
    if marker:
        conn.execute('INSERT INTO idempotent_operations(operation,user_id,request_key,fingerprint,result_id) VALUES (?,?,?,?,?)', (*marker, result_id))

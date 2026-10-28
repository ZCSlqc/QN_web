"""Small SQLite-backed fixed-window limits shared by all worker processes."""
import hashlib
import time
from fastapi import HTTPException, Request
from app.core.database import get_db


def limit(bucket, maximum=20, window=60):
    def check(request: Request):
        now = int(time.time())
        host = request.client.host if request.client else 'unknown'
        key = hashlib.sha256(f'{bucket}:{host}'.encode()).hexdigest()
        denied = False
        with get_db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            conn.execute('DELETE FROM request_limits WHERE started_at<?', (now - 3600,))
            row = conn.execute('SELECT * FROM request_limits WHERE key=?', (key,)).fetchone()
            if not row or now - row['started_at'] >= window:
                conn.execute('INSERT OR REPLACE INTO request_limits(key,started_at,attempts) VALUES (?,?,1)', (key, now))
            elif row['attempts'] >= maximum:
                denied = True
            else:
                conn.execute('UPDATE request_limits SET attempts=attempts+1 WHERE key=?', (key,))
        if denied:
            raise HTTPException(429, '操作太频繁，请稍后再试', headers={'Retry-After': str(window)})
    return check

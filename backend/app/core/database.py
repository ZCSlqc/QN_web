"""Final-schema initialization; existing data is never converted at startup."""
import sqlite3
import datetime
from pathlib import Path
from contextlib import contextmanager
from app.core.settings import settings
from app.core.uuid_ids import PET_ID, STORY_ID
from app.services.story import DEFAULT_STORY_TITLE, DEFAULT_STORY_CONTENT

def bj_time() -> str:
    return (
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)
    ).strftime("%Y-%m-%d %H:%M:%S")


@contextmanager
def get_db():
    conn = sqlite3.connect(settings.DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    conn.execute('PRAGMA busy_timeout=15000')
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.executescript(Path(__file__).with_name('schema.sql').read_text(encoding='utf-8'))
        conn.execute('INSERT OR IGNORE INTO love_story(id,title,content,updated_at) VALUES (?,?,?,?)',
                     (STORY_ID, DEFAULT_STORY_TITLE, DEFAULT_STORY_CONTENT, bj_time()))
        conn.execute('INSERT OR IGNORE INTO pets(id,name,created_at) VALUES (?,?,?)', (PET_ID, '六一', bj_time()))

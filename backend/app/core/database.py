from app.core.uuid_ids import uuid_schema, migrate_uuid_ids, PET_ID, STORY_ID, SYSTEM_ID
import sqlite3
import datetime
from contextlib import contextmanager
from app.core.settings import settings
from app.services.album import initialize_album
from app.services.story import DEFAULT_STORY_TITLE, DEFAULT_STORY_CONTENT
from app.services.mailbox_schema import initialize_mailbox
from app.services.pet_schema import initialize_pet

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
        migrate_uuid_ids(conn)
        conn.execute('PRAGMA journal_mode=WAL')
        conn.executescript(uuid_schema("""
            CREATE TABLE IF NOT EXISTS idempotent_operations (
                operation TEXT NOT NULL, user_id INTEGER NOT NULL, request_key TEXT NOT NULL,
                fingerprint TEXT NOT NULL, result_id INTEGER NOT NULL,
                PRIMARY KEY(operation,user_id,request_key)
            );
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS request_limits (
                key TEXT PRIMARY KEY, started_at INTEGER NOT NULL, attempts INTEGER NOT NULL
            );
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
                adcodes        TEXT    NOT NULL,
                checkin_points TEXT    NOT NULL DEFAULT '',
                event          TEXT    NOT NULL DEFAULT '',
                name           TEXT    NOT NULL,
                departure_date TEXT,
                return_date    TEXT,
                notes          TEXT,
                created_at     TEXT    NOT NULL,
                updated_at     TEXT    NOT NULL
            );
            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                thumbnail TEXT NOT NULL,
                caption TEXT NOT NULL DEFAULT '',
                media_type TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                author TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS love_story (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL
            );
        """))
        conn.executescript(uuid_schema("""
            CREATE TABLE IF NOT EXISTS journey_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                adcodes TEXT NOT NULL,
                checkin_points TEXT NOT NULL DEFAULT '',
                expected_departure TEXT NOT NULL DEFAULT '',
                reason TEXT NOT NULL DEFAULT '',
                converted_journey_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))
        journey_columns = {row['name'] for row in conn.execute('PRAGMA table_info(journeys)')}
        if 'planning_reason' not in journey_columns:
            conn.execute("ALTER TABLE journeys ADD COLUMN planning_reason TEXT NOT NULL DEFAULT ''")
        conn.execute(
            "INSERT OR IGNORE INTO love_story(id,title,content,updated_at) VALUES ('f7c108a7-0736-4d9e-82cd-2975cc5a2824',?,?,?)",
            (DEFAULT_STORY_TITLE, DEFAULT_STORY_CONTENT, bj_time()),
        )
        todo_columns = {row['name'] for row in conn.execute('PRAGMA table_info(things)')}
        if 'reflection' not in todo_columns:
            conn.execute("ALTER TABLE things ADD COLUMN reflection TEXT NOT NULL DEFAULT ''")
        # 迁移：为旧表添加 login_count 列
        initialize_album(conn, settings.PHOTO_ASSETS_DIR, bj_time())
        photo_columns = {row['name'] for row in conn.execute('PRAGMA table_info(photos)')}
        if 'journey_id' not in photo_columns:
            conn.execute('ALTER TABLE photos ADD COLUMN journey_id TEXT')
        conn.execute('CREATE INDEX IF NOT EXISTS photos_journey ON photos(journey_id,removed,created_at)')
        initialize_mailbox(conn)
        initialize_pet(conn, bj_time())
        try:
            conn.execute("ALTER TABLE user ADD COLUMN login_count INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass  # 列已存在
        # 修复旧数据的 NULL 值
        conn.execute("UPDATE user SET login_count = 0 WHERE login_count IS NULL")
        columns = {r["name"] for r in conn.execute("PRAGMA table_info(user)")}
        if 'nickname' not in columns:
            conn.execute("ALTER TABLE user ADD COLUMN nickname TEXT NOT NULL DEFAULT ''")
            conn.executemany('UPDATE user SET nickname=? WHERE username=?', [('琪琪', '李琪淳'), ('妮妮', '郑丹妮')])
        blessing_columns = {row['name'] for row in conn.execute('PRAGMA table_info(blessings)')}
        if 'author_id' not in blessing_columns:
            conn.execute('ALTER TABLE blessings ADD COLUMN author_id TEXT')
            conn.execute('UPDATE blessings SET author_id=(SELECT id FROM user WHERE username=blessings.author)')
        if 'token_version' not in columns:
            conn.execute('ALTER TABLE user ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0')
        if "role" not in columns:
            conn.execute("ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'guest'")

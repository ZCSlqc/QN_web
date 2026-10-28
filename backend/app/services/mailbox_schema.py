from app.core.uuid_ids import uuid_schema, migrate_uuid_ids, PET_ID, STORY_ID, SYSTEM_ID
"""Private mailbox tables; no HTTP dependencies."""
def initialize_mailbox(conn):
    conn.executescript(uuid_schema('''
        CREATE TABLE IF NOT EXISTS mailbox_letters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            sender_name TEXT NOT NULL,
            recipient_name TEXT NOT NULL,
            kind TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL,
            recipient_read_at TEXT,
            request_key TEXT NOT NULL,
            UNIQUE(sender_id, request_key),
            CHECK(sender_id <> recipient_id)
        );
        CREATE TABLE IF NOT EXISTS mailbox_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            letter_id INTEGER NOT NULL REFERENCES mailbox_letters(id),
            author_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            request_key TEXT NOT NULL,
            UNIQUE(author_id, request_key)
        );
        CREATE TABLE IF NOT EXISTS mailbox_reads (
            letter_id INTEGER NOT NULL REFERENCES mailbox_letters(id),
            user_id INTEGER NOT NULL,
            last_comment_id INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(letter_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS mailbox_letter_pair ON mailbox_letters(sender_id, recipient_id, id);
        CREATE INDEX IF NOT EXISTS mailbox_comment_thread ON mailbox_comments(letter_id, id);
    '''))

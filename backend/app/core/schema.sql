-- Final SQLite schema. No legacy conversion is performed at startup.

CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    username TEXT    NOT NULL UNIQUE,
    userpwd  TEXT    NOT NULL,
    userdate TEXT    NOT NULL,
    login_count INTEGER NOT NULL DEFAULT 0,
    token_version INTEGER NOT NULL DEFAULT 0,
    nickname TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS things (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    entry      TEXT    NOT NULL UNIQUE,
    types      TEXT    NOT NULL,
    user       TEXT    NOT NULL,
    start_date TEXT    NOT NULL,
    end_date   TEXT,
    done       INTEGER NOT NULL DEFAULT 0,
    reflection TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS blessings (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    content    TEXT    NOT NULL,
    author     TEXT    NOT NULL,
    created_at TEXT    NOT NULL,
    author_id TEXT
);

CREATE TABLE IF NOT EXISTS journeys (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    name           TEXT    NOT NULL,
    departure_date TEXT,
    return_date    TEXT,
    notes          TEXT,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL,
    adcodes TEXT NOT NULL DEFAULT '[]',
    checkin_points TEXT NOT NULL DEFAULT '',
    event TEXT NOT NULL DEFAULT '',
    planning_reason TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    filename TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    media_type TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    author TEXT NOT NULL,
    created_at TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'upload',
    removed INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    journey_id TEXT,
    content_hash TEXT NOT NULL,
    original_name TEXT NOT NULL DEFAULT '',
    storage_dir TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS love_story (
    id TEXT PRIMARY KEY NOT NULL CHECK (id = 'f7c108a7-0736-4d9e-82cd-2975cc5a2824'),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mailbox_letters (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
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
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    letter_id TEXT NOT NULL REFERENCES mailbox_letters(id),
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    request_key TEXT NOT NULL,
    UNIQUE(author_id, request_key)
);

CREATE TABLE IF NOT EXISTS mailbox_reads (
    letter_id TEXT NOT NULL REFERENCES mailbox_letters(id),
    user_id TEXT NOT NULL,
    last_comment_id TEXT NOT NULL DEFAULT '0',
    PRIMARY KEY(letter_id, user_id)
);

CREATE TABLE IF NOT EXISTS journey_plans (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    name TEXT NOT NULL,
    adcodes TEXT NOT NULL,
    checkin_points TEXT NOT NULL DEFAULT '',
    expected_departure TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    converted_journey_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS request_limits (
    key TEXT PRIMARY KEY, started_at INTEGER NOT NULL, attempts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotent_operations (
    operation TEXT NOT NULL, user_id TEXT NOT NULL, request_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL, result_id TEXT NOT NULL,
    PRIMARY KEY(operation,user_id,request_key)
);

CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pet_ledger (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    pet_id TEXT NOT NULL REFERENCES pets(id), actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL, kind TEXT NOT NULL, food TEXT NOT NULL,
    quantity INTEGER NOT NULL, request_key TEXT NOT NULL, created_at TEXT NOT NULL,
    inventory_owner_id TEXT,
    UNIQUE(pet_id,actor_id,request_key)
);

CREATE TABLE IF NOT EXISTS pet_user_inventory (
    user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
    treats INTEGER NOT NULL DEFAULT 0 CHECK(treats>=0)
);

CREATE TABLE IF NOT EXISTS pet_blessing_rewards (
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    reward_day TEXT NOT NULL, blessing_id TEXT NOT NULL,
    PRIMARY KEY(user_id,reward_day), UNIQUE(blessing_id)
);

CREATE TABLE IF NOT EXISTS pet_member_inventory (
    user_id TEXT NOT NULL REFERENCES user(id), food TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount>=0), PRIMARY KEY(user_id,food)
);

CREATE TABLE IF NOT EXISTS pet_activity_rewards (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    source_kind TEXT NOT NULL, source_key TEXT NOT NULL, source_id TEXT NOT NULL,
    owner_id TEXT NOT NULL, food TEXT NOT NULL, amount INTEGER NOT NULL,
    created_at TEXT NOT NULL, UNIQUE(source_kind,source_key)
);

CREATE TABLE IF NOT EXISTS "pet_environment" (pet_id TEXT PRIMARY KEY, weather TEXT NOT NULL DEFAULT 'sunny' CHECK(weather IN ('sunny','cloudy','rainy'))
);

CREATE INDEX IF NOT EXISTS mailbox_comment_thread ON mailbox_comments(letter_id, id);

CREATE INDEX IF NOT EXISTS mailbox_letter_pair ON mailbox_letters(sender_id, recipient_id, id);

CREATE INDEX IF NOT EXISTS pet_ledger_pet ON pet_ledger(pet_id,id);

CREATE INDEX IF NOT EXISTS pet_reward_source_record ON pet_activity_rewards(source_kind,source_id);

CREATE INDEX IF NOT EXISTS photos_content_hash ON photos(content_hash,removed);

CREATE INDEX IF NOT EXISTS photos_journey ON photos(journey_id,removed,created_at);

CREATE UNIQUE INDEX IF NOT EXISTS photos_source_filename ON photos(source, filename);

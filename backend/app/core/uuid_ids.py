"""UUID identities and an atomic, reversible migration from integer identities."""
import re
import sqlite3
import uuid
from pathlib import Path
from datetime import datetime

PET_ID = '3673107b-6c7d-4c37-9b5b-47519076cd31'
STORY_ID = 'f7c108a7-0736-4d9e-82cd-2975cc5a2824'
SYSTEM_ID = '00000000-0000-0000-0000-000000000000'
# SQLite-native default also works from database tools and import scripts.
UUID_DEFAULT = "(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))))"
ENTITIES = {'user', 'things', 'blessings', 'journeys', 'photos', 'journey_plans',
            'mailbox_letters', 'mailbox_comments', 'pet_ledger', 'pet_activity_rewards', 'pets', 'love_story'}
LINKS = {
    'photos': {'journey_id': 'journeys'},
    'idempotent_operations': {'user_id': 'user'},
    'blessings': {'author_id': 'user'},
    'journey_plans': {'converted_journey_id': 'journeys'},
    'mailbox_letters': {'sender_id': 'user', 'recipient_id': 'user'},
    'mailbox_comments': {'letter_id': 'mailbox_letters', 'author_id': 'user'},
    'mailbox_reads': {'letter_id': 'mailbox_letters', 'user_id': 'user', 'last_comment_id': 'mailbox_comments'},
    'pet_inventory': {'pet_id': 'pets'},
    'pet_ledger': {'pet_id': 'pets', 'actor_id': 'user', 'inventory_owner_id': 'user'},
    'pet_user_inventory': {'user_id': 'user'},
    'pet_blessing_rewards': {'user_id': 'user', 'blessing_id': 'blessings'},
    'pet_member_inventory': {'user_id': 'user'},
    'pet_activity_rewards': {'owner_id': 'user'},
}
SOURCES = {'journey': 'journeys', 'photo': 'photos', 'todo': 'things', 'blessing': 'blessings'}


def uuid_schema(sql):
    sql = re.sub(r'id\s+INTEGER PRIMARY KEY CHECK\s*\(\s*id\s*=\s*1\s*\)', f"id TEXT PRIMARY KEY NOT NULL CHECK (id = '{STORY_ID}')", sql, flags=re.I)
    sql = re.sub(r'\bid\s+INTEGER PRIMARY KEY(?: AUTOINCREMENT)?', 'id TEXT PRIMARY KEY NOT NULL DEFAULT ' + UUID_DEFAULT, sql, flags=re.I)
    sql = re.sub(r'\b(user_id|author_id|actor_id|sender_id|recipient_id|letter_id|last_comment_id|converted_journey_id|inventory_owner_id|owner_id|source_id|result_id)\s+INTEGER', r'\1 TEXT', sql, flags=re.I)
    return sql


def inserted_id(conn, cursor, table):
    """Resolve SQLite's internal row number to the inserted public UUID."""
    if table not in ENTITIES:
        raise ValueError('Unknown entity table')
    return conn.execute(f'SELECT id FROM "{table}" WHERE rowid=?', (cursor.lastrowid,)).fetchone()[0]


def migrate_uuid_ids(conn, backup_dir=None):
    schemas = {r['name']: r['sql'] for r in conn.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
    legacy = 'user' in schemas and any(r['name'] == 'id' and r['type'] == 'INTEGER' for r in conn.execute('PRAGMA table_info(user)'))
    if not legacy:
        return None
    if conn.in_transaction:
        raise RuntimeError('UUID migration must start outside a transaction')
    db_path = conn.execute('PRAGMA database_list').fetchone()['file']
    backup_dir = Path(backup_dir) if backup_dir else Path(db_path).parent / 'backups'
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f'before-uuid-{datetime.now():%Y%m%d-%H%M%S-%f}.db'
    with sqlite3.connect(backup) as target:
        conn.backup(target)
    maps = {}
    def mapped(table, value):
        if value is None:
            return None
        key = str(value)
        if key in ('0', ''):
            return '0' if table == 'mailbox_comments' else SYSTEM_ID
        mapping = maps.setdefault(table, {})
        if key not in mapping:
            mapping[key] = PET_ID if table == 'pets' and key == 'liuyi' else STORY_ID if table == 'love_story' and key == '1' else str(uuid.uuid4())
        return mapping[key]
    conn.execute('PRAGMA foreign_keys=OFF')
    try:
        conn.execute('BEGIN EXCLUSIVE')
        # Capture under the write lock so no record can arrive between mapping and copying.
        rows = {table: [dict(r) for r in conn.execute(f'SELECT rowid AS __rowid__,* FROM "{table}" ORDER BY rowid')] for table in schemas}
        objects = [r['sql'] for r in conn.execute("SELECT sql FROM sqlite_master WHERE type IN ('index','trigger') AND sql IS NOT NULL")]
        for table in ENTITIES & schemas.keys():
            for row in rows[table]:
                mapped(table, row['id'])
        for table, records in rows.items():
            for row in records:
                if table == 'pet_activity_rewards':
                    kind, old_source, old_owner = row['source_kind'], row['source_id'], row['owner_id']
                    if kind in SOURCES:
                        row['source_id'] = mapped(SOURCES[kind], old_source)
                        if row['source_key'] == str(old_source):
                            row['source_key'] = row['source_id']
                    elif kind in ('legacy_shared', 'legacy_personal'):
                        row['source_id'] = SYSTEM_ID
                        row['source_key'] = mapped('user', old_owner) + (':' + row['food'] if kind == 'legacy_shared' else '')
                    else:
                        raise RuntimeError(f'Unknown reward source: {kind}')
                if table == 'idempotent_operations':
                    if row['operation'] not in SOURCES:
                        raise RuntimeError(f"Unknown operation: {row['operation']}")
                    row['result_id'] = mapped(SOURCES[row['operation']], row['result_id'])
                if table in ENTITIES:
                    row['id'] = mapped(table, row['id'])
                for column, target in LINKS.get(table, {}).items():
                    if column in row:
                        row[column] = mapped(target, row[column])
        # Rebuild every table in one transaction; preserve rowid as an internal tie-breaker.
        for table in schemas:
            conn.execute(f'DROP TABLE "{table}"')
        for table, sql in schemas.items():
            conn.execute(uuid_schema(sql))
            for row in rows[table]:
                keys = list(row)
                columns = ','.join('rowid' if k == '__rowid__' else f'"{k}"' for k in keys)
                conn.execute(f'INSERT INTO "{table}" ({columns}) VALUES ({",".join("?" for _ in keys)})', [row[k] for k in keys])
        for sql in objects:
            conn.execute(sql)
        conn.execute('CREATE TABLE uuid_id_map(entity TEXT NOT NULL, old_id TEXT NOT NULL, new_id TEXT NOT NULL, PRIMARY KEY(entity,old_id))')
        conn.executemany('INSERT INTO uuid_id_map VALUES (?,?,?)', [(t, old, new) for t, mapping in maps.items() for old, new in mapping.items()])
        for table, before in rows.items():
            if conn.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0] != len(before):
                raise RuntimeError(f'Row count changed: {table}')
            actual = [dict(r) for r in conn.execute(f'SELECT rowid AS __rowid__,* FROM "{table}" ORDER BY rowid')]
            if actual != before:
                raise RuntimeError(f'Field preservation check failed: {table}')
        if conn.execute('PRAGMA foreign_key_check').fetchall():
            raise RuntimeError('Foreign key validation failed')
        if conn.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise RuntimeError('Integrity check failed')
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.execute('PRAGMA foreign_keys=ON')
    return str(backup)

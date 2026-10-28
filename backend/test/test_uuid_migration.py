import sqlite3
import uuid
import pytest
from app.core.uuid_ids import migrate_uuid_ids, uuid_schema, inserted_id


def legacy_database(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript('''
      CREATE TABLE user(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE,userdate TEXT,userpwd TEXT);
      CREATE TABLE blessings(id INTEGER PRIMARY KEY AUTOINCREMENT,author_id INTEGER,content TEXT,created_at TEXT);
      CREATE TABLE mailbox_letters(id INTEGER PRIMARY KEY AUTOINCREMENT,sender_id INTEGER,recipient_id INTEGER,body TEXT);
      CREATE TABLE mailbox_comments(id INTEGER PRIMARY KEY AUTOINCREMENT,letter_id INTEGER REFERENCES mailbox_letters(id),author_id INTEGER,content TEXT);
      CREATE TABLE mailbox_reads(letter_id INTEGER REFERENCES mailbox_letters(id),user_id INTEGER,last_comment_id INTEGER,PRIMARY KEY(letter_id,user_id));
      CREATE TABLE pet_user_inventory(user_id INTEGER PRIMARY KEY REFERENCES user(id),treats INTEGER);
      CREATE TABLE pet_blessing_rewards(user_id INTEGER REFERENCES user(id),reward_day TEXT,blessing_id INTEGER,PRIMARY KEY(user_id,reward_day));
      CREATE TABLE idempotent_operations(operation TEXT,user_id INTEGER,request_key TEXT,fingerprint TEXT,result_id INTEGER,PRIMARY KEY(operation,user_id,request_key));
      INSERT INTO user VALUES(1,'a','2021-01-01','keep-password'),(2,'b','2022-01-01','keep-password-too');
      INSERT INTO blessings VALUES(3,1,'hello','2026-10-28');
      INSERT INTO mailbox_letters VALUES(4,1,2,'letter text');
      INSERT INTO mailbox_comments VALUES(8,4,2,'first'),(9,4,1,'second');
      INSERT INTO mailbox_reads VALUES(4,1,8),(4,2,0);
      INSERT INTO pet_user_inventory VALUES(1,7);
      INSERT INTO pet_blessing_rewards VALUES(1,'2026-10-28',3);
      INSERT INTO idempotent_operations VALUES('blessing',1,'request-key','unchanged-fingerprint',3);
    ''')
    return conn


def test_migration_preserves_associations_content_order_balances_and_backup(tmp_path):
    conn = legacy_database(tmp_path/'old.db')
    backup = migrate_uuid_ids(conn, tmp_path/'backups')
    mapping = {(r['entity'], r['old_id']): r['new_id'] for r in conn.execute('SELECT * FROM uuid_id_map')}
    assert all(uuid.UUID(value).version == 4 for value in mapping.values())
    user = mapping['user','1']; blessing = mapping['blessings','3']
    assert conn.execute('SELECT userpwd FROM user WHERE id=?',(user,)).fetchone()[0] == 'keep-password'
    assert conn.execute('SELECT author_id FROM blessings WHERE id=?',(blessing,)).fetchone()[0] == user
    assert conn.execute('SELECT treats FROM pet_user_inventory WHERE user_id=?',(user,)).fetchone()[0] == 7
    assert conn.execute('SELECT blessing_id FROM pet_blessing_rewards').fetchone()[0] == blessing
    assert conn.execute('SELECT result_id FROM idempotent_operations').fetchone()[0] == blessing
    assert conn.execute('SELECT last_comment_id FROM mailbox_reads WHERE user_id=?',(user,)).fetchone()[0] == mapping['mailbox_comments','8']
    assert [r[0] for r in conn.execute('SELECT content FROM mailbox_comments ORDER BY rowid')] == ['first','second']
    assert migrate_uuid_ids(conn, tmp_path/'backups') is None
    cursor = conn.execute("INSERT INTO user(username,userdate,userpwd) VALUES ('new','2026-01-01','new-password')")
    assert uuid.UUID(inserted_id(conn, cursor, 'user')).version == 4
    with sqlite3.connect(backup) as old:
        assert old.execute('SELECT id FROM user ORDER BY id').fetchall() == [(1,), (2,)]
    conn.close()


def test_migration_rolls_back_on_invalid_relation(tmp_path):
    conn = legacy_database(tmp_path/'broken.db')
    conn.execute('INSERT INTO mailbox_comments VALUES(10,999,1,\'broken\')'); conn.commit()
    with pytest.raises(RuntimeError, match='Foreign key'):
        migrate_uuid_ids(conn, tmp_path/'backups')
    assert conn.execute('SELECT id FROM user ORDER BY id').fetchall()[0][0] == 1
    assert conn.execute('SELECT count(*) FROM mailbox_comments').fetchone()[0] == 3
    conn.close()


def test_user_sort_is_role_then_registration_date(api, monkeypatch):
    from .helpers import owner_headers
    client, module = api
    headers = owner_headers(client)
    with module.get_db() as conn:
        conn.execute("INSERT INTO user(username,userpwd,userdate) VALUES ('early-guest','x','2000-01-01'),('late-admin','x','2030-01-01'),('late-guest','x','2040-01-01')")
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset(['李琪淳','late-admin']))
    users = client.get('/admin/users', headers=headers).json()['data']
    assert [u['username'] for u in users] == ['李琪淳','late-admin','early-guest','late-guest']
    assert all(uuid.UUID(u['id']).version == 4 for u in users)

from app.core.uuid_ids import uuid_schema, migrate_uuid_ids, PET_ID, STORY_ID, SYSTEM_ID
"""Pet bootstrap is idempotent; initial food is granted only once."""


def initialize_pet(conn, now):
    conn.execute("CREATE TABLE IF NOT EXISTS pet_environment (pet_id TEXT PRIMARY KEY, weather TEXT NOT NULL DEFAULT 'sunny' CHECK(weather IN ('sunny','cloudy','rainy')))")
    environment_sql = conn.execute("SELECT sql FROM sqlite_master WHERE name='pet_environment'").fetchone()[0]
    if "'cloudy'" not in environment_sql:
        conn.execute("CREATE TABLE pet_environment_updated (pet_id TEXT PRIMARY KEY, weather TEXT NOT NULL DEFAULT 'sunny' CHECK(weather IN ('sunny','cloudy','rainy')))")
        conn.execute('INSERT INTO pet_environment_updated SELECT pet_id,weather FROM pet_environment')
        conn.execute('DROP TABLE pet_environment')
        conn.execute('ALTER TABLE pet_environment_updated RENAME TO pet_environment')
    conn.executescript(uuid_schema('''
        CREATE TABLE IF NOT EXISTS pets (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pet_inventory (
            pet_id TEXT NOT NULL REFERENCES pets(id), food TEXT NOT NULL,
            amount INTEGER NOT NULL CHECK(amount>=0), PRIMARY KEY(pet_id,food)
        );
        CREATE TABLE IF NOT EXISTS pet_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id TEXT NOT NULL REFERENCES pets(id), actor_id INTEGER NOT NULL,
            actor_name TEXT NOT NULL, kind TEXT NOT NULL, food TEXT NOT NULL,
            quantity INTEGER NOT NULL, request_key TEXT NOT NULL, created_at TEXT NOT NULL,
            UNIQUE(pet_id,actor_id,request_key)
        );
        CREATE INDEX IF NOT EXISTS pet_ledger_pet ON pet_ledger(pet_id,id);
        CREATE TABLE IF NOT EXISTS pet_user_inventory (
            user_id INTEGER PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
            treats INTEGER NOT NULL DEFAULT 0 CHECK(treats>=0)
        );
        CREATE TABLE IF NOT EXISTS pet_blessing_rewards (
            user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
            reward_day TEXT NOT NULL, blessing_id INTEGER NOT NULL,
            PRIMARY KEY(user_id,reward_day), UNIQUE(blessing_id)
        );
        CREATE TABLE IF NOT EXISTS pet_member_inventory (
            user_id INTEGER NOT NULL REFERENCES user(id), food TEXT NOT NULL,
            amount INTEGER NOT NULL CHECK(amount>=0), PRIMARY KEY(user_id,food)
        );
        CREATE TABLE IF NOT EXISTS pet_activity_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_kind TEXT NOT NULL, source_key TEXT NOT NULL, source_id INTEGER NOT NULL,
            owner_id INTEGER NOT NULL, food TEXT NOT NULL, amount INTEGER NOT NULL,
            created_at TEXT NOT NULL, UNIQUE(source_kind,source_key)
        );
        CREATE INDEX IF NOT EXISTS pet_reward_source_record ON pet_activity_rewards(source_kind,source_id);
        CREATE TABLE IF NOT EXISTS pet_wallet_versions (version TEXT PRIMARY KEY);
    '''))
    # Both inventory and welcome ledger are part of the same bootstrap transaction.
    inserted = conn.execute("INSERT OR IGNORE INTO pets(id,name,created_at) VALUES ('3673107b-6c7d-4c37-9b5b-47519076cd31','六一',?)", (now,))
    if inserted.rowcount:
        for food, count in [('treat', 0), ('kibble', 0), ('can', 0)]:
            conn.execute("INSERT INTO pet_inventory(pet_id,food,amount) VALUES ('3673107b-6c7d-4c37-9b5b-47519076cd31',?,?)", (food, count))
            conn.execute("INSERT INTO pet_ledger(pet_id,actor_id,actor_name,kind,food,quantity,request_key,created_at) VALUES ('3673107b-6c7d-4c37-9b5b-47519076cd31','00000000-0000-0000-0000-000000000000','入住小礼包','welcome',?,?,?,?)", (food, count, f'welcome:{food}', now))
    columns = {row['name'] for row in conn.execute('PRAGMA table_info(pet_ledger)')}
    if 'inventory_owner_id' not in columns:
        conn.execute('ALTER TABLE pet_ledger ADD COLUMN inventory_owner_id TEXT')
    if not conn.execute("SELECT 1 FROM pet_wallet_versions WHERE version='activity-baseline-v1'").fetchone():
        for kind, table, condition, food in [('photo', 'photos', "source='upload'", 'treat'), ('todo', 'things', 'done=1', 'kibble'), ('journey', 'journeys', '1=1', 'can')]:
            for row in conn.execute(f'SELECT id FROM {table} WHERE {condition}').fetchall():
                conn.execute('INSERT OR IGNORE INTO pet_activity_rewards(source_kind,source_key,source_id,owner_id,food,amount,created_at) VALUES (?,?,?,?,?,0,?)', (kind, str(row['id']), row['id'], SYSTEM_ID, food, now))
        conn.execute("INSERT INTO pet_wallet_versions(version) VALUES ('activity-baseline-v1')")

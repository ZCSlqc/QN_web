"""UUID constants and insertion helpers for the final schema."""
PET_ID = '3673107b-6c7d-4c37-9b5b-47519076cd31'
STORY_ID = 'f7c108a7-0736-4d9e-82cd-2975cc5a2824'
SYSTEM_ID = '00000000-0000-0000-0000-000000000000'
# SQLite-native default also works from database tools and import scripts.
UUID_DEFAULT = "(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', (random() & 3)+1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))))"
ENTITIES = {'user', 'things', 'blessings', 'journeys', 'photos', 'journey_plans',
            'mailbox_letters', 'mailbox_comments', 'pet_ledger', 'pet_activity_rewards', 'pets', 'love_story'}
def inserted_id(conn, cursor, table):
    """Resolve SQLite's internal row number to the inserted public UUID."""
    if table not in ENTITIES:
        raise ValueError('Unknown entity table')
    return conn.execute(f'SELECT id FROM "{table}" WHERE rowid=?', (cursor.lastrowid,)).fetchone()[0]

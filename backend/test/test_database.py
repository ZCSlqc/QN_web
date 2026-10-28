import sqlite3
import uuid
from pathlib import Path
from .helpers import owner_headers, photo_bytes, journey_data


def test_final_schema_initialization_is_repeatable_and_preserves_data(api):
    client, module = api
    headers = owner_headers(client)
    photo = client.post('/photos', files={'file': ('原始照片.png', photo_bytes(), 'image/png')}, headers=headers).json()['data']
    trip = client.post('/journeys', data=journey_data(), headers=headers).json()['id']
    with module.get_db() as conn:
        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        assert not {'uuid_id_map', 'pet_inventory', 'pet_wallet_versions'} & set(tables)
        before = {table: [tuple(r) for r in conn.execute(f'SELECT * FROM "{table}" ORDER BY rowid')] for table in tables}
    module.init_db(); module.init_db()
    with module.get_db() as conn:
        after = {table: [tuple(r) for r in conn.execute(f'SELECT * FROM "{table}" ORDER BY rowid')] for table in tables}
        assert before == after
        assert not conn.execute('PRAGMA foreign_key_check').fetchall()
        assert conn.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        row = conn.execute('SELECT * FROM photos WHERE id=?', (photo['id'],)).fetchone()
        assert row['original_name'] == '原始照片.png'
        assert row['storage_dir'] == f"albums/{photo['id']}"
    assert uuid.UUID(photo['id']).version == uuid.UUID(trip).version == 4
    assert client.get(photo['url'].removeprefix('/api')).status_code == 200


def test_schema_is_direct_uuid_sql_and_empty_database_starts_without_legacy_tables(tmp_path):
    schema = Path(__file__).resolve().parents[1]/'app/core/schema.sql'
    sql = schema.read_text(encoding='utf-8')
    assert 'AUTOINCREMENT' not in sql and 'ALTER TABLE' not in sql
    with sqlite3.connect(tmp_path/'blank.db') as conn:
        conn.executescript(sql)
        conn.execute("INSERT INTO user(username,userpwd,userdate) VALUES ('test','$2-test','2026-01-01')")
        value = conn.execute('SELECT id FROM user').fetchone()[0]
        assert uuid.UUID(value).version == 4
        assert conn.execute('SELECT count(*) FROM photos').fetchone()[0] == 0


def test_user_sort_is_role_then_registration_date(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    with module.get_db() as conn:
        conn.execute("INSERT INTO user(username,userpwd,userdate) VALUES ('early-guest','x','2000-01-01'),('late-owner','x','2030-01-01'),('late-guest','x','2040-01-01')")
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset(['李琪淳','late-owner']))
    users = client.get('/admin/users', headers=headers).json()['data']
    assert [u['username'] for u in users] == ['李琪淳','late-owner','early-guest','late-guest']


def test_historical_reward_markers_survive_initialization(api):
    client, module = api
    headers = owner_headers(client)
    trip = client.post('/journeys', data=journey_data(), headers=headers).json()['id']
    with module.get_db() as conn:
        before = [tuple(r) for r in conn.execute('SELECT * FROM pet_activity_rewards ORDER BY rowid')]
    module.init_db()
    response = client.put(f'/journeys/{trip}', data=journey_data(), headers=headers)
    assert response.json()['food_reward']['amount'] == 0
    with module.get_db() as conn:
        assert before == [tuple(r) for r in conn.execute('SELECT * FROM pet_activity_rewards ORDER BY rowid')]


def test_bulk_import_refuses_to_orphan_journey_photos(api, tmp_path):
    import pytest
    from scripts.import_journeys import replace_records
    client, module = api
    headers = owner_headers(client)
    trip = client.post('/journeys', data=journey_data(), headers=headers).json()['id']
    photo = client.post(f'/journeys/{trip}/photos', files={'file': ('trip.png', photo_bytes(), 'image/png')}, headers=headers).json()['data']
    with pytest.raises(ValueError, match='journey photos'):
        replace_records(module.settings.DB_PATH, [], tmp_path/'backup')
    assert client.get('/journeys', headers=headers).json()['data'][0]['id'] == trip
    assert client.get(photo['url'].removeprefix('/api'), headers=headers).status_code == 200

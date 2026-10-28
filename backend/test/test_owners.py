from .helpers import owner_headers


def test_owner_identity_controls_mailbox_and_pet(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    with module.get_db() as conn:
        conn.execute("INSERT INTO user(username,userpwd,userdate) VALUES ('owner-two','x','2026-01-01')")
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset(['李琪淳', 'owner-two']))
    assert client.get('/me', headers=headers).json()['has_mailbox'] is True
    assert client.get('/mailbox/summary', headers=headers).status_code == 200
    assert client.get('/pet', headers=headers).json()['can_feed'] is True
    assert [row['username'] for row in client.get('/admin/owners', headers=headers).json()['data']] == ['李琪淳', 'owner-two']


def test_contributor_requires_owner_and_keeps_legacy_records(api):
    client, module = api
    headers = owner_headers(client)
    payload = {'entry': 'new wish', 'type': '日常', 'user': 'visitor'}
    assert client.post('/admin/todos', data=payload, headers=headers).status_code == 400
    payload['user'] = '琪琪'
    assert client.post('/admin/todos', data=payload, headers=headers).status_code == 200
    assert client.get('/table_data').json()['data'][0]['user'] == '李琪淳'
    with module.get_db() as conn:
        conn.execute("INSERT INTO things(entry,types,user,start_date) VALUES ('legacy','日常','旧贡献人','2020-01-01')")
        old_id = conn.execute("SELECT id FROM things WHERE entry='legacy'").fetchone()[0]
    assert client.put(f'/admin/todos/{old_id}', data={'entry': 'legacy updated', 'type': '电影', 'user': '旧贡献人'}, headers=headers).status_code == 200
    assert client.get('/admin/owners').status_code == 401

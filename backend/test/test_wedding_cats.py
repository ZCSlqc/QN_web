def login(client):
    from app.core.security import create_token
    return {'Authorization': 'Bearer ' + create_token('李琪淳')}


def test_seed_is_idempotent_and_updates_persist(api):
    client, module = api
    headers = login(client)
    cats = client.get('/wedding/cats', headers=headers).json()['cats']
    assert [(c['name'], c['personality']) for c in cats] == [
        ('六一', 'clingy'), ('安安', 'lazy'), ('瓜瓜', 'shy'), ('花花', 'playful'), ('黑黑', 'alert')]
    assert all(sum(c[key] for key in ('rest_weight', 'explore_weight', 'social_weight', 'approach_weight')) == 100 for c in cats)
    change = {'rest_weight': 10, 'explore_weight': 45, 'speed': 90}
    result = client.patch('/wedding/cats/huahua', headers=headers, json=change)
    assert result.status_code == 200
    module.init_db()
    updated = client.get('/wedding/cats', headers=headers).json()['cats']
    assert len(updated) == 5
    assert next(c for c in updated if c['id'] == 'huahua')['speed'] == 90
    with module.get_db() as conn:
        assert conn.execute('SELECT COUNT(*) FROM pets').fetchone()[0] == 1


def test_npc_permissions_and_invalid_updates_do_not_write(api, monkeypatch):
    client, module = api
    headers = login(client)
    assert client.get('/wedding/cats').status_code == 401
    registered = client.post('/register_process', data={
        'username': '婚礼来宾', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()
    guest = {'Authorization': 'Bearer ' + registered['token']}
    assert client.get('/wedding/cats', headers=guest).status_code == 403
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset({'/index', '/wedding'}))
    result = client.get('/wedding/cats', headers=guest)
    assert result.status_code == 200 and result.headers['cache-control'] == 'no-store'
    assert client.patch('/wedding/cats/anan', json={'speed': 50}).status_code == 401
    assert client.patch('/wedding/cats/anan', headers=guest, json={'speed': 50}).status_code == 403
    before = client.get('/wedding/cats', headers=headers).json()
    for body in ({'rest_weight': 20}, {'speed': 500}, {'speed': None}, {'rest_min': 25, 'rest_max': 2},
                 {'personality': 'angry'}, {'name': '改名'}, {'speed': True}, {}):
        assert client.patch('/wedding/cats/anan', headers=headers, json=body).status_code == 422
    assert client.patch('/wedding/cats/unknown', headers=headers, json={'speed': 50}).status_code == 404
    assert client.get('/wedding/cats', headers=headers).json() == before

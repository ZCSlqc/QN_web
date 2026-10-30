import uuid
from concurrent.futures import ThreadPoolExecutor


def guest(client, module, name='guest'):
    token = client.post('/register_process', data={'username': name, 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    return {'Authorization': f'Bearer {token}'}


def test_daily_reward_retry_timezone_and_individual_balances(api, monkeypatch):
    client, module = api
    import app.api.blessings as blessings
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/pet']))
    headers = guest(client, module)
    other = guest(client, module, 'other')
    monkeypatch.setattr(blessings, 'bj_time', lambda: '2026-10-28 23:59:59')
    data = {'content': '愿你们每天开心', 'request_key': uuid.uuid4().hex}
    assert client.post('/blessings', data=data, headers=headers).json()['treat_reward'] == 1
    assert client.post('/blessings', data=data, headers=headers).json()['replayed'] is True
    with module.get_db() as conn:
        assert conn.execute('SELECT COUNT(*) FROM blessings').fetchone()[0] == 1
    assert client.post('/blessings', data={'content': '再留一句祝福'}, headers=headers).json()['treat_reward'] == 0
    assert client.get('/pet', headers=headers).json()['personal_treats'] == 1
    assert client.get('/pet', headers=other).json()['personal_treats'] == 0
    monkeypatch.setattr(blessings, 'bj_time', lambda: '2026-10-29 00:00:00')
    assert client.post('/blessings', data=data, headers=headers).json()['replayed'] is True
    assert client.get('/pet', headers=headers).json()['personal_treats'] == 1
    assert client.post('/blessings', data={'content': '新的一天'}, headers=headers).json()['treat_reward'] == 1
    module.init_db()
    assert client.get('/pet', headers=headers).json()['personal_treats'] == 2
    assert client.post('/blessings', data={'content': '   '}, headers=other).status_code == 400
    assert client.post('/blessings', data={'content': '匿名祝福'}).json()['treat_reward'] == 0
    assert client.get('/pet', headers=other).json()['personal_treats'] == 0


def test_concurrent_awards_and_reward_feeding_never_double_spend(api, monkeypatch):
    client, module = api
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/pet']))
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/pet']))
    headers = guest(client, module)
    def comment(i):
        return client.post('/blessings', data={'content': f'祝福{i}'}, headers=headers).json()['treat_reward']
    with ThreadPoolExecutor(max_workers=3) as pool:
        assert sum(pool.map(comment, range(3))) == 1
    before = client.get('/pet', headers=headers).json()['inventory']
    def feed(i):
        return client.post('/pet/reward-feed', data={'request_key': str(i)*32}, headers=headers)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(feed, [1, 2]))
    assert sorted(r.status_code for r in results) == [200, 409]
    winner = 1 if results[0].status_code == 200 else 2
    assert feed(winner).json()['replayed'] is True
    state = client.get('/pet', headers=headers).json()
    assert state['personal_treats'] == 0 and state['feed_count'] == 1
    assert state['inventory'] == before
    assert client.post('/pet/feed', data={'food': 'can', 'request_key': uuid.uuid4().hex}, headers=headers).status_code == 403
    assert client.post('/pet/reward-feed', data={'request_key': uuid.uuid4().hex}).status_code == 401

from .helpers import owner_headers


def test_default_faces_persist_once_respect_custom_faces_and_exclude_groom(api, monkeypatch):
    client, module = api
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/wedding']))
    owner = owner_headers(client)
    for username in ['new-guest-a', 'new-guest-b']:
        client.post('/register_process', data={'username': username, 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE})
    saved = {'face': 'custom', 'eyes': 'face-eyes-eyeblue-small', 'hair': 'none'}
    client.put('/wedding/wardrobe', headers=owner, json={'appearance': saved})
    first = client.get('/wedding/people', headers=owner)
    data = first.json()
    groom = next(p for p in data['people'] if p['role'] == 'groom')
    assert groom['facePreset'] is None and groom['appearance'] == saved
    assert set(data['npcFaces']) == {'florist', 'juggler'}
    presets = [*data['npcFaces'].values(), *(p['facePreset'] for p in data['people'] if p['role'] != 'groom')]
    assert len(set(presets)) == 4
    with module.get_db() as conn:
        before = [tuple(row) for row in conn.execute('SELECT * FROM wedding_face_defaults ORDER BY actor_key')]
        assert conn.execute('SELECT count(*) FROM wedding_face_defaults WHERE user_id=(SELECT id FROM user WHERE username=?)', (groom['username'],)).fetchone()[0] == 0
    assert client.get('/wedding/people', headers=owner).json() == data
    assert client.get('/wedding/people', headers={**owner, 'If-None-Match': first.headers['etag']}).status_code == 304
    with module.get_db() as conn:
        assert before == [tuple(row) for row in conn.execute('SELECT * FROM wedding_face_defaults ORDER BY actor_key')]
    client.post('/register_process', data={'username': 'late-guest', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE})
    after = client.get('/wedding/people', headers=owner).json()
    assert next(p for p in after['people'] if p['username'] == 'late-guest')['facePreset']
    assert all(next(p for p in after['people'] if p['username'] == old['username']) == old for old in data['people'])


def test_people_are_real_accounts_and_only_share_public_appearance(api, monkeypatch):
    client, module = api
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/wedding']))
    users = {}
    for username in ['shenqidayang', 'lqc']:
        token = client.post('/register_process', data={'username': username, 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
        users[username] = {'Authorization': f'Bearer {token}'}
    assert client.get('/wedding/people').status_code == 401
    appearance = {'hair': 'none', 'headwear': 'crown', 'shirt': 'shirts-white-whiteshirt5'}
    client.put('/wedding/wardrobe', headers=users['shenqidayang'], json={'appearance': appearance})
    client.post('/wedding/wardrobe/outfits', headers=users['shenqidayang'], json={'name': '私人收藏', 'appearance': appearance})
    result = client.get('/wedding/people', headers=users['lqc'])
    assert result.status_code == 200
    people = {p['username']: p for p in result.json()['people']}
    assert set(people) == {'李琪淳', 'shenqidayang', 'lqc'}
    assert people['shenqidayang']['persona'] == 'calm-girl'
    assert people['shenqidayang']['name'] == 'shenqidayang'
    assert people['lqc']['persona'] == 'lively-boy'
    assert people['shenqidayang']['appearance'] == appearance
    assert people['李琪淳']['role'] == 'groom'
    assert '私人收藏' not in result.text
    assert 'userpwd' not in result.text and 'token' not in result.text
    assert client.get('/wedding/people', headers={**users['lqc'], 'If-None-Match': result.headers['etag']}).status_code == 304
    client.put('/wedding/wardrobe', headers=users['shenqidayang'], json={'appearance': {'hair': 'none'}})
    assert client.get('/wedding/people', headers={**users['lqc'], 'If-None-Match': result.headers['etag']}).status_code == 200
    client.put('/account/nickname', headers=users['shenqidayang'], data={'nickname': '数据库昵称'})
    changed = client.get('/wedding/people', headers=users['lqc']).json()['people']
    assert next(p for p in changed if p['username'] == 'shenqidayang')['name'] == '数据库昵称'

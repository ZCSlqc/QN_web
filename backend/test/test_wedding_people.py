from .helpers import owner_headers


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

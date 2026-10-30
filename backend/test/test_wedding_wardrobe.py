from .helpers import owner_headers


def test_wardrobe_persists_per_account_and_uses_conditional_reads(api, monkeypatch):
    client, module = api
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/wedding']))
    owner = owner_headers(client)
    token = client.post('/register_process', data={'username': 'lqc', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    guest = {'Authorization': f'Bearer {token}'}
    assert client.get('/wedding/wardrobe').status_code == 401
    empty = client.get('/wedding/wardrobe', headers=guest)
    assert empty.json() == {'appearance': None, 'outfits': [], 'revision': 0}
    assert client.get('/wedding/wardrobe', headers={**guest, 'If-None-Match': empty.headers['etag']}).status_code == 304
    appearance = {'hair': 'none', 'headwear': 'none', 'shirt': 'shirts-white-whiteshirt5', 'coatStyle': None}
    saved = client.put('/wedding/wardrobe', headers=guest, json={'appearance': appearance})
    assert saved.status_code == 200
    assert saved.json()['appearance'] == appearance
    assert client.get('/wedding/wardrobe', headers=owner).json()['appearance'] is None
    assert client.get('/wedding/wardrobe', headers=guest).json()['appearance'] == appearance
    assert client.get('/wedding/wardrobe', headers={**guest, 'If-None-Match': empty.headers['etag']}).status_code == 200
    assert client.get('/wedding/wardrobe', headers={**guest, 'If-None-Match': saved.headers['etag']}).status_code == 304
    with module.get_db() as conn:
        assert conn.execute('SELECT count(*) FROM wedding_wardrobes').fetchone()[0] == 1


def test_saved_outfits_are_owned_bounded_and_do_not_replace_current_appearance(api, monkeypatch):
    client, module = api
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/wedding']))
    owner = owner_headers(client)
    token = client.post('/register_process', data={'username': 'shenqidayang', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    guest = {'Authorization': f'Bearer {token}'}
    result = client.post('/wedding/wardrobe/outfits', headers=owner, json={'name': '我的白衬衫', 'appearance': {'shirt': 'shirts-white-whiteshirt5'}})
    assert result.status_code == 200
    outfit = result.json()['outfits'][0]
    assert result.json()['appearance'] is None
    assert client.get('/wedding/wardrobe', headers=guest).json()['outfits'] == []
    assert client.delete(f'/wedding/wardrobe/outfits/{outfit["id"]}', headers=guest).status_code == 404
    assert client.delete(f'/wedding/wardrobe/outfits/{outfit["id"]}', headers=owner).json()['outfits'] == []
    assert client.put('/wedding/wardrobe', headers=owner, json={'appearance': {'image': '<svg/>'}}).status_code == 422
    assert client.put('/wedding/wardrobe', headers=owner, json={'appearance': {'shirt': 'x' * 1000}}).status_code == 422
    assert client.post('/wedding/wardrobe/outfits', headers=owner, json={'name': ' ', 'appearance': {'hair': 'none'}}).status_code == 422
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index']))
    assert client.get('/wedding/wardrobe', headers=guest).status_code == 403

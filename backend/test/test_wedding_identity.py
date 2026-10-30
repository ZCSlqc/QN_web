from .helpers import owner_headers


def test_wedding_identity_comes_from_admin_account_and_survives_nickname_changes(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    assert client.get('/me', headers=headers).json()['wedding_role'] == 'groom'
    client.put('/account/nickname', data={'nickname': '换一个婚礼昵称'}, headers=headers)
    assert client.get('/me', headers=headers).json()['wedding_role'] == 'groom'
    monkeypatch.setattr(module.settings, 'WEDDING_GROOM_USER', 'other-owner')
    monkeypatch.setattr(module.settings, 'WEDDING_BRIDE_USER', '李琪淳')
    assert client.get('/me', headers=headers).json()['wedding_role'] == 'bride'
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset())
    assert client.get('/me', headers=headers).json()['wedding_role'] is None

from .helpers import owner_headers


def test_reset_uses_latest_share_code_hashes_password_and_revokes_sessions(file_registration):
    client, module, storage, path = file_registration
    headers = owner_headers(client)
    token = client.post('/register_process', data={'username': 'reset-guest', 'userpwd': 'old-password', 'checkcode': storage.registration_code()}).json()['token']
    guest = {'Authorization': f'Bearer {token}'}
    user_id = next(u['id'] for u in client.get('/admin/users', headers=headers).json()['data'] if u['username'] == 'reset-guest')
    endpoint = f'/admin/users/{user_id}/reset-password'
    assert client.post(endpoint).status_code == 401
    assert client.post(endpoint, headers=guest).status_code == 403
    state = client.get('/admin/settings/registration', headers=headers).json()
    client.put('/admin/settings/registration', data={'code': 'updated-share-code', 'revision': state['revision']}, headers=headers)
    result = client.post(endpoint, headers=headers)
    assert result.status_code == 200 and result.json()['self_reset'] is False
    assert 'updated-share-code' not in result.text
    assert client.get('/me', headers=guest).status_code == 401
    assert client.post('/login_process', data={'username': 'reset-guest', 'userpwd': 'old-password'}).json().get('token') is None
    assert client.post('/login_process', data={'username': 'reset-guest', 'userpwd': 'updated-share-code'}).json().get('token')
    with module.get_db() as conn:
        row = conn.execute('SELECT userpwd,token_version FROM user WHERE id=?', (user_id,)).fetchone()
        assert row['userpwd'].startswith('$2') and row['token_version'] == 1


def test_reset_self_missing_user_and_unconfigured_code(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    user_id = client.get('/admin/users', headers=headers).json()['data'][0]['id']
    assert client.post('/admin/users/9999/reset-password', headers=headers).status_code == 404
    original = module.settings.CHECK_CODE
    monkeypatch.setattr(module.settings, 'CHECK_CODE', '')
    assert client.post(f'/admin/users/{user_id}/reset-password', headers=headers).status_code == 400
    assert client.get('/me', headers=headers).status_code == 200
    monkeypatch.setattr(module.settings, 'CHECK_CODE', original)
    assert client.post(f'/admin/users/{user_id}/reset-password', headers=headers).json()['self_reset'] is True
    assert client.get('/me', headers=headers).status_code == 401
    assert client.post('/login_process', data={'username': '李琪淳', 'userpwd': original}).json().get('token')

from pathlib import Path
from unittest.mock import patch
from .helpers import owner_headers, photo_bytes, journey_data


def test_public_registration_cannot_claim_reserved_accounts(api, monkeypatch):
    client, module = api
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset({'预留管理员', '情侣乙'}))
    for name in ['预留管理员', '情侣乙']:
        response = client.post('/register_process', data={'username': name, 'userpwd': 'test-password', 'checkcode': module.settings.CHECK_CODE})
        assert response.status_code == 403
        with module.get_db() as conn:
            assert conn.execute('SELECT 1 FROM user WHERE username=?', (name,)).fetchone() is None


def test_photo_file_failure_is_hidden_and_retryable(api):
    client, module = api
    headers = owner_headers(client)
    photo = client.post('/photos', files={'file': ('a.png', photo_bytes(), 'image/png')}, headers=headers).json()['data']
    with patch.object(Path, 'unlink', side_effect=PermissionError('locked')):
        response = client.delete(f"/photos/{photo['id']}", headers=headers)
    assert response.status_code == 200 and response.json()['cleanup_pending'] is True
    assert client.get('/photos').json()['data'] == []
    assert client.get(photo['url'].removeprefix('/api')).status_code == 404
    assert len(list(module.settings.UPLOAD_DIR.iterdir())) == 2
    assert client.delete(f"/photos/{photo['id']}", headers=headers).json()['cleanup_pending'] is False
    assert not list(module.settings.UPLOAD_DIR.iterdir())


def test_home_and_admin_share_todo_validation(api):
    client, _ = api
    headers = owner_headers(client)
    for path in ['/table_add', '/admin/todos']:
        assert client.post(path, data={'entry': '   ', 'type': '旅行', 'user': '李琪淳'}, headers=headers).status_code == 400
    todo_id = client.post('/admin/todos', data={'entry': '旧名字', 'type': '旅行', 'user': '李琪淳'}, headers=headers).json()['id']
    assert client.put(f'/admin/todos/{todo_id}', data={'entry': '新名字', 'type': '旅行', 'user': '李琪淳'}, headers=headers).status_code == 200
    assert client.post(f'/admin/todos/{todo_id}/status', data={'done': True}, headers=headers).status_code == 200
    assert client.get('/table_done_list').json()['data'][0]['entry'] == '新名字'
    assert client.post('/table_delete', data={'entry': '旧名字'}, headers=headers).status_code == 404


def test_password_change_and_logout_revoke_old_tokens(api):
    client, _ = api
    headers = owner_headers(client)
    assert client.post('/account/password', data={'current_password': 'wrong', 'new_password': 'new-password'}, headers=headers).status_code == 400
    assert client.post('/account/password', data={'current_password': 'owner-password', 'new_password': 'new-password'}, headers=headers).status_code == 200
    assert client.get('/me', headers=headers).status_code == 401
    login = client.post('/login_process', data={'username': '李琪淳', 'userpwd': 'new-password'}).json()
    new_headers = {'Authorization': 'Bearer ' + login['token']}
    assert client.post('/logout', headers=new_headers).status_code == 200
    assert client.get('/me', headers=new_headers).status_code == 401
    again = client.post('/login_process', data={'username': '李琪淳', 'userpwd': 'new-password'}).json()
    assert again['token'] != login['token']
    assert client.get('/me', headers={'Authorization': 'Bearer ' + again['token']}).status_code == 200


def test_login_rate_limit_does_not_apply_to_reads(api):
    client, _ = api
    for _ in range(20):
        assert client.post('/login_process', data={'username': 'missing', 'userpwd': 'wrong'}).status_code == 200
    assert client.post('/login_process', data={'username': 'missing', 'userpwd': 'wrong'}).status_code == 429
    assert client.get('/health').status_code == 200


def test_upload_and_trip_retries_do_not_duplicate(api):
    client, _ = api
    headers = owner_headers(client)
    key = 'same-journey-request-key'
    data = journey_data(request_key=key)
    one = client.post('/journeys', data=data, headers=headers)
    two = client.post('/journeys', data=data, headers=headers)
    assert one.json()['id'] == two.json()['id']
    assert len(client.get('/journeys', headers=headers).json()['data']) == 1
    data['notes'] = '不同内容'
    assert client.post('/journeys', data=data, headers=headers).status_code == 409
    photo = photo_bytes()
    options = {'files': {'file': ('one.png', photo, 'image/png')}, 'data': {'request_key': 'same-upload-request-key'}, 'headers': headers}
    first = client.post('/photos', **options)
    second = client.post('/photos', **options)
    assert first.json()['data']['id'] == second.json()['data']['id']
    assert len(client.get('/photos').json()['data']) == 1

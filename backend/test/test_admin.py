import json
import io
import os
import sys
import sqlite3
from pathlib import Path
import pytest
from .helpers import owner_headers, journey_data, photo_bytes

def test_blessing_limit_and_admin_protection(api):
    client, _ = api
    assert client.post("/blessings", data={"content": "x" * 301}).status_code == 400
    assert client.post("/admin/users/delete", data={"username": "李琪淳"}, headers=owner_headers(client)).status_code == 400


def test_todo_reads_observe_external_commits(api):
    client, module = api
    with sqlite3.connect(module.settings.DB_PATH) as conn:
        conn.execute("INSERT INTO things(entry,types,user,start_date) VALUES ('外部写入','旅行','我们','2025-01-01')")
    assert any(row["entry"] == "外部写入" for row in client.get("/table_data").json()["data"])


def test_registration_settings_immediate_and_persistent(file_registration):
    import subprocess
    client, module, storage, path = file_registration
    headers = owner_headers(client)
    initial = client.get('/admin/settings/registration', headers=headers)
    assert initial.headers['cache-control'] == 'no-store'
    assert 'code' not in initial.json()
    assert initial.json()['editable'] is True
    assert client.get('/admin/settings/registration?reveal=true', headers=headers).json()['code'] == 'original-file-code'
    response = client.put('/admin/settings/registration', data={'code': 'new-file-code', 'revision': initial.json()['revision']}, headers=headers)
    assert response.status_code == 200
    assert 'code' not in response.json()
    assert storage.registration_code() == 'new-file-code'
    assert '# keep this comment' in path.read_text(encoding='utf-8')
    assert 'QN_ADMIN_USERS=owner' in path.read_text(encoding='utf-8')
    assert 'QN_SECRET_KEY=keep-secret' in path.read_text(encoding='utf-8')
    data = {'username': 'rotated-code-user', 'userpwd': 'guest-password', 'checkcode': 'original-file-code'}
    assert client.post('/register_process', data=data).json()['flag'] == -3
    data['checkcode'] = 'new-file-code'
    assert client.post('/register_process', data=data).json()['flag'] == 1
    # Existing users can still log in without a share code.
    assert client.post('/login_process', data={'username': data['username'], 'userpwd': data['userpwd']}).json()['flag'] == 1
    env = os.environ.copy()
    env.pop('QN_CHECK_CODE', None)
    env['QN_ENV_FILE'] = str(path)
    subprocess.run([sys.executable, '-c', "from app.services.registration import registration_code; assert registration_code() == 'new-file-code'"],
                   cwd=Path(__file__).resolve().parents[1], env=env, check=True)
    stale = client.put('/admin/settings/registration', data={'code': 'stale-overwrite', 'revision': initial.json()['revision']}, headers=headers)
    assert stale.status_code == 409
    assert storage.registration_code() == 'new-file-code'


def test_registration_settings_permissions_and_read_only(api, monkeypatch):
    client, module = api
    for method, path in [('get', '/admin/settings/registration?reveal=true'), ('put', '/admin/settings/registration')]:
        kwargs = {'data': {'code': 'new-code', 'revision': 'x'}} if method == 'put' else {}
        assert getattr(client, method)(path, **kwargs).status_code == 401
    guest = client.post('/register_process', data={'username': 'settings-guest', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    guest_headers = {'Authorization': f'Bearer {guest}'}
    assert client.get('/admin/settings/registration?reveal=true', headers=guest_headers).status_code == 403
    assert client.put('/admin/settings/registration', data={'code': 'new-code', 'revision': 'x'}, headers=guest_headers).status_code == 403
    headers = owner_headers(client)
    monkeypatch.setattr(module.settings, 'CHECK_CODE_FROM_ENV', True)
    state = client.get('/admin/settings/registration', headers=headers).json()
    assert state['source'] == 'environment' and state['editable'] is False
    assert client.put('/admin/settings/registration', data={'code': 'new-code', 'revision': state['revision']}, headers=headers).status_code == 409


@pytest.mark.parametrize('value', ['short', 'contains space', 'abc\nQN_ADMIN_USERS=attacker', 'x' * 65])
def test_registration_invalid_code_preserves_file(file_registration, value):
    client, _, _, path = file_registration
    before = path.read_bytes()
    headers = owner_headers(client)
    revision = client.get('/admin/settings/registration', headers=headers).json()['revision']
    assert client.put('/admin/settings/registration', data={'code': value, 'revision': revision}, headers=headers).status_code == 400
    assert path.read_bytes() == before


def test_registration_write_failure_preserves_active_code(file_registration, monkeypatch):
    client, _, storage, path = file_registration
    headers = owner_headers(client)
    revision = client.get('/admin/settings/registration', headers=headers).json()['revision']
    def fail(*args, **kwargs):
        raise PermissionError('test file is read-only')
    monkeypatch.setattr(storage, 'set_key', fail)
    assert client.put('/admin/settings/registration', data={'code': 'cannot-save', 'revision': revision}, headers=headers).status_code == 503
    assert storage.registration_code() == 'original-file-code'


def test_admin_todo_edit_complete_restore_and_roles(api):
    client, module = api
    headers = owner_headers(client)
    users = client.get('/admin/users', headers=headers).json()['data']
    assert next(user for user in users if user['username'] == '李琪淳')['is_admin'] is True
    client.post('/table_add', data={'entry': '后台心愿测试', 'type': '旅行', 'user': '李琪淳'}, headers=headers)
    todo = next(item for item in client.get('/admin/todos', headers=headers).json()['data'] if item['entry'] == '后台心愿测试')
    todo_id = todo['id']
    assert client.get('/admin/todos').status_code == 401
    assert client.put(f'/admin/todos/{todo_id}', data={'entry': '修改后的心愿', 'type': '美食', 'user': '李琪淳'}, headers=headers).status_code == 200
    assert client.post(f'/admin/todos/{todo_id}/status', data={'done': 'true'}, headers=headers).status_code == 200
    completed = next(item for item in client.get('/admin/todos?done=true', headers=headers).json()['data'] if item['id'] == todo_id)
    assert completed['entry'] == '修改后的心愿' and completed['end_date']
    assert completed['start_date'] == todo['start_date']
    assert client.post(f'/admin/todos/{todo_id}/status', data={'done': 'false'}, headers=headers).status_code == 200
    restored = next(item for item in client.get('/admin/todos', headers=headers).json()['data'] if item['id'] == todo_id)
    assert restored['end_date'] is None
    assert client.delete(f'/admin/todos/{todo_id}', headers=headers).status_code == 200
    assert client.delete(f'/admin/todos/{todo_id}', headers=headers).status_code == 404


def test_admin_todo_edit_rejects_duplicate_names(api):
    client, _ = api
    headers = owner_headers(client)
    for entry in ['保留的心愿', '另一个心愿']:
        client.post('/table_add', data={'entry': entry, 'type': '旅行', 'user': '李琪淳'}, headers=headers)
    todo = next(item for item in client.get('/admin/todos', headers=headers).json()['data'] if item['entry'] == '另一个心愿')
    response = client.put(f"/admin/todos/{todo['id']}", data={'entry': '保留的心愿', 'type': '旅行', 'user': '李琪淳'}, headers=headers)
    assert response.status_code == 409
    unchanged = next(item for item in client.get('/admin/todos', headers=headers).json()['data'] if item['id'] == todo['id'])
    assert unchanged == todo

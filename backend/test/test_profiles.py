from .helpers import owner_headers


def test_default_nickname_and_user_list_column(api):
    client, _ = api
    headers = owner_headers(client)
    me = client.get('/me', headers=headers).json()
    assert me['username'] == '李琪淳' and me['nickname'] == '琪琪' and me['display_name'] == '琪琪'
    user = client.get('/admin/users', headers=headers).json()['data'][0]
    assert user['username'] == '李琪淳' and user['nickname'] == '琪琪'


def test_nickname_updates_records_but_not_identity(api):
    client, module = api
    token = client.post('/register_process', data={'username': 'guest-profile', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    headers = {'Authorization': 'Bearer ' + token}
    client.post('/blessings', data={'content': '之前的祝福'}, headers=headers)
    assert client.put('/account/nickname', data={'nickname': '小橘子 🍊'}, headers=headers).status_code == 200
    me = client.get('/me', headers=headers).json()
    assert me['username'] == 'guest-profile' and me['display_name'] == '小橘子 🍊' and not me['is_admin']
    assert client.get('/blessings').json()['data'][0]['author'] == '小橘子 🍊'
    assert client.put('/account/nickname', data={'nickname': '琪琪'}, headers=headers).status_code == 409
    assert client.put('/account/nickname', data={'nickname': 'x' * 21}, headers=headers).status_code == 400
    assert client.put('/account/nickname', data={'nickname': '跨\n行'}, headers=headers).status_code == 400
    assert client.put('/account/nickname', data={'nickname': ''}, headers=headers).status_code == 200
    assert client.get('/blessings').json()['data'][0]['author'] == 'guest-profile'
    assert client.put('/account/nickname', data={'nickname': '未登录'}).status_code == 401


def test_nickname_changes_preserve_reward_and_todo_identity(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    client.post('/admin/todos', data={'entry': '昵称记录', 'type': '日常', 'user': '琪琪'}, headers=headers)
    assert client.get('/table_data').json()['data'][0]['user'] == '李琪淳'
    assert client.put('/account/nickname', data={'nickname': '新的琪琪'}, headers=headers).status_code == 200
    assert client.get('/table_data').json()['data'][0]['user_display'] == '新的琪琪'
    assert client.get('/me', headers=headers).json()['is_admin'] is True

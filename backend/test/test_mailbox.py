import uuid
import pytest


@pytest.fixture
def mailbox(api, monkeypatch):
    client, module = api
    names = ['信箱甲', '信箱乙', '外部管理员']
    headers = {}
    for name in names:
        res = client.post('/register_process', data={'username': name, 'userpwd': 'test-password', 'checkcode': module.settings.CHECK_CODE})
        headers[name] = {'Authorization': 'Bearer ' + res.json()['token']}
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset(names[:2]))
    return client, module, headers


def letter_data(**changes):
    return {'title': '想和你说说话', 'body': '今天很想你。\n明天一起去散步吧。', 'kind': 'secret', 'request_key': uuid.uuid4().hex, **changes}


def send(client, headers, **changes):
    response = client.post('/mailbox/letters', data=letter_data(**changes), headers=headers)
    assert response.status_code == 201
    return response.json()['id']


def test_letter_daily_food_reward_is_per_sender_and_idempotent(mailbox):
    client, module, auth = mailbox
    data = letter_data()
    first = client.post('/mailbox/letters', data=data, headers=auth['信箱甲'])
    assert first.json()['food_reward'] == {'food': 'treat', 'amount': 1}
    replay = client.post('/mailbox/letters', data=data, headers=auth['信箱甲'])
    assert replay.json().get('food_reward', {}).get('amount', 0) == 0
    second = client.post('/mailbox/letters', data=letter_data(), headers=auth['信箱甲'])
    assert second.json()['food_reward']['amount'] == 0
    peer = client.post('/mailbox/letters', data=letter_data(), headers=auth['信箱乙'])
    assert peer.json()['food_reward']['amount'] == 1
    assert client.get('/pet', headers=auth['信箱甲']).json()['inventory']['treat'] == 2
    client.post(f"/mailbox/letters/{first.json()['id']}/comments", data={'content': '留言不奖励', 'request_key': uuid.uuid4().hex}, headers=auth['信箱乙'])
    assert client.get('/pet', headers=auth['信箱甲']).json()['inventory']['treat'] == 2


def test_letter_reward_next_beijing_day(mailbox):
    client, module, auth = mailbox
    from app.services.pet_wallets import grant_letter_treat
    letter_id = send(client, auth['信箱甲'])
    with module.get_db() as conn:
        assert grant_letter_treat(conn, '信箱甲', letter_id, '2099-01-01 23:59:59') == 1
        assert grant_letter_treat(conn, '信箱甲', letter_id, '2099-01-01 23:59:59') == 0
        assert grant_letter_treat(conn, '信箱甲', letter_id, '2099-01-02 00:00:00') == 1


def test_private_access_including_unrelated_admin(mailbox):
    client, _, auth = mailbox
    letter_id = send(client, auth['信箱甲'])
    assert client.get('/me', headers=auth['信箱甲']).json()['has_mailbox'] is True
    assert client.get('/me', headers=auth['外部管理员']).json()['has_mailbox'] is False
    for headers, expected in [(None, 401), (auth['外部管理员'], 403)]:
        for path in ['/mailbox/summary', '/mailbox/letters', f'/mailbox/letters/{letter_id}']:
            assert client.get(path, headers=headers).status_code == expected
        assert client.post('/mailbox/letters', data=letter_data(), headers=headers).status_code == expected
        assert client.post(f'/mailbox/letters/{letter_id}/read', headers=headers).status_code == expected
        assert client.post(f'/mailbox/letters/{letter_id}/comments', data={'content': '窥探', 'request_key': uuid.uuid4().hex}, headers=headers).status_code == expected


def test_opening_list_or_sender_read_does_not_mark_recipient_read(mailbox):
    client, _, auth = mailbox
    sender, recipient = auth['信箱甲'], auth['信箱乙']
    letter_id = send(client, sender)
    for headers in [sender, recipient]:
        listed = client.get('/mailbox/letters', headers=headers)
        assert listed.headers['cache-control'] == 'no-store'
        assert all('body' not in row for row in listed.json()['data'])
    assert client.get('/mailbox/summary', headers=recipient).json()['unread_letters'] == 1
    assert client.get('/mailbox/summary', headers=sender).json()['pending_sent'] == 1
    client.get(f'/mailbox/letters/{letter_id}', headers=recipient)
    client.post(f'/mailbox/letters/{letter_id}/read', headers=sender)
    assert client.get('/mailbox/summary', headers=recipient).json()['unread_letters'] == 1
    read = client.post(f'/mailbox/letters/{letter_id}/read', data={'through_comment_id': 0}, headers=recipient)
    assert read.json()['recipient_read_at']
    assert read.json()['summary']['unread_letters'] == 0
    assert client.get('/mailbox/summary', headers=sender).json()['pending_sent'] == 0
    again = client.post(f'/mailbox/letters/{letter_id}/read', headers=recipient)
    assert again.json()['recipient_read_at'] == read.json()['recipient_read_at']


def test_new_replies_have_independent_read_cursors(mailbox):
    client, _, auth = mailbox
    sender, recipient = auth['信箱甲'], auth['信箱乙']
    letter_id = send(client, sender)
    client.post(f'/mailbox/letters/{letter_id}/read', headers=recipient)
    comment = client.post(f'/mailbox/letters/{letter_id}/comments', data={'content': '我也想你', 'request_key': uuid.uuid4().hex}, headers=recipient).json()
    assert client.get('/mailbox/summary', headers=sender).json()['unread_reply_threads'] == 1
    assert client.get('/mailbox/summary', headers=recipient).json()['unread_reply_threads'] == 0
    second = client.post(f'/mailbox/letters/{letter_id}/comments', data={'content': '还有一件事', 'request_key': uuid.uuid4().hex}, headers=recipient).json()
    # Mark only the comments included in the page the sender actually fetched.
    client.post(f'/mailbox/letters/{letter_id}/read', data={'through_comment_id': comment['id']}, headers=sender)
    assert client.get('/mailbox/summary', headers=sender).json()['unread_reply_threads'] == 1
    client.post(f'/mailbox/letters/{letter_id}/read', data={'through_comment_id': second['id']}, headers=sender)
    assert client.get('/mailbox/summary', headers=sender).json()['unread_reply_threads'] == 0
    assert client.get('/mailbox/summary', headers=recipient).json()['unread_letters'] == 0
    assert client.post(f'/mailbox/letters/{letter_id}/read', data={'through_comment_id': 999999}, headers=sender).status_code == 400


def test_retry_does_not_duplicate_letters_or_comments(mailbox):
    client, _, auth = mailbox
    headers = auth['信箱甲']
    data = letter_data()
    first = client.post('/mailbox/letters', data=data, headers=headers).json()
    assert client.post('/mailbox/letters', data=data, headers=headers).json()['id'] == first['id']
    assert client.get('/mailbox/letters?box=sent', headers=headers).json()['total'] == 1
    data['body'] = '不同正文'
    assert client.post('/mailbox/letters', data=data, headers=headers).status_code == 409
    reply = {'content': '补充一句', 'request_key': uuid.uuid4().hex}
    path = f"/mailbox/letters/{first['id']}/comments"
    one = client.post(path, data=reply, headers=headers).json()
    assert client.post(path, data=reply, headers=headers).json()['id'] == one['id']
    assert len(client.get(f"/mailbox/letters/{first['id']}", headers=headers).json()['comments']) == 1


def test_old_letters_not_inherited_by_reregistered_account(mailbox):
    client, module, auth = mailbox
    letter_id = send(client, auth['信箱甲'])
    with module.get_db() as conn:
        conn.execute('DELETE FROM user WHERE username=?', ('信箱乙',))
    assert client.post('/register_process', data={'username': '信箱乙', 'userpwd': 'new-password', 'checkcode': module.settings.CHECK_CODE}).status_code == 403
    from app.core.security import hash_password, create_token
    with module.get_db() as conn:
        conn.execute('INSERT INTO user(username,userpwd,userdate) VALUES (?,?,?)', ('信箱乙', hash_password('new-password'), '2026-01-01'))
    token = create_token('信箱乙')
    new_headers = {'Authorization': 'Bearer ' + token}
    assert client.get(f'/mailbox/letters/{letter_id}', headers=new_headers).status_code == 404
    assert client.get('/mailbox/letters', headers=new_headers).json()['data'] == []
    assert client.get('/mailbox/summary', headers=new_headers).json()['unread_letters'] == 0


def test_partner_change_and_missing_partner(mailbox, monkeypatch):
    client, module, auth = mailbox
    letter_id = send(client, auth['信箱甲'])
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset({'信箱甲', '外部管理员'}))
    assert client.get(f'/mailbox/letters/{letter_id}', headers=auth['外部管理员']).status_code == 404
    assert client.get(f'/mailbox/letters/{letter_id}', headers=auth['信箱甲']).status_code == 404
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset({'信箱甲', '未注册账号'}))
    assert client.get('/mailbox/summary', headers=auth['信箱甲']).json()['partner_ready'] is False
    assert client.post('/mailbox/letters', data=letter_data(), headers=auth['信箱甲']).status_code == 409


@pytest.mark.parametrize('changes', [{'title': ' '}, {'body': ' '}, {'body': 'x' * 10001}, {'title': 'x' * 101}, {'kind': 'invalid'}, {'request_key': 'short'}])
def test_letter_validation(mailbox, changes):
    client, _, auth = mailbox
    assert client.post('/mailbox/letters', data=letter_data(**changes), headers=auth['信箱甲']).status_code == 400


def test_mailbox_identity_protection_and_pagination(mailbox):
    client, module, auth = mailbox
    assert client.post('/admin/users/delete', data={'username': '信箱甲'}, headers=auth['信箱乙']).status_code == 400
    for number in range(21):
        send(client, auth['信箱甲'], title=f'第{number}封信')
    one = client.get('/mailbox/letters?box=inbox&page=1', headers=auth['信箱乙']).json()
    two = client.get('/mailbox/letters?box=inbox&page=2', headers=auth['信箱乙']).json()
    assert one['total'] == 21 and len(one['data']) == 20 and len(two['data']) == 1
    assert not {row['id'] for row in one['data']} & {row['id'] for row in two['data']}

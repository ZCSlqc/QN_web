from .helpers import owner_headers


def test_completion_reflection_optional_editable_and_preserved(api):
    client, _ = api
    headers = owner_headers(client)
    todo_id = client.post('/admin/todos', data={'entry': '看电视剧', 'type': '电视剧', 'user': '李琪淳'}, headers=headers).json()['id']
    path = f'/admin/todos/{todo_id}'
    assert client.post(path + '/status', data={'done': True, 'reflection': '  很开心 💪\r\n下次继续  '}, headers=headers).status_code == 200
    row = client.get('/table_done_list').json()['data'][0]
    assert row['reflection'] == '很开心 💪\n下次继续'
    completed_at = row['end_date']
    assert client.put(path + '/reflection', data={'reflection': '改了一句 😏'}, headers=headers).status_code == 200
    row = client.get('/table_done_list').json()['data'][0]
    assert row['reflection'] == '改了一句 😏' and row['end_date'] == completed_at
    assert client.post(path + '/status', data={'done': False}, headers=headers).status_code == 200
    assert client.put(path + '/reflection', data={'reflection': '不可修改'}, headers=headers).status_code == 409
    assert client.post(path + '/status', data={'done': True}, headers=headers).status_code == 200
    assert client.get('/table_done_list').json()['data'][0]['reflection'] == '改了一句 😏'
    assert client.post(path + '/status', data={'done': True, 'reflection': '', 'replace_reflection': True}, headers=headers).status_code == 200
    assert client.get('/table_done_list').json()['data'][0]['reflection'] == ''
    client.put(path + '/reflection', data={'reflection': '再次补写'}, headers=headers)
    assert client.put(path + '/reflection', data={'reflection': ''}, headers=headers).status_code == 200
    assert client.get('/table_done_list').json()['data'][0]['reflection'] == ''


def test_reflection_validation_and_permissions(api):
    client, _ = api
    headers = owner_headers(client)
    todo_id = client.post('/admin/todos', data={'entry': '空感想心愿', 'type': '日常', 'user': '李琪淳'}, headers=headers).json()['id']
    path = f'/admin/todos/{todo_id}'
    assert client.post(path + '/status', data={'done': True, 'reflection': 'x' * 2001}, headers=headers).status_code == 400
    assert len(client.get('/table_data').json()['data']) == 1
    assert client.post(path + '/status', data={'done': True, 'reflection': ''}, headers=headers).status_code == 200
    assert client.get('/table_done_list').json()['data'][0]['reflection'] == ''
    assert client.put(path + '/reflection', data={'reflection': '访客写入'}).status_code == 401
    assert client.put('/admin/todos/999999/reflection', data={'reflection': '不存在'}, headers=headers).status_code == 404

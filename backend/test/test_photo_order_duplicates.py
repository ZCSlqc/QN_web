from .helpers import owner_headers, journey_data, photo_bytes


def test_order_and_global_duplicate_protection(api):
    client, module = api
    headers = owner_headers(client)
    trip = client.post('/journeys', data=journey_data(), headers=headers).json()['id']
    endpoint = f'/journeys/{trip}/photos'
    originals = [photo_bytes(size=(50+i, 90)) for i in range(3)]
    ids = []
    for i, data in enumerate(originals):
        result = client.post(endpoint, files={'file': (f'{i}.png', data, 'image/png')}, headers=headers)
        assert result.status_code == 201
        ids.append(result.json()['data']['id'])
    duplicate = client.post('/photos', files={'file': ('renamed.png', originals[0], 'image/png')}, headers=headers)
    assert duplicate.status_code == 409
    assert '已经上传' in duplicate.json()['detail']
    ordered = list(reversed(ids))
    assert client.put(f'/journeys/{trip}/photo-order', json={'ids': ordered, 'original_ids': ids}, headers=headers).status_code == 200
    assert [p['id'] for p in client.get(endpoint, headers=headers).json()['data']] == ordered
    card = client.get('/journeys', headers=headers).json()['data'][0]
    assert [p['id'] for p in card['cover_photos']] == ordered[:2]
    assert client.put(f'/journeys/{trip}/photo-order', json={'ids': ids, 'original_ids': ids}, headers=headers).status_code == 409
    assert client.put(f'/journeys/{trip}/photo-order', json={'ids': [ids[0]]*3, 'original_ids': ordered}, headers=headers).status_code == 400
    assert client.put(f'/journeys/{trip}/photo-order', json={'ids': ids, 'original_ids': ordered}).status_code == 401
    client.delete(f'{endpoint}/{ids[0]}', headers=headers)
    assert client.post(endpoint, files={'file': ('again.png', originals[0], 'image/png')}, headers=headers).status_code == 201


def test_stored_hash_and_retry(api):
    client, module = api
    headers = owner_headers(client)
    image = photo_bytes(size=(61, 93))
    data = {'request_key': 'same-upload-retry-key'}
    first = client.post('/photos', data=data, files={'file': ('a.png', image, 'image/png')}, headers=headers).json()['data']
    replay = client.post('/photos', data=data, files={'file': ('a.png', image, 'image/png')}, headers=headers)
    assert replay.status_code == 201 and replay.json()['data']['id'] == first['id']
    assert client.post('/photos', files={'file': ('renamed.png', image, 'image/png')}, headers=headers).status_code == 409

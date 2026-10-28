from unittest.mock import patch
from pathlib import Path
from .helpers import owner_headers, journey_data, photo_bytes


def test_trip_photos_are_private_separate_retryable_and_removed_with_trip(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    trip = client.post('/journeys', data=journey_data(), headers=headers).json()['id']
    endpoint = f'/journeys/{trip}/photos'
    data = {'caption': '西湖日落', 'request_key': 'journey-photo-upload-1234'}
    image = photo_bytes()
    response = client.post(endpoint, data=data, files={'file': ('photo.png', image, 'image/png')}, headers=headers)
    assert response.status_code == 201
    photo = response.json()['data']
    retry = client.post(endpoint, data=data, files={'file': ('photo.png', image, 'image/png')}, headers=headers)
    assert retry.json()['data']['id'] == photo['id']
    assert client.get('/photos').json()['data'] == []
    assert len(client.get(endpoint, headers=headers).json()['data']) == 1
    card = client.get('/journeys', headers=headers).json()['data'][0]
    assert card['photo_count'] == 1 and card['cover']['id'] == photo['id']
    image_url = photo['url'].removeprefix('/api')
    assert client.get(image_url).status_code == 401
    token = client.post('/register_process', data={'username': 'viewer', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    guest = {'Authorization': f'Bearer {token}'}
    assert client.get(image_url, headers=guest).status_code == 403
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index','/journey']))
    assert client.get(image_url, headers=guest).status_code == 200
    assert client.get(image_url, headers=guest).headers['cache-control'] == 'private, no-store'
    assert client.post(endpoint, files={'file': ('p.png', image, 'image/png')}, headers=guest).status_code == 403
    assert client.put(f'{endpoint}/{photo["id"]}', data={'caption': '新的说明'}, headers=headers).status_code == 200
    assert client.get(endpoint, headers=headers).json()['data'][0]['caption'] == '新的说明'
    assert client.post('/journeys/missing/photos', files={'file': ('p.png', image, 'image/png')}, headers=headers).status_code == 404
    with patch.object(Path, 'unlink', side_effect=PermissionError('locked')):
        deletion = client.delete(f'/journeys/{trip}', headers=headers)
        assert deletion.status_code == 200 and deletion.json()['cleanup_pending']
    assert client.get(image_url, headers=headers).status_code == 404
    from app.services.photo_cleanup import retry_photo_cleanup
    assert retry_photo_cleanup() == 0
    assert list(module.settings.UPLOAD_DIR.iterdir()) == []


def test_photo_delete_wrong_trip_and_invalid_upload(api):
    client, _ = api
    headers = owner_headers(client)
    ids = [client.post('/journeys', data=journey_data(), headers=headers).json()['id'] for _ in range(2)]
    endpoint = f'/journeys/{ids[0]}/photos'
    assert client.post(endpoint, files={'file': ('bad.png', b'bad', 'image/png')}, headers=headers).status_code == 400
    photo = client.post(endpoint, files={'file': ('p.png', photo_bytes(), 'image/png')}, headers=headers).json()['data']
    assert client.delete(f'/journeys/{ids[1]}/photos/{photo["id"]}', headers=headers).status_code == 404
    assert client.delete(f'{endpoint}/{photo["id"]}', headers=headers).status_code == 200
    assert client.get(endpoint, headers=headers).json()['data'] == []

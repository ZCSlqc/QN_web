import io
from PIL import Image
from .helpers import owner_headers, journey_data, photo_bytes


def test_display_derivative_preserves_original_and_private_access(api):
    client, module = api
    headers = owner_headers(client)
    trip = client.post('/journeys', data=journey_data(), headers=headers).json()['id']
    original = photo_bytes(size=(3000, 2000))
    photo = client.post(f'/journeys/{trip}/photos', files={'file': ('large.png', original, 'image/png')}, headers=headers).json()['data']
    url = photo['display_url'].removeprefix('/api')
    assert client.get(url).status_code == 401
    response = client.get(url, headers=headers)
    assert response.status_code == 200
    assert response.headers['content-type'] == 'image/webp'
    assert response.headers['cache-control'] == 'private, no-store'
    with Image.open(io.BytesIO(response.content)) as image:
        assert image.size == (1920, 1280)
    assert client.get(photo['url'].removeprefix('/api'), headers=headers).content == original
    folder = module.settings.UPLOAD_DIR / 'journeys' / trip / photo['id']
    cached = folder / 'display.webp'
    timestamp = cached.stat().st_mtime_ns
    assert client.get(url, headers=headers).content == response.content
    assert cached.stat().st_mtime_ns == timestamp
    for variant, size in [('small', (256, 171)), ('cover', (640, 427))]:
        preview = client.get(photo[f'{variant}_url'].removeprefix('/api'), headers=headers)
        assert preview.status_code == 200
        with Image.open(io.BytesIO(preview.content)) as image:
            assert image.size == size
    assert client.delete(f'/journeys/{trip}', headers=headers).status_code == 200
    assert not cached.exists()
    assert not (folder / 'small.webp').exists()
    assert not (folder / 'cover.webp').exists()
    assert client.get(url, headers=headers).status_code == 404


def test_small_display_does_not_upscale(api):
    client, _ = api
    photo = client.post('/photos', files={'file': ('small.png', photo_bytes(size=(300, 200)), 'image/png')}, headers=owner_headers(client)).json()['data']
    response = client.get(photo['display_url'].removeprefix('/api'))
    assert response.status_code == 200
    with Image.open(io.BytesIO(response.content)) as image:
        assert image.size == (300, 200)

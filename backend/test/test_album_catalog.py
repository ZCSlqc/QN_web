from contextlib import closing
import sqlite3
from PIL import Image

from .helpers import owner_headers, photo_bytes


def seed_originals(module):
    from app.services.album import BUNDLED_PHOTOS
    root = module.settings.PHOTO_ASSETS_DIR
    (root / 'album').mkdir(parents=True, exist_ok=True)
    (root / 'optimized/album').mkdir(parents=True, exist_ok=True)
    for name in BUNDLED_PHOTOS[:3]:
        Image.new('RGB', (600, 800), '#d4788f').save(root / 'album' / name)
        Image.new('RGB', (300, 400), '#d4788f').save(root / 'optimized/album' / name.replace('.jpg', '.webp'))
    module.init_db()


def test_bundled_removal_is_persistent_and_preserves_files(api):
    from app.services.album import BUNDLED_PHOTOS
    client, module = api
    seed_originals(module)
    photos = client.get('/photos').json()['data']
    assert len(photos) == 3
    photo = photos[0]
    assert photo['source'] == 'bundled'
    assert client.get(photo['url'].removeprefix('/api')).status_code == 200
    assert client.get(photo['thumbnail_url'].removeprefix('/api')).headers['content-type'] == 'image/webp'
    assert client.delete(f"/photos/{photo['id']}").status_code == 401
    assert client.delete(f"/photos/{photo['id']}", headers=owner_headers(client)).status_code == 200
    module.init_db()
    assert len(client.get('/photos').json()['data']) == 2
    assert client.get(photo['url'].removeprefix('/api')).status_code == 404
    assert (module.settings.PHOTO_ASSETS_DIR / 'album' / BUNDLED_PHOTOS[0]).is_file()
    assert client.delete(f"/photos/{photo['id']}", headers=owner_headers(client)).status_code == 404


def test_uploaded_and_bundled_photos_share_one_catalog(api):
    client, module = api
    seed_originals(module)
    response = client.post('/photos', files={'file': ('new.jpg', photo_bytes('JPEG'), 'image/jpeg')}, headers=owner_headers(client))
    assert response.status_code == 201
    data = client.get('/photos').json()['data']
    assert len(data) == 4
    assert data[0]['source'] == 'upload'
    assert all(photo['source'] == 'bundled' for photo in data[1:])


def test_existing_uploaded_photo_survives_catalog_upgrade(api, tmp_path):
    from app.services.album import initialize_album
    with closing(sqlite3.connect(tmp_path / 'old.db')) as conn:
        conn.row_factory = sqlite3.Row
        conn.executescript('''CREATE TABLE photos (
            id INTEGER PRIMARY KEY, filename TEXT, thumbnail TEXT, caption TEXT, media_type TEXT,
            width INTEGER, height INTEGER, author TEXT, created_at TEXT);
            INSERT INTO photos VALUES (1,'old.jpg','old.webp','旧回忆','image/jpeg',600,800,'我们','2025-01-01');''')
        initialize_album(conn, tmp_path / 'missing-assets', '2026-01-01')
        row = conn.execute('SELECT * FROM photos WHERE id=1').fetchone()
        assert row['caption'] == '旧回忆'
        assert row['source'] == 'upload' and row['removed'] == 0

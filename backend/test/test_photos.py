import json
import io
import os
import sys
import sqlite3
from pathlib import Path
import pytest
from .helpers import owner_headers, journey_data, photo_bytes

def test_photo_upload_preview_persistence_and_delete(api):
    from PIL import Image
    client, module = api
    headers = owner_headers(client)
    data = photo_bytes()
    response = client.post("/photos", files={"file": ("../../outside.png", data, "image/png")}, data={"caption": "一起看花"}, headers=headers)
    assert response.status_code == 201
    photo = response.json()["data"]
    assert (photo["width"], photo["height"]) == (1200, 800)
    assert photo["caption"] == "一起看花"
    assert photo in client.get("/photos").json()["data"]
    with module.get_db() as conn:
        row = conn.execute("SELECT * FROM photos WHERE id=?", (photo["id"],)).fetchone()
        assert "/" not in row["filename"] and ".." not in row["filename"]
    original = client.get(photo["url"].removeprefix("/api"))
    assert original.content == data
    assert original.headers["content-type"] == "image/png"
    thumbnail = client.get(photo["thumbnail_url"].removeprefix("/api"))
    assert thumbnail.status_code == 200
    with Image.open(io.BytesIO(thumbnail.content)) as image:
        assert image.format == "WEBP"
        assert max(image.size) == 960
    assert client.delete(f"/photos/{photo['id']}", headers=headers).status_code == 200
    assert not (module.settings.UPLOAD_DIR / row["filename"]).exists()
    assert not (module.settings.UPLOAD_DIR / row["thumbnail"]).exists()
    assert client.get(photo["url"].removeprefix("/api")).status_code == 404


def test_photo_write_permissions(api):
    client, module = api
    files = {"file": ("photo.png", photo_bytes(), "image/png")}
    assert client.post("/photos", files=files).status_code == 401
    token = client.post("/register_process", data={"username": "photo-guest", "userpwd": "guest-password", "checkcode": module.settings.CHECK_CODE}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/photos", files=files, headers=headers).status_code == 403
    assert client.delete("/photos/1", headers=headers).status_code == 403


@pytest.mark.parametrize("data", [b"not a photo", b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', b""])
def test_fake_photo_is_rejected(api, data):
    client, module = api
    before = list(module.settings.UPLOAD_DIR.glob("*"))
    response = client.post("/photos", files={"file": ("fake.jpg", data, "image/jpeg")}, headers=owner_headers(client))
    assert response.status_code == 400
    assert list(module.settings.UPLOAD_DIR.glob("*")) == before


def test_photo_limits(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    monkeypatch.setattr(module.settings, "MAX_PHOTO_BYTES", 32)
    assert client.post("/photos", files={"file": ("photo.png", photo_bytes(), "image/png")}, headers=headers).status_code == 413
    assert client.post("/photos", files={"file": ("photo.png", photo_bytes(), "image/png")}, data={"caption": "x" * 101}, headers=headers).status_code == 400


def test_corrupt_photo_and_missing_photo(api):
    client, _ = api
    image = photo_bytes("JPEG")
    assert client.post("/photos", files={"file": ("broken.jpg", image[:100], "image/jpeg")}, headers=owner_headers(client)).status_code == 400
    assert client.get("/photos/999999/image").status_code == 404
    assert client.get("/photos/1/unknown").status_code == 404

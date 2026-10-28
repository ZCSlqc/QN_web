import json
import io
import os
import sys
import sqlite3
from pathlib import Path
import pytest
from .helpers import owner_headers, journey_data, photo_bytes

def test_story_update_preserves_lines_and_survives_initialization(api):
    client, module = api
    original = client.get("/story").json()["data"]
    assert original["title"] == "这就是我们的爱情故事"
    content = "第一行\n第二行\n\n新的一段 <script>仅作为文字</script>"
    response = client.put("/story", data={"title": "我们的故事", "content": content, "version": original["version"]}, headers=owner_headers(client))
    assert response.status_code == 200
    assert response.json()["data"]["content"] == content
    module.init_db()
    assert client.get("/story").json()["data"] == response.json()["data"]
    # An older editor must not overwrite a newer saved version.
    stale = client.put("/story", data={"title": "旧草稿", "content": "不能覆盖", "version": original["version"]}, headers=owner_headers(client))
    assert stale.status_code == 409
    assert client.get("/story").json()["data"]["content"] == content


def test_story_write_requires_admin(api):
    client, module = api
    data = {"title": "故事", "content": "内容", "version": 1}
    assert client.put("/story", data=data).status_code == 401
    token = client.post("/register_process", data={"username": "story-guest", "userpwd": "guest-password", "checkcode": module.settings.CHECK_CODE}).json()["token"]
    assert client.put("/story", data=data, headers={"Authorization": f"Bearer {token}"}).status_code == 403


@pytest.mark.parametrize("changes", [{"title": " "}, {"content": "\n "}, {"title": "x" * 81}, {"content": "x" * 5001}])
def test_story_validation(api, changes):
    client, _ = api
    original = client.get("/story").json()["data"]
    data = {"title": "标题", "content": "正文", "version": original["version"], **changes}
    assert client.put("/story", data=data, headers=owner_headers(client)).status_code == 400
    assert client.get("/story").json()["data"] == original

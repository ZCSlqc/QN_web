import json
import io
import os
import sys
import sqlite3
from pathlib import Path
import pytest
from .helpers import owner_headers, journey_data, photo_bytes

def test_owner_login_uses_hashed_password(api):
    client, module = api
    headers = owner_headers(client)
    assert client.get("/me", headers=headers).json()["is_admin"] is True
    with module.get_db() as conn:
        assert conn.execute("SELECT userpwd FROM user WHERE username='李琪淳'").fetchone()[0].startswith("$2")


def test_new_owner_name_is_not_automatically_admin(api):
    client, module = api
    response = client.post("/register_process", data={"username": "郑丹妮", "userpwd": "guest-password", "checkcode": module.settings.CHECK_CODE})
    headers = {"Authorization": f"Bearer {response.json()['token']}"}
    assert client.get("/me", headers=headers).json()["is_admin"] is False
    assert client.post("/journeys", data=journey_data(), headers=headers).status_code == 403


def test_deleted_account_token_stays_invalid_after_reregistration(api):
    client, module = api
    data = {"username": "temporary-guest", "userpwd": "guest-password", "checkcode": module.settings.CHECK_CODE}
    token = client.post("/register_process", data=data).json()["token"]
    assert client.post("/admin/users/delete", data={"username": data["username"]}, headers=owner_headers(client)).status_code == 200
    client.post("/register_process", data=data)
    assert client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_oversized_password_does_not_crash(api):
    client, _ = api
    response = client.post("/login_process", data={"username": "李琪淳", "userpwd": "x" * 73})
    assert response.status_code == 200
    assert response.json()["flag"] == -2


def test_environment_is_the_only_owner_authority(api, monkeypatch):
    client, module = api
    headers = owner_headers(client)
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset())
    assert client.get('/me', headers=headers).json()['is_admin'] is False
    assert client.post('/journeys', data=journey_data(), headers=headers).status_code == 403
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset({'李琪淳'}))
    assert client.get('/me', headers=headers).json()['is_admin'] is True


def test_registration_share_code_configuration(api, monkeypatch):
    client, module = api
    monkeypatch.setattr(module.settings, 'CHECK_CODE', 'new-share-code')
    data = {'username': 'env-code-guest', 'userpwd': 'guest-password', 'checkcode': 'old-code'}
    assert client.post('/register_process', data=data).json()['flag'] == -3
    data['checkcode'] = 'new-share-code'
    assert client.post('/register_process', data=data).json()['flag'] == 1
    monkeypatch.setattr(module.settings, 'CHECK_CODE', '')
    assert client.post('/register_process', data=data).status_code == 503

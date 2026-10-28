import importlib
import json
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def api(tmp_path, monkeypatch):
    db = tmp_path / 'test.db'
    with closing(sqlite3.connect(db)) as conn:
        with conn:
            conn.execute("CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, userpwd TEXT NOT NULL, userdate TEXT NOT NULL)")
            conn.execute("INSERT INTO user (username,userpwd,userdate) VALUES (?,?,?)", ('李琪淳', 'owner-password', '2021-06-24'))
    values = {
        'QN_DB_PATH': str(db), 'QN_ENV_FILE': str(tmp_path / 'missing.env'),
        'QN_ADMIN_USERS': json.dumps(['李琪淳']), 'QN_CHECK_CODE': 'test-registration-code',
        'QN_USER_PAGE_ALLOWLIST': '["/index"]',
        'QN_SECRET_KEY': 'isolated-test-signing-key', 'QN_UPLOAD_DIR': str(tmp_path / 'uploads'),
        'QN_PHOTO_ASSETS_DIR': str(tmp_path / 'assets'),
    }
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parents[1]))
    # Recreate the application module graph for this isolated environment.
    from types import SimpleNamespace
    for name in list(sys.modules):
        if name == 'main' or name == 'app' or name.startswith('app.'):
            sys.modules.pop(name, None)
    main = importlib.import_module('main')
    database = importlib.import_module('app.core.database')
    module = SimpleNamespace(app=main.app, settings=main.settings, get_db=database.get_db, init_db=database.init_db)
    with TestClient(module.app) as client:
        yield client, module


@pytest.fixture
def file_registration(api, monkeypatch, tmp_path):
    import app.services.registration as registration_settings
    client, module = api
    path = tmp_path / '.env'
    path.write_text('# keep this comment\nQN_CHECK_CODE=original-file-code\nQN_ADMIN_USERS=owner\nQN_SECRET_KEY=keep-secret\n', encoding='utf-8')
    monkeypatch.setattr(registration_settings, 'ENV_PATH', path)
    monkeypatch.setattr(module.settings, 'CHECK_CODE_FROM_ENV', False)
    return client, module, registration_settings, path

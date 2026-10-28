"""应用配置管理"""
from pathlib import Path
import os
import secrets
import json
import re
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = Path(os.environ.get("QN_ENV_FILE", BASE_DIR.parent / ".env"))
CHECK_CODE_FROM_ENV = "QN_CHECK_CODE" in os.environ
load_dotenv(ENV_PATH, override=False, encoding="utf-8-sig")


def configured_users(variable):
    raw = os.environ.get(variable, "").strip()
    if not raw:
        return frozenset()
    values = json.loads(raw) if raw.startswith("[") else raw.replace("，", ",").split(",")
    if not isinstance(values, list) or any(not isinstance(name, str) for name in values):
        raise ValueError(f"{variable} must be a JSON string array or comma-separated names")
    return frozenset(name.strip() for name in values if name.strip())


def signing_key():
    if os.environ.get("QN_SECRET_KEY"):
        return os.environ["QN_SECRET_KEY"]
    path = BASE_DIR / ".secret_key"
    try:
        with path.open("x", encoding="utf-8") as f:
            f.write(secrets.token_urlsafe(48))
    except FileExistsError:
        pass
    return path.read_text(encoding="utf-8").strip()


def configured_owners():
    owners = configured_users('QN_ADMIN_USERS')
    if len(owners) > 2:
        raise ValueError('QN_ADMIN_USERS supports at most two owners')
    return owners


def configured_user_pages():
    paths = json.loads(os.environ.get('QN_USER_PAGE_ALLOWLIST', '["/index"]'))
    if not isinstance(paths, list) or any(not isinstance(path, str) or not re.fullmatch(r'/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*', path) for path in paths):
        raise ValueError('QN_USER_PAGE_ALLOWLIST must be a JSON array of exact page paths')
    # The home page is always the safe landing page.
    return frozenset(['/index', *paths])


class Settings:
    # 数据库
    DB_PATH = Path(os.environ.get("QN_DB_PATH", BASE_DIR / "couple.db"))
    UPLOAD_DIR = Path(os.environ.get("QN_UPLOAD_DIR", BASE_DIR / "uploads"))
    PHOTO_ASSETS_DIR = Path(os.environ.get("QN_PHOTO_ASSETS_DIR", BASE_DIR.parent / "frontend/public"))
    MAX_PHOTO_BYTES = 15 * 1024 * 1024

    # 授权码
    CHECK_CODE = os.environ.get("QN_CHECK_CODE", "").strip()
    CHECK_CODE_FROM_ENV = CHECK_CODE_FROM_ENV
    ADMIN_USERS = configured_owners()
    USER_PAGE_ALLOWLIST = configured_user_pages()

    # JWT 配置
    SECRET_KEY = signing_key()
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7天

    # 服务器
    SERVER_HOST = "0.0.0.0"
    SERVER_PORT = int(os.environ.get('QN_BACKEND_PORT', '1277'))
    FRONTEND_PORT = int(os.environ.get('QN_FRONTEND_PORT', '7721'))
    if not all(1 <= port <= 65535 for port in (SERVER_PORT, FRONTEND_PORT)):
        raise ValueError('Configured ports must be between 1 and 65535')

    # CORS
    CORS_ORIGINS = ["*"]
    CORS_METHODS = ["*"]
    CORS_HEADERS = ["*"]


settings = Settings()

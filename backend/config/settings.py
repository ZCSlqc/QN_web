"""应用配置管理"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    # 数据库
    DB_PATH = BASE_DIR / "couple.db"

    # 授权码
    CHECK_CODE = "ZDNlqc"

    # JWT 配置
    SECRET_KEY = "qiqi_nini_2021_secret_key"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7天

    # 服务器
    SERVER_HOST = "0.0.0.0"
    SERVER_PORT = 8000

    # CORS
    CORS_ORIGINS = ["*"]
    CORS_METHODS = ["*"]
    CORS_HEADERS = ["*"]


settings = Settings()

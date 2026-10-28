import datetime
import bcrypt
import hashlib
import uuid
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.settings import settings
from app.core.database import get_db

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    if len(plain.encode()) > 72 or not hashed.startswith('$2'):
        return False
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(username: str) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        hours=settings.ACCESS_TOKEN_EXPIRE_HOURS
    )
    with get_db() as conn:
        user = conn.execute("SELECT id,token_version FROM user WHERE username=?", (username,)).fetchone()
    payload = {"sub": username, "uid": user["id"], "version": user['token_version'], "exp": expire, 'jti': uuid.uuid4().hex}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    if credentials is None:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        with get_db() as conn:
            revoked = conn.execute('SELECT 1 FROM revoked_tokens WHERE token_hash=?', (hashlib.sha256(credentials.credentials.encode()).hexdigest(),)).fetchone()
            if revoked:
                raise HTTPException(401, '登录已退出，请重新登录')
            row = conn.execute(
                "SELECT username FROM user WHERE id=? AND username=? AND token_version=?",
                (payload.get("uid"), payload.get("sub"), payload.get('version', 0)),
            ).fetchone()
        if row:
            return row["username"]
        raise HTTPException(status_code=401, detail="登录已失效，请重新登录")
    except JWTError:
        raise HTTPException(status_code=401, detail="登录已失效，请重新登录")


def require_admin(
    current_user: Optional[str] = Depends(get_current_user),
) -> str:
    """要求管理员权限，访客调用则拒绝"""
    if current_user is None:
        raise HTTPException(status_code=401, detail="请先登录")
    if current_user not in settings.ADMIN_USERS:
        raise HTTPException(status_code=403, detail="仅管理员可以操作")
    return current_user


def require_page_access(path):
    def check(current_user: Optional[str] = Depends(get_current_user)):
        if current_user is None:
            raise HTTPException(401, '请先登录')
        if current_user not in settings.ADMIN_USERS and path not in settings.USER_PAGE_ALLOWLIST:
            raise HTTPException(403, '当前账号无权访问此页面')
        return current_user
    return check

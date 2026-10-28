"""Registration code storage. File-managed codes are read afresh by every worker."""
import hashlib
import hmac
import re

from dotenv import dotenv_values, set_key
from fastapi import HTTPException
from app.core.settings import settings, ENV_PATH


def registration_code():
    if settings.CHECK_CODE_FROM_ENV:
        return settings.CHECK_CODE
    try:
        if not ENV_PATH.exists():
            return ''
        return (dotenv_values(ENV_PATH, encoding='utf-8-sig', interpolate=False).get('QN_CHECK_CODE') or '').strip()
    except OSError:
        raise HTTPException(503, '暂时无法读取注册设置，请稍后重试')


def code_revision(code):
    return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def registration_state(reveal=False):
    code = registration_code()
    result = {
        'configured': bool(code),
        'source': 'environment' if settings.CHECK_CODE_FROM_ENV else 'file',
        'editable': not settings.CHECK_CODE_FROM_ENV,
        'revision': code_revision(code),
    }
    if reveal:
        result['code'] = code
    return result


def update_registration_code(code, revision):
    if settings.CHECK_CODE_FROM_ENV:
        raise HTTPException(409, '分享码由部署环境管理，请在服务器环境变量中修改')
    if not re.fullmatch(r'[A-Za-z0-9_-]{6,64}', code):
        raise HTTPException(400, '分享码需为6至64位字母、数字、下划线或短横线')
    if not hmac.compare_digest(revision, code_revision(registration_code())):
        raise HTTPException(409, '分享码已被更新，请刷新设置后重试')
    try:
        # set_key uses an atomic replacement and preserves other .env entries.
        set_key(str(ENV_PATH), 'QN_CHECK_CODE', code, quote_mode='always', encoding='utf-8')
    except OSError:
        raise HTTPException(503, '保存失败，请检查后端配置文件是否可写')
    return registration_state()

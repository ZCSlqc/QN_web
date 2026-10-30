from typing import Literal
import json
import uuid
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.database import get_db, bj_time
from app.core.security import require_admin, require_page_access
from app.core.settings import settings

router = APIRouter(prefix='/wedding', tags=['婚礼猫咪'])

APPEARANCE_KEYS = frozenset('animalHead formalStyle formalColor matchedBottom veil headwear skin hair shirt sleeve innerSleeve pants leg shoes face faceLayout eyes eyebrows mouth nose topStyle topColor coatStyle coatColor bottomStyle bottomColor'.split())


class WardrobeAppearance(BaseModel):
    model_config = ConfigDict(extra='forbid')
    appearance: dict

    @field_validator('appearance')
    @classmethod
    def small_part_identifiers(cls, value):
        if not value or set(value) - APPEARANCE_KEYS:
            raise ValueError('请保存有效的服装部件')
        for part in value.values():
            if part is not None and type(part) is not bool and (not isinstance(part, str) or len(part) > 96):
                raise ValueError('服装仅保存部件标识')
        return value


class OutfitSave(WardrobeAppearance):
    name: str = Field(min_length=1, max_length=24)

    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError('请填写搭配名称')
        return value


def wardrobe_user(conn, username):
    row = conn.execute('SELECT id FROM user WHERE username=?', (username,)).fetchone()
    if row is None:
        raise HTTPException(401, '请重新登录')
    return row['id']


def wardrobe_data(conn, user_id):
    row = conn.execute('SELECT appearance,outfits,revision FROM wedding_wardrobes WHERE user_id=?', (user_id,)).fetchone()
    return {'appearance': json.loads(row['appearance']) if row and row['appearance'] else None,
            'outfits': json.loads(row['outfits']) if row else [], 'revision': row['revision'] if row else 0}


def wardrobe_response(data, user_id):
    return JSONResponse(data, headers={'Cache-Control': 'private, no-cache', 'Vary': 'Authorization',
                                      'ETag': f'"wardrobe-{user_id}-{data["revision"]}"'})


@router.get('/people')
def wedding_people(request: Request, username=Depends(require_page_access('/wedding'))):
    with get_db() as conn:
        rows = conn.execute('''SELECT u.username,u.nickname,w.appearance FROM user u
                               LEFT JOIN wedding_wardrobes w ON w.user_id=u.id
                               ORDER BY CASE WHEN u.username=? THEN 0 WHEN u.username IN (?,?) THEN 1 ELSE 2 END,u.userdate,u.id''', (username, settings.WEDDING_GROOM_USER, settings.WEDDING_BRIDE_USER)).fetchall()
    people = []
    for row in rows:
        name = row['username']
        role = ('groom' if name == settings.WEDDING_GROOM_USER else 'bride' if name == settings.WEDDING_BRIDE_USER else None) if name in settings.ADMIN_USERS else None
        persona = 'calm-girl' if name == 'shenqidayang' else 'lively-boy' if name == 'lqc' else 'guest'
        people.append({'username': name, 'name': row['nickname'] or name,
                       'role': role, 'persona': persona, 'appearance': json.loads(row['appearance']) if row['appearance'] else None})
    data = {'people': people}
    digest = hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:20]
    headers = {'Cache-Control': 'private, no-cache', 'Vary': 'Authorization', 'ETag': f'"wedding-people-{digest}"'}
    if request.headers.get('if-none-match') == headers['ETag']:
        return Response(status_code=304, headers=headers)
    return JSONResponse(data, headers=headers)


@router.get('/wardrobe')
def get_wardrobe(request: Request, username=Depends(require_page_access('/wedding'))):
    with get_db() as conn:
        user_id = wardrobe_user(conn, username)
        data = wardrobe_data(conn, user_id)
    result = wardrobe_response(data, user_id)
    if request.headers.get('if-none-match') == result.headers['etag']:
        return Response(status_code=304, headers=dict(result.headers))
    return result


@router.put('/wardrobe')
def save_appearance(body: WardrobeAppearance, username=Depends(require_page_access('/wedding'))):
    with get_db() as conn:
        user_id = wardrobe_user(conn, username)
        conn.execute('''INSERT INTO wedding_wardrobes(user_id,appearance,revision,updated_at) VALUES(?,?,1,?)
                        ON CONFLICT(user_id) DO UPDATE SET appearance=excluded.appearance,
                        revision=wedding_wardrobes.revision+1,updated_at=excluded.updated_at''',
                     (user_id, json.dumps(body.appearance, ensure_ascii=False), bj_time()))
        data = wardrobe_data(conn, user_id)
    return wardrobe_response(data, user_id)


@router.post('/wardrobe/outfits')
def save_outfit(body: OutfitSave, username=Depends(require_page_access('/wedding'))):
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        user_id = wardrobe_user(conn, username)
        data = wardrobe_data(conn, user_id)
        if len(data['outfits']) >= 24:
            raise HTTPException(422, '最多保存24套搭配，请先移除一套')
        outfits = [*data['outfits'], {'id': str(uuid.uuid4()), 'name': body.name, 'appearance': body.appearance}]
        conn.execute('''INSERT INTO wedding_wardrobes(user_id,outfits,revision,updated_at) VALUES(?,?,1,?)
                        ON CONFLICT(user_id) DO UPDATE SET outfits=excluded.outfits,
                        revision=wedding_wardrobes.revision+1,updated_at=excluded.updated_at''',
                     (user_id, json.dumps(outfits, ensure_ascii=False), bj_time()))
        data = wardrobe_data(conn, user_id)
    return wardrobe_response(data, user_id)


@router.delete('/wardrobe/outfits/{outfit_id}')
def delete_outfit(outfit_id: str, username=Depends(require_page_access('/wedding'))):
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        user_id = wardrobe_user(conn, username)
        data = wardrobe_data(conn, user_id)
        outfits = [item for item in data['outfits'] if item['id'] != outfit_id]
        if len(outfits) == len(data['outfits']):
            raise HTTPException(404, '这套搭配不存在')
        conn.execute('UPDATE wedding_wardrobes SET outfits=?,revision=revision+1,updated_at=? WHERE user_id=?',
                     (json.dumps(outfits, ensure_ascii=False), bj_time(), user_id))
        data = wardrobe_data(conn, user_id)
    return wardrobe_response(data, user_id)


class CatUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    personality: Literal['clingy', 'lazy', 'shy', 'playful', 'alert'] | None = None
    rest_weight: int | None = Field(default=None, ge=0, le=100, strict=True)
    explore_weight: int | None = Field(default=None, ge=0, le=100, strict=True)
    social_weight: int | None = Field(default=None, ge=0, le=100, strict=True)
    approach_weight: int | None = Field(default=None, ge=0, le=100, strict=True)
    speed: int | None = Field(default=None, ge=20, le=100, strict=True)
    roam_radius: int | None = Field(default=None, ge=60, le=350, strict=True)
    rest_min: int | None = Field(default=None, ge=2, le=30, strict=True)
    rest_max: int | None = Field(default=None, ge=2, le=40, strict=True)


def response(data):
    return JSONResponse(data, headers={'Cache-Control': 'no-store', 'Vary': 'Authorization'})


@router.get('/cats')
def get_cats(username=Depends(require_page_access('/wedding'))):
    with get_db() as conn:
        rows = conn.execute('SELECT * FROM wedding_cat_npcs ORDER BY sort_order').fetchall()
    return response({'cats': [dict(row) for row in rows]})


@router.patch('/cats/{cat_id}')
def update_cat(cat_id: str, body: CatUpdate, username=Depends(require_admin)):
    values = body.model_dump(exclude_unset=True)
    if not values or any(value is None for value in values.values()):
        raise HTTPException(422, '请提供有效的猫咪活动参数')
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute('SELECT * FROM wedding_cat_npcs WHERE id=?', (cat_id,)).fetchone()
        if row is None:
            raise HTTPException(404, '猫咪不存在')
        merged = dict(row) | values
        if sum(merged[key] for key in ('rest_weight', 'explore_weight', 'social_weight', 'approach_weight')) != 100:
            raise HTTPException(422, '四种活动权重之和必须为100')
        if merged['rest_min'] > merged['rest_max']:
            raise HTTPException(422, '最短休息时间不能超过最长休息时间')
        values['updated_at'] = bj_time()
        # Column names come exclusively from the validated model, never from raw input.
        conn.execute('UPDATE wedding_cat_npcs SET ' + ','.join(f'{key}=?' for key in values) + ' WHERE id=?',
                     [*values.values(), cat_id])
        result = dict(conn.execute('SELECT * FROM wedding_cat_npcs WHERE id=?', (cat_id,)).fetchone())
    return response(result)

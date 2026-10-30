from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from app.core.security import get_current_user, require_page_access
from app.core.settings import settings
from app.services.pet import get_state, get_activity, can_feed, feed, set_weather

router = APIRouter(prefix='/pet', tags=['六一的小窝'])


@router.put('/weather')
def update_weather(weather: str = Form(...), username=Depends(get_current_user)):
    return JSONResponse(set_weather(username, weather), headers={'Cache-Control': 'no-store'})


@router.get('')
def get_pet(username=Depends(require_page_access('/pet'))):
    return JSONResponse(get_state(username), headers={'Cache-Control': 'no-store', 'Vary': 'Authorization'})


@router.get('/activity')
def pet_activity(cursor: str = None, username=Depends(require_page_access('/pet'))):
    return JSONResponse(get_activity(cursor), headers={'Cache-Control': 'no-store', 'Vary': 'Authorization'})


@router.post('/feed')
def feed_pet(food: str = Form(...), request_key: str = Form(...), username=Depends(get_current_user)):
    if username is None:
        raise HTTPException(401, '请先登录')
    if not can_feed(username):
        raise HTTPException(403, '投喂只对情侣双方开放，欢迎摸摸六一')
    return JSONResponse(feed(username, food, request_key), headers={'Cache-Control': 'no-store'})


@router.post('/reward-feed')
def feed_reward(request_key: str = Form(...), username=Depends(require_page_access('/pet'))):
    if username in settings.ADMIN_USERS:
        raise HTTPException(403, '管理员使用情侣背包，不能使用访客留言猫条')
    return JSONResponse(feed(username, 'treat', request_key, personal=True), headers={'Cache-Control': 'no-store'})

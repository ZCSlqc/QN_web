from app.core.uuid_ids import inserted_id
"""One shared pet, transactional inventory and an immutable feeding ledger."""
from fastapi import HTTPException
import re
from app.core.database import get_db, bj_time
from app.core.settings import settings
from app.services.profiles import display_name
from app.services.pet_wallets import prepare_wallets, balances

PET_ID = '3673107b-6c7d-4c37-9b5b-47519076cd31'
FOODS = {
    'treat': {'name': '猫条', 'unit': '根'},
    'kibble': {'name': '猫粮', 'unit': '份'},
    'can': {'name': '猫罐头', 'unit': '罐'},
}


def can_feed(username):
    return bool(username and len(settings.ADMIN_USERS) == 2 and username in settings.ADMIN_USERS)


def state(conn, username, activity_limit=20):
    environment = conn.execute('SELECT weather FROM pet_environment WHERE pet_id=?', (PET_ID,)).fetchone()
    profile = conn.execute('SELECT name,created_at FROM pets WHERE id=?', (PET_ID,)).fetchone()
    members = prepare_wallets(conn, bj_time())
    viewer = conn.execute('SELECT id,nickname FROM user WHERE username=?', (username,)).fetchone() if username else None
    viewer_id = viewer['id'] if viewer else None
    is_admin = bool(username and username in settings.ADMIN_USERS)
    inventory, own, partner, partner_name = balances(conn, members, viewer_id)
    totals = conn.execute("SELECT count(*) AS feed_count,MAX(created_at) AS last_fed_at FROM pet_ledger WHERE pet_id=? AND kind IN ('feed','reward_feed')", (PET_ID,)).fetchone()
    events = conn.execute("SELECT id,actor_id,actor_name,kind,food,quantity,created_at,inventory_owner_id FROM pet_ledger WHERE pet_id=? AND kind IN ('feed','reward_feed') ORDER BY created_at DESC, rowid DESC LIMIT ?", (PET_ID, activity_limit)).fetchall()
    activity = []
    for event in events:
        item = dict(event)
        item['actor_name'] = display_name(conn, user_id=event['actor_id'], fallback=event['actor_name'])
        item['inventory_owner_name'] = display_name(conn, user_id=event['inventory_owner_id']) if event['inventory_owner_id'] else ''
        activity.append(item)
    personal = conn.execute('SELECT treats FROM pet_user_inventory WHERE user_id=?', (viewer_id,)).fetchone()
    claimed = conn.execute('SELECT 1 FROM pet_blessing_rewards WHERE user_id=? AND reward_day=?', (viewer_id, bj_time()[:10])).fetchone()
    return {'id': PET_ID, 'name': profile['name'], 'joined_at': profile['created_at'], 'can_feed': can_feed(username) and len(members) == 2,
            'viewer_id': viewer_id, 'is_admin': is_admin, 'weather': environment['weather'] if environment else 'sunny',
            'can_spend_personal': bool(viewer and not is_admin and '/cat' in settings.USER_PAGE_ALLOWLIST),
            'inventory': inventory if is_admin else None, 'own_inventory': own if is_admin else None,
            'partner_inventory': partner if is_admin else None, 'partner_name': partner_name if is_admin else '',
            'personal_treats': personal['treats'] if personal and not is_admin else 0, 'reward_claimed_today': bool(claimed),
            'feed_count': totals['feed_count'], 'last_fed_at': totals['last_fed_at'], 'activity': activity}



def get_state(username, activity_limit=20):
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        return state(conn, username, activity_limit)


def set_weather(username, weather):
    if not username:
        raise HTTPException(401, '请先登录')
    if username not in settings.ADMIN_USERS:
        raise HTTPException(403, '天气由小窝的主人决定')
    if weather not in ('sunny', 'cloudy', 'rainy'):
        raise HTTPException(400, '请选择晴天、阴天或雨天')
    with get_db() as conn:
        conn.execute('INSERT INTO pet_environment(pet_id,weather) VALUES (?,?) ON CONFLICT(pet_id) DO UPDATE SET weather=excluded.weather', (PET_ID, weather))
    return {'weather': weather}


def feed(username, food, request_key, personal=False):
    if food not in FOODS:
        raise HTTPException(400, '请选择猫条、猫粮或猫罐头')
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,80}', request_key):
        raise HTTPException(400, '投喂标识无效，请刷新页面重试')
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        actor = conn.execute('SELECT id FROM user WHERE username=?', (username,)).fetchone()
        if not actor:
            raise HTTPException(401, '请重新登录')
        if personal and username in settings.ADMIN_USERS:
            raise HTTPException(403, '主人使用共同背包，不领取或使用访客留言猫条')
        members = prepare_wallets(conn, bj_time())
        kind = 'reward_feed' if personal else 'feed'
        existing = conn.execute('SELECT id,food,kind FROM pet_ledger WHERE pet_id=? AND actor_id=? AND request_key=?', (PET_ID, actor['id'], request_key)).fetchone()
        if existing:
            if existing['food'] != food or existing['kind'] != kind:
                raise HTTPException(409, '上一次投喂已经完成，请刷新后再选择食物')
            return {'event_id': existing['id'], 'replayed': True, 'pet': state(conn, username)}
        inventory_owner = actor['id']
        if personal:
            result = conn.execute('UPDATE pet_user_inventory SET treats=treats-1 WHERE user_id=? AND treats>0', (actor['id'],))
        else:
            if not can_feed(username) or len(members) != 2:
                raise HTTPException(403, '仅两位主人可使用共同背包')
            result = conn.execute('UPDATE pet_member_inventory SET amount=amount-1 WHERE user_id=? AND food=? AND amount>0', (actor['id'], food))
            if not result.rowcount:
                inventory_owner = next(member['id'] for member in members if member['id'] != actor['id'])
                result = conn.execute('UPDATE pet_member_inventory SET amount=amount-1 WHERE user_id=? AND food=? AND amount>0', (inventory_owner, food))
        if not result.rowcount:
            raise HTTPException(409, f"{FOODS[food]['name']}已经吃完啦，先摸摸六一吧")
        event = conn.execute("INSERT INTO pet_ledger(pet_id,actor_id,actor_name,kind,food,quantity,request_key,created_at,inventory_owner_id) VALUES (?,?,?,?,?,-1,?,?,?)",
                             (PET_ID, actor['id'], username, kind, food, request_key, bj_time(), inventory_owner))
        return {'event_id': inserted_id(conn, event, 'pet_ledger'), 'replayed': False, 'pet': state(conn, username)}

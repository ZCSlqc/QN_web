from app.core.uuid_ids import inserted_id, SYSTEM_ID
import json
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from app.core.database import get_db, bj_time
from app.core.security import require_admin, require_page_access
from app.services.pet_wallets import grant_activity_food
from app.services.idempotency import lookup, remember
from app.services.journeys import normalize_cities, journey_payload
from app.api.photos import store_photo, photo_payload
from app.services.photo_cleanup import cleanup_photo
from pydantic import BaseModel

class PhotoOrder(BaseModel):
    ids: list[str]
    original_ids: list[str]

router = APIRouter(dependencies=[Depends(require_page_access('/journey'))])


def validate_journey(adcodes, name, departure_date, return_date, notes):
    normalize_cities(name, adcodes)
    try:
        departure = datetime.date.fromisoformat(departure_date)
        returning = datetime.date.fromisoformat(return_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="请填写有效的出发和返程日期")
    if returning < departure:
        raise HTTPException(status_code=400, detail="返程日期不能早于出发日期")
    if len(notes) > 2000:
        raise HTTPException(status_code=400, detail="备注不能超过2000字")


@router.get("/journeys")
def get_journeys(summary: bool = False):
    with get_db() as conn:
        selection = "id,name,adcodes,departure_date,return_date,created_at,updated_at,substr(notes,1,160) AS notes,substr(checkin_points,1,200) AS checkin_points,substr(event,1,120) AS event" if summary else '*'
        rows = conn.execute(f"SELECT {selection} FROM journeys ORDER BY created_at DESC, rowid DESC").fetchall()
        photos = conn.execute('WITH ranked AS (SELECT *,ROW_NUMBER() OVER (PARTITION BY journey_id ORDER BY display_order,created_at,rowid) AS rank,COUNT(*) OVER (PARTITION BY journey_id) AS total FROM photos WHERE journey_id IS NOT NULL AND removed=0) SELECT * FROM ranked WHERE rank<=2 ORDER BY journey_id,rank').fetchall()
        grouped = {}
        for photo in photos:
            grouped.setdefault(photo['journey_id'], []).append(photo_payload(photo))
        counts = {photo['journey_id']: photo['total'] for photo in photos}
    return {"data": [journey_payload(row) | {'_summary': summary, 'photo_count': counts.get(row['id'], 0), 'cover': next(iter(grouped.get(row['id'], [])), None), 'cover_photos': grouped.get(row['id'], [])} for row in rows]}


@router.get('/journeys/{journey_id}')
def get_journey(journey_id: str):
    with get_db() as conn:
        row = conn.execute('SELECT * FROM journeys WHERE id=?', (journey_id,)).fetchone()
    if not row:
        raise HTTPException(404, '旅程记录不存在')
    return {'data': journey_payload(row)}


@router.get('/journey-search')
def search_journeys(q: str = ''):
    with get_db() as conn:
        rows = conn.execute("SELECT id FROM journeys WHERE instr(name || ' ' || COALESCE(checkin_points,'') || ' ' || COALESCE(event,'') || ' ' || COALESCE(notes,''), ?) > 0", (q.strip(),)).fetchall()
    return {'ids': [row['id'] for row in rows]}


@router.get('/journeys/{journey_id}/photos')
def list_journey_photos(journey_id: str):
    with get_db() as conn:
        if not conn.execute('SELECT 1 FROM journeys WHERE id=?', (journey_id,)).fetchone():
            raise HTTPException(404, '旅程记录不存在')
        rows = conn.execute('SELECT * FROM photos WHERE journey_id=? AND removed=0 ORDER BY display_order ASC,created_at ASC,rowid ASC', (journey_id,)).fetchall()
    return {'data': [photo_payload(row) for row in rows]}


@router.post('/journeys/{journey_id}/photos', status_code=201)
def upload_journey_photo(journey_id: str, file: UploadFile = File(...), caption: str = Form(''), request_key: str = Form(''), current_user: str = Depends(require_admin)):
    return store_photo(file, caption, request_key, current_user, journey_id)


@router.put('/journeys/{journey_id}/photo-order')
def reorder_photos(journey_id: str, order: PhotoOrder, current_user: str = Depends(require_admin)):
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        if not conn.execute('SELECT 1 FROM journeys WHERE id=?', (journey_id,)).fetchone():
            raise HTTPException(404, '旅程不存在')
        current = [row['id'] for row in conn.execute('SELECT id FROM photos WHERE journey_id=? AND removed=0 ORDER BY display_order,created_at,rowid', (journey_id,))]
        if current != order.original_ids:
            raise HTTPException(409, '照片列表已变化，请取消排序并刷新后重试')
        if len(order.ids) != len(set(order.ids)) or set(order.ids) != set(current):
            raise HTTPException(400, '排序必须包含这段旅程的全部照片且不能重复')
        conn.executemany('UPDATE photos SET display_order=? WHERE id=? AND journey_id=?', [(index, photo_id, journey_id) for index, photo_id in enumerate(order.ids)])
    return {'status': 'success'}


@router.put('/journeys/{journey_id}/photos/{photo_id}')
def edit_journey_photo(journey_id: str, photo_id: str, caption: str = Form(''), current_user: str = Depends(require_admin)):
    if len(caption.strip()) > 100:
        raise HTTPException(400, '照片描述不能超过100字')
    with get_db() as conn:
        result = conn.execute('UPDATE photos SET caption=? WHERE id=? AND journey_id=? AND removed=0', (caption.strip(), photo_id, journey_id))
        if not result.rowcount:
            raise HTTPException(404, '照片不存在')
    return {'status': 'success'}


@router.delete('/journeys/{journey_id}/photos/{photo_id}')
def delete_journey_photo(journey_id: str, photo_id: str, current_user: str = Depends(require_admin)):
    with get_db() as conn:
        result = conn.execute('UPDATE photos SET removed=1 WHERE id=? AND journey_id=?', (photo_id, journey_id))
        if not result.rowcount:
            raise HTTPException(404, '照片不存在')
    return {'status': 'success', 'cleanup_pending': not cleanup_photo(photo_id)}


def prepare_journey(name, adcodes, departure_date, return_date, notes, checkin_points, event):
    names, codes = normalize_cities(name, adcodes)
    validate_journey(json.dumps(codes), json.dumps(names), departure_date, return_date, notes)
    if len(checkin_points) > 2000 or len(event) > 500:
        raise HTTPException(400, detail="打卡点不能超过2000字，大事件不能超过500字")
    return (json.dumps(names, ensure_ascii=False), json.dumps(codes), departure_date, return_date,
            notes.strip(), checkin_points.strip(), event.strip())


@router.post("/journeys")
def add_journey(
    name: str = Form(...), adcodes: str = Form(...),
    departure_date: str = Form(""), return_date: str = Form(""),
    notes: str = Form(""),
    checkin_points: str = Form(""), event: str = Form(""),
    request_key: str = Form(""),
    current_user: str = Depends(require_admin),
):
    values = prepare_journey(name, adcodes, departure_date, return_date, notes, checkin_points, event)
    now = bj_time()
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        existing, marker = lookup(conn, 'journey', current_user, request_key, json.dumps(values, ensure_ascii=False).encode())
        if existing is not None:
            return {'status': 'success', 'id': existing}
        result = conn.execute("INSERT INTO journeys(name,adcodes,departure_date,return_date,notes,checkin_points,event,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)", values + (now, now))
        remember(conn, marker, inserted_id(conn, result, 'journeys'))
        awarded = 0
        if return_date <= now[:10]:
            awarded = grant_activity_food(conn, current_user, 'journey', inserted_id(conn, result, 'journeys'), now)
        return {'status': 'success', 'id': inserted_id(conn, result, 'journeys'), 'food_reward': {'food': 'can', 'amount': awarded}}


@router.put("/journeys/{journey_id}")
def update_journey(
    journey_id: str, name: str = Form(...), adcodes: str = Form(...),
    departure_date: str = Form(""), return_date: str = Form(""),
    notes: str = Form(""),
    checkin_points: Optional[str] = Form(None), event: Optional[str] = Form(None),
    current_user: str = Depends(require_admin),
):
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        old = conn.execute("SELECT * FROM journeys WHERE id=?", (journey_id,)).fetchone()
        if not old:
            raise HTTPException(404, detail="旅程记录不存在")
        values = prepare_journey(name, adcodes, departure_date, return_date, notes,
                                 old['checkin_points'] if checkin_points is None else checkin_points,
                                 old['event'] if event is None else event)
        conn.execute("UPDATE journeys SET name=?,adcodes=?,departure_date=?,return_date=?,notes=?,checkin_points=?,event=?,updated_at=? WHERE id=?", values + (bj_time(), journey_id))
        awarded = 0
        if return_date <= bj_time()[:10]:
            awarded = grant_activity_food(conn, current_user, 'journey', journey_id, bj_time())
    return {"status": "success", "food_reward": {"food": "can", "amount": awarded}}


@router.delete("/journeys/{journey_id}")
def delete_journey(journey_id: str, current_user: str = Depends(require_admin)):
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        photo_ids = [row['id'] for row in conn.execute('SELECT id FROM photos WHERE journey_id=?', (journey_id,))]
        for plan in conn.execute('SELECT id FROM journey_plans WHERE converted_journey_id=?', (journey_id,)).fetchall():
            conn.execute("INSERT OR IGNORE INTO idempotent_operations(operation,user_id,request_key,fingerprint,result_id) VALUES ('deleted_plan_conversion',?,?,?,?)", (SYSTEM_ID,plan['id'],'deleted',journey_id))
        conn.execute('DELETE FROM journey_plans WHERE converted_journey_id=?', (journey_id,))
        conn.execute('UPDATE photos SET removed=1 WHERE journey_id=?', (journey_id,))
        result = conn.execute("DELETE FROM journeys WHERE id=?", (journey_id,))
        if not result.rowcount:
            raise HTTPException(status_code=404, detail="旅程记录不存在")
    pending = sum(not cleanup_photo(photo_id) for photo_id in photo_ids)
    return JSONResponse({"status": "success", "cleanup_pending": bool(pending)})




def prepare_plan(name, adcodes, expected_departure, checkin_points, reason):
    names, codes = normalize_cities(name, adcodes)
    # Ordinary province codes are not city destinations.
    if any(code.endswith('0000') and code[:2] not in ('11', '12', '31', '50', '81', '82') for code in codes):
        raise HTTPException(400, '请选择具体城市')
    if expected_departure:
        try:
            if datetime.date.fromisoformat(expected_departure).isoformat() != expected_departure:
                raise ValueError()
        except ValueError:
            raise HTTPException(400, '请填写有效的预估去程日期')
    if len(checkin_points) > 2000 or len(reason) > 2000:
        raise HTTPException(400, '打卡点和想去原因不能超过2000字')
    return (json.dumps(names, ensure_ascii=False), json.dumps(codes), expected_departure,
            checkin_points.strip(), reason.strip())


@router.get('/journey-plans')
def get_plans():
    with get_db() as conn:
        rows = conn.execute('SELECT * FROM journey_plans WHERE converted_journey_id IS NULL ORDER BY created_at DESC, rowid DESC').fetchall()
    return {'data': [journey_payload(row) for row in rows]}


@router.post('/journey-plans')
def add_plan(name: str = Form(...), adcodes: str = Form(...), expected_departure: str = Form(''),
             checkin_points: str = Form(''), reason: str = Form(''), current_user: str = Depends(require_admin)):
    values = prepare_plan(name, adcodes, expected_departure, checkin_points, reason)
    with get_db() as conn:
        cursor = conn.execute('INSERT INTO journey_plans(name,adcodes,expected_departure,checkin_points,reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', values + (bj_time(), bj_time()))
        return {'status': 'success', 'id': inserted_id(conn, cursor, 'journey_plans')}


@router.put('/journey-plans/{plan_id}')
def update_plan(plan_id: str, name: str = Form(...), adcodes: str = Form(...), expected_departure: str = Form(''),
                checkin_points: str = Form(''), reason: str = Form(''), current_user: str = Depends(require_admin)):
    values = prepare_plan(name, adcodes, expected_departure, checkin_points, reason)
    with get_db() as conn:
        cursor = conn.execute('UPDATE journey_plans SET name=?,adcodes=?,expected_departure=?,checkin_points=?,reason=?,updated_at=? WHERE id=? AND converted_journey_id IS NULL', values + (bj_time(), plan_id))
        if not cursor.rowcount:
            raise HTTPException(409, '预定不存在或已经转为旅程，请刷新后重试')
    return {'status': 'success'}


@router.delete('/journey-plans/{plan_id}')
def cancel_plan(plan_id: str, current_user: str = Depends(require_admin)):
    with get_db() as conn:
        cursor = conn.execute('DELETE FROM journey_plans WHERE id=? AND converted_journey_id IS NULL', (plan_id,))
        if not cursor.rowcount:
            raise HTTPException(409, '预定不存在或已经转为旅程，请刷新后重试')
    return {'status': 'success'}


@router.post('/journey-plans/{plan_id}/convert')
def convert_plan(plan_id: str, name: str = Form(...), adcodes: str = Form(...),
                 departure_date: str = Form(''), return_date: str = Form(''),
                 checkin_points: str = Form(''), notes: str = Form(''), event: str = Form(''),
                 reason: Optional[str] = Form(None),
                 current_user: str = Depends(require_admin)):
    values = prepare_journey(name, adcodes, departure_date, return_date, notes, checkin_points, event)
    if reason is not None and len(reason) > 2000:
        raise HTTPException(400, '想去原因不能超过2000字')
    with get_db() as conn:
        # Serialize conversion with edits/cancellation; a retried request returns the same journey.
        conn.execute('BEGIN IMMEDIATE')
        plan = conn.execute('SELECT * FROM journey_plans WHERE id=?', (plan_id,)).fetchone()
        if not plan:
            if conn.execute("SELECT 1 FROM idempotent_operations WHERE operation='deleted_plan_conversion' AND user_id=? AND request_key=?", (SYSTEM_ID,plan_id)).fetchone():
                raise HTTPException(410, '这条预定已转换，关联旅程已删除，不能重复转换')
            raise HTTPException(404, '预定旅程不存在')
        if plan['converted_journey_id'] is not None:
            return {'status': 'success', 'id': plan['converted_journey_id']}
        now = bj_time()
        cursor = conn.execute('INSERT INTO journeys(name,adcodes,departure_date,return_date,notes,checkin_points,event,created_at,updated_at,planning_reason) VALUES (?,?,?,?,?,?,?,?,?,?)', values + (now, now, plan['reason'] if reason is None else reason.strip()))
        journey_id = inserted_id(conn, cursor, 'journeys')
        awarded = 0
        if return_date <= now[:10]:
            awarded = grant_activity_food(conn, current_user, 'journey', journey_id, now)
        conn.execute('UPDATE journey_plans SET converted_journey_id=?,updated_at=? WHERE id=?', (journey_id, now, plan_id))
    return {'status': 'success', 'id': journey_id, 'food_reward': {'food': 'can', 'amount': awarded}}

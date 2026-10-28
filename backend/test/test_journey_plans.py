import json
import pytest
from .helpers import owner_headers, journey_data


def plan_data(**changes):
    return dict(name=json.dumps(['杭州市']), adcodes='["330100"]',
                expected_departure='2026-11-01', checkin_points='西湖', reason='一起看秋天', **changes)


def test_plan_conversion_is_atomic_idempotent_and_preserves_reason(api):
    client, module = api
    headers = owner_headers(client)
    plan_id = client.post('/journey-plans', data=plan_data(), headers=headers).json()['id']
    assert client.get('/journeys', headers=headers).json()['data'] == []
    bad = client.post(f'/journey-plans/{plan_id}/convert', data=journey_data(return_date='2020-01-01'), headers=headers)
    assert bad.status_code == 400
    assert len(client.get('/journey-plans', headers=headers).json()['data']) == 1
    data = journey_data(name='["杭州市","上海市"]', adcodes='["330100","310000"]', notes='实际旅途感想')
    first = client.post(f'/journey-plans/{plan_id}/convert', data=data, headers=headers)
    again = client.post(f'/journey-plans/{plan_id}/convert', data=data, headers=headers)
    assert first.status_code == again.status_code == 200
    assert first.json()['id'] == again.json()['id']
    assert first.json()['status'] == again.json()['status'] == 'success'
    assert again.json().get('food_reward', {}).get('amount', 0) == 0
    assert client.get('/journey-plans', headers=headers).json()['data'] == []
    rows = client.get('/journeys', headers=headers).json()['data']
    assert len(rows) == 1
    assert rows[0]['planning_reason'] == '一起看秋天'
    assert rows[0]['notes'] == '实际旅途感想'
    assert rows[0]['adcodes'] == ['330100', '310000']
    assert client.put(f'/journey-plans/{plan_id}', data=plan_data(), headers=headers).status_code == 409
    module.init_db()
    assert client.get('/journeys', headers=headers).json()['data'] == rows


def test_plan_crud_without_date_and_city_changes(api):
    client, _ = api
    headers = owner_headers(client)
    data = plan_data()
    data['expected_departure'] = ''
    plan_id = client.post('/journey-plans', data=data, headers=headers).json()['id']
    data.update(name='["上海市"]', adcodes='["310000"]', reason='再次出发')
    assert client.put(f'/journey-plans/{plan_id}', data=data, headers=headers).status_code == 200
    row = client.get('/journey-plans', headers=headers).json()['data'][0]
    assert row['adcodes'] == ['310000'] and row['expected_departure'] == ''
    assert client.delete(f'/journey-plans/{plan_id}', headers=headers).status_code == 200
    assert client.get('/journey-plans', headers=headers).json()['data'] == []
    assert client.get('/journeys', headers=headers).json()['data'] == []
    assert client.post(f'/journey-plans/{plan_id}/convert', data=journey_data(), headers=headers).status_code == 404


@pytest.mark.parametrize('changes', [dict(expected_departure='2026-02-30'), dict(adcodes='[]'), dict(reason='x'*2001), dict(adcodes='["330000"]')])
def test_invalid_plans_rejected(api, changes):
    client, _ = api
    data = plan_data(); data.update(changes)
    assert client.post('/journey-plans', data=data, headers=owner_headers(client)).status_code == 400


@pytest.mark.parametrize('method,path', [('post','/journey-plans'), ('put','/journey-plans/1'), ('delete','/journey-plans/1'), ('post','/journey-plans/1/convert')])
def test_plan_writes_require_admin(api, method, path):
    client, _ = api
    assert getattr(client, method)(path, **({'data': plan_data()} if method != 'delete' else {})).status_code == 401


def test_guest_cannot_change_plans(api):
    client, module = api
    token = client.post('/register_process', data={'username': 'guest', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    headers = {'Authorization': f'Bearer {token}'}
    for method, path in [('post', '/journey-plans'), ('put', '/journey-plans/1'), ('post', '/journey-plans/1/convert')]:
        assert getattr(client, method)(path, data=plan_data(), headers=headers).status_code == 403
    assert client.delete('/journey-plans/1', headers=headers).status_code == 403

import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest
from .helpers import photo_bytes


@pytest.fixture
def pet_pair(api, monkeypatch):
    client, module = api
    auth = {}
    for name in ['养猫甲', '养猫乙', '其他管理员', '访客']:
        result = client.post('/register_process', data={'username': name, 'userpwd': 'cat-password', 'checkcode': module.settings.CHECK_CODE})
        auth[name] = {'Authorization': 'Bearer ' + result.json()['token']}
    monkeypatch.setattr(module.settings, 'ADMIN_USERS', frozenset({'养猫甲', '养猫乙'}))
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset({'/index', '/pet'}))
    return client, module, auth


def credit(module, name, food, count):
    from app.services.pet_wallets import add_credit
    with module.get_db() as conn:
        user_id = conn.execute('SELECT id FROM user WHERE username=?', (name,)).fetchone()[0]
        add_credit(conn, user_id, food, count)


def test_shared_weather_is_validated_persistent_and_admin_only(pet_pair):
    client, module, auth = pet_pair
    assert client.get('/pet', headers=auth['访客']).json()['weather'] == 'sunny'
    assert client.put('/pet/weather', data={'weather': 'rainy'}).status_code == 401
    assert client.put('/pet/weather', data={'weather': 'rainy'}, headers=auth['访客']).status_code == 403
    assert client.put('/pet/weather', data={'weather': 'storm'}, headers=auth['养猫甲']).status_code == 400
    assert client.put('/pet/weather', data={'weather': 'rainy'}, headers=auth['养猫甲']).json()['weather'] == 'rainy'
    module.init_db()
    assert client.get('/pet', headers=auth['访客']).json()['weather'] == 'rainy'
    assert client.put('/pet/weather', data={'weather': 'cloudy'}, headers=auth['养猫乙']).status_code == 200
    assert client.get('/pet', headers=auth['访客']).json()['weather'] == 'cloudy'
    assert client.put('/pet/weather', data={'weather': 'sunny'}, headers=auth['养猫乙']).status_code == 200
    assert client.get('/pet', headers=auth['访客']).json()['weather'] == 'sunny'


def test_backpack_is_admin_only_and_new_food_is_not_seeded(pet_pair):
    client, module, auth = pet_pair
    assert client.get('/pet').status_code == 401
    assert client.get('/pet', headers=auth['访客']).json()['inventory'] is None
    admin = client.get('/pet', headers=auth['养猫甲']).json()
    assert admin['inventory'] == {'treat': 0, 'kibble': 0, 'can': 0}
    assert admin['can_feed'] is True
    module.init_db()
    assert client.get('/pet', headers=auth['养猫甲']).json()['inventory'] == admin['inventory']
    assert client.get('/pet', headers=auth['其他管理员']).json()['can_feed'] is False


def test_only_couple_can_feed_and_admin_cannot_claim_visitor_reward(pet_pair):
    client, _, auth = pet_pair
    data = {'food': 'can', 'request_key': uuid.uuid4().hex}
    assert client.post('/pet/feed', data=data).status_code == 401
    assert client.post('/pet/feed', data=data, headers=auth['其他管理员']).status_code == 403
    assert client.post('/pet/reward-feed', data={'request_key': uuid.uuid4().hex}, headers=auth['养猫甲']).status_code == 403
    reward = client.post('/blessings', data={'content': '管理员祝福'}, headers=auth['养猫甲']).json()
    assert reward['treat_reward'] == 0 and reward['reward_status'] == 'none'
    assert client.post('/blessings', data={'content': '访客祝福'}, headers=auth['访客']).json()['treat_reward'] == 1


def test_spends_self_then_partner_and_replay_is_free(pet_pair):
    client, module, auth = pet_pair
    credit(module, '养猫甲', 'treat', 1)
    credit(module, '养猫乙', 'treat', 2)
    key = uuid.uuid4().hex
    first = client.post('/pet/feed', data={'food': 'treat', 'request_key': key}, headers=auth['养猫甲']).json()
    assert first['pet']['own_inventory']['treat'] == 0
    assert first['pet']['partner_inventory']['treat'] == 2
    repeated = client.post('/pet/feed', data={'food': 'treat', 'request_key': key}, headers=auth['养猫甲']).json()
    assert repeated['replayed'] is True and repeated['pet']['inventory']['treat'] == 2
    second = client.post('/pet/feed', data={'food': 'treat', 'request_key': uuid.uuid4().hex}, headers=auth['养猫甲']).json()
    assert second['pet']['partner_inventory']['treat'] == 1
    assert second['pet']['activity'][0]['inventory_owner_name'] == '养猫乙'
    peer = client.get('/pet', headers=auth['养猫乙']).json()
    assert peer['own_inventory']['treat'] == 1 and peer['inventory']['treat'] == 1


def test_concurrent_feeding_cannot_overdraw(pet_pair):
    client, module, auth = pet_pair
    credit(module, '养猫甲', 'can', 1)
    def give(name):
        return client.post('/pet/feed', data={'food': 'can', 'request_key': uuid.uuid4().hex}, headers=auth[name]).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(give, ['养猫甲', '养猫乙']))
    assert sorted(statuses) == [200, 409]
    assert client.get('/pet', headers=auth['养猫甲']).json()['inventory']['can'] == 0


def test_three_activity_sources_reward_once(pet_pair):
    client, _, auth = pet_pair
    headers = auth['养猫甲']
    raw = photo_bytes()
    response = client.post('/photos', files={'file': ('same.png', raw, 'image/png')}, headers=headers)
    assert response.status_code == 201
    assert response.json()['food_reward'] == {'food': 'treat', 'amount': 1}
    assert client.post('/photos', files={'file': ('same.png', raw, 'image/png')}, headers=headers).status_code == 409
    assert client.get('/pet', headers=headers).json()['inventory']['treat'] == 1
    todo_id = client.post('/admin/todos', data={'entry': '一起完成', 'type': '日常', 'user': '养猫甲'}, headers=headers).json()['id']
    for done, expected in [(True, 1), (False, 0), (True, 0)]:
        response = client.post(f'/admin/todos/{todo_id}/status', data={'done': done}, headers=headers)
        assert response.status_code == 200
        assert response.json()['food_reward'] == {'food': 'kibble', 'amount': expected}
    assert client.get('/pet', headers=headers).json()['inventory']['kibble'] == 1
    from .helpers import journey_data
    data = journey_data()
    response = client.post('/journeys', data=data, headers=headers).json()
    assert response['food_reward'] == {'food': 'can', 'amount': 1}
    trip = response['id']
    assert client.put(f'/journeys/{trip}', data=data, headers=headers).json()['food_reward']['amount'] == 0
    assert client.get('/pet', headers=headers).json()['inventory']['can'] == 1
    future = journey_data(departure_date='2099-01-01', return_date='2099-01-02')
    client.post('/journeys', data=future, headers=headers)
    assert client.get('/pet', headers=headers).json()['inventory']['can'] == 1


def test_invalid_food_does_not_change_inventory(pet_pair):
    client, _, auth = pet_pair
    for data in [{'food': 'unknown', 'request_key': uuid.uuid4().hex}, {'food': 'treat', 'request_key': 'bad'}]:
        assert client.post('/pet/feed', data=data, headers=auth['养猫甲']).status_code == 400
    assert client.get('/pet', headers=auth['养猫甲']).json()['feed_count'] == 0

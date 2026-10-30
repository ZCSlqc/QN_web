from .helpers import owner_headers
def test_diary_default_three_and_all_has_no_twenty_row_cap(api):
    client, module = api
    from app.services.pet import PET_ID
    from app.core.uuid_ids import SYSTEM_ID
    with module.get_db() as conn:
        for i in range(25):
            conn.execute('INSERT INTO pet_ledger(pet_id,actor_id,actor_name,kind,food,quantity,request_key,created_at) VALUES (?,?,?,?,?,?,?,?)', (PET_ID, SYSTEM_ID, 'test', 'feed', 'treat', -1, f'activity-test-{i}', f'2026-10-28 12:{i:02}:00'))
    headers = owner_headers(client)
    recent = client.get('/pet', headers=headers).json()
    first = client.get('/pet/activity', headers=headers).json()
    second = client.get('/pet/activity', params={'cursor': first['next_cursor']}, headers=headers).json()
    all_events = {'activity': first['data'] + second['data']}
    assert len(first['data']) == 20 and second['next_cursor'] is None
    assert len(recent['activity']) == 3
    assert len(all_events['activity']) == 25
    assert recent['activity'] == all_events['activity'][:3]
    assert recent['activity'][0]['created_at'] == '2026-10-28 12:24:00'

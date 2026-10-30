from .helpers import owner_headers, journey_data
import json

def test_cat_reads_require_whitelist(api, monkeypatch):
    client, module = api
    for path in ['/pet', '/pet/activity']:
        assert client.get(path).status_code == 401
    token = client.post('/register_process', data={'username':'guest','userpwd':'guest-password','checkcode':module.settings.CHECK_CODE}).json()['token']
    headers={'Authorization':f'Bearer {token}'}
    assert client.get('/pet', headers=headers).status_code == 403
    monkeypatch.setattr(module.settings,'USER_PAGE_ALLOWLIST',frozenset(['/index','/pet']))
    assert client.get('/pet', headers=headers).status_code == 200

def test_cat_snapshot_does_not_acquire_writer_lock(api):
    client, module = api; headers=owner_headers(client)
    with module.get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        assert client.get('/pet',headers=headers).status_code==200

def test_deleted_conversion_cannot_be_recreated(api):
    client, module = api; headers=owner_headers(client)
    plan=client.post('/journey-plans',data={'name':json.dumps(['南京市']),'adcodes':'["320100"]'},headers=headers).json()['id']
    trip=client.post(f'/journey-plans/{plan}/convert',data=journey_data(),headers=headers).json()['id']
    assert client.delete(f'/journeys/{trip}',headers=headers).status_code==200
    assert client.post(f'/journey-plans/{plan}/convert',data=journey_data(),headers=headers).status_code==410
    with module.get_db() as conn:
        assert not conn.execute('SELECT 1 FROM journey_plans WHERE converted_journey_id=?',(trip,)).fetchone()
    assert client.get('/journey-plans',headers=headers).json()['data']==[]

def test_summary_does_not_send_full_notes_but_search_and_detail_do(api):
    client,_=api;headers=owner_headers(client)
    notes='同行的回忆。'*100+'最终的关键词'
    trip=client.post('/journeys',data=journey_data(notes=notes),headers=headers).json()['id']
    summary=client.get('/journeys?summary=true',headers=headers).json()['data'][0]
    assert summary['_summary'] and len(summary['notes'])==160
    assert client.get(f'/journeys/{trip}',headers=headers).json()['data']['notes']==notes
    assert trip in client.get('/journey-search',params={'q':'最终的关键词'},headers=headers).json()['ids']

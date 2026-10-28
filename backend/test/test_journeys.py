import json
import io
import os
import sys
import sqlite3
from pathlib import Path
import pytest
from .helpers import owner_headers, journey_data, photo_bytes

@pytest.mark.parametrize("method,path", [("post", "/journeys"), ("put", "/journeys/1"), ("delete", "/journeys/1")])
def test_anonymous_cannot_write(api, method, path):
    client, _ = api
    kwargs = {"data": journey_data()} if method != "delete" else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401


def test_multiple_visits_and_crud(api):
    client, _ = api
    headers = owner_headers(client)
    for day in ("2025-06-01", "2025-06-02"):
        assert client.post("/journeys", data=journey_data(departure_date=day), headers=headers).status_code == 200
    visits = client.get("/journeys", headers=headers).json()["data"]
    assert len(visits) == 2
    record_id = visits[0]["id"]
    assert client.put(f"/journeys/{record_id}", data=journey_data(notes="再访金陵"), headers=headers).status_code == 200
    assert client.get("/journeys", headers=headers).json()["data"][0]["notes"] == "再访金陵"
    assert client.delete(f"/journeys/{record_id}", headers=headers).status_code == 200
    assert len(client.get("/journeys", headers=headers).json()["data"]) == 1
    assert client.delete(f"/journeys/{record_id}", headers=headers).status_code == 404


@pytest.mark.parametrize("changes", [{"return_date": "2025-05-01"}, {"departure_date": "invalid"}, {"notes": "x" * 2001}, {"adcodes": '["bad"]'}])
def test_invalid_journey_is_rejected(api, changes):
    client, _ = api
    assert client.post("/journeys", data=journey_data(**changes), headers=owner_headers(client)).status_code == 400


def test_multi_city_journey_roundtrip(api):
    import json
    client, module = api
    headers = owner_headers(client)
    data = journey_data(name=json.dumps(['南京市', '杭州市']), adcodes=json.dumps(['320100', '330100']),
                        checkin_points='西湖、江宁区', event='杭州实习', notes='和妮在一起好安心')
    assert client.post('/journeys', data=data, headers=headers).status_code == 200
    record = client.get('/journeys', headers=headers).json()['data'][0]
    assert record['name'] == ['南京市', '杭州市']
    assert record['adcodes'] == ['320100', '330100']
    assert record['checkin_points'] == '西湖、江宁区'
    module.init_db()
    assert client.get('/journeys', headers=headers).json()['data'][0] == record
    data['name'] = json.dumps(['杭州市'])
    data['adcodes'] = json.dumps(['330100'])
    data['checkin_points'] = '西湖'
    assert client.put(f"/journeys/{record['id']}", data=data, headers=headers).status_code == 200
    updated = client.get('/journeys', headers=headers).json()['data'][0]
    assert updated['adcodes'] == ['330100']
    assert updated['event'] == '杭州实习'
    assert updated['notes'] == '和妮在一起好安心'


def test_city_array_validation_and_municipality_normalization(api):
    import json
    client, _ = api
    headers = owner_headers(client)
    for names, codes in [([], []), (['南京'], ['320100', '330100']), ([3], ['320100']), (['南京'], ['bad'])]:
        assert client.post('/journeys', data=journey_data(name=json.dumps(names), adcodes=json.dumps(codes)), headers=headers).status_code == 400
    assert client.post('/journeys', data=journey_data(name=json.dumps(['东城区']), adcodes=json.dumps(['110101'])), headers=headers).status_code == 200
    latest = client.get('/journeys', headers=headers).json()['data'][0]
    assert latest['name'] == ['北京市']
    assert latest['adcodes'] == ['110000']


def test_journey_requires_city_arrays(api):
    client, module = api
    with module.get_db() as conn:
        columns = {row['name'] for row in conn.execute('PRAGMA table_info(journeys)')}
    assert 'adcode' not in columns
    headers = owner_headers(client)
    missing = journey_data()
    del missing['adcodes']
    missing['adcode'] = '320100'
    assert client.post('/journeys', data=missing, headers=headers).status_code == 422
    assert client.post('/journeys', data=journey_data(name='南京市'), headers=headers).status_code == 400
    assert all('adcode' not in row for row in client.get('/journeys', headers=headers).json()['data'])


def test_hong_kong_macao_are_whole_regions(api):
    client, _ = api
    headers = owner_headers(client)
    response = client.post('/journeys', data=journey_data(
        name=json.dumps(['中西区', '湾仔区', '花地玛堂区']),
        adcodes=json.dumps(['810001', '810002', '820001']),
    ), headers=owner_headers(client))
    assert response.status_code == 200
    record = client.get('/journeys', headers=headers).json()['data'][0]
    assert record['name'] == ['香港特别行政区', '澳门特别行政区']
    assert record['adcodes'] == ['810000', '820000']

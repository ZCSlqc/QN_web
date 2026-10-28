import pytest
from .helpers import owner_headers, journey_data


@pytest.mark.parametrize('path', ['/journeys', '/journey-plans'])
def test_page_data_requires_auth_and_explicit_allowlist(api, monkeypatch, path):
    client, module = api
    assert client.get(path).status_code == 401
    token = client.post('/register_process', data={'username': 'guest', 'userpwd': 'guest-password', 'checkcode': module.settings.CHECK_CODE}).json()['token']
    guest = {'Authorization': f'Bearer {token}'}
    assert client.get('/me', headers=guest).json()['allowed_pages'] == ['/index']
    assert client.get(path, headers=guest).status_code == 403
    assert client.get(path, headers=owner_headers(client)).status_code == 200
    monkeypatch.setattr(module.settings, 'USER_PAGE_ALLOWLIST', frozenset(['/index', '/journey']))
    assert client.get('/me', headers=guest).json()['allowed_pages'] == ['/index', '/journey']
    assert client.get(path, headers=guest).status_code == 200
    assert client.post('/journeys', data=journey_data(), headers=guest).status_code == 403


def test_page_allowlist_parser_is_exact_and_defaults_closed(api, monkeypatch):
    from app.core.settings import configured_user_pages
    monkeypatch.delenv('QN_USER_PAGE_ALLOWLIST')
    assert configured_user_pages() == frozenset(['/index'])
    monkeypatch.setenv('QN_USER_PAGE_ALLOWLIST', '["/index", "/journey"]')
    assert configured_user_pages() == frozenset(['/index', '/journey'])
    for value in ['["*"]', '["/index?all=true"]', '["/index/../admin"]', '"/index"']:
        monkeypatch.setenv('QN_USER_PAGE_ALLOWLIST', value)
        with pytest.raises(ValueError):
            configured_user_pages()

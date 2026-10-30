from .test_pet import pet_pair, credit


def test_startup_tops_up_each_owner_without_refilling_on_reads(pet_pair):
    client, module, auth = pet_pair
    from app.services.pet_wallets import replenish_startup_food
    credit(module, '养猫甲', 'treat', 5)
    replenish_startup_food()
    first = client.get('/pet', headers=auth['养猫甲']).json()
    assert first['own_inventory'] == {'treat': 5, 'kibble': 1, 'can': 1}
    assert first['partner_inventory'] == {'treat': 1, 'kibble': 1, 'can': 1}
    replenish_startup_food()
    assert client.get('/pet', headers=auth['养猫甲']).json()['inventory'] == first['inventory']
    for key in ('first-feed-key-0001', 'second-feed-key-0002'):
        assert client.post('/pet/feed', data={'food': 'can', 'request_key': key}, headers=auth['养猫甲']).status_code == 200
    assert client.get('/pet', headers=auth['养猫甲']).json()['inventory']['can'] == 0
    replenish_startup_food()
    assert client.get('/pet', headers=auth['养猫甲']).json()['inventory']['can'] == 2
    assert client.get('/pet', headers=auth['访客']).json()['personal_treats'] == 0


def test_reset_preserves_content_and_backup(pet_pair, tmp_path):
    client, module, auth = pet_pair
    from scripts.reset_pet_mailbox import reset_database
    from app.services.pet_wallets import replenish_startup_food
    replenish_startup_food()
    client.post('/mailbox/letters', data={'body': 'private body', 'request_key': 'reset-letter-000001'}, headers=auth['养猫甲'])
    client.post('/pet/feed', data={'food': 'can', 'request_key': 'reset-feed-0000001'}, headers=auth['养猫甲'])
    client.post('/blessings', data={'content': 'preserve me'}, headers=auth['访客'])
    result = reset_database(module.settings.DB_PATH, tmp_path / 'backups')
    assert result['removed']['mailbox_letters'] == 1
    state = client.get('/pet', headers=auth['养猫甲']).json()
    assert state['feed_count'] == 0 and state['inventory'] == {'treat': 0, 'kibble': 0, 'can': 0}
    assert client.get('/pet', headers=auth['访客']).json()['personal_treats'] == 0
    with module.get_db() as conn:
        assert conn.execute('SELECT COUNT(*) FROM blessings').fetchone()[0] == 1
        assert conn.execute('SELECT COUNT(*) FROM pet_blessing_rewards').fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM pet_activity_rewards WHERE source_kind='letter_daily'").fetchone()[0] == 0
    import sqlite3
    from contextlib import closing
    with closing(sqlite3.connect(result['backup'])) as conn:
        assert conn.execute('SELECT COUNT(*) FROM mailbox_letters').fetchone()[0] == 1

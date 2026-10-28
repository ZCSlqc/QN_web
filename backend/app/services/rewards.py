"""Daily blessing rewards. The caller owns the blessing/reward transaction."""


from app.core.settings import settings


def eligible_visitor(conn, user_id):
    user = conn.execute('SELECT username FROM user WHERE id=?', (user_id,)).fetchone() if user_id is not None else None
    return bool(user and user['username'] not in settings.ADMIN_USERS)


def grant_blessing_treat(conn, user_id, blessing_id, timestamp):
    if not eligible_visitor(conn, user_id):
        return 0
    granted = conn.execute(
        'INSERT OR IGNORE INTO pet_blessing_rewards(user_id,reward_day,blessing_id) VALUES (?,?,?)',
        (user_id, timestamp[:10], blessing_id),
    )
    if not granted.rowcount:
        return 0
    conn.execute('INSERT INTO pet_user_inventory(user_id,treats) VALUES (?,1) ON CONFLICT(user_id) DO UPDATE SET treats=treats+1', (user_id,))
    return 1


def blessing_receipt(conn, user_id, blessing_id, timestamp, awarded=0, replayed=False):
    reward = conn.execute('SELECT reward_day FROM pet_blessing_rewards WHERE user_id=? AND blessing_id=?', (user_id, blessing_id)).fetchone() if user_id is not None else None
    if replayed:
        status = 'confirmed' if reward else 'confirmed_without_reward'
    else:
        status = 'granted' if awarded else 'already_claimed' if eligible_visitor(conn, user_id) else 'none'
    return {'status': 'success', 'treat_reward': int(bool(reward)) if replayed else awarded,
            'replayed': replayed, 'reward_status': status,
            'reward_day': reward['reward_day'] if reward else None,
            'server_day': timestamp[:10]}

from app.core.uuid_ids import SYSTEM_ID
"""Couple inventory is summed for display but owned and spent per account."""
from app.core.settings import settings
from app.services.profiles import display_name

FOOD_FOR_ACTIVITY = {'photo': 'treat', 'todo': 'kibble', 'journey': 'can'}


def caretakers(conn):
    if len(settings.ADMIN_USERS) != 2:
        return []
    names = sorted(settings.ADMIN_USERS)
    if len(names) != 2:
        return []
    rows = conn.execute('SELECT id,username FROM user WHERE username IN (?,?) ORDER BY userdate ASC, id ASC', names).fetchall()
    return rows if len(rows) == 2 else []


def add_credit(conn, owner_id, food, quantity):
    conn.execute('INSERT INTO pet_member_inventory(user_id,food,amount) VALUES (?,?,?) ON CONFLICT(user_id,food) DO UPDATE SET amount=amount+excluded.amount', (owner_id, food, quantity))


def replenish_startup_food():
    """Startup only: floor each configured owner's food at one, never add repeatedly."""
    from app.core.database import get_db, bj_time
    with get_db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        prepare_wallets(conn, bj_time())
        for username in settings.ADMIN_USERS:
            owner = conn.execute('SELECT id FROM user WHERE username=?', (username,)).fetchone()
            if not owner:
                continue
            for food in ('treat', 'kibble', 'can'):
                conn.execute('INSERT INTO pet_member_inventory(user_id,food,amount) VALUES (?,?,1) ON CONFLICT(user_id,food) DO UPDATE SET amount=MAX(amount,1)', (owner['id'], food))


def grant_letter_treat(conn, username, letter_id, now):
    members = prepare_wallets(conn, now)
    actor = next((member for member in members if member['username'] == username), None)
    if not actor:
        return 0
    key = f"{actor['id']}:{now[:10]}"
    result = conn.execute('INSERT OR IGNORE INTO pet_activity_rewards(source_kind,source_key,source_id,owner_id,food,amount,created_at) VALUES (?,?,?,?,?,1,?)',
                          ('letter_daily', key, letter_id, actor['id'], 'treat', now))
    if result.rowcount:
        add_credit(conn, actor['id'], 'treat', 1)
        return 1
    return 0


def prepare_wallets(conn, now):
    members = caretakers(conn)
    if not members:
        return []
    if not conn.execute("SELECT 1 FROM pet_wallet_versions WHERE version='shared-to-owned-v1'").fetchone():
        # Preserve the old shared balance, split evenly; the older account gets an odd remainder.
        for row in conn.execute("SELECT food,amount FROM pet_inventory WHERE pet_id='3673107b-6c7d-4c37-9b5b-47519076cd31'").fetchall():
            for index, member in enumerate(members):
                amount = row['amount'] // 2 + (row['amount'] % 2 if index == 0 else 0)
                if amount:
                    add_credit(conn, member['id'], row['food'], amount)
                    conn.execute('INSERT INTO pet_activity_rewards(source_kind,source_key,source_id,owner_id,food,amount,created_at) VALUES (?,?,?,?,?,?,?)',
                                 ('legacy_shared', f"{member['id']}:{row['food']}", SYSTEM_ID, member['id'], row['food'], amount, now))
        conn.execute("UPDATE pet_inventory SET amount=0 WHERE pet_id='3673107b-6c7d-4c37-9b5b-47519076cd31'")
        conn.execute("INSERT INTO pet_wallet_versions(version) VALUES ('shared-to-owned-v1')")
    # An administrator's previously earned visitor treats are preserved, not earned again.
    for member in members:
        row = conn.execute('SELECT treats FROM pet_user_inventory WHERE user_id=?', (member['id'],)).fetchone()
        if row and row['treats']:
            amount = row['treats']
            add_credit(conn, member['id'], 'treat', amount)
            conn.execute('INSERT INTO pet_activity_rewards(source_kind,source_key,source_id,owner_id,food,amount,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(source_kind,source_key) DO UPDATE SET amount=amount+excluded.amount',
                         ('legacy_personal', str(member['id']), SYSTEM_ID, member['id'], 'treat', amount, now))
            conn.execute('UPDATE pet_user_inventory SET treats=0 WHERE user_id=?', (member['id'],))
    return members


def grant_activity_food(conn, username, kind, source_id, now, source_key=None):
    members = prepare_wallets(conn, now)
    actor = next((member for member in members if member['username'] == username), None)
    if kind not in FOOD_FOR_ACTIVITY:
        return 0
    food = FOOD_FOR_ACTIVITY[kind]
    # A source record already present at rollout or previously completed cannot earn again.
    if conn.execute('SELECT 1 FROM pet_activity_rewards WHERE source_kind=? AND source_id=?', (kind, source_id)).fetchone():
        return 0
    if not actor:
        conn.execute('INSERT OR IGNORE INTO pet_activity_rewards(source_kind,source_key,source_id,owner_id,food,amount,created_at) VALUES (?,?,?,?,?,0,?)',
                     (kind, source_key or str(source_id), source_id, SYSTEM_ID, food, now))
        return 0
    result = conn.execute('INSERT OR IGNORE INTO pet_activity_rewards(source_kind,source_key,source_id,owner_id,food,amount,created_at) VALUES (?,?,?,?,?,1,?)',
                          (kind, source_key or str(source_id), source_id, actor['id'], food, now))
    if result.rowcount:
        add_credit(conn, actor['id'], food, 1)
        return 1
    return 0


def balances(conn, members, viewer_id):
    zero = {'treat': 0, 'kibble': 0, 'can': 0}
    total, own, partner = zero.copy(), zero.copy(), zero.copy()
    partner_name = ''
    for member in members:
        wallet = zero | {row['food']: row['amount'] for row in conn.execute('SELECT food,amount FROM pet_member_inventory WHERE user_id=?', (member['id'],))}
        for food, amount in wallet.items():
            total[food] += amount
        if member['id'] == viewer_id:
            own = wallet
        else:
            partner = wallet
            partner_name = display_name(conn, user_id=member['id'])
    return total, own, partner, partner_name

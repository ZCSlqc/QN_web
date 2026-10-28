"""Names shown to people are independent of usernames used for authentication."""


def display_name(conn, user_id=None, username=None, fallback=''):
    row = conn.execute('SELECT username,nickname FROM user WHERE id=?', (user_id,)).fetchone() if user_id is not None else conn.execute('SELECT username,nickname FROM user WHERE username=?', (username,)).fetchone()
    return (row['nickname'] or row['username']) if row else fallback or username or '一位朋友'


def name_map(conn):
    return {row['username']: row['nickname'] or row['username'] for row in conn.execute('SELECT username,nickname FROM user')}

"""Create a reserved account locally without exposing a password in command history."""
import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.database import init_db, get_db, bj_time
from app.core.settings import settings
from app.core.security import hash_password


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('username')
    args = parser.parse_args()
    username = args.username.strip()
    if username not in settings.ADMIN_USERS:
        parser.error('Configure this reserved username in .env first.')
    init_db()
    with get_db() as conn:
        if conn.execute('SELECT 1 FROM user WHERE username=?', (username,)).fetchone():
            parser.error('Account already exists; no password was changed.')
    password = getpass.getpass('Password: ')
    if password != getpass.getpass('Confirm password: '):
        parser.error('Passwords differ.')
    if not password.strip() or len(password.encode()) > 72:
        parser.error('Password must be nonempty and at most 72 UTF-8 bytes.')
    hashed = hash_password(password)
    with get_db() as conn:
        conn.execute('INSERT INTO user(username,userpwd,userdate) VALUES (?,?,?)', (username, hashed, bj_time()))
    print('Account created. Existing accounts were not changed.')


if __name__ == '__main__':
    main()

"""Add an existing account to the administrator list in .env."""
import argparse
import json
import sqlite3
from contextlib import closing
from dotenv import set_key
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.settings import settings, ENV_PATH

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("username", help="Existing account name")
    args = parser.parse_args()
    with closing(sqlite3.connect(settings.DB_PATH.resolve().as_uri() + '?mode=ro', uri=True)) as conn:
        if not conn.execute("SELECT 1 FROM user WHERE username=?", (args.username,)).fetchone():
            parser.error("Account not found; register it first.")
    names = sorted(settings.ADMIN_USERS | {args.username})
    set_key(str(ENV_PATH), 'QN_ADMIN_USERS', json.dumps(names, ensure_ascii=False), encoding='utf-8')
    print("Administrator list saved to .env. Restart the backend to apply.")
    print("If QN_ADMIN_USERS is set by the service or shell, update that value too; it takes priority.")

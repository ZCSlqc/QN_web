"""Back up and reset mailbox, feeding history and wallets; keep content reward markers."""
import argparse
from contextlib import closing
from datetime import datetime
import hashlib
import json
from pathlib import Path
import sqlite3
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.settings import settings

CHANGED = {'mailbox_reads', 'mailbox_comments', 'mailbox_letters', 'pet_ledger',
           'pet_member_inventory', 'pet_user_inventory', 'pet_activity_rewards'}


def fingerprint(conn, tables):
    return {table: hashlib.sha256(json.dumps(conn.execute(f'SELECT * FROM "{table}"').fetchall(),
                                           ensure_ascii=False, default=str).encode()).hexdigest()
            for table in tables}


def reset_database(path, backup_dir):
    path = Path(path).resolve()
    backup_dir = Path(backup_dir).resolve()
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f'couple-before-reset-{datetime.now():%Y%m%d-%H%M%S-%f}.db'
    with closing(sqlite3.connect(path.as_uri() + '?mode=rw', uri=True, timeout=30)) as conn:
        conn.execute('PRAGMA foreign_keys=ON')
        with closing(sqlite3.connect(backup)) as target:
            conn.backup(target)
            if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Backup integrity check failed; nothing reset')
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        if not CHANGED <= tables:
            raise RuntimeError(f'Missing tables: {CHANGED - tables}; nothing reset')
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            before = fingerprint(conn, tables - CHANGED)
            markers = conn.execute("SELECT * FROM pet_activity_rewards WHERE source_kind<>'letter_daily'").fetchall()
            removed = {}
            for table in ('mailbox_reads', 'mailbox_comments', 'mailbox_letters', 'pet_ledger'):
                removed[table] = conn.execute(f'DELETE FROM {table}').rowcount
            removed['letter_rewards'] = conn.execute("DELETE FROM pet_activity_rewards WHERE source_kind='letter_daily'").rowcount
            conn.execute('UPDATE pet_member_inventory SET amount=0')
            conn.execute('UPDATE pet_user_inventory SET treats=0')
            assert fingerprint(conn, tables - CHANGED) == before, 'Unrelated data changed'
            assert conn.execute("SELECT * FROM pet_activity_rewards WHERE source_kind<>'letter_daily'").fetchall() == markers
            assert not conn.execute('PRAGMA foreign_key_check').fetchall()
        assert conn.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    return {'database': str(path), 'backup': str(backup), 'removed': removed, 'wallets': 'zero', 'other_tables': 'unchanged'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Perform the reset after creating a verified backup')
    parser.add_argument('--database', type=Path, default=settings.DB_PATH)
    parser.add_argument('--backup-dir', type=Path, default=Path(__file__).resolve().parents[3] / 'QN_web_backups')
    args = parser.parse_args()
    if not args.apply:
        parser.error('Use --apply to back up and reset the specified database')
    print(json.dumps(reset_database(args.database, args.backup_dir), ensure_ascii=False, indent=2))

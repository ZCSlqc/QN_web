"""Rehearse on a consistent snapshot, then migrate explicitly with --apply.

Run with the backend stopped. Each migration creates its own SQLite backup.
"""
import argparse
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.uuid_ids import migrate_uuid_ids, ENTITIES


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('artifacts/uuid-migration'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    database = args.database.resolve(strict=True)
    args.output.mkdir(parents=True, exist_ok=True)
    target = database if args.apply else args.output / f'rehearsal-{datetime.now():%Y%m%d-%H%M%S-%f}.db'
    if not args.apply:
        with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as source:
            with sqlite3.connect(target) as destination:
                source.backup(destination)
    conn = sqlite3.connect(target, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        backup = migrate_uuid_ids(conn, args.output)
        tables = {r['name'] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        counts = {table: conn.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0] for table in sorted(ENTITIES & tables)}
        report = {'applied': args.apply, 'database': str(target), 'backup': backup, 'entity_counts': counts,
                  'integrity': conn.execute('PRAGMA integrity_check').fetchone()[0], 'foreign_key_errors': len(conn.execute('PRAGMA foreign_key_check').fetchall())}
        report_path = args.output / ('applied.json' if args.apply else 'rehearsal.json')
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(report, ensure_ascii=True))
    finally:
        conn.close()


if __name__ == '__main__':
    main()

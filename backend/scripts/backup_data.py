"""Create a private backup containing the database, uploads and deployment secrets."""
import argparse
from contextlib import closing
import datetime
from pathlib import Path
import shutil
import sqlite3
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.settings import settings, ENV_PATH, BASE_DIR


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=BASE_DIR.parent.parent / 'QN_web_backups')
    args = parser.parse_args()
    destination = args.output / datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    destination.mkdir(parents=True)
    with closing(sqlite3.connect(settings.DB_PATH.resolve().as_uri() + '?mode=ro', uri=True)) as source:
        with closing(sqlite3.connect(destination / 'couple.db')) as target:
            source.backup(target)
            if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Backup integrity check failed')
    if settings.UPLOAD_DIR.exists():
        shutil.copytree(settings.UPLOAD_DIR, destination / 'uploads')
    for path in (ENV_PATH, BASE_DIR / '.secret_key'):
        if path.is_file():
            shutil.copy2(path, destination / path.name)
    print(f'Private backup created: {destination}')
    print('Store securely. For an exact database/media snapshot, stop uploads during backup.')


if __name__ == '__main__':
    main()

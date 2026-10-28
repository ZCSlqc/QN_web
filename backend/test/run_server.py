"""Temporary backend for real browser integration tests. Never uses backend/.env or couple.db."""
import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
import uvicorn


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8015)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='qn-integration-') as directory:
        root = Path(directory)
        os.environ.update({
            'QN_DB_PATH': str(root / 'integration.db'), 'QN_ENV_FILE': str(root / '.env'),
            'QN_SECRET_KEY': 'isolated-integration-key-not-for-deployment',
            'QN_ADMIN_USERS': json.dumps(['集成测试甲', '集成测试乙']),
            'QN_UPLOAD_DIR': str(root / 'uploads'),
        })
        os.environ.pop('QN_CHECK_CODE', None)
        (root / '.env').write_text('QN_CHECK_CODE=integration-share-code\n', encoding='utf-8')
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from app.core.database import init_db, get_db, bj_time
        from app.core.security import hash_password
        init_db()
        with get_db() as conn:
            for name in ['集成测试甲', '集成测试乙']:
                conn.execute('INSERT INTO user(username,userpwd,userdate) VALUES (?,?,?)', (name, hash_password('integration-password'), bj_time()))
        from main import app
        uvicorn.run(app, host='127.0.0.1', port=args.port, log_level='warning')


if __name__ == '__main__':
    main()

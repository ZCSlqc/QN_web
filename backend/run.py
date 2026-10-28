"""Start the backend using the port configured in .env."""
import uvicorn
import os
import argparse
from pathlib import Path
from dotenv import dotenv_values

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--production', action='store_true', help='Disable development reloading')
    args = parser.parse_args()
    config = dotenv_values(Path(os.environ.get('QN_ENV_FILE', Path(__file__).resolve().parents[1] / '.env')), encoding='utf-8-sig', interpolate=False)
    port = int(os.environ.get('QN_BACKEND_PORT', config.get('QN_BACKEND_PORT') or '1277'))
    if not 1 <= port <= 65535:
        raise ValueError('QN_BACKEND_PORT must be between 1 and 65535')
    uvicorn.run('main:app', app_dir=str(Path(__file__).resolve().parent), host='127.0.0.1', port=port, reload=not args.production)

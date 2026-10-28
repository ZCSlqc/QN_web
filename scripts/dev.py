"""Cross-platform development launcher. Stops only the child processes it owns."""
import argparse
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


def configured_port(name, default, config=None):
    value = int(os.environ.get(name, (config or {}).get(name) or default))
    if not 1 <= value <= 65535:
        raise ValueError(f'{name} must be between 1 and 65535')
    return value


def free_port(port):
    with socket.socket() as sock:
        try:
            sock.bind(('127.0.0.1', port))
        except OSError:
            raise SystemExit(f'Port {port} is already in use; existing processes were not stopped.')


def stop_child(process):
    if process.poll() is not None:
        return
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True)
    else:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)


def wait_ready(url, process):
    for _ in range(30):
        if process.poll() is not None:
            raise RuntimeError('A service exited before it became ready; see its output above.')
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        time.sleep(0.5)
    raise RuntimeError(f'Service did not become ready: {url}')


def main():
    config = dotenv_values(Path(os.environ.get('QN_ENV_FILE', ROOT / '.env')), encoding='utf-8-sig', interpolate=False)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend-port', type=int, default=configured_port('QN_BACKEND_PORT', 1277, config))
    parser.add_argument('--frontend-port', type=int, default=configured_port('QN_FRONTEND_PORT', 7721, config))
    args = parser.parse_args()
    def terminated(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, terminated)
    for port in (args.backend_port, args.frontend_port):
        free_port(port)
    python = ROOT / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if not python.exists():
        raise SystemExit('Create .venv and install backend requirements first.')
    node = shutil.which('node')
    vite = ROOT / 'frontend/node_modules/vite/bin/vite.js'
    if not node or not vite.exists():
        raise SystemExit('Install Node.js and run npm ci in frontend first.')
    children = []
    options = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}
    env = os.environ.copy()
    env['QN_API_TARGET'] = f'http://127.0.0.1:{args.backend_port}'
    try:
        backend = subprocess.Popen([str(python), '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', str(args.backend_port), '--reload'], cwd=ROOT / 'backend', env=env, **options)
        children.append(backend)
        wait_ready(f'http://127.0.0.1:{args.backend_port}/health', backend)
        frontend = subprocess.Popen([node, str(vite), '--host', '127.0.0.1', '--port', str(args.frontend_port), '--strictPort'], cwd=ROOT / 'frontend', env=env, **options)
        children.append(frontend)
        wait_ready(f'http://127.0.0.1:{args.frontend_port}', frontend)
        print(f'Ready: http://127.0.0.1:{args.frontend_port} — Ctrl+C stops these two services.', flush=True)
        while all(process.poll() is None for process in children):
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        for process in reversed(children):
            stop_child(process)


if __name__ == '__main__':
    main()

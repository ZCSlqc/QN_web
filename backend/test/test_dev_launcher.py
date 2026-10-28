import importlib.util
from pathlib import Path
import socket
import pytest


def test_busy_port_is_not_killed():
    script = Path(__file__).resolve().parents[2] / 'scripts/dev.py'
    spec = importlib.util.spec_from_file_location('qn_dev_launcher', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        sock.listen(1)
        port = sock.getsockname()[1]
        with pytest.raises(SystemExit, match='existing processes were not stopped'):
            module.free_port(port)
        assert sock.getsockname()[1] == port

import importlib.util
from pathlib import Path
import pytest


def launcher():
    spec = importlib.util.spec_from_file_location('qn_dev_test', Path(__file__).resolve().parents[2] / 'scripts/dev.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_launcher_port_precedence_and_validation(monkeypatch):
    module = launcher()
    monkeypatch.delenv('QN_BACKEND_PORT', raising=False)
    assert module.configured_port('QN_BACKEND_PORT', 1277) == 1277
    assert module.configured_port('QN_BACKEND_PORT', 1277, {'QN_BACKEND_PORT': '1300'}) == 1300
    monkeypatch.setenv('QN_BACKEND_PORT', '1400')
    assert module.configured_port('QN_BACKEND_PORT', 1277, {'QN_BACKEND_PORT': '1300'}) == 1400
    monkeypatch.setenv('QN_BACKEND_PORT', '70000')
    with pytest.raises(ValueError): module.configured_port('QN_BACKEND_PORT', 1277)


def test_settings_load_custom_ports(api, monkeypatch):
    import subprocess
    import sys
    monkeypatch.setenv('QN_BACKEND_PORT', '1515')
    monkeypatch.setenv('QN_FRONTEND_PORT', '7878')
    result = subprocess.run([sys.executable, '-c', 'from app.core.settings import settings; print(settings.SERVER_PORT, settings.FRONTEND_PORT)'],
                            cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, check=True)
    assert result.stdout.strip() == '1515 7878'

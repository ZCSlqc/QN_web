"""Retry cleanup of uploaded images already removed from the album."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.photo_cleanup import retry_photo_cleanup

if __name__ == '__main__':
    print('Pending file cleanups:', retry_photo_cleanup())

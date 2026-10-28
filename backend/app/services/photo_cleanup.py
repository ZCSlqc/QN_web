"""Retryable removal: keep a hidden tombstone until uploaded files are gone."""
import logging
from app.core.database import get_db
from app.core.settings import settings

log = logging.getLogger(__name__)


def cleanup_photo(photo_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM photos WHERE id=? AND source='upload' AND removed=1", (photo_id,)).fetchone()
    if row is None:
        return True
    try:
        for filename in (row['filename'], row['thumbnail']):
            (settings.UPLOAD_DIR / filename).unlink(missing_ok=True)
    except OSError:
        log.warning('Photo %s hidden; file cleanup pending', photo_id)
        return False
    with get_db() as conn:
        conn.execute("DELETE FROM photos WHERE id=? AND source='upload' AND removed=1", (photo_id,))
    return True


def retry_photo_cleanup():
    with get_db() as conn:
        ids = [row['id'] for row in conn.execute("SELECT id FROM photos WHERE source='upload' AND removed=1")]
    return sum(not cleanup_photo(photo_id) for photo_id in ids)

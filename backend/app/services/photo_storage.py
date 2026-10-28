"""Photo paths are always resolved inside the final UUID directory layout."""
from pathlib import Path
from uuid import UUID
from app.core.settings import settings


def photo_directory(photo_id, journey_id=None):
    photo = str(UUID(str(photo_id)))
    relative = Path('journeys') / str(UUID(str(journey_id))) / photo if journey_id else Path('albums') / photo
    return settings.UPLOAD_DIR / relative


def managed_directory(row):
    expected = photo_directory(row['id'], row['journey_id'])
    actual = (settings.UPLOAD_DIR / row['storage_dir']).resolve()
    if actual != expected.resolve() or not actual.is_relative_to(settings.UPLOAD_DIR.resolve()):
        raise ValueError('Invalid photo storage path')
    return expected


def photo_path(row, variant='image'):
    folder = managed_directory(row)
    return folder / (Path(row['filename']).name if variant == 'image' else 'thumbnail.webp' if variant == 'thumbnail' else f'{variant}.webp')


def original_basename(filename):
    return str(filename or '').replace('\\', '/').split('/')[-1][:255]

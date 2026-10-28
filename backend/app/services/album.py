"""Register bundled album photos once; removed entries stay removed after restart."""
from pathlib import Path
from PIL import Image, ImageOps

BUNDLED_PHOTOS = [
    'IMG_DAZZ_ARG_20250505160350853.jpg', 'college (1).jpg', 'college (2).jpg',
    'mmexport1738078414583.jpg', 'IMG_DAZZ_ARG_20250505160333542.jpg',
    'IMG_20250719_150456.jpg', 'IMG_20250719_192034.jpg',
    'IMG_20250719_155502.jpg', 'IMG_20250719_155404.jpg', 'IMG_20250806_222951.jpg',
    'IMG_20250921_165512.jpg', 'IMG_DAZZ_ARG_20250505160345509.jpg',
    'IMG_20250705_160216.jpg', 'IMG_20250129_104238.jpg',
]


def initialize_album(conn, assets_dir, now):
    columns = {row['name'] for row in conn.execute('PRAGMA table_info(photos)')}
    for name, declaration in [
        ('source', "TEXT NOT NULL DEFAULT 'upload'"),
        ('removed', 'INTEGER NOT NULL DEFAULT 0'),
        ('display_order', 'INTEGER NOT NULL DEFAULT 0'),
    ]:
        if name not in columns:
            conn.execute(f'ALTER TABLE photos ADD COLUMN {name} {declaration}')
    conn.execute('CREATE UNIQUE INDEX IF NOT EXISTS photos_source_filename ON photos(source, filename)')
    for order, filename in enumerate(BUNDLED_PHOTOS):
        if conn.execute("SELECT 1 FROM photos WHERE source='bundled' AND filename=?", (filename,)).fetchone():
            continue
        path = assets_dir / 'album' / filename
        if not path.is_file():
            continue
        with Image.open(path) as image:
            width, height = ImageOps.exif_transpose(image).size
        thumb = Path(filename).with_suffix('.webp').name
        conn.execute(
            "INSERT OR IGNORE INTO photos(filename,thumbnail,caption,media_type,width,height,author,created_at,source,display_order) VALUES (?,?,'','image/jpeg',?,?,'',?,'bundled',?)",
            (filename, thumb, width, height, now, order),
        )

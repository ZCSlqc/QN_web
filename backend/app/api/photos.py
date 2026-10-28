from app.core.uuid_ids import inserted_id
import io
import hashlib
import uuid
import warnings
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from app.core.settings import settings
from app.core.database import get_db, bj_time
from app.core.security import require_admin, get_current_user, require_page_access
from app.services.pet_wallets import grant_activity_food
from app.services.idempotency import lookup, remember
from app.services.photo_cleanup import cleanup_photo
from app.services.photo_storage import photo_directory, photo_path, original_basename

router = APIRouter()


def photo_payload(row):
    return {
        "id": row["id"], "caption": row["caption"],
        "width": row["width"], "height": row["height"],
        "created_at": row["created_at"],
        "source": row["source"],
        "original_name": row['original_name'],
        "url": f"/api/photos/{row['id']}/image",
        "display_url": f"/api/photos/{row['id']}/display",
        "small_url": f"/api/photos/{row['id']}/small",
        "cover_url": f"/api/photos/{row['id']}/cover",
        "thumbnail_url": f"/api/photos/{row['id']}/thumbnail",
    }


@router.get("/photos")
def list_photos():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM photos WHERE removed=0 AND journey_id IS NULL ORDER BY CASE source WHEN 'upload' THEN 0 ELSE 1 END, CASE WHEN source='bundled' THEN display_order END ASC, created_at DESC, rowid DESC").fetchall()
    return {"data": [photo_payload(row) for row in rows]}


@router.post("/photos", status_code=201)
def upload_photo(
    file: UploadFile = File(...),
    caption: str = Form(""),
    request_key: str = Form(""),
    current_user: str = Depends(require_admin),
):
    return store_photo(file, caption, request_key, current_user)


def store_photo(file, caption, request_key, current_user, journey_id=None):
    if len(caption.strip()) > 100:
        raise HTTPException(status_code=400, detail="照片描述不能超过100字")
    data = file.file.read(settings.MAX_PHOTO_BYTES + 1)
    if len(data) > settings.MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="每张照片不能超过15MB")
    formats = {"JPEG": ("jpg", "image/jpeg"), "PNG": ("png", "image/png"), "WEBP": ("webp", "image/webp")}
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in formats:
                    raise HTTPException(status_code=400, detail=f"图片实际格式为 {source.format or '未知'}，与文件扩展名可能不同。当前支持 JPG、PNG、WebP；请将图片导出为其中一种格式后上传，仅修改文件名无效。")
                extension, media_type = formats[source.format]
                if source.width * source.height > 40_000_000:
                    raise HTTPException(status_code=400, detail="照片分辨率过大，请缩小到4000万像素以内")
                if getattr(source, "is_animated", False):
                    raise HTTPException(status_code=400, detail="请上传静态照片")
                source.verify()
            with Image.open(io.BytesIO(data)) as source:
                image = ImageOps.exif_transpose(source)
                width, height = image.size
                image.thumbnail((960, 960))
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA" if "transparency" in image.info else "RGB")
                thumbnail = io.BytesIO()
                image.save(thumbnail, format="WEBP", quality=82)
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(status_code=400, detail="无法读取这张照片，请选择有效的 JPG、PNG 或 WebP 文件")

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    photo_id = str(uuid.uuid4())
    try:
        folder = photo_directory(photo_id, journey_id)
    except ValueError:
        raise HTTPException(404, '旅程记录不存在')
    relative = folder.relative_to(settings.UPLOAD_DIR)
    filename, thumbnail_name = (relative / f'original.{extension}').as_posix(), (relative / 'thumbnail.webp').as_posix()
    original_path = settings.UPLOAD_DIR / filename
    thumbnail_path = settings.UPLOAD_DIR / thumbnail_name
    content_hash = hashlib.sha256(data).hexdigest()
    try:
        with get_db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            if journey_id and not conn.execute('SELECT 1 FROM journeys WHERE id=?', (journey_id,)).fetchone():
                raise HTTPException(404, '旅程记录不存在')
            fingerprint = data + b'\0' + caption.strip().encode()
            if journey_id:
                fingerprint += b'\0journey:' + journey_id.encode()
            existing, marker = lookup(conn, 'photo', current_user, request_key, fingerprint)
            if existing is not None:
                previous = conn.execute('SELECT * FROM photos WHERE id=? AND removed=0', (existing,)).fetchone()
                if not previous:
                    raise HTTPException(409, '这张照片曾经上传并已移除，请重新选择照片')
                return {'data': photo_payload(previous)}
            duplicate = conn.execute('SELECT journey_id FROM photos WHERE content_hash=? AND removed=0', (content_hash,)).fetchone()
            if duplicate:
                location = '首页相册'
                if duplicate['journey_id']:
                    trip = conn.execute('SELECT name,departure_date FROM journeys WHERE id=?', (duplicate['journey_id'],)).fetchone()
                    if trip:
                        import json
                        location = f"{trip['departure_date']} · {'、'.join(json.loads(trip['name']))}的旅行回忆"
                    else:
                        location = '旅行回忆'
                raise HTTPException(409, f'这张图片已经上传到{location}，请勿重复上传（更换文件名也会识别）')
            order = conn.execute('SELECT COALESCE(MAX(display_order),-1)+1 FROM photos WHERE journey_id IS ? AND removed=0', (journey_id,)).fetchone()[0]
            folder.mkdir(parents=True, exist_ok=True)
            original_path.write_bytes(data)
            thumbnail_path.write_bytes(thumbnail.getvalue())
            result = conn.execute(
                "INSERT INTO photos(id,filename,thumbnail,caption,media_type,width,height,author,created_at,journey_id,content_hash,display_order,storage_dir,original_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (photo_id,filename, thumbnail_name, caption.strip(), media_type, width, height, current_user, bj_time(), journey_id,content_hash,order,relative.as_posix(),original_basename(file.filename)),
            )
            row = conn.execute("SELECT * FROM photos WHERE id=?", (inserted_id(conn, result, 'photos'),)).fetchone()
            remember(conn, marker, inserted_id(conn, result, 'photos'))
            awarded = grant_activity_food(conn, current_user, 'photo', inserted_id(conn, result, 'photos'), bj_time(), source_key=hashlib.sha256(data).hexdigest())
    except Exception:
        original_path.unlink(missing_ok=True)
        thumbnail_path.unlink(missing_ok=True)
        if folder.exists():
            folder.rmdir()
        if journey_id and folder.parent.exists() and not any(folder.parent.iterdir()):
            folder.parent.rmdir()
        raise
    return {"data": photo_payload(row), "food_reward": {"food": "treat", "amount": awarded}}


@router.get("/photos/{photo_id}/{variant}")
def photo_file(photo_id: str, variant: str, current_user=Depends(get_current_user)):
    if variant not in ("image", "thumbnail", "display", "small", "cover"):
        raise HTTPException(status_code=404, detail="照片不存在")
    with get_db() as conn:
        row = conn.execute("SELECT * FROM photos WHERE id=?", (photo_id,)).fetchone()
    if row is None or row['removed']:
        raise HTTPException(status_code=404, detail="照片不存在")
    if row['journey_id']:
        require_page_access('/journey')(current_user)
    path = photo_path(row, 'thumbnail' if variant == 'thumbnail' else 'image')
    if not path.is_file():
        raise HTTPException(status_code=404, detail="照片文件不存在")
    if variant in ('display', 'small', 'cover'):
        path = display_preview(row, path, variant)
    return FileResponse(path, media_type="image/webp" if path.suffix == '.webp' else row["media_type"],
                        headers={"Cache-Control": "private, no-store" if row['journey_id'] else "public, max-age=3600", "X-Content-Type-Options": "nosniff"})


def display_preview(row, original, variant='display'):
    """Resize outside database transactions; publish under a short deletion-safe lock."""
    target = photo_path(row, variant)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    temporary = settings.UPLOAD_DIR / f'{uuid.uuid4().hex}-display.tmp'
    if target.is_file() and target.stat().st_mtime_ns >= original.stat().st_mtime_ns:
        return target
    size = {'small': 256, 'cover': 640, 'display': 1920}[variant]
    try:
        with Image.open(original) as source:
            image = ImageOps.exif_transpose(source)
            image.thumbnail((size, size))
            if image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
            image.save(temporary, format='WEBP', quality=82 if size < 1920 else 85, method=4)
        with get_db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            if not conn.execute('SELECT 1 FROM photos WHERE id=? AND removed=0', (row['id'],)).fetchone():
                raise HTTPException(404, '照片已移除')
            temporary.replace(target)
    except (OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(400, '无法生成照片预览')
    finally:
        temporary.unlink(missing_ok=True)
    return target


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: str, current_user: str = Depends(require_admin)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM photos WHERE id=?", (photo_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="照片不存在")
        conn.execute('UPDATE photos SET removed=1 WHERE id=?', (photo_id,))
    return {"status": "success", "cleanup_pending": not cleanup_photo(photo_id)}

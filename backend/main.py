"""Application entry point; start with uv run python run.py (root .env ports)."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.settings import settings
from app.core.database import init_db, get_db, bj_time
from app.core.security import get_current_user
from app.api import auth, story, photos, journeys, blessings, admin, todos, pet, wedding
from app.api.mailbox import build_mailbox_router
from app.services.photo_cleanup import retry_photo_cleanup
from app.services.pet_wallets import replenish_startup_food


@asynccontextmanager
async def lifespan(app):
    init_db()
    replenish_startup_food()
    retry_photo_cleanup()
    yield


app = FastAPI(title="qiqi & nini 情侣网页 API", version="3.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS,
                   allow_credentials=False, allow_methods=settings.CORS_METHODS, allow_headers=settings.CORS_HEADERS)
for module in (auth, story, photos, journeys, blessings, admin, todos, pet, wedding):
    app.include_router(module.router)
app.include_router(build_mailbox_router(get_db, get_current_user, settings, bj_time))


@app.get('/health')
def health():
    return {'status': 'ok'}

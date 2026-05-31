from __future__ import annotations

import os
import secrets

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import router
from app.database import init_db


DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]


def get_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS")
    if not configured:
        return DEFAULT_CORS_ORIGINS
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def get_api_key() -> str | None:
    api_key = os.getenv("RUSH_TRACKER_API_KEY")
    return api_key.strip() if api_key and api_key.strip() else None


def create_app() -> FastAPI:
    app = FastAPI(
        title="Rush Tracker API",
        version="0.1.0",
        description="Ethical recruitment CRM API for manual prospect tracking.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def require_api_key(request: Request, call_next):
        expected_api_key = get_api_key()
        if (
            expected_api_key is None
            or request.method == "OPTIONS"
            or request.url.path == "/health"
        ):
            return await call_next(request)

        provided_api_key = (
            request.headers.get("x-rush-tracker-api-key")
            or ""
        )
        if not secrets.compare_digest(provided_api_key, expected_api_key):
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid API key."},
            )

        return await call_next(request)

    app.include_router(router)

    @app.on_event("startup")
    def startup() -> None:
        init_db()

    return app


app = create_app()

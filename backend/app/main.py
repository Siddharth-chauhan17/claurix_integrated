"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth
from routes.analyze import router as analyze_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Register all ORM models on Base, then create any missing tables
    from app.models.analysis_history import AnalysisHistory  # noqa: F401
    from app.models.user import User  # noqa: F401

    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(analyze_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Insurify API",
        "docs": "/docs",
        "health": "/health",
        "auth": "/auth/signup, /auth/login",
        "analyze": "POST /analyze-policy",
        "history": "GET /history",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

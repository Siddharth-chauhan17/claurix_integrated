"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, clients, demo_requests, documents, outlook, projects, workspace

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    from scripts.reset_identity import reset_identity_foundation
    from scripts.run_migrations import upgrade_head

    upgrade_head()

    if settings.reset_identity_on_startup:
        reset_identity_foundation(wipe=True)
        reset_identity_foundation(wipe=False)

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
app.include_router(clients.router)
app.include_router(demo_requests.router)
app.include_router(outlook.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(workspace.router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "claurix API",
        "docs": "/docs",
        "health": "/health",
        "auth": "/auth/signup, /auth/login, /auth/google",
        "clients": "POST /clients, GET /clients, GET /clients/{id}",
        "demo_requests": "POST /demo-requests (public), GET /demo-requests (admin)",
        "outlook": "GET /integrations/outlook/connect, /status, DELETE /disconnect",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

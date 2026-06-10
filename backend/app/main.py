"""FastAPI application entrypoint."""



from contextlib import asynccontextmanager



from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware



from app.config import get_settings

from app.database import Base, engine

from app.routers import auth, clients, demo_requests, projects, workspace



settings = get_settings()





@asynccontextmanager

async def lifespan(_app: FastAPI):

    from app.models.client import Client  # noqa: F401
    from app.models.project import Project  # noqa: F401

    from app.models.demo_request import DemoRequest  # noqa: F401

    from app.models.organization import Organization  # noqa: F401

    from app.models.user import User  # noqa: F401

    from scripts.init_db import _ensure_demo_request_array_columns

    from scripts.reset_identity import reset_identity_foundation



    if settings.reset_identity_on_startup:

        reset_identity_foundation(wipe=True)



    Base.metadata.create_all(bind=engine)



    if settings.reset_identity_on_startup:

        reset_identity_foundation(wipe=False)



    _ensure_demo_request_array_columns()

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
app.include_router(projects.router)
app.include_router(workspace.router)





@app.get("/")

def root() -> dict[str, str]:

    return {

        "message": "claurix API",

        "docs": "/docs",

        "health": "/health",

        "auth": "/auth/signup, /auth/login, /auth/google",

        "clients": "POST /clients, GET /clients, GET /clients/{id}",

        "demo_requests": "POST /demo-requests, GET /demo-requests",

    }





@app.get("/health")

def health() -> dict[str, str]:

    return {"status": "ok"}



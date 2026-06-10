"""Client API — multi-tenant, creator-scoped access."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.client import Client
from app.models.user import User
from app.schemas import ClientCreate, ClientListResponse, ClientResponse
from app.services import client_service

router = APIRouter(prefix="/clients", tags=["clients"])


def _to_response(client: Client) -> ClientResponse:
    return ClientResponse.model_validate(client)


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a client",
)
def create_client(
    payload: ClientCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ClientResponse:
    client = client_service.create_client(db, user, payload)
    return _to_response(client)


@router.get(
    "",
    response_model=ClientListResponse,
    summary="List or search clients created by the current user",
)
def list_clients(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    search: Optional[str] = Query(default=None, max_length=255),
    limit: Optional[int] = Query(default=None, ge=1, le=100),
) -> ClientListResponse:
    clients = client_service.list_clients_for_user(db, user, search=search, limit=limit)
    items = [_to_response(c) for c in clients]
    return ClientListResponse(count=len(items), items=items)


@router.post(
    "/{client_id}/touch",
    response_model=ClientResponse,
    summary="Mark client as recently worked on",
)
def touch_client(
    client_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ClientResponse:
    client = client_service.get_client_for_user_or_raise(db, client_id, user)
    client = client_service.touch_client_last_worked(db, client)
    return _to_response(client)


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Get a client by id",
)
def get_client(
    client_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ClientResponse:
    client = client_service.get_client_for_user_or_raise(db, client_id, user)
    client = client_service.touch_client_last_worked(db, client)
    return _to_response(client)

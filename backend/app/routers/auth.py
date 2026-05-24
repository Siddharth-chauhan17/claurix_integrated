"""Auth API: signup, login, and Google OAuth."""

import secrets
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.schemas import (
    LoginRequest,
    LoginResponse,
    SignupRequest,
    SignupResponse,
    Token,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

# Frontend URL to redirect after successful Google login
OAUTH_SUCCESS_REDIRECT = "http://localhost:3000/auth/success"
OAUTH_STATE_COOKIE = "oauth_state"
ACCESS_TOKEN_COOKIE = "access_token"
ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24  # 24 hours (matches access_token_expire_minutes)


def user_to_response(user) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at,
        google_id=user.google_id,
    )


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
)
def signup(
    payload: SignupRequest,
    db: Session = Depends(get_db),
) -> SignupResponse:
    """
    Register a new user with name, email, and password.
    Returns the created user and a JWT access token.
    """
    try:
        user = auth_service.create_user(db, payload)
    except ValueError as e:
        if "already exists" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    access_token, expires_in = auth_service.create_access_token(user.id)
    token = Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
    )
    response = JSONResponse(
        content=SignupResponse(
            user=user_to_response(user),
            token=token,
            message="Account created successfully",
        ).model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
    )
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=ACCESS_TOKEN_MAX_AGE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Sign in with email and password",
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """
    Authenticate with email and password.
    Returns the user and a JWT access token.
    """
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token, expires_in = auth_service.create_access_token(user.id)
    token = Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
    )
    response = JSONResponse(
        content=LoginResponse(
            user=user_to_response(user),
            token=token,
        ).model_dump(mode="json"),
    )
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=ACCESS_TOKEN_MAX_AGE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user from cookie",
)
def me(request: Request, db: Session = Depends(get_db)) -> UserResponse:
    """Return the current user from the access_token cookie. 401 if no valid token."""
    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = auth_service.decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = auth_service.get_user_by_id(db, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user_to_response(user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out (clear cookie)",
)
def logout() -> JSONResponse:
    """Clear the access_token cookie. Same path/samesite as set_cookie so browser removes it."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(
        ACCESS_TOKEN_COOKIE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response


# ----- Google OAuth -----


@router.get(
    "/google",
    summary="Redirect to Google login",
)
def auth_google(request: Request) -> RedirectResponse:
    """Redirect the user to Google's OAuth consent screen."""
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env (or in the environment for Docker).",
        )
    state = secrets.token_urlsafe(32)
    url = auth_service.get_google_authorization_url(state)
    response = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        OAUTH_STATE_COOKIE,
        value=state,
        max_age=600,  # 10 minutes
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response


@router.get(
    "/google/callback",
    summary="Google OAuth callback",
)
def auth_google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Exchange code for token, create or link user, set cookie, redirect to frontend."""
    if error:
        redirect_url = f"{OAUTH_SUCCESS_REDIRECT}?error={quote(error)}"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    if not code or not state:
        redirect_url = f"{OAUTH_SUCCESS_REDIRECT}?error=missing_code_or_state"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    cookie_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not cookie_state or not secrets.compare_digest(cookie_state, state):
        redirect_url = f"{OAUTH_SUCCESS_REDIRECT}?error=invalid_state"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    try:
        email, name, google_id = auth_service.exchange_google_code_for_userinfo(code)
    except Exception as e:
        redirect_url = f"{OAUTH_SUCCESS_REDIRECT}?error={quote(str(e))}"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    try:
        user = auth_service.handle_google_user(db, email=email, name=name, google_id=google_id)
    except ValueError as e:
        redirect_url = f"{OAUTH_SUCCESS_REDIRECT}?error={quote(str(e))}"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    access_token, _ = auth_service.create_access_token_oauth({"sub": str(user.id)})
    response = RedirectResponse(url=OAUTH_SUCCESS_REDIRECT, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=7 * 24 * 60 * 60,  # 7 days
        path="/",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    response.delete_cookie(OAUTH_STATE_COOKIE)
    return response

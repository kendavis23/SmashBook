from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    get_password_hash,
    decode_token,
)
from app.db.models.tenant import Tenant
from app.db.models.user import User, TenantUser, TenantUserRole
from app.db.models.wallet import Wallet
from app.schemas.user import (
    UserRegister,
    UserLogin,
    TokenResponse,
    RefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
)

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_active_tenant(subdomain: str, db: AsyncSession) -> Tenant:
    result = await db.execute(
        select(Tenant).where(Tenant.subdomain == subdomain, Tenant.is_active == True)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new player account."""
    tenant = await _get_active_tenant(body.tenant_subdomain, db)

    existing = await db.execute(
        select(User).where(User.email == body.email, User.tenant_id == tenant.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        tenant_id=tenant.id,
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(body.password),
    )
    db.add(user)
    await db.flush()  # Populate user.id before foreign key references

    db.add(TenantUser(tenant_id=tenant.id, user_id=user.id, role=TenantUserRole.player))
    db.add(Wallet(user_id=user.id))

    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and receive access + refresh tokens."""
    tenant = await _get_active_tenant(body.tenant_subdomain, db)

    result = await db.execute(
        select(User).where(User.email == body.email, User.tenant_id == tenant.id)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest):
    """Exchange a refresh token for a new access + refresh token pair."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )
    token_data = {"sub": payload["sub"]}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    """Logout — tokens are stateless JWTs; client must discard them."""
    return


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(body: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate a password reset token for the given email.
    Always returns 202 to avoid user enumeration.
    TODO: publish reset_token to notification-events → notification-worker → SendGrid.
    """
    tenant = await _get_active_tenant(body.tenant_subdomain, db)

    result = await db.execute(
        select(User).where(User.email == body.email, User.tenant_id == tenant.id)
    )
    user = result.scalar_one_or_none()

    if user and user.is_active:
        _reset_token = create_reset_token({"sub": str(user.id)})
        # TODO: publish {"type": "password_reset", "user_id": str(user.id), "token": _reset_token}
        #       to PUBSUB_TOPIC_NOTIFICATION_EVENTS


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_password_reset(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """Set a new password using a valid reset token."""
    payload = decode_token(body.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token"
        )

    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token"
        )

    user.hashed_password = get_password_hash(body.new_password)

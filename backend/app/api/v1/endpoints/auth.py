import logging
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.config import get_settings
from app.core.pubsub import publish_notification_event
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    create_verify_token,
    get_password_hash,
    decode_token,
)
from app.db.models.club import Club
from app.db.models.membership import (
    MembershipPlan,
    MembershipStatus,
    MembershipSubscription,
)
from app.db.models.staff import StaffProfile
from app.db.models.tenant import Tenant
from app.db.models.user import User, TenantUserRole
from app.db.models.wallet import Wallet
from app.schemas.user import (
    ClubSummary,
    EmailVerifyRequest,
    EmailVerifyResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterResponse,
    TokenResponse,
    UserLogin,
    UserRegister,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_active_tenant(subdomain: str, db: AsyncSession) -> tuple[Tenant, str]:
    """Resolve an active tenant by matching either player_subdomain or staff_subdomain.

    Returns the tenant and the subdomain string that was used to look it up,
    so the caller can build confirmation-email URLs that send the user back
    to the same portal they registered from.
    """
    subdomain = subdomain.strip().lower()
    result = await db.execute(
        select(Tenant).where(
            Tenant.is_active,
            (Tenant.player_subdomain == subdomain) | (Tenant.staff_subdomain == subdomain),
        )
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant, subdomain


async def _get_active_club(club_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Club:
    result = await db.execute(
        select(Club).where(Club.id == club_id, Club.tenant_id == tenant_id)
    )
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return club


def _tenant_url(tenant: Tenant, subdomain: str, path: str, params: dict) -> str:
    """
    Build a tenant-scoped URL targeting the portal the user originated from.

    ``subdomain`` is the value the caller used to look up the tenant — either
    the player or the staff subdomain. We send the user back to that same
    host so player-registration confirmation links land on the player site
    and staff-registration links land on the staff portal. Tenants with a
    custom_domain still funnel through that single host.
    """
    parsed = urlparse(get_settings().APP_BASE_URL)
    scheme = parsed.scheme or "https"
    host = tenant.custom_domain or f"{subdomain}.{parsed.netloc}"
    return f"{scheme}://{host}{path}?{urlencode(params)}"


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new player. Creates the user in an unverified state and emails a
    verification link; the free basic membership at the chosen club is attached
    in POST /auth/verify-email once the player clicks the link. Login is blocked
    until verification.
    """
    tenant, origin_subdomain = await _get_active_tenant(body.tenant_subdomain, db)
    club = await _get_active_club(body.club_id, tenant.id, db)

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
        role=TenantUserRole.player,
        email_verified_at=None,
    )
    db.add(user)
    await db.flush()  # populate user.id

    db.add(Wallet(user_id=user.id))
    await db.commit()

    verify_token = create_verify_token({"sub": str(user.id), "cid": str(club.id)})
    verify_url = _tenant_url(tenant, origin_subdomain, "/verify-email", {"token": verify_token})
    try:
        publish_notification_event("email_verify", {
            "user_id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "tenant_name": tenant.name,
            "club_id": str(club.id),
            "club_name": club.name,
            "verify_url": verify_url,
        })
    except Exception:
        logger.exception(
            "failed to publish email_verify event user_id=%s tenant_id=%s",
            user.id, tenant.id,
        )

    return RegisterResponse(user_id=user.id, email=user.email)


@router.post("/verify-email", response_model=EmailVerifyResponse)
async def verify_email(body: EmailVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Confirm a player's email using the token emailed at registration.
    On first verification, attaches the club's free basic membership.
    Idempotent: re-clicking the link returns the existing membership.
    """
    payload = decode_token(body.token)
    if not payload or payload.get("type") != "verify":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    club = await _get_active_club(uuid.UUID(payload["cid"]), user.tenant_id, db)

    # Look up an existing basic membership (idempotency on re-click) or the
    # club's default plan to create one. We do this before mutating user state
    # so a missing default plan doesn't half-verify the account.
    existing_sub_result = await db.execute(
        select(MembershipSubscription).where(
            MembershipSubscription.user_id == user.id,
            MembershipSubscription.club_id == club.id,
        )
    )
    subscription = existing_sub_result.scalar_one_or_none()

    if subscription is None:
        plan_result = await db.execute(
            select(MembershipPlan).where(
                MembershipPlan.club_id == club.id,
                MembershipPlan.is_default,
                MembershipPlan.is_active,
            )
        )
        plan = plan_result.scalar_one_or_none()
        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Club has no default membership plan configured",
            )

        now = datetime.now(tz=timezone.utc)
        # Free basic plan — no Stripe involvement. Period_end is effectively a
        # rolling annual window; renewals for paid plans happen via Stripe webhook,
        # which doesn't apply here.
        subscription = MembershipSubscription(
            user_id=user.id,
            plan_id=plan.id,
            club_id=club.id,
            status=MembershipStatus.active,
            current_period_start=now,
            current_period_end=now + timedelta(days=365),
            credits_remaining=plan.booking_credits_per_period,
            guest_passes_remaining=plan.guest_passes_per_period,
            stripe_subscription_id=None,
        )
        db.add(subscription)
        await db.flush()

    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(tz=timezone.utc)
        db.add(user)

    await db.commit()

    try:
        publish_notification_event("welcome", {
            "user_id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "tenant_name": (await db.get(Tenant, user.tenant_id)).name,
        })
    except Exception:
        logger.exception(
            "failed to publish welcome event user_id=%s tenant_id=%s",
            user.id, user.tenant_id,
        )

    return EmailVerifyResponse(
        user_id=user.id,
        email=user.email,
        club_id=club.id,
        membership_subscription_id=subscription.id,
    )


async def _get_user_clubs(user: User, db: AsyncSession) -> list[ClubSummary]:
    if user.role in (TenantUserRole.owner, TenantUserRole.admin):
        result = await db.execute(
            select(Club).where(Club.tenant_id == user.tenant_id)
        )
        return [
            ClubSummary(club_id=club.id, club_name=club.name, role=user.role.value)
            for club in result.scalars().all()
        ]

    clubs = []

    staff_result = await db.execute(
        select(StaffProfile, Club)
        .join(Club, Club.id == StaffProfile.club_id)
        .where(StaffProfile.user_id == user.id, StaffProfile.is_active)
    )
    for staff_profile, club in staff_result:
        clubs.append(ClubSummary(club_id=club.id, club_name=club.name, role=staff_profile.role.value))

    if not clubs:
        player_result = await db.execute(
            select(MembershipSubscription, Club)
            .join(Club, Club.id == MembershipSubscription.club_id)
            .where(
                MembershipSubscription.user_id == user.id,
                MembershipSubscription.status == MembershipStatus.active,
            )
        )
        for _, club in player_result:
            clubs.append(ClubSummary(club_id=club.id, club_name=club.name, role="player"))

    return clubs


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and receive access + refresh tokens."""
    tenant, _origin_subdomain = await _get_active_tenant(body.tenant_subdomain, db)

    result = await db.execute(
        select(User).where(User.email == body.email, User.tenant_id == tenant.id)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    if user.email_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    clubs = await _get_user_clubs(user, db)
    token_data = {"sub": str(user.id), "tid": str(tenant.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        clubs=clubs,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access + refresh token pair."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )
    token_data = {"sub": payload["sub"], "tid": payload["tid"]}

    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    clubs = await _get_user_clubs(user, db)
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        clubs=clubs,
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
    tenant, origin_subdomain = await _get_active_tenant(body.tenant_subdomain, db)

    result = await db.execute(
        select(User).where(User.email == body.email, User.tenant_id == tenant.id)
    )
    user = result.scalar_one_or_none()

    if user and user.is_active:
        reset_token = create_reset_token({"sub": str(user.id)})
        reset_url = _tenant_url(
            tenant, origin_subdomain, "/reset-password", {"token": reset_token}
        )
        publish_notification_event("password_reset", {
            "user_id": str(user.id),
            "email": user.email,
            "reset_url": reset_url,
        })


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

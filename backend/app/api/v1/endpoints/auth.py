from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, get_password_hash

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(db: AsyncSession = Depends(get_db)):
    """Register a new player account."""
    pass


@router.post("/login")
async def login(db: AsyncSession = Depends(get_db)):
    """Login and receive access + refresh tokens."""
    pass


@router.post("/refresh")
async def refresh_token():
    """Refresh an access token using a refresh token."""
    pass


@router.post("/logout")
async def logout():
    """Invalidate refresh token."""
    pass


@router.post("/password-reset/request")
async def request_password_reset():
    """Send password reset email."""
    pass


@router.post("/password-reset/confirm")
async def confirm_password_reset():
    """Set new password using reset token."""
    pass

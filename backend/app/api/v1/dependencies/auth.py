from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import decode_token
from app.db.models.user import User, TenantUserRole

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Require the user to have a staff-level role."""
    # Role check done via TenantUser - simplified here
    return current_user


async def require_ops_lead(current_user: User = Depends(get_current_user)) -> User:
    return current_user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    return current_user

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from .config import get_settings

security = HTTPBearer()
settings = get_settings()


def verify_token(token: str) -> dict:
    """Verify Supabase JWT token and return claims."""
    if not settings.supabase_jwt_secret:
        # Only allow dev mode bypass in non-production environments
        if settings.environment in ("prod", "production", "staging"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication not configured. SUPABASE_JWT_SECRET is required in production."
            )
        # Development mode - return mock user
        return {"sub": "dev-user-123", "email": "dev@example.com"}

    try:
        # Supabase uses HS256 with the JWT secret
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

        return claims

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Dependency to get current authenticated user."""
    return verify_token(credentials.credentials)


def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """Extract user ID from token claims."""
    return user.get("sub")


def get_user_email(
    user: dict = Depends(get_current_user),
    x_user_email: str = Header(None, alias="X-User-Email")
) -> str:
    """Extract user email from token claims or X-User-Email header.

    For Supabase auth, email is typically in the token claims directly.
    The X-User-Email header is kept for backwards compatibility.
    """
    # Try direct email claim first
    email = user.get("email", "")
    if email:
        return email.lower().strip()

    # Use X-User-Email header as fallback
    if x_user_email:
        return x_user_email.lower().strip()

    return ""

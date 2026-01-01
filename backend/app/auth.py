from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from functools import lru_cache
from .config import get_settings

security = HTTPBearer()
settings = get_settings()


@lru_cache(maxsize=1)
def get_cognito_keys():
    """Fetch and cache Cognito JWKS."""
    if not settings.cognito_user_pool_id:
        return None
    
    jwks_url = (
        f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/"
        f"{settings.cognito_user_pool_id}/.well-known/jwks.json"
    )
    
    response = httpx.get(jwks_url)
    response.raise_for_status()
    return response.json()


def verify_token(token: str) -> dict:
    """Verify Cognito JWT token and return claims."""
    if not settings.cognito_user_pool_id:
        # Development mode - return mock user
        return {"sub": "dev-user-123", "email": "dev@example.com"}
    
    try:
        # Get the key ID from the token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        # Find the matching key
        jwks = get_cognito_keys()
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = k
                break
        
        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token key"
            )
        
        # Verify and decode
        issuer = f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/{settings.cognito_user_pool_id}"
        
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.cognito_client_id,
            issuer=issuer,
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

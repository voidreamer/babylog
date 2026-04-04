from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_real_client_ip(request: Request) -> str:
    """Extract real client IP, accounting for API Gateway / CloudFront proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_real_client_ip)

# Rate limit constants
RATE_READ = "60/minute"
RATE_WRITE = "30/minute"
RATE_AUTH = "10/minute"
RATE_EXPORT = "5/minute"
RATE_ADMIN = "5/minute"

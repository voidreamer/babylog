from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str = "postgresql://user:pass@localhost:5432/simplebaby"
    environment: str = "development"
    supabase_jwt_secret: str = ""
    # CORS origins - comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_monthly: str = ""
    stripe_price_yearly: str = ""
    # VAPID keys for Web Push notifications
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_contact_email: str = "support@heybub.app"
    # Sentry error monitoring
    sentry_dsn: str = ""
    # Groq API for voice intent parsing
    groq_api_key: str = ""
    # Supabase Storage (for photo uploads)
    supabase_url: str = ""
    supabase_service_key: str = ""
    photo_bucket: str = "photos"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

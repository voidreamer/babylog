from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str = "postgresql://user:pass@localhost:5432/simplebaby"
    environment: str = "development"
    supabase_jwt_secret: str = ""
    # CORS origins - comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

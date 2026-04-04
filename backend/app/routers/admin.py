"""
Admin management endpoints.

Protected endpoints for database migrations and admin operations.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from ..config import get_settings
from ..logging_config import get_logger
from ..rate_limit import limiter, RATE_ADMIN

logger = get_logger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


def verify_admin_key(x_admin_key: str = Header(None)):
    """
    Verify admin API key for protected operations.

    In production, set ADMIN_API_KEY environment variable.
    This protects migration and other admin endpoints.
    """
    expected_key = os.environ.get("ADMIN_API_KEY", "")

    if not expected_key:
        # If no admin key is configured, only allow in development
        if settings.environment in ("prod", "production", "staging"):
            raise HTTPException(
                status_code=403,
                detail="Admin operations require ADMIN_API_KEY to be configured"
            )
        return True

    if not x_admin_key or x_admin_key != expected_key:
        logger.warning("Invalid admin key attempt")
        raise HTTPException(status_code=403, detail="Invalid admin key")

    return True


@router.post("/migrate")
@limiter.limit(RATE_ADMIN)
async def run_migrations(request: Request, authorized: bool = Depends(verify_admin_key)):
    """
    Run pending database migrations.

    Call this endpoint after deploying new code that includes migrations.
    Requires X-Admin-Key header with the ADMIN_API_KEY value.

    Example:
        curl -X POST https://api.example.com/admin/migrate \
             -H "X-Admin-Key: your-secret-key"
    """
    try:
        from alembic.config import Config
        from alembic import command
        import os

        # Get the directory where this file is located
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))

        # Set the script location relative to where we are
        alembic_cfg.set_main_option(
            "script_location",
            os.path.join(backend_dir, "alembic")
        )

        # Get current revision before upgrade
        from alembic.runtime.migration import MigrationContext
        from sqlalchemy import create_engine

        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            context = MigrationContext.configure(conn)
            current_rev = context.get_current_revision()

        # Run migrations
        command.upgrade(alembic_cfg, "head")

        # Get new revision after upgrade
        with engine.connect() as conn:
            context = MigrationContext.configure(conn)
            new_rev = context.get_current_revision()

        if current_rev == new_rev:
            return {
                "status": "ok",
                "message": "Already at latest migration",
                "revision": new_rev
            }

        logger.info("Migrations applied", extra={"previous_revision": current_rev, "current_revision": new_rev})
        return {
            "status": "ok",
            "message": "Migrations applied successfully",
            "previous_revision": current_rev,
            "current_revision": new_rev
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Migration failed: {str(e)}"
        )


@router.get("/migration-status")
@limiter.limit(RATE_ADMIN)
async def get_migration_status(request: Request, authorized: bool = Depends(verify_admin_key)):
    """
    Get current migration status.

    Returns the current database revision and available migrations.
    """
    try:
        from alembic.runtime.migration import MigrationContext
        from sqlalchemy import create_engine

        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            context = MigrationContext.configure(conn)
            current_rev = context.get_current_revision()

        return {
            "status": "ok",
            "current_revision": current_rev,
            "message": "No migrations applied yet" if not current_rev else f"At revision {current_rev}"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get migration status: {str(e)}"
        )

"""
Alembic environment configuration.

This file configures how Alembic connects to the database
and auto-generates migrations from SQLAlchemy models.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the backend directory to path so we can import our app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import your models and Base
from app.database import Base
from app.config import get_settings
# Import all models so they're registered with Base.metadata
from app import models  # noqa: F401

# Alembic Config object
config = context.config

# Load settings from environment
settings = get_settings()

# Override sqlalchemy.url with our environment variable
config.set_main_option("sqlalchemy.url", settings.database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This generates SQL scripts without connecting to the database.
    Useful for generating migration scripts to run later.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    Creates an Engine and connects to the database to run migrations.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Compare types to detect column type changes
            compare_type=True,
            # Compare server defaults
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

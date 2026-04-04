"""Add missing indexes for shared_with JSONB, analytics events, and user email.

- GIN index on babies.shared_with for JSONB containment queries
- Composite index on analytics_events (event_name, created_at DESC)
- Index on users.email for fast lookups

Revision ID: 0011
Revises: 0010
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    # GIN index for JSONB containment queries on babies.shared_with
    op.execute("CREATE INDEX IF NOT EXISTS ix_babies_shared_with_gin ON babies USING gin (shared_with)")
    # Composite index for analytics event queries by name and recency
    op.execute("CREATE INDEX IF NOT EXISTS ix_analytics_events_name_created ON analytics_events (event_name, created_at DESC)")
    # Index on users.email for fast lookups
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_users_email")
    op.execute("DROP INDEX IF EXISTS ix_analytics_events_name_created")
    op.execute("DROP INDEX IF EXISTS ix_babies_shared_with_gin")

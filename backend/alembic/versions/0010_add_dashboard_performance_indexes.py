"""Add composite indexes for dashboard query performance.

These indexes cover the dashboard endpoint's "last event" and "daily summary"
queries. Each index is (baby_id, time_column DESC) so the DB can satisfy
ORDER BY ... DESC LIMIT 1 with an index-only scan.

Revision ID: 0010
Revises: 0009
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    # Composite indexes: (baby_id, time DESC) for fast "last event" lookups
    op.execute("CREATE INDEX IF NOT EXISTS ix_feedings_baby_time ON feedings (baby_id, time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_diapers_baby_time ON diapers (baby_id, time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_sleeps_baby_start ON sleeps (baby_id, start_time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_pumpings_baby_time ON pumpings (baby_id, time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_potty_baby_time ON potty (baby_id, time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tummy_time_baby_start ON tummy_time (baby_id, start_time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_baths_baby_time ON baths (baby_id, time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_supplements_baby_time ON supplements (baby_id, time DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_solids_baby_time ON solids (baby_id, time DESC)")


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_solids_baby_time")
    op.execute("DROP INDEX IF EXISTS ix_supplements_baby_time")
    op.execute("DROP INDEX IF EXISTS ix_baths_baby_time")
    op.execute("DROP INDEX IF EXISTS ix_tummy_time_baby_start")
    op.execute("DROP INDEX IF EXISTS ix_potty_baby_time")
    op.execute("DROP INDEX IF EXISTS ix_pumpings_baby_time")
    op.execute("DROP INDEX IF EXISTS ix_sleeps_baby_start")
    op.execute("DROP INDEX IF EXISTS ix_diapers_baby_time")
    op.execute("DROP INDEX IF EXISTS ix_feedings_baby_time")

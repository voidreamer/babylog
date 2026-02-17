"""Add onboarding and tour completion timestamps to users table.

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("onboarding_completed_at", sa.DateTime, nullable=True))
    op.add_column("users", sa.Column("tour_completed_at", sa.DateTime, nullable=True))


def downgrade():
    op.drop_column("users", "tour_completed_at")
    op.drop_column("users", "onboarding_completed_at")

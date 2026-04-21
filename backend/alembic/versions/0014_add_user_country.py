"""Add country column to users table.

Stores the user's country (ISO 3166-1 alpha-2, lowercase) so that
country-specific content like vaccination schedules can be shown
for just that country.

Revision ID: 0014
Revises: 0013
"""
from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("country", sa.String(length=2), nullable=True))


def downgrade():
    op.drop_column("users", "country")

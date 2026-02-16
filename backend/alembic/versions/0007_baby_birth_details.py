"""Add birth details columns to babies table.

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("babies", sa.Column("blood_type", sa.String(5), nullable=True))
    op.add_column("babies", sa.Column("birthplace", sa.String(200), nullable=True))
    op.add_column("babies", sa.Column("birth_time", sa.String(5), nullable=True))


def downgrade():
    op.drop_column("babies", "birth_time")
    op.drop_column("babies", "birthplace")
    op.drop_column("babies", "blood_type")

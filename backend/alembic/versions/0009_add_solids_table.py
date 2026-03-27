"""Add solids table for tracking solid food intake.

Revision ID: 0009
Revises: 0008
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "solids",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("baby_id", sa.Integer, sa.ForeignKey("babies.id"), nullable=False),
        sa.Column("time", sa.DateTime, nullable=False),
        sa.Column("food_name", sa.String, nullable=False),
        sa.Column("amount", sa.String, nullable=True),
        sa.Column("reaction", sa.String, nullable=True),
        sa.Column("notes", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_solids_baby_id", "solids", ["baby_id"])


def downgrade():
    op.drop_index("ix_solids_baby_id", table_name="solids")
    op.drop_table("solids")

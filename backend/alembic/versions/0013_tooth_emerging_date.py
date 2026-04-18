"""Add emerging_date to teeth and make emerged_date nullable.

Allows tracking teeth that are currently breaking through (emerging) in
addition to teeth that have fully emerged.

Revision ID: 0013
Revises: 0012
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("teeth", sa.Column("emerging_date", sa.DateTime(), nullable=True))
    with op.batch_alter_table("teeth") as batch_op:
        batch_op.alter_column("emerged_date", existing_type=sa.DateTime(), nullable=True)


def downgrade():
    # Backfill any null emerged_date from emerging_date before re-enforcing NOT NULL
    op.execute(
        "UPDATE teeth SET emerged_date = emerging_date "
        "WHERE emerged_date IS NULL AND emerging_date IS NOT NULL"
    )
    with op.batch_alter_table("teeth") as batch_op:
        batch_op.alter_column("emerged_date", existing_type=sa.DateTime(), nullable=False)
    op.drop_column("teeth", "emerging_date")

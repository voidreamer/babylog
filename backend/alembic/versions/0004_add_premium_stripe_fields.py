"""Add Stripe premium fields to users table.

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("stripe_subscription_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("premium_plan", sa.String(), nullable=True))
    op.add_column("users", sa.Column("premium_expires_at", sa.DateTime(), nullable=True))
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"])


def downgrade():
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "premium_expires_at")
    op.drop_column("users", "premium_plan")
    op.drop_column("users", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")

"""Add analytics events, push subscriptions, and photo columns.

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    # Analytics events table
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("event_name", sa.String(100), nullable=False, index=True),
        sa.Column("event_data", sa.String(), nullable=True),
        sa.Column("session_id", sa.String(64), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), index=True),
    )

    # Push subscriptions table
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("endpoint", sa.String(), nullable=False, unique=True),
        sa.Column("p256dh_key", sa.String(), nullable=False),
        sa.Column("auth_key", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Photo URL on milestones
    op.add_column("milestones", sa.Column("photo_url", sa.String(), nullable=True))

    # Profile photo URL on babies
    op.add_column("babies", sa.Column("profile_photo_url", sa.String(), nullable=True))

    # Composite indexes for performance (Sprint 3 caching quick wins)
    op.create_index("ix_feedings_baby_time", "feedings", ["baby_id", sa.text("time DESC")])
    op.create_index("ix_sleeps_baby_start", "sleeps", ["baby_id", sa.text("start_time DESC")])
    op.create_index("ix_diapers_baby_time", "diapers", ["baby_id", sa.text("time DESC")])
    op.create_index("ix_pumpings_baby_time", "pumpings", ["baby_id", sa.text("time DESC")])


def downgrade():
    op.drop_index("ix_pumpings_baby_time", table_name="pumpings")
    op.drop_index("ix_diapers_baby_time", table_name="diapers")
    op.drop_index("ix_sleeps_baby_start", table_name="sleeps")
    op.drop_index("ix_feedings_baby_time", table_name="feedings")
    op.drop_column("babies", "profile_photo_url")
    op.drop_column("milestones", "photo_url")
    op.drop_table("push_subscriptions")
    op.drop_table("analytics_events")

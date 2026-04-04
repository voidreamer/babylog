"""Add telegram_chat_id column to users table.

Supports Telegram bot integration for logging events and receiving
status summaries via chat commands.

Revision ID: 0012
Revises: 0011
"""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("telegram_chat_id", sa.String(), nullable=True))
    op.create_index("ix_users_telegram_chat_id", "users", ["telegram_chat_id"])


def downgrade():
    op.drop_index("ix_users_telegram_chat_id", table_name="users")
    op.drop_column("users", "telegram_chat_id")
